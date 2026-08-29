/* RE:WEAR의 개인 기록은 이 기기 브라우저에 저장됩니다. */
const read = key => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch (_) { return []; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const clothes = () => read('rewearClothes');
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
    analysis.innerHTML = `<article class="listing"><h3>${garment.name}</h3><p>아래 점선 윤곽에 옷의 위치·크기를 맞춘 뒤 현재 사진을 촬영하세요.</p><div class="alignment-guide"><img id="outlineGuide" alt="새 옷 사진에서 추출한 점선 윤곽"><span>BASELINE OUTLINE</span></div><label class="primary upload-now">현재 옷 촬영하기<input id="currentPhoto" type="file" accept="image/*" capture="environment"></label><div id="score"></div></article>`;
    makeOutline(garment.photo).then(outline => { const guide = document.querySelector('#outlineGuide'); if (guide) guide.src = outline; }).catch(() => {});
    document.querySelector('#currentPhoto').onchange = async event => {
      try {
        const now = await file64(event.target.files[0]);
        const base = new Image(), current = new Image();
        await Promise.all([new Promise((ok, no) => { base.onload = ok; base.onerror = no; base.src = garment.photo; }), new Promise((ok, no) => { current.onload = ok; current.onerror = no; current.src = now; })]);
        const score = estimateCondition(base, current), box = document.querySelector('#score');
        pendingAnalysis = { id: garment.id, score };
        box.innerHTML = `<img src="${now}" class="thumb" alt="현재 옷 사진"><h2>손상·변형도 ${score}%</h2><p>같은 구도·조명에서 촬영할수록 비교 신뢰도가 높아집니다.</p><button class="primary save-score" type="button">분석 결과 저장하기 <span>→</span></button><p id="saveNotice" class="notice"></p>`;
        box.querySelector('.save-score').addEventListener('click', window.saveCurrentAnalysis);
      } catch (_) { alert('현재 옷 사진을 분석하지 못했습니다. 다른 사진으로 다시 시도해주세요.'); }
    };
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
  box.innerHTML = items.length ? items.map(item => `<article class="listing"><img src="${item.photo}" class="thumb" alt="${item.name}"><h3>${item.name} ${item.sellerId === user?.uid ? '· 내 판매물품' : ''}</h3><p>${item.category || '기타'} · ${(item.price || 0).toLocaleString()}원 · 손상·변형 ${item.score ?? '-'}%</p><p>${item.desc || ''}</p>${item.sellerId === user?.uid ? '<p class="notice">내가 등록한 상품입니다.</p>' : `<button class="primary chat-start" data-id="${item.id}" data-seller="${item.sellerId}" data-name="${item.sellerName || '판매자'}">판매자와 채팅하기</button>`}</article>`).join('') : empty;
  document.querySelectorAll('.chat-start').forEach(button => button.addEventListener('click', () => openChat(button.dataset)));
}
function renderFabricMarket() {
  const box = document.querySelector('#fabricMarket'); if (!box) return;
  const user = window.rewearFirebase?.user?.();
  box.innerHTML = fabricItems.length ? fabricItems.map(item => `<article class="listing"><img src="${item.photo}" class="thumb" alt="${item.name}"><h3>${item.name} ${item.sellerId === user?.uid ? '· 내 판매물품' : ''}</h3><p>${(item.price || 0).toLocaleString()}원 · 손상·변형 ${item.score ?? '-'}%</p><p>${item.desc || '원단 판매 상품'}</p>${item.sellerId === user?.uid ? '<p class="notice">내가 등록한 원단입니다.</p>' : `<button class="primary chat-start" data-id="${item.id}" data-seller="${item.sellerId}" data-name="${item.sellerName || '판매자'}">판매자와 채팅하기</button>`}</article>`).join('') : empty;
  document.querySelectorAll('.chat-start').forEach(button => button.addEventListener('click', () => openChat(button.dataset)));
}
function openChat(data) {
  const firebase = window.rewearFirebase;
  if (!firebase?.enabled) return alert('실시간 채팅은 Firebase 설정 후 사용할 수 있습니다.');
  const user = firebase.user();
  if (!user) return alert('판매자와 채팅하려면 홈에서 먼저 로그인해주세요.');
  const memberIds = [user.uid, data.seller].sort(), roomId = `${data.id}_${memberIds.join('_')}`;
  document.querySelector('#chatModal')?.remove();
  const modal = document.createElement('section');
  modal.id = 'chatModal'; modal.className = 'chat-modal';
  modal.innerHTML = `<div class="chat-card"><button class="chat-close" type="button">×</button><p class="eyebrow"><span></span> CHAT</p><h2>${data.name}님과 대화</h2><div class="messages"></div><form class="chat-form"><input required maxlength="500" placeholder="메시지를 입력하세요"><button class="primary">보내기</button></form></div>`;
  document.body.append(modal);
  modal.querySelector('.chat-close').onclick = () => { unsubscribe?.(); modal.remove(); };
  let unsubscribe = firebase.subscribeMessages(roomId, messages => { const box = modal.querySelector('.messages'); box.innerHTML = messages.map(message => `<p class="${message.senderId === user.uid ? 'mine' : ''}">${message.text}</p>`).join(''); box.scrollTop = box.scrollHeight; });
  modal.querySelector('.chat-form').onsubmit = async event => { event.preventDefault(); const input = event.currentTarget.querySelector('input'); try { await firebase.sendMessage({ listingId: data.id, sellerId: data.seller, text: input.value }); input.value = ''; } catch (error) { alert(error.message); } };
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
