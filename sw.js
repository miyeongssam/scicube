// 사이큐브 앱 엔진(서비스워커) — 설치가 되게 하고, 늘 새 화면을 받는다(2026-11-04, 결정 D-493)
// 같은 주소의 파일만 다루고 서버(슈퍼베이스) · 구글 로그인은 건드리지 않는다. 화면 파일은 매번 새것을 확인하고(no-cache), 끊기면 저장해 둔 것을 쓴다
const VERSION = 'scicube-2026-11-05a';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(['./', './icons/icon-192.png'])).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('./'))));
});
