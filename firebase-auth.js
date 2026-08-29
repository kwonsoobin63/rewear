import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where, doc, writeBatch } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { getStorage, ref, uploadString, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js';

const config = window.REWEAR_CONFIG?.firebase;
const usable = Boolean(config?.apiKey && config?.authDomain && config?.projectId && config?.appId);
let auth, db, storage, currentUser = null;
const listeners = new Set();
const notify = () => listeners.forEach(listener => listener(currentUser));

if (usable) {
  const app = getApps()[0] || initializeApp(config);
  auth = getAuth(app); db = getFirestore(app); storage = getStorage(app);
  setPersistence(auth, browserLocalPersistence).catch(() => {});
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
  async emailLogin(email, password) {
    if (!usable) throw new Error('Firebase 설정값이 비어 있습니다. config.js를 먼저 입력해주세요.');
    return (await signInWithEmailAndPassword(auth, email, password)).user;
  },
  async emailSignup(email, password) {
    if (!usable) throw new Error('Firebase 설정값이 비어 있습니다. config.js를 먼저 입력해주세요.');
    return (await createUserWithEmailAndPassword(auth, email, password)).user;
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
    const batch = writeBatch(db);
    const members = [user.uid, sellerId].sort();
    const conversation = doc(db, 'conversations', roomId);
    batch.set(conversation, { listingId, sellerId, participants: members, participantNames: { [user.uid]: user.displayName || '사용자', [sellerId]: sellerId === user.uid ? (user.displayName || '사용자') : '판매자' }, updatedAt: serverTimestamp(), lastMessage: text.trim() }, { merge: true });
    batch.set(doc(collection(db, 'chats', roomId, 'messages')), { text: text.trim(), senderId: user.uid, senderName: user.displayName || '사용자', createdAt: serverTimestamp() });
    await batch.commit();
    return roomId;
  },
  subscribeMessages(roomId, callback) {
    if (!usable) return () => callback([]);
    return onSnapshot(query(collection(db, 'chats', roomId, 'messages'), orderBy('createdAt', 'asc')), snapshot => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  },
  subscribeConversations(callback) {
    if (!usable || !currentUser) return () => callback([]);
    return onSnapshot(query(collection(db, 'conversations'), where('participants', 'array-contains', currentUser.uid)), snapshot => callback(snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() })).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))));
  }
};
window.dispatchEvent(new Event('rewearFirebaseReady'));

document.addEventListener('click', async event => {
  const google = event.target.closest('[data-login-google]');
  const emailOpen = event.target.closest('[data-email-open]');
  if (!google && !emailOpen) return;
  const status = document.querySelector('[data-login-status]');
  const form = document.querySelector('[data-email-form]');
  if (emailOpen) {
    const signup = emailOpen.dataset.emailOpen === 'signup';
    form?.classList.remove('hidden');
    if (form) form.dataset.mode = signup ? 'signup' : 'login';
    const title = form?.querySelector('[data-email-form-title]');
    const submit = form?.querySelector('[data-email-submit]');
    if (title) title.textContent = signup ? '이메일 회원가입' : '이메일 로그인';
    if (submit) submit.textContent = signup ? '회원가입' : '이메일 로그인';
    return;
  }
  try {
    if (status) status.textContent = '로그인 창을 여는 중…';
    await window.rewearFirebase.googleLogin();
    if (status) status.textContent = '로그인되었습니다.';
  } catch (error) { if (status) status.textContent = error.message || '로그인에 실패했습니다.'; }
});

document.addEventListener('submit', async event => {
  const form = event.target.closest('[data-email-form]');
  if (!form) return;
  event.preventDefault();
  const status = document.querySelector('[data-login-status]');
  const email = form.querySelector('[name=email]').value.trim();
  const password = form.querySelector('[name=password]').value;
  const signup = form.dataset.mode === 'signup';
  try {
    if (status) status.textContent = signup ? '회원가입 중…' : '로그인 중…';
    await (signup ? window.rewearFirebase.emailSignup(email, password) : window.rewearFirebase.emailLogin(email, password));
    if (status) status.textContent = signup ? '회원가입 및 로그인 완료!' : '로그인되었습니다.';
  } catch (error) {
    if (status) status.textContent = error.message || '이메일 로그인에 실패했습니다.';
  }
});
