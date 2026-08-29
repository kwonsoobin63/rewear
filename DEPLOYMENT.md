# GitHub Pages 배포

이 폴더의 파일을 GitHub 저장소의 루트(또는 `docs/`)에 올린 뒤 GitHub Pages를 켜면 됩니다.

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더의 `index.html`, `style.css`, `app.js`, `.nojekyll`을 저장소에 커밋·푸시합니다.
3. 저장소의 **Settings → Pages**에서 배포 원본을 해당 브랜치의 `/(root)`(또는 `docs`)로 선택하고 저장합니다.
4. 표시된 `https://계정명.github.io/저장소명/` 주소로 접속합니다.

Google 로그인을 사용하려면 배포 주소를 Google Cloud Console의 Authorized JavaScript origins에 등록하고 `config.js`에 웹 OAuth 클라이언트 ID를 넣어 다시 배포합니다. 자세한 절차는 `INTEGRATION.md`를 참고하세요.

## 앱처럼 설치하기

이 프로젝트는 PWA 구성(`manifest.webmanifest`, `service-worker.js`)을 포함합니다. GitHub Pages 배포가 끝난 뒤 휴대폰에서 배포 주소를 열고 브라우저 메뉴의 **홈 화면에 추가**를 선택하면, 앱 아이콘으로 실행할 수 있습니다. 배포 방식은 여전히 웹이며 App Store·Play Store 등록은 필요하지 않습니다.

## 카메라 권한

카메라 API는 HTTPS 또는 localhost에서만 사용할 수 있습니다. GitHub Pages는 HTTPS를 제공하므로 배포 주소에서 “카메라 사용하기 → 권한 요청 및 시작”을 누르면 브라우저가 사용자에게 허용 여부를 묻습니다. `file://`로 직접 열 때는 브라우저에 따라 카메라가 차단될 수 있습니다.

촬영 이미지는 현재 브라우저 메모리에서 미리보기로만 사용합니다. 실제 서비스에서 서버 저장·AI 분석을 추가한다면, 촬영 전 개인정보 처리 및 보관 기간 동의 절차를 별도로 제공해야 합니다.
