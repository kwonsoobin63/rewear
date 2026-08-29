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
    analysis.innerHTML = `<article class="listing"><img src="${garment.photo}" class="thumb" alt="${garment.name}"><h3>${garment.name}</h3><p>새 옷 기준 사진</p><label class="primary upload-now">현재 옷 촬영하기<input id="currentPhoto" type="file" accept="image/*" capture="environment"></label><div id="score"></div></article>`;
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

function list(type) { return read(type); }
function render(category = '전체') {
  const box = document.querySelector('#marketList'); if (!box) return;
  const items = list('rewearMarket').filter(item => category === '전체' || item.category === category);
  box.innerHTML = items.length ? items.map(item => `<article class="listing"><img src="${item.photo}" class="thumb" alt="${item.name}"><h3>${item.name} ${item.mine ? '· 내 판매물품' : ''}</h3><p>${item.category} · ${item.price.toLocaleString()}원 · 손상·변형 ${item.score}%</p><p>${item.desc}</p><button class="primary">관심 누르기</button> <button class="outline">장바구니</button></article>`).join('') : empty;
}
render();
document.querySelectorAll('#categories button').forEach(button => button.onclick = () => { document.querySelectorAll('#categories button').forEach(x => x.classList.remove('active')); button.classList.add('active'); render(button.dataset.c); });
document.querySelector('#sell')?.addEventListener('click', () => {
  const garment = clothes().find(item => item.score < 60);
  if (!garment) return alert('손상·변형도 60% 미만으로 분석된 옷이 없습니다.');
  const price = +prompt(`${garment.name} 가격 (정가의 90% 이하: ${Math.floor(garment.retail * .9)}원)`, ''), desc = prompt('상품 설명', '');
  if (!price || price > garment.retail * .9) return alert('정가의 90%를 넘을 수 없습니다.');
  write('rewearMarket', [...list('rewearMarket'), { ...garment, price, desc, category: '상의', mine: true }]); location.reload();
});
const fabric = document.querySelector('#fabricList');
if (fabric) { const eligible = clothes().filter(item => item.score >= 60); fabric.innerHTML = eligible.length ? eligible.map(item => `<article class="listing"><h3>${item.name}</h3><p>손상·변형도 ${item.score}% · 원단 판매 가능</p></article>`).join('') : empty; }
document.querySelector('#fabricSell')?.addEventListener('click', () => { const garment = clothes().find(item => item.score >= 60); if (!garment) return alert('원단 판매 대상 의류가 없습니다.'); const price = +prompt(`원단 가격 (정가의 40% 이하: ${Math.floor(garment.retail * .4)}원)`, ''); if (!price || price > garment.retail * .4) return alert('정가의 40%를 넘을 수 없습니다.'); alert('원단 정보와 가격이 등록되었습니다.'); });
