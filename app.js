const $ = (s) => document.querySelector(s);
const modal = $('#modal');
const steps = [
  { title: '기준 사진', desc: '구매 직후의 옷 사진을 불러오거나 촬영하세요.', tip: '단색 배경 · 자연광 · 옷 전체가 보이게', guide: '옷을 평평한 곳에 놓고<br>프레임에 맞춰주세요' },
  { title: '현재 사진', desc: '같은 구도에서 현재의 옷을 촬영하세요.', tip: '처음 사진과 같은 배경·거리·조명을 권장해요', guide: '처음과 같은 위치에서<br>현재의 옷을 촬영해주세요' },
  { title: '분석 준비 완료', desc: '두 기록을 비교해 순환 경로를 계산합니다.', tip: '분석은 약 10초 정도 걸려요', guide: '촬영 기록을 바탕으로<br>변형도를 계산할게요' }
];
let step = 0, mode = 'two', currentPhoto = '';
function openModal(html){ $('#modalBody').innerHTML = html; modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
function closeModal(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
function updateStage(){ const d=steps[step]; $('#stepNumber').textContent = String(step+1).padStart(2,'0'); $('#progressBar').style.width = `${(step+1)*33.33}%`; $('#captureTitle').textContent=d.title; $('#captureDesc').textContent=d.desc; $('#captureTip').textContent=d.tip; $('#guideText').innerHTML=d.guide; $('#backBtn').disabled=step===0; $('#nextBtn').innerHTML=step===2?'상태 분석하기 <span>↗</span>':'다음 단계 <span>→</span>'; $('.capture-note .number').textContent=String(step+1).padStart(2,'0'); if(step===2) $('.upload').style.display='none'; else $('.upload').style.display='block'; }
function scanResult(){ openModal(`<p class="eyebrow"><span></span> ANALYSIS COMPLETE</p><h2>이 옷은 아직<br><em>충분히 다시 입을 수 있어요.</em></h2><div class="result-score">46<span style="font-size:20px">%</span></div><p>통합 변형·손상도 — 2D 외관 분석 18% + 3D 표면 변화 28%</p><div class="route"><b>추천 경로 · 중고 거래</b><p>기준선인 60% 이하입니다. 중고 거래 등록 시 <strong>+1,200 P</strong>를 드려요.</p></div><button class="primary" onclick="document.querySelector('#navPoints').textContent='3,680 P';document.querySelector('#modal').classList.remove('open')">중고 거래로 이동 <span>→</span></button>`); }
$('#nextBtn').onclick=()=>{ if(step===2) return scanResult(); step++; updateStage(); };
$('#backBtn').onclick=()=>{ if(step>0){step--;updateStage();} };
$('#startBtn').onclick=()=>$('#scan').scrollIntoView({behavior:'smooth'});
$('#photoInput').onchange=(e)=>{const f=e.target.files[0];if(!f)return;const url=URL.createObjectURL(f);const frame=$('.camera-frame');frame.style.backgroundImage=`linear-gradient(#14392955,#14392955),url(${url})`;frame.classList.add('photo-ready');currentPhoto=url;};
document.querySelectorAll('.mode').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.mode').forEach(x=>x.classList.remove('active'));btn.classList.add('active');mode=btn.dataset.mode; if(mode==='three'){ $('#guideText').innerHTML='앞면을 촬영한 뒤,<br>좌우 45° 촬영 가이드가 이어집니다'; $('#captureTip').textContent='무광 배경 · 옷을 고정 · 총 3개 각도'; }else updateStage();});
$('#scienceBtn').onclick=()=>openModal(`<p class="eyebrow"><span></span> RECOMMENDED METHOD</p><h2>의류 측정 권장안</h2><h3>무아레만으로 가능한가요?</h3><p>부분적으로 가능합니다. 위상식 프린지 투영은 표면의 높이·주름·늘어짐 같은 3D 형상 차이를 정량화하는 데 적합합니다. 단, 얼룩·보풀·색 바램은 깊이 변화가 작아 일반 이미지 분석을 결합해야 합니다.</p><h3>제품 권장 구성</h3><ul><li><b>빠른 판정:</b> 기준/현재 2D 사진을 정렬하고 색·텍스처·윤곽 차이를 계산합니다.</li><li><b>정밀 판정:</b> 휴대폰 화면 또는 소형 프로젝터로 4단계 위상 격자를 투영하고, 카메라로 촬영해 위상차 맵을 계산합니다.</li><li><b>3D 촬영:</b> 한 장의 일반 사진만으로는 신뢰도 높은 깊이를 얻기 어렵습니다. 앞면·좌 45°·우 45°를 안내해 다중 시점 3D 또는 카메라-프로젝터 삼각측량을 사용하세요.</li></ul><h3>구현 도구</h3><p>웹에서는 <b>getUserMedia</b>로 카메라를 열고, Canvas/WebGL로 정현파 격자를 표시합니다. 서버 또는 WebAssembly/OpenCV에서 위상 복원·언랩·기준 정합을 수행하는 구조를 권장합니다.</p>`);
$('#walletBtn').onclick=()=>openModal(`<p class="eyebrow"><span></span> CIRCULAR WALLET</p><h2>내 순환 포인트</h2><div class="result-score">2,480 P</div><p>중고 거래와 원단 순환으로 쌓은 포인트입니다.</p><div class="route"><b>연동 준비 중</b><p>네이버페이·동백전 등 지역 결제수단과의 전환은 제휴 및 전자금융 관련 검토 후 제공할 수 있습니다.</p></div>`);
$('#impactBtn').onclick=()=>openModal(`<p class="eyebrow"><span></span> YOUR CIRCULAR REPORT</p><h2>내 옷장, 더 오래<br><em>순환하고 있어요.</em></h2><div class="route"><b>올해의 기록</b><p>7벌을 재사용 경로로 연결했고, 2벌은 원단으로 순환했습니다. 다음 옷도 기록해 보세요.</p></div>`);
$('#closeModal').onclick=closeModal; modal.onclick=(e)=>{if(e.target===modal)closeModal()}; document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeModal()}); updateStage();

// 카메라는 사용자가 명시적으로 버튼을 누른 뒤에만 권한을 요청합니다.
let cameraStream;
const cameraModal = $('#cameraModal');
const cameraVideo = $('#cameraVideo');
function stopCamera(){ if(cameraStream) cameraStream.getTracks().forEach(track=>track.stop()); cameraStream=null; cameraVideo.srcObject=null; $('#takePhoto').disabled=true; }
function closeCamera(){ stopCamera(); cameraModal.classList.remove('open'); cameraModal.setAttribute('aria-hidden','true'); }
$('#requestCamera').onclick=()=>{ cameraModal.classList.add('open'); cameraModal.setAttribute('aria-hidden','false'); };
$('#enableCamera').onclick=async()=>{ const status=$('#cameraStatus'); if(!navigator.mediaDevices?.getUserMedia){ status.textContent='이 브라우저는 카메라 권한 API를 지원하지 않습니다. HTTPS로 배포한 최신 브라우저에서 시도해주세요.'; return; } try{ status.textContent='브라우저 권한 응답을 기다리고 있습니다…'; cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false}); cameraVideo.srcObject=cameraStream; await cameraVideo.play(); status.textContent='카메라가 켜졌습니다. 옷 전체가 가이드 안에 들어오게 한 뒤 촬영하세요.'; $('#takePhoto').disabled=false; }catch(error){ status.textContent=error.name==='NotAllowedError'?'카메라 권한이 허용되지 않았습니다. 브라우저 주소창의 카메라 설정에서 허용한 뒤 다시 시도해주세요.':`카메라를 시작할 수 없습니다: ${error.message}`; } };
function showAnalysisDemo(){const modal=$('#analysisModal');const items=[...document.querySelectorAll('.analysis-steps li')];const labels=['PHASE 0°','PHASE 90°','Δ PHASE MAP','CONDITION SCORE'];const status=['기준 이미지를 기록하고 있어요…','격자를 90° 이동해 표면 변화를 읽고 있어요…','두 이미지의 위상차를 비교하고 있어요…','2D 외관 정보와 결합해 상태를 계산했어요.'];modal.classList.add('open');modal.setAttribute('aria-hidden','false');items.forEach((item,index)=>{setTimeout(()=>{items.forEach(x=>x.classList.remove('active'));item.classList.add('active');$('#phaseLabel').textContent=labels[index];$('#analysisStatus').textContent=status[index];},index*900)});setTimeout(()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');},4100);}
$('#takePhoto').onclick=()=>{ const canvas=document.createElement('canvas'); canvas.width=cameraVideo.videoWidth; canvas.height=cameraVideo.videoHeight; canvas.getContext('2d').drawImage(cameraVideo,0,0); const image=canvas.toDataURL('image/jpeg',.9); const frame=$('.camera-frame'); frame.style.backgroundImage=`linear-gradient(#14392955,#14392955),url(${image})`; frame.classList.add('photo-ready'); currentPhoto=image; closeCamera(); showAnalysisDemo(); };
$('#closeCamera').onclick=closeCamera; cameraModal.onclick=(event)=>{if(event.target===cameraModal)closeCamera()};

// 로그인 UI: Google OAuth의 ID 토큰 검증·계정 저장은 배포 시 서버에서 수행해야 합니다.
const loginModal=$('#loginModal');
function closeLogin(){loginModal.classList.remove('open');loginModal.setAttribute('aria-hidden','true');}
function setLoggedIn(name){$('#loginBtn').textContent=`${name}님`;$('#loginBtn').classList.add('signed-in');}
function decodeJwtPayload(token){try{return JSON.parse(decodeURIComponent(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')).split('').map(c=>`%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join('')))}catch{return null}}
function handleGoogleCredential(response){const profile=decodeJwtPayload(response.credential);if(!profile){$('#loginStatus').textContent='Google 응답을 읽지 못했습니다. 다시 시도해주세요.';return;}sessionStorage.setItem('rewearDemoUser',JSON.stringify({name:profile.name,email:profile.email,provider:'google'}));setLoggedIn(profile.name||'사용자');$('#loginStatus').textContent=`${profile.name||profile.email} 계정이 연결되었습니다. 실제 배포에서는 서버가 ID 토큰을 검증합니다.`;setTimeout(closeLogin,900);}
function renderGoogleButton(){const clientId=window.REWEAR_CONFIG?.googleClientId?.trim();const container=$('#googleSignIn');if(!clientId){container.innerHTML='';$('#loginStatus').textContent='config.js에 Google OAuth 웹 클라이언트 ID를 넣으면 이 위치에 Google 공식 로그인 버튼이 표시됩니다.';return;}if(!window.google?.accounts?.id){$('#loginStatus').textContent='Google 로그인 모듈을 불러오는 중입니다. 잠시 후 다시 열어주세요.';return;}google.accounts.id.initialize({client_id:clientId,callback:handleGoogleCredential,ux_mode:'popup',auto_select:false});container.innerHTML='';google.accounts.id.renderButton(container,{theme:'outline',size:'large',text:'signin_with',shape:'rectangular',locale:'ko',width:330});$('#loginStatus').textContent='Google 계정을 선택해 로그인할 수 있습니다.';}
$('#loginBtn').onclick=()=>{loginModal.classList.add('open');loginModal.setAttribute('aria-hidden','false');renderGoogleButton();};
$('#closeLogin').onclick=closeLogin;loginModal.onclick=(event)=>{if(event.target===loginModal)closeLogin()};
$('#emailLoginForm').onsubmit=(event)=>{event.preventDefault();const email=$('#emailInput').value.trim();const name=email.split('@')[0]||'사용자';sessionStorage.setItem('rewearDemoUser',JSON.stringify({name,email,provider:'email-demo'}));setLoggedIn(name);$('#loginStatus').textContent='웹 시제품용 로컬 세션으로 계속합니다. 운영 서비스에서는 이메일 인증 또는 인증 서비스를 연결해야 합니다.';setTimeout(closeLogin,700);};
const savedUser=sessionStorage.getItem('rewearDemoUser');if(savedUser){try{setLoggedIn(JSON.parse(savedUser).name)}catch{sessionStorage.removeItem('rewearDemoUser')}}

// 모바일 앱형 하단 탭 동작
$('#tabScan').onclick=()=>$('#scan').scrollIntoView({behavior:'smooth'});
$('#tabWallet').onclick=()=>$('#walletBtn').click();
$('#tabProfile').onclick=()=>$('#loginBtn').click();
document.querySelectorAll('.tabbar a.tab').forEach(tab=>tab.onclick=()=>{document.querySelectorAll('.tabbar .tab').forEach(item=>item.classList.remove('active'));tab.classList.add('active');});
