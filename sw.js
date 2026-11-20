// 사이큐브 앱 엔진(서비스워커) — 설치가 되게 하고, 늘 새 화면을 받는다(2026-11-04, 결정 D-493)
// 같은 주소의 파일만 다루고 서버(슈퍼베이스) · 구글 로그인은 건드리지 않는다. 화면 파일은 매번 새것을 확인하고(no-cache), 끊기면 저장해 둔 것을 쓴다
const VERSION = 'scicube-2026-11-20a';
const IMG = 'scicube-img-1';   // 문항 그림(슈퍼베이스 비공개 저장소) — 주소 뒤 임시 열쇠는 빼고 그림 이름으로 담아 둔다(2026-11-20)
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(['./', './icons/icon-192.png'])).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method === 'GET' && /\/storage\/v1\/object\/sign\/question-images\//.test(url.pathname)) {
    const key = url.origin + url.pathname;   // 열쇠(token)가 바뀌어도 같은 그림이면 같은 칸
    e.respondWith(caches.open(IMG).then(c => c.match(key).then(hit => hit || fetch(req.url, { mode: 'cors', credentials: 'omit' }).then(res => {
      if (res.ok) c.put(key, res.clone());   // 잘 받은 그림만 담는다(열쇠가 지난 오류 응답은 담지 않음)
      return res;
    }).catch(() => fetch(req)))));
    return;
  }
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('./'))));
});
