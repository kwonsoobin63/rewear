import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { getStorage, ref, uploadString, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js';

const config = window.REWEAR_CONFIG?.firebase;
const usable = Boolean(config?.apiKey && config?.authDomain && config?.projectId && config?.appId);
let auth, db, storage, currentUser = null;
const listeners = new Set();
const notify = () => listeners.forEach(listener => listener(currentUser));

if (usable) {
  const app = getApps()[0] || initializeApp(config);
  auth = getAuth(app); db = getFirestore(app); storage = getStorage(app);
  onAuthStateChanged(auth, user => { currentUser = user; notify(); });
}

const requireUser = () => {
  if (!usable) throw new Error('Firebase 설정값이 비어 있습니다. config.js를 먼저 입력해주세요.');
  if (!currentUser) throw new Error('판매·채팅을 하려면 먼저 로그인해주세요.');
  return currentUser;
};
const listingPreview = source => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const max = 420, scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL('image/jpeg', .55));
  };
  image.onerror = () => reject(new Error('판매 사진을 처리하지 못했습니다.'));
  image.src = source;
});

window.rewearFirebase = {
  enabled: usable,
  user: () => currentUser,
  onUserChange(listener) { listeners.add(listener); listener(currentUser); return () => listeners.delete(listener); },
  async googleLogin() {
    if (!usable) throw new Error('Firebase 설정값이 비어 있습니다. config.js를 먼저 입력해주세요.');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return (await signInWithPopup(auth, provider)).user;
  },
  async naverLogin() {
    if (!config?.naverAuthEndpoint) throw new Error('네이버 로그인에는 Firebase Cloud Functions의 네이버 OAuth 주소가 필요합니다. config.js의 naverAuthEndpoint를 입력해주세요.');
    // 네이버 client secret은 웹에 두면 안 됩니다. Cloud Function에서 OAuth 교환 후 Firebase Custom Token을 발급해야 합니다.
    location.assign(config.naverAuthEndpoint);
  },
  async createListing(listing) {
    const user = requireUser();
    // Spark 요금제에서도 작동하도록 작은 썸네일은 Firestore에 직접 저장한다.
    // useStorage를 켜면 원본급 사진은 Storage URL로 대체한다.
    let photoUrl = await listingPreview(listing.photo);
    if (config.useStorage && config.storageBucket) {
      const imageRef = ref(storage, `listings/${user.uid}/${Date.now()}.jpg`);
      await uploadString(imageRef, listing.photo, 'data_url');
      photoUrl = await getDownloadURL(imageRef);
    }
    const doc = await addDoc(collection(db, 'listings'), { ...listing, photo: photoUrl, sellerId: user.uid, sellerName: user.displayName || 'RE:WEAR 사용자', createdAt: serverTimestamp() });
    return doc.id;
  },
  subscribeListings(callback) {
    if (!usable) return () => callback([]);
    return onSnapshot(query(collection(db, 'listings'), orderBy('createdAt', 'desc')), snapshot => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  },
  async sendMessage({ listingId, sellerId, text }) {
    const user = requireUser();
    if (!text.trim()) return;
    const memberIds = [user.uid, sellerId].sort();
    const roomId = `${listingId}_${memberIds.join('_')}`;
    await addDoc(collection(db, 'chats', roomId, 'messages'), { text: text.trim(), senderId: user.uid, senderName: user.displayName || '사용자', createdAt: serverTimestamp() });
    return roomId;
  },
  subscribeMessages(roomId, callback) {
    if (!usable) return () => callback([]);
    return onSnapshot(query(collection(db, 'chats', roomId, 'messages'), orderBy('createdAt', 'asc')), snapshot => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  }
};
window.dispatchEvent(new Event('rewearFirebaseReady'));

document.addEventListener('click', async event => {
  const google = event.target.closest('[data-login-google]');
  const naver = event.target.closest('[data-login-naver]');
  if (!google && !naver) return;
  const status = document.querySelector('[data-login-status]');
  try {
    if (status) status.textContent = '로그인 창을 여는 중…';
    await (google ? window.rewearFirebase.googleLogin() : window.rewearFirebase.naverLogin());
    if (status) status.textContent = '로그인되었습니다.';
  } catch (error) { if (status) status.textContent = error.message || '로그인에 실패했습니다.'; }
});
