// 인터넷이 끊겨도 앱이 열리게: 받은 파일을 기기에 저장해 두고, 연결이 안 되면 저장본을 씀.
// 연결되면 항상 새 파일을 먼저 받아서(고친 화면이 바로 보이게) 저장본도 바꿔 둠.
// shortcut: 그림은 한 번 화면에 나온 것만 저장됨. 처음 보는 날의 배움 그림은 오프라인이면 글자 그림으로 대신 나옴.
const CACHE = 'morning-v1';
const SHELL = ['./', 'index.html', 'app.js', 'logic.js', 'curriculum.js', 'manifest.webmanifest', 'icon-180.png',
  // 늘 보이는 그림: 별·설정·알람시계·선물·집·할 일·병아리
  ...['2b50', '2699', '23f0', '1f381', '1f3e0', '1faa5', '1f455', '1f392', '1f4d6', '1f425'].map((h) => `img/${h}.webp`)];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 앱 파일과 글꼴만 저장. 날씨(옛 날씨가 보이면 안 됨)·유튜브(영상은 너무 큼)는 그냥 인터넷으로.
  const mine = url.origin === location.origin || /^fonts\.g(oogleapis|static)\.com$/.test(url.hostname);
  if (e.request.method !== 'GET' || !mine) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const r = await fetch(e.request);
      if (r.ok || r.type === 'opaque') c.put(e.request, r.clone());
      return r;
    } catch (err) {
      const hit = await c.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
