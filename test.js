// 실행: node morning-app/test.js
import assert from 'node:assert/strict';
import { weekOf, lessonFor, crossStone, minutesLeft, rush, timeFill, dustGrade, summarizeWeather } from './logic.js';
import { WEEKS } from './curriculum.js';

const D = (m, d) => new Date(2026, m - 1, d, 8, 0);
assert.deepEqual(weekOf(D(11, 17)), { month: 11, week: 3 }); // 사진 속 날짜: 11월 3주차
assert.deepEqual(weekOf(D(11, 22)), { month: 11, week: 3 }); // 일요일도 같은 주
assert.deepEqual(weekOf(D(12, 1)), { month: 11, week: 5 });  // 12/1(화)은 11/30 월요일 주
assert.deepEqual(weekOf(D(12, 7)), { month: 12, week: 1 });

const t = lessonFor(D(11, 17), WEEKS);
assert.equal(t.key, '11-3');
assert.equal(t.lesson.t, '얼음 나무 만들기'); // 화요일 = 두 번째
assert.equal(lessonFor(D(11, 21), WEEKS).dayIdx, 4); // 토요일 → 금요일 복습
assert.equal(lessonFor(new Date(2027, 0, 12), WEEKS).key, '12-4'); // 1월은 데이터 없음 → 12월 마지막 주
assert.equal(lessonFor(new Date(2026, 9, 5), WEEKS).key, '11-1');  // 10월 → 첫 주

for (const w of Object.values(WEEKS)) {
  assert.equal(w.days.length, 5);
  for (const l of w.days) assert.ok(l.c.length >= 2 && l.p >= 315 && l.p <= 408, l.t);
}

const s = { stones: 9, lastStone: null, rewards: [{ at: 10, text: '놀이터' }] };
assert.equal(crossStone(s, '2026-11-17').reward.text, '놀이터');
assert.equal(crossStone(s, '2026-11-17').moved, false); // 같은 날 두 번 안 됨
assert.equal(s.stones, 10);

assert.equal(minutesLeft(new Date(2026, 10, 17, 8, 10), '08:50'), 40);
assert.deepEqual([16, 15, 6, 5, 0, -10].map(rush), ['calm', 'soon', 'soon', 'now', 'now', 'now']);
assert.deepEqual([90, 60, 30, 0, -5].map(timeFill), [0, 0, 0.5, 1, 1]);

assert.equal(dustGrade(30, 15), '좋음');
assert.equal(dustGrade(31, 10), '보통');
assert.equal(dustGrade(20, 36), '나쁨');
assert.equal(dustGrade(200, null), '매우 나쁨');

const fill = (v) => Array(24).fill(v);
const w = {
  hourly: { temperature_2m: fill(5), weather_code: fill(3), precipitation_probability: fill(10) },
  daily: { temperature_2m_max: [13], temperature_2m_min: [4] },
};
w.hourly.temperature_2m[8] = 7.6;
w.hourly.precipitation_probability[14] = 53;
const sw = summarizeWeather(w, { current: { pm10: 90, pm2_5: 20 } }, '08:50', new Date(2026, 10, 17, 7, 30));
assert.equal(sw.temp, 8);                 // 7:30에 열면 출발(8시) 기온
assert.equal(sw.when, '출발할 때(8시)');
assert.equal(sw.rain, 53);                // 하원 전 비 → 우산
assert.deepEqual(sw.tips.map((t) => t[0]), ['🧥', '☂️', '😷']);
assert.equal(summarizeWeather(w, null, '08:50', new Date(2026, 10, 17, 21, 0)).rain, 10); // 밤에도 터지지 않음

console.log('ok');
