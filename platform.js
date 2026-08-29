/* RE:WEAR의 개인 기록은 이 기기 브라우저에 저장됩니다. */
const read = key => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch (_) { return []; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const tabbar = document.querySelector('.tabbar');
if (tabbar && !tabbar.querySelector('[href="profile.html"]')) {
  const myTab = document.createElement('a');
  myTab.className = 'tab'; myTab.href = 'profile.html'; myTab.innerHTML = '<b>◯</b><span>MY</span>';
  tabbar.append(myTab);
}
const clothes = () => read('rewearClothes');
const favorites = () => read('rewearFavorites');
// 관심을 누른 즉시 상품 요약도 함께 보관한다. Firestore 목록을 불러오는 중이어도
// MY 화면에서 관심 상품이 비어 보이지 않게 하기 위한 작은 로컬 캐시다.
const favoriteItems = () => read('rewearFavoriteItems');
const sameId = (one, other) => String(one) === String(other);
const toggleFavorite = item => {
  const ids = favorites();
  if (ids.some(id => sameId(id, item.id))) {
    write('rewearFavorites', ids.filter(id => !sameId(id, item.id)));
    write('rewearFavoriteItems', favoriteItems().filter(saved => !sameId(saved.id, item.id)));
  } else {
    write('rewearFavorites', [...ids, item.id]);
    write('rewearFavoriteItems', [...favoriteItems().filter(saved => !sameId(saved.id, item.id)), item]);
  }
};
const empty = '<div class="empty"><h2>아직 등록된 옷이 없어요.</h2><p>새 옷을 촬영해 옷 앨범에 보관해보세요.</p></div>';

const file64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('사진 파일을 읽지 못했습니다.'));
  reader.readAsDataURL(file);
});

// 휴대폰 원본은 수 MB라 localStorage에 바로 저장할 수 없다. 앨범용으로 줄인다.
const compactPhoto = file => new Promise((resolve, reject) => {
  if (!file) return reject(new Error('사진을 선택해주세요.'));
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, 900 / longest);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL('image/jpeg', 0.72));
  };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지 형식을 읽지 못했습니다. JPG 또는 PNG 사진을 사용해주세요.')); };
  image.src = url;
});

const form = document.querySelector('#newGarment');
if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const photoInput = document.querySelector('#newPhoto');
    const nameInput = document.querySelector('#name');
    const brandInput = document.querySelector('#brand');
    const dateInput = document.querySelector('#date');
    const retailInput = document.querySelector('#retail');
    const submit = form.querySelector('button[type="submit"], button:not([type])');
    if (!photoInput.files[0]) return alert('새 옷 사진을 먼저 촬영하거나 선택해주세요.');
    if (!form.reportValidity()) return;
    submit.disabled = true;
    submit.textContent = '사진을 앨범에 저장하는 중…';
    try {
      const photo = await compactPhoto(photoInput.files[0]);
      const data = { id: Date.now(), photo, name: nameInput.value.trim(), brand: brandInput.value.trim(), date: dateInput.value, retail: +retailInput.value };
      write('rewearClothes', [...clothes(), data]);
      form.reset();
      location.assign('wardrobe.html?saved=1');
    } catch (error) {
      submit.disabled = false;
      submit.innerHTML = '옷 앨범에 저장 <span>→</span>';
      alert(`앨범 저장에 실패했습니다. ${error.message || '사진 크기를 줄여 다시 시도해주세요.'}`);
    }
  });
}

const album = document.querySelector('#wardrobe');
if (album) {
  const list = clothes();
  album.innerHTML = list.length ? list.map(c => `<article class="listing"><img src="${c.photo}" class="thumb" alt="${c.name}"><h3>${c.name}</h3><p>${c.brand} · ${c.date} · 정가 ${c.retail.toLocaleString()}원</p>${c.score == null ? '<p>아직 현재 상태 분석 전</p>' : `<p>손상·변형도 ${c.score}%</p>`}<button class="primary current" data-id="${c.id}">현재 옷 촬영하기 <span>→</span></button></article>`).join('') : empty;
  document.querySelectorAll('.current').forEach(button => button.onclick = () => location.href = `current.html?id=${button.dataset.id}`);
  if (new URLSearchParams(location.search).get('saved')) {
    const note = document.createElement('p');
    note.className = 'notice'; note.textContent = '새 옷 사진을 옷 앨범에 저장했어요.';
    album.before(note);
  }
}

let pendingAnalysis = null;
const makeOutline = source => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const size = 420, scale = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height), out = context.createImageData(canvas.width, canvas.height);
    for (let y = 1; y < canvas.height - 1; y++) for (let x = 1; x < canvas.width - 1; x++) {
      const i = (y * canvas.width + x) * 4, left = i - 4, right = i + 4, up = i - canvas.width * 4, down = i + canvas.width * 4;
      const edge = Math.abs(pixels.data[right] - pixels.data[left]) + Math.abs(pixels.data[down] - pixels.data[up]);
      if (edge > 110 && (x + y) % 10 < 5) { out.data[i] = 51; out.data[i + 1] = 125; out.data[i + 2] = 78; out.data[i + 3] = 230; }
    }
    context.putImageData(out, 0, 0); resolve(canvas.toDataURL('image/png'));
  };
  image.onerror = reject; image.src = source;
});
const estimateCondition = (baseline, current) => {
  // 동일한 크기의 회색조 미리보기 간 평균 밝기 차이. 진짜 위상 무아레 측정값이 아니라 시제품 비교 지표다.
  const size = 48, canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = canvas.height = size;
  const sample = image => { ctx.clearRect(0, 0, size, size); ctx.drawImage(image, 0, 0, size, size); return ctx.getImageData(0, 0, size, size).data; };
  const base = sample(baseline), now = sample(current);
  let delta = 0;
  for (let i = 0; i < base.length; i += 4) delta += Math.abs((base[i] + base[i + 1] + base[i + 2]) - (now[i] + now[i + 1] + now[i + 2])) / 3;
  return Math.min(99, Math.max(1, Math.round(delta / (size * size) * 1.25)));
};

const analysis = document.querySelector('#analysis');
if (analysis) {
  const garment = clothes().find(item => String(item.id) === new URLSearchParams(location.search).get('id'));
  if (!garment) analysis.innerHTML = empty;
  else {
    analysis.innerHTML = `<article class="listing"><h3>${garment.name}</h3><p>카메라 화면의 점선 윤곽에 새 옷 사진 속 옷의 위치와 크기를 맞춘 뒤 촬영하세요.</p><div class="live-camera"><video id="currentCamera" autoplay playsinline muted></video><img id="outlineGuide" alt="새 옷 사진에서 추출한 점선 윤곽"><span>BASELINE OUTLINE · 옷 윤곽을 맞춰주세요</span></div><div class="camera-row"><button id="openCurrentCamera" class="primary" type="button">카메라 열기 <span>⌁</span></button><button id="takeCurrentPhoto" class="outline-button" type="button" disabled>사진 촬영하기</button></div><label class="upload-now">사진 앨범에서 선택<input id="currentPhoto" type="file" accept="image/*" capture="environment"></label><div id="score"></div></article>`;
    makeOutline(garment.photo).then(outline => { const guide = document.querySelector('#outlineGuide'); if (guide) guide.src = outline; }).catch(() => {});
    let stream = null;
    const stopCamera = () => { stream?.getTracks().forEach(track => track.stop()); stream = null; const video = document.querySelector('#currentCamera'); if (video) video.srcObject = null; };
    const analysePhoto = async now => {
      try {
        const base = new Image(), current = new Image();
        await Promise.all([new Promise((ok, no) => { base.onload = ok; base.onerror = no; base.src = garment.photo; }), new Promise((ok, no) => { current.onload = ok; current.onerror = no; current.src = now; })]);
        const score = estimateCondition(base, current), box = document.querySelector('#score');
        pendingAnalysis = { id: garment.id, score };
        box.innerHTML = `<img src="${now}" class="thumb" alt="현재 옷 사진"><h2>손상·변형도 ${score}%</h2><p>같은 구도·조명에서 촬영할수록 비교 신뢰도가 높아집니다.</p><button class="primary save-score" type="button">분석 결과 저장하기 <span>→</span></button><p id="saveNotice" class="notice"></p>`;
        box.querySelector('.save-score').addEventListener('click', window.saveCurrentAnalysis);
      } catch (_) { alert('현재 옷 사진을 분석하지 못했습니다. 다른 사진으로 다시 시도해주세요.'); }
    };
    document.querySelector('#openCurrentCamera').onclick = async () => {
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }); const video = document.querySelector('#currentCamera'); video.srcObject = stream; await video.play(); document.querySelector('#takeCurrentPhoto').disabled = false; }
      catch (_) { alert('카메라 권한을 허용해야 촬영할 수 있어요. 주소창 설정에서 카메라를 허용한 뒤 다시 눌러주세요.'); }
    };
    document.querySelector('#takeCurrentPhoto').onclick = () => { const video = document.querySelector('#currentCamera'), canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext('2d').drawImage(video, 0, 0); stopCamera(); analysePhoto(canvas.toDataURL('image/jpeg', .8)); };
    document.querySelector('#currentPhoto').onchange = async event => { if (event.target.files[0]) analysePhoto(await file64(event.target.files[0])); };
    window.addEventListener('pagehide', stopCamera, { once: true });
  }
}

window.saveCurrentAnalysis = () => {
  if (!pendingAnalysis) return alert('분석 결과를 먼저 생성해주세요.');
  const button = document.querySelector('.save-score'), notice = document.querySelector('#saveNotice');
  if (button) button.disabled = true;
  if (notice) notice.textContent = '분석 결과를 옷 앨범에 저장하고 있어요…';
  const all = clothes(), item = all.find(entry => String(entry.id) === String(pendingAnalysis.id));
  if (!item) return alert('옷 앨범에서 해당 옷을 찾지 못했습니다. 다시 선택해주세요.');
  item.score = pendingAnalysis.score;
  item.analyzedAt = new Date().toLocaleDateString('ko-KR');
  try { write('rewearClothes', all); }
  catch (_) { if (button) button.disabled = false; return alert('옷 앨범 저장 공간이 부족합니다. 기존 기록을 정리한 뒤 다시 시도해주세요.'); }
  const target = pendingAnalysis.score < 60 ? 'market.html' : 'fabric.html';
  pendingAnalysis = null;
  setTimeout(() => location.assign(target), 250);
};

let marketItems = [], fabricItems = [];
function list(type) { return read(type); }
function render(category = '전체') {
  const box = document.querySelector('#marketList'); if (!box) return;
  const user = window.rewearFirebase?.user?.();
  const items = marketItems.filter(item => category === '전체' || item.category === category);
  box.innerHTML = items.length ? items.map(item => `<article class="listing"><button class="heart-button like-toggle" aria-label="관심 상품" data-id="${item.id}">${favorites().some(id => sameId(id, item.id)) ? '♥' : '♡'}</button><img src="${item.photo}" class="thumb" alt="${item.name}"><h3>${item.name} ${item.sellerId === user?.uid ? '· 내 판매물품' : ''}</h3><p>${item.category || '기타'} · ${(item.price || 0).toLocaleString()}원 · 손상·변형 ${item.score ?? '-'}%</p><p>${item.desc || ''}</p>${item.sellerId === user?.uid ? '<p class="notice">내가 등록한 상품입니다.</p>' : `<button class="primary chat-start" data-id="${item.id}" data-seller="${item.sellerId}" data-name="${item.sellerName || '판매자'}">판매자와 채팅하기</button>`}</article>`).join('') : empty;
  document.querySelectorAll('.chat-start').forEach(button => button.addEventListener('click', () => openChat(button.dataset)));
  document.querySelectorAll('.like-toggle').forEach(button => button.onclick = () => { const item = marketItems.find(entry => sameId(entry.id, button.dataset.id)); if (item) toggleFavorite(item); render(category); });
}
function renderFabricMarket() {
  const box = document.querySelector('#fabricMarket'); if (!box) return;
  const user = window.rewearFirebase?.user?.();
  box.innerHTML = fabricItems.length ? fabricItems.map(item => `<article class="listing"><button class="heart-button fabric-like" aria-label="관심 상품" data-id="${item.id}">${favorites().some(id => sameId(id, item.id)) ? '♥' : '♡'}</button><img src="${item.photo}" class="thumb" alt="${item.name}"><h3>${item.name} ${item.sellerId === user?.uid ? '· 내 판매물품' : ''}</h3><p>${(item.price || 0).toLocaleString()}원 · 손상·변형 ${item.score ?? '-'}%</p><p>${item.desc || '원단 판매 상품'}</p>${item.sellerId === user?.uid ? '<p class="notice">내가 등록한 원단입니다.</p>' : `<button class="primary chat-start" data-id="${item.id}" data-seller="${item.sellerId}" data-name="${item.sellerName || '판매자'}">판매자와 채팅하기</button>`}</article>`).join('') : empty;
  document.querySelectorAll('.chat-start').forEach(button => button.addEventListener('click', () => openChat(button.dataset)));
  document.querySelectorAll('.fabric-like').forEach(button => button.onclick = () => { const item = fabricItems.find(entry => sameId(entry.id, button.dataset.id)); if (item) toggleFavorite(item); renderFabricMarket(); });
}
function openChat(data) {
  const firebase = window.rewearFirebase;
  if (!firebase?.enabled) return alert('실시간 채팅은 Firebase 설정 후 사용할 수 있습니다.');
  const user = firebase.user();
  if (!user) return alert('판매자와 채팅하려면 홈에서 먼저 로그인해주세요.');
  const memberIds = [user.uid, data.seller].sort(), roomId = `${data.id}_${memberIds.join('_')}`;
  // 대화창을 여는 순간에도 부모 대화방 문서를 보장한다. 이전 버전에서 메시지만
  // 남은 방도 이때 복구되어 판매자·구매자 양쪽 MY 목록에 나타난다.
  if (firebase.ensureChatRoom) {
    firebase.ensureChatRoom({ listingId: data.id, sellerId: data.seller, sellerName: data.name }).catch(error => {
      console.error('채팅방 생성 실패:', error);
      alert('대화방을 만들지 못했습니다. Firestore 규칙과 로그인 상태를 확인해주세요.');
    });
  }
  document.querySelector('#chatModal')?.remove();
  const modal = document.createElement('section');
  modal.id = 'chatModal'; modal.className = 'chat-modal';
  modal.innerHTML = `<div class="chat-card"><button class="chat-close" type="button">×</button><p class="eyebrow"><span></span> CHAT</p><h2>${data.name}님과 대화</h2><div class="messages"></div><form class="chat-form"><input required maxlength="500" placeholder="메시지를 입력하세요"><button class="primary">보내기</button></form></div>`;
  document.body.append(modal);
  modal.querySelector('.chat-close').onclick = () => { unsubscribe?.(); modal.remove(); };
  let unsubscribe = firebase.subscribeMessages(roomId, messages => { const box = modal.querySelector('.messages'); box.innerHTML = messages.map(message => `<p class="${message.senderId === user.uid ? 'mine' : ''}">${message.text}</p>`).join(''); box.scrollTop = box.scrollHeight; });
  modal.querySelector('.chat-form').onsubmit = async event => { event.preventDefault(); const input = event.currentTarget.querySelector('input'); try { await firebase.sendMessage({ listingId: data.id, sellerId: data.seller, sellerName: data.name, text: input.value }); input.value = ''; } catch (error) { alert(error.message); } };
}
function attachMarketFirebase() {
  const firebase = window.rewearFirebase;
  if (!firebase?.enabled) { marketItems = list('rewearMarket'); render(); renderFabricMarket(); return; }
  firebase.subscribeListings(items => { marketItems = items.filter(item => item.kind !== 'fabric'); fabricItems = items.filter(item => item.kind === 'fabric'); render(); renderFabricMarket(); });
  firebase.onUserChange(() => { render(); renderFabricMarket(); });
}
window.addEventListener('rewearFirebaseReady', attachMarketFirebase, { once: true });
if (window.rewearFirebase) attachMarketFirebase();
document.querySelectorAll('#categories button').forEach(button => button.onclick = () => { document.querySelectorAll('#categories button').forEach(x => x.classList.remove('active')); button.classList.add('active'); render(button.dataset.c); });
document.querySelector('#sell')?.addEventListener('click', async () => {
  const garment = clothes().find(item => item.score < 60);
  if (!garment) return alert('손상·변형도 60% 미만으로 분석된 옷이 없습니다.');
  const price = +prompt(`${garment.name} 가격 (정가의 90% 이하: ${Math.floor(garment.retail * .9)}원)`, ''), desc = prompt('상품 설명', '');
  if (!price || price > garment.retail * .9) return alert('정가의 90%를 넘을 수 없습니다.');
  try { await window.rewearFirebase?.createListing({ ...garment, price, desc, category: '상의' }); alert('중고 거래에 등록했습니다.'); }
  catch (error) { alert(error.message || '상품 등록에 실패했습니다.'); }
});
const fabric = document.querySelector('#fabricList');
if (fabric) { const eligible = clothes().filter(item => item.score >= 60); fabric.innerHTML = eligible.length ? eligible.map(item => `<article class="listing"><h3>${item.name}</h3><p>손상·변형도 ${item.score}% · 원단 판매 가능</p></article>`).join('') : empty; }
document.querySelector('#fabricSell')?.addEventListener('click', async () => { const garment = clothes().find(item => item.score >= 60); if (!garment) return alert('원단 판매 대상 의류가 없습니다.'); const price = +prompt(`원단 가격 (정가의 40% 이하: ${Math.floor(garment.retail * .4)}원)`, ''), desc = prompt('원단 정보 또는 상태 설명', ''); if (!price || price > garment.retail * .4) return alert('원단 가격은 정가의 40%를 넘을 수 없습니다.'); try { await window.rewearFirebase?.createListing({ ...garment, price, desc, category: '원단', kind: 'fabric' }); alert('원단 판매에 등록했습니다.'); } catch (error) { alert(error.message || '원단 등록에 실패했습니다.'); } });

const myPage = document.querySelector('#myPage');
if (myPage) {
  let allListings = [], stopChats = null;
  const renderMy = () => {
    const user = window.rewearFirebase?.user?.();
    const mine = clothes();
    document.querySelector('#myWardrobe').innerHTML = mine.length ? mine.map(item => `<article class="listing mini"><img src="${item.photo}" alt="${item.name}"><div><b>${item.name}</b><p>${item.score == null ? '분석 전' : `손상·변형 ${item.score}%`}</p></div></article>`).join('') : '<p class="notice">저장한 옷이 없습니다.</p>';
    // 목록 실시간 수신 전에는 저장해 둔 요약을, 수신 뒤에는 최신 Firestore 상품을 쓴다.
    const liked = [...favoriteItems(), ...allListings]
      .filter((item, index, array) => favorites().some(id => sameId(id, item.id)) && array.findIndex(entry => sameId(entry.id, item.id)) === index);
    document.querySelector('#myLikes').innerHTML = liked.length ? liked.map(item => `<article class="listing mini"><img src="${item.photo}" alt="${item.name}"><div><b>${item.name}</b><p>${(item.price || 0).toLocaleString()}원</p></div></article>`).join('') : '<p class="notice">관심 상품이 없습니다.</p>';
    if (!user) document.querySelector('#myChats').innerHTML = '<p class="notice">채팅을 보려면 홈에서 로그인해주세요.</p>';
  };
  const connectChats = () => {
    stopChats?.();
    const firebase = window.rewearFirebase, user = firebase?.user?.();
    if (!user) return renderMy();
    stopChats = firebase.subscribeConversations(conversations => {
      document.querySelector('#myChats').innerHTML = conversations.length ? conversations.map(chat => { const other = chat.participants?.find(id => id !== user.uid) || ''; const name = chat.participantNames?.[other] || '거래 상대'; return `<button class="listing chat-list" data-id="${chat.listingId}" data-seller="${other}" data-name="${name}"><b>${name}님과의 대화</b><p>${chat.lastMessage || '새 대화를 시작하세요.'}</p></button>`; }).join('') : '<p class="notice">진행 중인 채팅이 없습니다.</p>';
      document.querySelectorAll('.chat-list').forEach(button => button.onclick = () => openChat(button.dataset));
    }, () => { document.querySelector('#myChats').innerHTML = '<p class="notice">채팅 목록을 불러오지 못했습니다. 로그인 상태를 확인한 뒤 새로고침해주세요.</p>'; });
  };
  const connectMyFirebase = () => {
    const firebase = window.rewearFirebase;
    if (!firebase?.enabled) return;
    firebase.subscribeListings(items => { allListings = items; renderMy(); });
    firebase.onUserChange(() => { renderMy(); connectChats(); });
  };
  connectMyFirebase();
  window.addEventListener('rewearFirebaseReady', connectMyFirebase, { once: true });
  renderMy();
}
