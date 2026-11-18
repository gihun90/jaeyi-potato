// 앱이 말하는 고정 문장을 구글 AI 목소리(Text-to-Speech)로 미리 만들어 morning-app/voice/ 에 저장.
// 실행(PowerShell):  $env:GOOGLE_TTS_KEY="발급받은 키"; node morning-app/tools/make-voice.mjs
// 목소리 바꾸기:     $env:TTS_VOICE="ko-KR-Neural2-A"   (안 정하면 한국어 여자 목소리 중 가장 자연스러운 것을 고름)
// 미리 세어 보기:   node morning-app/tools/make-voice.mjs --dry
// 이미 만든 문장은 건너뜀. 문장(curriculum.js, logic.js의 SAY)을 고치면 다시 실행.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { WEEKS } from '../curriculum.js';
import { SAY, ROUTINE, sky, wearFor } from '../logic.js';

const API = 'https://texttospeech.googleapis.com/v1';
const OUT = new URL('../voice/', import.meta.url);
fs.mkdirSync(OUT, { recursive: true });

// 1) 말할 문장 모으기
const lines = new Set([
  ...Object.values(SAY).filter((v) => typeof v === 'string'),
  ...ROUTINE.flatMap(([, label]) => [SAY.ask(label), SAY.already(label)]),
  '비가 올 수 있어요, 우산 챙기기', '미세먼지 나쁨, 마스크 쓰기', '미세먼지 매우 나쁨, 마스크 쓰기',
]);
for (let c = 0; c <= 99; c++) for (const night of [false, true]) lines.add(sky(c, night)[1]);
for (let t = -30; t <= 40; t++) lines.add(wearFor(t)[1]);
for (const w of Object.values(WEEKS)) for (const l of w.days) { lines.add(l.say); lines.add(l.q); l.c.forEach(([, label]) => lines.add(label)); }

if (process.argv.includes('--dry')) {
  console.log(`문장 ${lines.size}개, 글자 ${[...lines].join('').length}자`);
  process.exit(0);
}
const KEY = process.env.GOOGLE_TTS_KEY;
if (!KEY) { console.error('GOOGLE_TTS_KEY 환경 변수가 없어요. 위 실행 방법을 보세요.'); process.exit(1); }

// 2) 목소리 고르기
async function api(path, body) {
  const r = await fetch(`${API}/${path}${path.includes('?') ? '&' : '?'}key=${KEY}`, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${j.error?.message || ''}`);
  return j;
}
const { voices } = await api('voices?languageCode=ko-KR');
const female = voices.filter((v) => v.ssmlGender === 'FEMALE').map((v) => v.name);
const voice = process.env.TTS_VOICE
  || ['Chirp3-HD', 'Neural2', 'Wavenet'].map((k) => female.find((n) => n.includes(k))).find(Boolean)
  || female[0] || voices[0].name;
console.log(`목소리: ${voice}  (고를 수 있는 여자 목소리: ${female.join(', ')})`);

// 3) 파일 만들기
const indexFile = new URL('index.json', OUT);
const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : {};
const chirp = voice.includes('Chirp');
let made = 0;
for (const text of lines) {
  const name = crypto.createHash('sha1').update(`${voice}|${text}`).digest('hex').slice(0, 12) + '.mp3';
  if (index[text] === name && fs.existsSync(new URL(name, OUT))) continue;
  const { audioContent } = await api('text:synthesize', {
    input: { text },
    voice: { languageCode: 'ko-KR', name: voice },
    // Chirp 목소리는 높낮이 조절을 받지 않아서 기본값 그대로
    audioConfig: chirp ? { audioEncoding: 'MP3' } : { audioEncoding: 'MP3', speakingRate: 0.95, pitch: 2 },
  });
  fs.writeFileSync(new URL(name, OUT), Buffer.from(audioContent, 'base64'));
  index[text] = name;
  made++;
  process.stdout.write(`\r만드는 중 ${made}`);
}
fs.writeFileSync(indexFile, JSON.stringify(index, null, 1));
console.log(`\n끝: 새로 ${made}개, 전체 ${Object.keys(index).length}문장 → morning-app/voice/`);
