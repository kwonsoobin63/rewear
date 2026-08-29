// Google Cloud Console에서 발급한 웹 OAuth 클라이언트 ID를 아래에 넣으세요.
// 예: 1234567890-abcdefghijklm.apps.googleusercontent.com
window.REWEAR_CONFIG = {
  firebase: {
    apiKey: "AIzaSyBzQgrY4VYytf5y5Kvb8Mfj_dNvxUPz9xE",
    authDomain: "rewear-78f74.firebaseapp.com",
    projectId: "rewear-78f74",
    appId: "1:798554532398:web:8027dd10a75c1cab48cdbf",
    storageBucket: "rewear-78f74.firebasestorage.app",
    // Spark 요금제에서는 Storage를 만들 수 없어 기본값은 false입니다.
    // Blaze 요금제로 업그레이드해 Storage를 만든 뒤 true로 바꾸세요.
    useStorage: false,
    // Firebase Cloud Functions로 배포한 네이버 OAuth 콜백 주소를 입력합니다.
    // 예: https://asia-northeast3-내프로젝트.cloudfunctions.net/naverLogin
    naverAuthEndpoint: ""
  }
};
