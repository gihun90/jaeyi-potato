import { WEEKS } from './curriculum.js';
import { dayKey, lessonFor, crossStone, minutesLeft, rush, timeFill, summarizeWeather, SAY, ROUTINE } from './logic.js';

const KEY = 'morning-bridge-v1';
// 날씨 지역(시청 근처 좌표). 동네 단위 정밀도는 필요 없어서 큰 도시만.
const CITIES = {
  서울: [37.57, 126.98], 인천: [37.46, 126.71], 수원: [37.26, 127.03], 성남: [37.42, 127.13], 용인: [37.24, 127.18],
  고양: [37.66, 126.83], 화성: [37.2, 126.83], 춘천: [37.88, 127.73], 강릉: [37.75, 128.88], 청주: [36.64, 127.49],
  천안: [36.82, 127.11], 세종: [36.48, 127.29], 대전: [36.35, 127.38], 전주: [35.82, 127.15], 광주: [35.16, 126.85],
  대구: [35.87, 128.6], 포항: [36.02, 129.34], 울산: [35.54, 129.31], 창원: [35.23, 128.68], 부산: [35.18, 129.08], 제주: [33.5, 126.53],
};
const HERE = '📍 지금 위치';
const LESSON = '__lesson';
const OFF = [0, 60, 90, 60, 0, -60, -90, -60]; // 별 모으기 화면의 별만 구불구불하게 (보상 줄은 글이 길어 가운데 고정)
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// 이모지 글자 → 3D 그림(img/<코드>.webp, Microsoft Fluent Emoji 3D, MIT). 그림이 없으면 글자 그대로.
const seg = new Intl.Segmenter('ko', { granularity: 'grapheme' });
const graphemes = (s) => [...seg.segment(String(s))].map((x) => x.segment);
const isEmoji = (g) => /\p{Extended_Pictographic}/u.test(g);
const ekey = (g) => [...g].map((c) => c.codePointAt(0).toString(16)).filter((h) => h !== 'fe0f').join('-');
const ico = (s) => graphemes(s).map((g) => (isEmoji(g)
  ? `<img class="e" src="img/${ekey(g)}.webp" alt="${g}" onerror="this.replaceWith(this.alt)">`
  : esc(g))).join('');

// shortcut: 기록은 이 기기 브라우저(localStorage)에만 저장됨. 기기를 바꾸거나 방문 기록을 지우면 사라짐.
let state = load();
function load() {
  const base = {
    name: '', depart: '08:45',
    routine: ROUTINE,
    rewards: [{ at: 5, text: '예시) 좋아하는 스티커 한 장' }, { at: 10, text: '예시) 주말에 놀이터 가기' }],
    stones: 0, lastStone: null, today: null, done: [],
    city: '서울', coords: null, wxCache: null,
  };
  try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return base; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }

function syncDay() {
  const k = dayKey(new Date());
  if (state.today === k) return false;
  state.today = k; state.done = []; save();
  return true;
}

const items = () => [
  ...state.routine.map(([emoji, label]) => ({ id: label, emoji, label })),
  { id: LESSON, emoji: '📖', label: '오늘의 배움' },
];
const isDone = (id) => state.done.includes(id);
const show = (s) => { $(s).hidden = false; };
const hide = (s) => { $(s).hidden = true; };

// ---------- 소리 ----------
let ac;
function sfx(kind) {
  try {
    ac ||= new AudioContext();
    const notes = { tap: [784], good: [659, 988], bad: [330, 262], win: [523, 659, 784, 1047] }[kind];
    notes.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.12;
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.3);
    });
  } catch {}
}
// 진동: 안드로이드는 vibrate, 아이폰(iOS 18 이상)은 스위치 체크박스를 누르면 나는 진동을 빌려 씀.
// 아이패드는 진동 모터가 없어서 진동 없음(대신 소리 + 눌리는 움직임).
const hapticSwitch = Object.assign(document.createElement('label'), { hidden: true, innerHTML: '<input type="checkbox" switch>' });
document.body.append(hapticSwitch);
function haptic(ms = 15) {
  try { navigator.vibrate ? navigator.vibrate(ms) : hapticSwitch.click(); } catch {}
}

// ---------- 목소리 ----------
// 문장마다: 미리 만든 AI 목소리 파일(voice/index.json에 있으면) → 없으면 기기 목소리.
let voiceFiles = {};
fetch('voice/index.json').then((r) => (r.ok ? r.json() : {})).then((m) => { voiceFiles = m; }).catch(() => {});
const player = new Audio(); // 하나만 계속 씀: 아이패드는 한 번 터치로 허락된 재생기만 나중에 소리 낼 수 있음
let talkId = 0;
function deviceVoice() {
  const ko = (speechSynthesis.getVoices?.() || []).filter((v) => v.lang?.toLowerCase().startsWith('ko'));
  return ko.find((v) => /premium|enhanced|natural|neural|고급|향상/i.test(v.name)) || ko[0] || null;
}
function sayOne(text, id) {
  return new Promise((done) => {
    if (id !== talkId) return done();
    const file = voiceFiles[text];
    if (file) {
      player.onended = player.onerror = done;
      player.src = `voice/${file}`;
      player.play().catch(done);
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR'; u.voice = deviceVoice();
      u.rate = 0.92; u.pitch = 1.2; // 조금 높고 천천히 = 덜 딱딱하게
      u.onend = u.onerror = done;
      speechSynthesis.speak(u);
      setTimeout(done, 1000 + text.length * 250); // 끝 알림이 안 오는 기기 대비
    } catch { done(); }
  });
}
async function speak(...lines) {
  const id = ++talkId;
  player.pause();
  try { speechSynthesis.cancel(); } catch {}
  for (const t of lines.filter(Boolean)) {
    if (id !== talkId) return;
    await sayOne(t, id);
  }
}
function confetti() {
  const colors = ['#58c322', '#ffc61a', '#1fa8f0', '#ff7ab6', '#ff9f1a'];
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('i');
    s.className = 'conf';
    s.style.left = Math.random() * 100 + 'vw';
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.5 + 's';
    document.body.append(s);
    setTimeout(() => s.remove(), 3000);
  }
}

// ---------- 화면 그리기 ----------
function renderTop() {
  const now = new Date();
  $('#date').textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 ${'일월화수목금토'[now.getDay()]}요일`;
  $('#clock').textContent = now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  $('#stoneCount').textContent = state.stones;
  const left = minutesLeft(now, state.depart);
  const school = now.getDay() % 6 !== 0, counting = school && left > -60;
  const [label, big] = !school ? ['오늘은', '유치원 쉬는 날']
    : left > 0 ? ['유치원 출발까지', `${left}분 남았어요`]
    : counting ? ['지금은', '출발할 시간!'] : ['오늘도 잘했어요', '내일 만나요'];
  $('#leaveLabel').textContent = label;
  $('#leaveMin').textContent = big;
  // 출발이 가까울수록 막대가 차고, 시계가 흔들리고, 마지막엔 카드가 번쩍임
  $('.leave').dataset.rush = counting ? rush(left) : 'calm';
  $('.leave .bar').hidden = !counting;
  $('#bar').style.width = `${timeFill(left) * 100}%`;
  const list = items(), n = list.filter((i) => isDone(i.id)).length;
  $('#barText').textContent = `${n}/${list.length} 했어요 · ${state.depart} 출발`;
  renderWx();
}

// ---------- 날씨 ----------
let wx = null, nextTry = 0;
const place = () => (state.coords ? '지금 위치' : state.city);
async function loadWeather(force) {
  const [lat, lon] = state.coords || CITIES[state.city] || CITIES.서울;
  const key = `${lat},${lon},${state.today}`;
  const c = state.wxCache;
  if (!force && ((c?.key === key && Date.now() - c.at < 30 * 60000) || Date.now() < nextTry)) return;
  nextTry = Date.now() + 5 * 60000; // 실패해도 5분 동안은 다시 묻지 않음
  try {
    const q = `latitude=${lat}&longitude=${lon}&timezone=Asia%2FSeoul`;
    const [w, air] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${q}&forecast_days=1&hourly=temperature_2m,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&current=pm10,pm2_5`)
        .then((r) => (r.ok ? r.json() : null)).catch(() => null), // 미세먼지는 없어도 날씨는 보여 줌
    ]);
    state.wxCache = { key, at: Date.now(), w, air };
    save();
  } catch {} // 인터넷이 끊기면 아까 받은 값을 그대로 씀
  renderWx();
}
function renderWx() {
  const c = state.wxCache;
  try { wx = c?.key.endsWith(state.today) ? summarizeWeather(c.w, c.air, state.depart, new Date()) : null; } catch { wx = null; }
  $('#wxCard').innerHTML = wx
    ? `<div class="ti">${ico(wx.emoji)}</div><div class="tt"><small>${wx.when} 날씨</small><b>${wx.temp}°</b><span>${esc(wx.tips[0][1])}</span></div>`
    : `<div class="ti">${ico('🌥️')}</div><div class="tt"><small>오늘 날씨</small><b>…</b><span>날씨를 불러오는 중이에요</span></div>`;
}
const tipsHtml = (tips) => `<div class="tips">${tips.map(([e, t]) => `<div class="tip"><span>${ico(e)}</span>${esc(t)}</div>`).join('')}</div>`;

function openInfo(html, lines) {
  $('#sheet').innerHTML = `<div class="panel">${html}<div class="row"><button class="btn" data-a="close">좋아요</button></div></div>`;
  show('#sheet');
  speak(...lines);
  $('#sheet').onclick = (e) => { if (e.target.id === 'sheet' || e.target.closest('[data-a]')) hide('#sheet'); };
}

function renderPath() {
  const L = lessonFor(new Date(), WEEKS);
  const [m, w] = L.key.split('-');
  $('#unit').innerHTML = `<small>${m}월 ${w}주차 · ${esc(L.theme)}${L.exact ? '' : ' (이번 주 자료가 없어 가까운 주를 보여 줘요)'}</small>
    <b>${esc(L.sub)}</b><span>${esc(L.goal)}</span>`;
  const list = items(), cur = list.findIndex((i) => !isDone(i.id));
  $('#path').innerHTML = list.map((it, i) => `
    <div class="step">
      ${i === cur ? `<div class="bubble">${state.name ? esc(state.name) + ', ' : ''}이거 하자!</div>` : ''}
      <button class="node ${isDone(it.id) ? 'done' : i === cur ? 'cur' : ''} ${it.id === justDone ? 'pop' : ''}" data-i="${i}" aria-label="${esc(it.label)}">${ico(it.emoji)}</button>
      <div class="label">${esc(it.label)}</div>
    </div>`).join('') + `
    <div class="step">
      <div class="node goal ${cur < 0 ? 'done' : ''}">${ico('⭐')}</div><div class="label">별 받기</div>
    </div>`;
  // 세로 태블릿에선 길이 길어 화면 밖으로 나가므로 지금 할 일을 화면 가운데로
  $('.node.cur')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

const sortedRewards = () => [...state.rewards].sort((a, b) => a.at - b.at);

function renderRiver() {
  const rs = sortedRewards();
  const next = rs.find((r) => r.at > state.stones);
  $('#nextReward').innerHTML = next
    ? `${ico('🎁')} 「${esc(next.text)}」까지 별 ${next.at - state.stones}개 남았어요`
    : '준비된 보상을 다 받았어요! 부모님께 새 보상을 부탁해요';
  $('#bigReward').hidden = !next;
  const byAt = Object.fromEntries(rs.map((r) => [r.at, r]));
  const max = Math.max(state.stones + 5, 10, ...rs.map((r) => r.at));
  let h = '';
  for (let i = max; i >= 1; i--) {
    const r = byAt[i];
    h += `<div class="stone-row" style="--x:${r ? 0 : OFF[i % 8]}px">
      <button class="stone ${i <= state.stones ? 'done' : ''} ${r ? 'gift' : ''}" data-at="${i}" aria-label="${i}번째 별">
        ${r ? ico('🎁') : i <= state.stones ? ico('⭐') : `${ico('⭐')}<b>${i}</b>`}${i === state.stones ? `<span class="me">${ico('🐥')}</span>` : ''}</button>
      ${r ? `<div class="flag">별 ${i}개 · ${esc(r.text)}</div>` : ''}</div>`;
  }
  $('#river').innerHTML = h + `<div class="bank">${state.stones === 0 ? `<span class="me">${ico('🐥')}</span>` : ''}${ico('🏠')} 출발</div>`;
}

const renderAll = () => { renderTop(); renderPath(); renderRiver(); };

// ---------- 오늘 할 일 ----------
let justDone = null; // 방금 한 일: 길에서 통 튀어 오르게
function mark(id, on) {
  state.done = state.done.filter((d) => d !== id);
  if (on) state.done.push(id);
  justDone = on ? id : null;
  save(); renderAll();
  justDone = null;
  if (!on) return;
  sfx('good');
  if (items().every((i) => isDone(i.id))) {
    const r = crossStone(state, state.today);
    save(); renderAll();
    if (r.moved) setTimeout(() => celebrate(r.reward), 300);
  }
}

function openSheet(it) {
  const d = isDone(it.id);
  // 옷 입기·가방 챙기기를 열면 오늘 날씨에 맞는 도움말(외투·우산·마스크)을 같이 보여 줌
  const tips = !d && wx && /옷|가방/.test(it.label) ? wx.tips : [];
  // 글을 못 읽어도 되게: 큰 그림 + 목소리 + 그림 버튼(👍 했어요 / ⏳ 아직). 초록 버튼이 더 크고 오른쪽.
  const pick = (a, e, t, main) => `<button class="pick ${main ? 'yes' : 'no'}" data-a="${a}">${ico(e)}<span>${t}</span></button>`;
  $('#sheet').innerHTML = `<div class="panel">
    <div class="asktop"><div class="big">${ico(d ? '⭐' : it.emoji)}</div>
      <button class="spk2" data-a="say" aria-label="다시 듣기">${ico('🔊')}</button></div>
    <h2>${esc(it.label)}<span>${d ? '벌써 했어요!' : '다 했어요?'}</span></h2>
    ${tips.length ? tipsHtml(tips) : ''}
    <div class="picks">${d
      ? pick('undo', '↩️', '아직') + pick('close', '👍', '좋아요', true)
      : pick('close', '⏳', '아직') + pick('yes', '👍', '다 했어요!', true)}</div></div>`;
  show('#sheet');
  const talk = () => speak(d ? SAY.already(it.label) : SAY.ask(it.label), ...tips.map((t) => t[1]));
  talk();
  $('#sheet').onclick = (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'say') return talk();
    if (e.target.id !== 'sheet' && !a) return;
    haptic(a === 'yes' ? 40 : 10);
    hide('#sheet');
    if (a === 'yes') mark(it.id, true);
    if (a === 'undo') mark(it.id, false);
  };
}

// ---------- 오늘의 배움 (누리과정) ----------
function openLesson() {
  const L = lessonFor(new Date(), WEEKS), l = L.lesson;
  const choices = l.c.map(([e, t], i) => ({ e, t, ok: i === 0 })).sort(() => Math.random() - 0.5);
  const el = $('#lesson');
  let pick = -1;
  el.innerHTML = `<div class="lesson">
    <div class="ltop"><button class="x" data-a="close" aria-label="닫기">✕</button><div class="bar"><i style="width:35%"></i></div></div>
    <small class="tag">오늘의 배움 · ${esc(L.sub)} · ${esc(l.t)}</small>
    <div class="talk"><div class="mascot">${ico('🐥')}</div>
      <div class="say">${esc(l.say)}<button class="spk" data-a="say" aria-label="다시 듣기">${ico('🔊')}</button></div></div>
    <h2>${esc(l.q)}</h2>
    <div class="choices">${choices.map((c, i) => `<button class="choice" data-i="${i}"><span class="${graphemes(c.e).length > 1 ? 'multi' : ''}">${ico(c.e)}</span>${esc(c.t)}</button>`).join('')}</div>
    <footer class="lfoot"><div class="msg"></div><button class="btn" data-a="check" disabled>확인</button></footer>
  </div>`;
  show('#lesson');
  speak(l.say, l.q);
  const foot = el.querySelector('.lfoot'), msg = foot.querySelector('.msg'), main = foot.querySelector('.btn');
  el.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.i != null) {
      if (main.dataset.a === 'next' || b.classList.contains('wrong')) return;
      pick = +b.dataset.i;
      el.querySelectorAll('.choice').forEach((c, i) => c.classList.toggle('sel', i === pick));
      foot.className = 'lfoot'; msg.textContent = ''; main.disabled = false;
      haptic(); sfx('tap'); speak(choices[pick].t);
      return;
    }
    const a = b.dataset.a;
    if (a === 'close') { speak(); hide('#lesson'); } // 빈 speak() = 말하던 것 멈춤
    else if (a === 'say') speak(l.say, l.q);
    else if (a === 'check' && choices[pick].ok) {
      foot.className = 'lfoot good'; msg.innerHTML = `${SAY.right} ${ico('🎉')}`;
      main.textContent = '계속'; main.dataset.a = 'next';
      el.querySelector('.ltop .bar i').style.width = '100%';
      haptic(40); sfx('good'); speak(SAY.right);
    } else if (a === 'check') {
      foot.className = 'lfoot bad'; msg.textContent = SAY.wrong;
      main.disabled = true;
      el.querySelectorAll('.choice')[pick].classList.replace('sel', 'wrong');
      sfx('bad'); speak(SAY.wrong);
    } else if (a === 'next') { hide('#lesson'); mark(LESSON, true); }
  };
}

// ---------- 축하·보상 카드 ----------
function showCard({ emoji, title, text, huge, next }) {
  $('#show').innerHTML = `<div class="show"><div class="card">
    <div class="big">${ico(emoji)}</div><h2>${esc(title)}</h2><p class="${huge ? 'huge' : ''}">${esc(text)}</p>
    <button class="btn">${next ? '다음' : '좋아요'}</button></div></div>`;
  show('#show');
  $('#show .btn').onclick = () => { hide('#show'); next?.(); };
}
function celebrate(reward) {
  confetti(); sfx('win');
  const msg = `오늘 할 일을 다 했어요! 별을 ${state.stones}개 모았어요.`;
  speak(SAY.allDone, SAY.stone);
  showCard({ emoji: '⭐', title: `별 ${state.stones}개째!`, text: msg, next: reward && (() => showReward(reward)) });
}
function showReward(r) {
  const got = r.at <= state.stones;
  if (got) { confetti(); sfx('win'); }
  got ? speak(SAY.gift, r.text) : speak(r.text, SAY.more); // 보상 글은 부모님이 쓴 것이라 기기 목소리
  showCard({
    emoji: got ? '🎁' : '🎯', huge: true, text: r.text,
    title: got ? `별 ${r.at}개! 보상 도착!` : `별 ${r.at}개가 되면 (${r.at - state.stones}개 남았어요)`,
  });
}

// ---------- 부모님 설정 ----------
function openSettings() {
  const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
  if (prompt(`부모님 확인: ${a} + ${b} = ?`)?.trim() !== String(a + b)) return;
  const L = lessonFor(new Date(), WEEKS);
  let stones = state.stones;
  const rRow = ([e, n]) => `<div class="row item"><input class="emo" value="${esc(e)}" aria-label="그림"><input class="nm" value="${esc(n)}" aria-label="할 일"><button class="x" data-a="del" aria-label="지우기">✕</button></div>`;
  const wRow = ({ at, text }) => `<div class="row item"><input class="at" type="number" min="1" value="${at}" aria-label="별 몇 개"><span>개</span><input class="tx" value="${esc(text)}" aria-label="보상"><button class="x" data-a="del" aria-label="지우기">✕</button></div>`;
  const el = $('#settings');
  el.innerHTML = `<div class="set">
    <h2>부모님 설정</h2>
    <label>아이 이름 <input id="sName" value="${esc(state.name)}" placeholder="예) 하윤"></label>
    <label>출발 시각 <input id="sDepart" type="time" value="${esc(state.depart)}"></label>
    <label>날씨 지역 <select id="sCity">${[...Object.keys(CITIES), HERE].map((c) =>
      `<option${(state.coords ? c === HERE : c === state.city) ? ' selected' : ''}>${c}</option>`).join('')}</select></label>
    <h3>아침 할 일</h3><div id="sRoutine">${state.routine.map(rRow).join('')}</div>
    <button class="btn white sm" data-a="addR">+ 할 일 추가</button>
    <h3>별 보상<small>별을 몇 개 모으면 무엇을 받을지 직접 적어 주세요. 별 모으기 화면에 그대로 떠요.</small></h3>
    <div id="sRewards">${sortedRewards().map(wRow).join('')}</div>
    <button class="btn white sm" data-a="addW">+ 보상 추가</button>
    <h3>지금까지 모은 별</h3>
    <div class="row"><button class="btn white sm" data-a="minus">−</button><b id="sStones">${stones}</b><button class="btn white sm" data-a="plus">+</button></div>
    <h3>이번 주 누리과정<small>${L.key.replace('-', '월 ')}주차 · ${esc(L.theme)} · ${esc(L.sub)} — ${esc(L.goal)}</small></h3>
    <ol class="week">${L.days.map((d, i) => `<li class="${i === L.dayIdx ? 'today' : ''}">${'월화수목금'[i]} · ${esc(d.t)} <small>(지도서 ${d.p}쪽)</small><br>${esc(d.q)}</li>`).join('')}</ol>
    <p class="src">출처: 3세 누리과정 교사용 지도서 「봄·여름·가을·겨울」. 지도서는 날짜를 정해 두지 않아서(220쪽) 주차 배치는 앱이 정했어요.</p>
    <div class="row end"><button class="btn white" data-a="close">취소</button><button class="btn" data-a="save">저장</button></div>
  </div>`;
  show('#settings');

  let coords = state.coords;
  $('#sCity').onchange = (e) => {
    if (e.target.value !== HERE) return;
    const fail = () => { alert('위치를 가져오지 못했어요. 가까운 도시를 골라 주세요.'); e.target.value = state.city; coords = null; };
    // 위치는 https 주소나 이 PC(localhost)에서만 허락됨. 같은 와이파이 IP 주소로 열면 실패함.
    if (!navigator.geolocation) return fail();
    navigator.geolocation.getCurrentPosition((p) => { coords = [+p.coords.latitude.toFixed(2), +p.coords.longitude.toFixed(2)]; }, fail);
  };

  el.onclick = (e) => {
    const act = e.target.closest('[data-a]')?.dataset.a;
    if (act === 'del') e.target.closest('.item').remove();
    if (act === 'addR') $('#sRoutine').insertAdjacentHTML('beforeend', rRow(['⭐', '']));
    if (act === 'addW') $('#sRewards').insertAdjacentHTML('beforeend', wRow({ at: stones + 5, text: '' }));
    if (act === 'minus' || act === 'plus') $('#sStones').textContent = stones = Math.max(0, stones + (act === 'plus' ? 1 : -1));
    if (act === 'close') hide('#settings');
    if (act !== 'save') return;
    state.name = $('#sName').value.trim();
    if (/^\d\d:\d\d$/.test($('#sDepart').value)) state.depart = $('#sDepart').value;
    state.routine = [...el.querySelectorAll('#sRoutine .item')]
      .map((r) => [r.querySelector('.emo').value.trim() || '⭐', r.querySelector('.nm').value.trim()])
      .filter(([, n], i, all) => n && all.findIndex(([, m]) => m === n) === i); // 빈 칸·같은 이름 빼기
    state.rewards = [...el.querySelectorAll('#sRewards .item')]
      .map((r) => ({ at: Math.floor(+r.querySelector('.at').value), text: r.querySelector('.tx').value.trim() }))
      .filter((r) => r.text && r.at >= 1);
    state.stones = stones;
    const city = $('#sCity').value;
    if (city === HERE && coords) state.coords = coords;
    else if (city !== HERE) { state.city = city; state.coords = null; }
    save(); hide('#settings'); renderAll(); loadWeather();
  };
}

// ---------- 연결 ----------
$('#path').onclick = (e) => {
  const b = e.target.closest('[data-i]');
  if (!b) return;
  const it = items()[+b.dataset.i];
  haptic(); sfx('tap');
  it.id === LESSON ? openLesson() : openSheet(it);
};
$('#river').onclick = (e) => {
  const r = state.rewards.find((x) => x.at === +e.target.closest('[data-at]')?.dataset.at);
  if (r) showReward(r);
};
$('#bigReward').onclick = () => { const n = sortedRewards().find((r) => r.at > state.stones); if (n) showReward(n); };
$('#gear').onclick = openSettings;
$('#wxCard').onclick = () => {
  if (!wx) return loadWeather(true);
  openInfo(`<div class="big">${ico(wx.emoji)}</div><h2>${wx.when} ${wx.temp}°, ${esc(wx.sky)}</h2>
    <p class="facts">낮 최고 ${wx.max}° · 최저 ${wx.min}°<br>비 올 확률 ${wx.rain}% (오후 5시까지)${wx.dust ? ` · 미세먼지 ${wx.dust}` : ''}</p>
    ${tipsHtml(wx.tips)}<p class="src">${esc(place())} · 날씨 Open-Meteo</p>`,
  [wx.sky, ...wx.tips.map((t) => t[1])]);
};
document.querySelectorAll('.tabs button').forEach((t) => (t.onclick = () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === t));
  $('#view-today').hidden = t.dataset.tab !== 'today';
  $('#view-stones').hidden = t.dataset.tab !== 'stones';
  if (t.dataset.tab === 'stones') $('#river .me')?.scrollIntoView({ block: 'center' });
}));

syncDay();
renderAll();
loadWeather();
setInterval(() => { syncDay() ? renderAll() : renderTop(); loadWeather(); }, 15000); // 날씨는 30분마다만 새로 받음
