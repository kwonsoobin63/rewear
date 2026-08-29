// Google Cloud Console에서 발급한 웹 OAuth 클라이언트 ID를 아래에 넣으세요.
// 예: 1234567890-abcdefghijklm.apps.googleusercontent.com
window.REWEAR_CONFIG = {
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: "",
    storageBucket: "",
    // Firebase Cloud Functions로 배포한 네이버 OAuth 콜백 주소를 입력합니다.
    // 예: https://asia-northeast3-내프로젝트.cloudfunctions.net/naverLogin
    naverAuthEndpoint: ""
  }
};
