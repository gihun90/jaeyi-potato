// 화면과 상관없는 계산만 모음 (test.js에서 검사).

// 앱이 소리 내어 말하는 고정 문장. tools/make-voice.mjs가 이 문장들로 AI 목소리 파일을 미리 만듦.
// 글자를 바꾸면 목소리 파일도 다시 만들어야 함(안 만들면 그 문장만 기기 목소리로 나옴).
export const SAY = {
  right: '정답이에요! 잘했어요',
  wrong: '괜찮아요, 다른 걸 골라 볼까요?',
  allDone: '오늘 할 일을 다 했어요!',
  stone: '별을 하나 받았어요!',
  gift: '보상 도착!',
  more: '별을 더 모으면 받을 수 있어요',
  ask: (label) => `${label} 다 했나요?`,
  already: (label) => `${label} 벌써 했어요!`,
};
export const ROUTINE = [['🪥', '세수·양치'], ['👕', '옷 입기'], ['🎒', '가방 챙기기']];
export const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const mondayOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));

// "11월 3주차" = 그 주 월요일이 11월의 몇 번째 월요일인가. 토·일은 그 주 월요일에 속함.
export function weekOf(d) {
  const mon = mondayOf(d);
  return { month: mon.getMonth() + 1, week: Math.ceil(mon.getDate() / 7) };
}

// 학년도 순서(3월=1 … 2월=12)로 바꾼 주 번호
const ord = (m, w) => ((m + 9) % 12) * 10 + w;

// 오늘의 배움. 주말엔 금요일 것을 복습.
// shortcut: 데이터가 없는 주는 그 앞의 가장 가까운 주를 반복, 10월 이전이면 첫 주. 주차를 더 넣으면 해결.
export function lessonFor(d, weeks) {
  const { month, week } = weekOf(d);
  const cur = ord(month, week);
  const keys = Object.keys(weeks).sort((a, b) => ord(...a.split('-').map(Number)) - ord(...b.split('-').map(Number)));
  const key = keys.filter((k) => ord(...k.split('-').map(Number)) <= cur).pop() || keys[0];
  const dayIdx = Math.min((d.getDay() + 6) % 7, 4);
  return { key, month, week, exact: key === `${month}-${week}`, dayIdx, ...weeks[key], lesson: weeks[key].days[dayIdx] };
}

// 오늘 할 일을 다 하면 별 하나. 하루에 한 번만. 도착한 보상이 있으면 돌려줌.
export function crossStone(state, today) {
  if (state.lastStone === today) return { moved: false, reward: null };
  state.stones += 1;
  state.lastStone = today;
  return { moved: true, reward: state.rewards.find((r) => r.at === state.stones) || null };
}

export function minutesLeft(now, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return Math.ceil((new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m) - now) / 60000);
}

// 출발 알림 단계. 분 기준은 정한 값(공식 근거 없음): 60분 전부터 막대가 차고, 15분 전 서두르기, 5분 전 지금 가기
export const RUSH = { window: 60, soon: 15, now: 5 };
export const rush = (left) => (left > RUSH.soon ? 'calm' : left > RUSH.now ? 'soon' : 'now');
export const timeFill = (left) => Math.min(1, Math.max(0, 1 - left / RUSH.window));

// ---------- 날씨 (Open-Meteo 응답을 아이용 말로) ----------
// WMO 날씨 코드 → 그림·말
export function sky(c, night = false) {
  if (c <= 2 && night) return ['🌙', '맑은 밤이에요'];
  if (c === 0) return ['☀️', '맑아요'];
  if (c <= 2) return ['🌤️', '구름이 조금 있어요'];
  if (c === 3) return ['☁️', '흐려요'];
  if (c <= 48) return ['🌫️', '안개가 꼈어요'];
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return ['🌨️', '눈이 와요'];
  if (c >= 95) return ['⛈️', '천둥 번개가 쳐요'];
  return ['🌧️', '비가 와요'];
}

// 기온별 옷차림: 앱이 정한 대략적 기준(공식 기준 아님). 바꾸려면 여기만 고치면 됨.
export function wearFor(t) {
  if (t <= 0) return ['🧤', '아주 추워요! 패딩·장갑·목도리'];
  if (t <= 8) return ['🧥', '추워요! 두꺼운 외투 입기'];
  if (t <= 15) return ['🧥', '쌀쌀해요, 겉옷 입기'];
  if (t <= 22) return ['👕', '포근해요, 얇은 겉옷'];
  return ['🩳', '더워요, 시원한 옷'];
}

// 환경부 미세먼지 예보 등급(㎍/㎥): PM10 30/80/150, PM2.5 15/35/75. 둘 중 나쁜 쪽.
export function dustGrade(pm10, pm25) {
  const lvl = (v, cuts) => {
    if (v == null) return 0;
    const i = cuts.findIndex((c) => v <= c);
    return i < 0 ? 3 : i;
  };
  return ['좋음', '보통', '나쁨', '매우 나쁨'][Math.max(lvl(pm10, [30, 80, 150]), lvl(pm25, [15, 35, 75]))];
}

const RAIN_UNTIL = 17; // 하원 무렵(가정). 출발~이 시각 사이 비 올 확률 중 가장 높은 값을 봄.
export function summarizeWeather(w, air, depart, now) {
  const dh = +depart.split(':')[0];
  const before = now.getHours() < dh;
  const h = before ? dh : now.getHours();
  const H = w.hourly;
  const [emoji, word] = sky(H.weather_code[h], h < 6 || h >= 19);
  const temp = Math.round(H.temperature_2m[h]);
  const rain = Math.max(0, ...H.precipitation_probability.slice(h, Math.max(h + 1, RAIN_UNTIL + 1)).filter((v) => v != null));
  const pm = air?.current;
  const dust = pm ? dustGrade(pm.pm10, pm.pm2_5) : null;
  const tips = [wearFor(temp)];
  if (rain >= 50) tips.push(['☂️', '비가 올 수 있어요, 우산 챙기기']); // 숫자는 화면에만(말은 고정 문장)
  if (dust === '나쁨' || dust === '매우 나쁨') tips.push(['😷', `미세먼지 ${dust}, 마스크 쓰기`]);
  return {
    emoji, sky: word, temp, rain, dust, tips,
    when: before ? `출발할 때(${dh}시)` : '지금',
    max: Math.round(w.daily.temperature_2m_max[0]), min: Math.round(w.daily.temperature_2m_min[0]),
  };
}

