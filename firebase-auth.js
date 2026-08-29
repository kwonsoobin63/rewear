import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';

const config = window.REWEAR_CONFIG?.firebase;
window.firebaseGoogleLogin = async () => {
  if (!config?.apiKey || !config?.authDomain) throw new Error('Firebase 설정값이 아직 입력되지 않았습니다. config.js를 확인해주세요.');
  const app = initializeApp(config);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(getAuth(app), provider);
  return result.user;
};
