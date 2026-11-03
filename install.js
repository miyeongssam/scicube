// 사이큐브 앱 설치 안내(2026-11-04, 결정 D-330 설치 표준 · D-493) — 스킬 pwa-install-guide 의 모듈을 사이큐브에 맞춤
// 휴대폰 · 아이패드(사파리) · 갤럭시 탭(크롬) · PC(크롬 · 엣지 = 바탕 화면, 맥 사파리 = Dock) · 앱 안 화면(카톡 등 → 크롬/사파리로)
// 띠 ✕ = 7일 숨김(기록이 서버에 있는 앱). 새 버전을 올리면 「새 버전이 있어요 [새로 고침]」
(function () {
  'use strict';
  const UA = navigator.userAgent, APP = 'https://scicube.choisci.com/', HIDE = 'sc.ig.hide';
  const IN_APP = [[/KAKAOTALK/i, '카카오톡'], [/Slack/i, '슬랙'], [/NAVER\(inapp/i, '네이버 앱'], [/Instagram/i, '인스타그램'],
    [/FBAN|FBAV|FB_IAB/i, '페이스북'], [/\bLine\//i, '라인'], [/BAND\//i, '밴드'], [/DaumApps/i, '다음 앱'], [/Telegram/i, '텔레그램'], [/everytimeApp/i, '에브리타임']];
  let deferred = null;
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIPad = () => /ipad/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // 아이패드 사파리는 맥으로 자신을 알린다
  const isIOS = () => /iphone|ipod/i.test(UA) || isIPad();

  function state() {
    if (isStandalone()) return { kind: 'app' };
    const ios = isIOS(), android = /Android/i.test(UA), ipad = isIPad();
    const hit = IN_APP.find(([re]) => re.test(UA));
    if (hit) return { kind: 'inapp', name: hit[1], ios, android, kakao: /KAKAOTALK/i.test(UA) };
    if (ios) {
      if (/CriOS|FxiOS|EdgiOS|OPiOS|Whale/i.test(UA)) return { kind: 'other', name: '다른 브라우저', ios, ipad };
      if (!/Safari\//.test(UA)) return { kind: 'inapp', name: '앱 안 화면', ios };
      return { kind: 'safari', ios, ipad };
    }
    if (android) {
      if (/; wv\)/.test(UA)) return { kind: 'inapp', name: '앱 안 화면', android };
      const other = UA.match(/SamsungBrowser|EdgA|OPR|Whale|YaBrowser|Firefox|UCBrowser|MiuiBrowser|HuaweiBrowser/i);
      if (other || !/Chrome\//.test(UA)) return { kind: 'other', name: other && /Samsung/i.test(other[0]) ? '삼성 인터넷' : '다른 브라우저', android };
      return { kind: 'chrome', android };
    }
    // 컴퓨터: 크롬 · 엣지는 바탕 화면 설치, 맥 사파리는 Dock 추가, 나머지는 안내 없음
    if (/Edg\/|Chrome\//.test(UA) && !/OPR|Whale/i.test(UA)) return { kind: 'pc' };
    if (/Macintosh/.test(UA) && /Safari\//.test(UA) && !/Chrome|Firefox/i.test(UA)) return { kind: 'macsafari' };
    return { kind: 'none' };
  }

  function modal(inner, onMount) {
    const wrap = document.createElement('div');
    wrap.className = 'ig-wrap';
    wrap.innerHTML = `<div class="ig-modal" role="dialog" aria-modal="true">${inner}</div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-ig=close]')) wrap.remove(); });
    if (onMount) onMount(wrap);
  }
  const ok = '<div class="ig-btns"><button type="button" class="ig-btn ig-primary" data-ig="close">알겠어요</button></div>';
  const guides = {
    chrome: () => modal(`<h2>📲 안드로이드 · 갤럭시 탭에 설치하기</h2>
      <ol class="ig-steps"><li>크롬 오른쪽 위 <b>⋮</b>(점 세 개)를 누르세요</li><li><b>「앱 설치」</b> 또는 <b>「홈 화면에 추가 → 설치」</b>를 누르세요</li><li>홈 화면의 <b>사이큐브</b> 아이콘으로 여세요</li></ol>
      <div class="ig-note">「바로가기 만들기」는 고르지 마세요. 앱이 아니라 크롬 바로가기예요.</div>${ok}`),
    safari: st => modal(`<h2>📲 ${st.ipad ? '아이패드' : '아이폰'}에 설치하기</h2>
      <ol class="ig-steps"><li>${st.ipad ? '화면 <b>위쪽 오른편</b>' : '화면 <b>아래 가운데</b>'}의 <b>공유 단추(□↑)</b>를 누르세요</li><li>메뉴에서 <b>「홈 화면에 추가」</b> → <b>추가</b>를 누르세요</li><li>홈 화면의 <b>사이큐브</b> 아이콘으로 여세요</li></ol>
      <div class="ig-note">설치한 앱에서 처음 한 번 구글로 다시 로그인하세요. 풀이 기록 · 메모 · 시험은 그대로 이어져요.</div>${ok}`),
    pc: () => modal(`<h2>💻 컴퓨터 바탕 화면에 설치하기</h2>
      <ol class="ig-steps"><li>주소창 오른쪽 끝의 <b>설치 아이콘(⊕ 또는 모니터 모양)</b>을 누르세요</li><li>안 보이면 오른쪽 위 <b>⋮</b> → <b>「전송, 저장, 공유」 → 「앱 설치」</b>(엣지는 <b>…</b> → 「앱」 → 「이 사이트를 앱으로 설치」)</li><li>바탕 화면 · 시작 메뉴의 <b>사이큐브</b>로 여세요</li></ol>${ok}`),
    macsafari: () => modal(`<h2>💻 맥 Dock에 추가하기</h2>
      <ol class="ig-steps"><li>위 메뉴 <b>파일 → 「Dock에 추가」</b>를 누르세요</li><li>Dock의 <b>사이큐브</b>로 여세요</li></ol>${ok}`),
    inapp: st => {
      const target = st.ios ? '사파리' : '크롬';
      modal(`<h2>⚠️ 이 화면에서는 설치가 안 돼요</h2>
        <p>지금 <b>${st.name || '다른 화면'}</b>에서 열려 있어요. <b>${target}</b>에서 열어야 설치돼요.</p>
        ${st.android ? '<button type="button" class="ig-btn ig-primary ig-block" data-open="chrome">크롬으로 열기</button>' : ''}
        ${st.ios && st.kakao ? '<button type="button" class="ig-btn ig-primary ig-block" data-open="kakao">사파리로 열기</button>' : ''}
        <input class="ig-input" id="igUrl" readonly value="${APP}" aria-label="사이큐브 주소">
        <button type="button" class="ig-btn ig-block" data-copy>📋 주소 복사</button>
        <p class="ig-small">단추가 안 되면 주소를 복사해서 <b>${target} 주소창</b>에 붙여 넣으세요.</p>
        <div class="ig-btns"><button type="button" class="ig-btn" data-ig="close">닫기</button></div>`, w => {
        w.addEventListener('click', async e => {
          const o = e.target.closest('[data-open]');
          if (o && o.dataset.open === 'chrome') location.href = `intent://scicube.choisci.com/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(APP)};end`;
          if (o && o.dataset.open === 'kakao') location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(APP)}`;
          const c = e.target.closest('[data-copy]');
          if (c) { let done = false; try { await navigator.clipboard.writeText(APP); done = true; } catch (x) { const i = w.querySelector('#igUrl'); i.select(); done = document.execCommand('copy'); }
            c.textContent = done ? `복사했어요. ${target} 주소창에 붙여 넣으세요` : '주소를 길게 눌러 직접 복사하세요'; }
        });
      });
    }
  };
  guides.other = guides.inapp;

  async function help() {
    const st = state();
    if (st.kind === 'app') return modal(`<h2>✅ 이미 앱으로 쓰고 있어요</h2><p>지금 연 사이큐브가 설치한 앱이에요.</p>${ok}`);
    if ((st.kind === 'chrome' || st.kind === 'pc') && deferred) {
      const ev = deferred; deferred = null; ev.prompt();
      try { await ev.userChoice; } catch (x) {}
      return updateBar();
    }
    if (st.kind === 'none') return modal(`<h2>💻 설치하기</h2><p>크롬이나 엣지(맥은 사파리)에서 열면 바탕 화면에 앱으로 설치할 수 있어요.</p>${ok}`);
    return guides[st.kind](st);
  }

  const hidden = () => { try { return Date.now() - (+localStorage.getItem(HIDE) || 0) < 7 * 864e5; } catch (x) { return false; } };
  function updateBar() {
    const st = state();
    // 컴퓨터 크롬 · 엣지는 설치할 수 있을 때(브라우저가 알려 줄 때)만 띠를 보인다
    const show = !hidden() && !['app', 'none'].includes(st.kind) && !(st.kind === 'pc' && !deferred);
    let bar = document.getElementById('igBar');
    if (!show) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'igBar'; bar.className = 'ig-bar';
      bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', '앱 설치 안내');
      bar.addEventListener('click', e => {
        if (e.target.closest('[data-ig=x]')) { try { localStorage.setItem(HIDE, Date.now()); } catch (x) {} updateBar(); }
        else if (e.target.closest('[data-ig=go]')) help();
      });
      document.body.appendChild(bar);
    }
    const good = ['chrome', 'safari', 'pc', 'macsafari'].includes(st.kind);
    const label = st.kind === 'pc' ? '💻 바탕 화면에 앱으로 설치' : st.kind === 'macsafari' ? '💻 Dock에 앱으로 추가' : good ? '📲 홈 화면에 앱으로 설치' : `⚠️ ${st.ios ? '사파리' : '크롬'}에서 열어야 설치돼요`;
    bar.classList.toggle('ig-warn', !good);
    bar.innerHTML = `<button type="button" class="ig-go" data-ig="go">${label}</button><button type="button" class="ig-x" data-ig="x" aria-label="7일 동안 숨기기">✕</button>`;
  }

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; updateBar(); });
  window.addEventListener('appinstalled', () => { deferred = null; const b = document.getElementById('igBar'); if (b) b.remove(); });

  // 앱 엔진 등록 + 새 버전 띠
  function newVersion(reg) {
    if (document.getElementById('igNew')) return;
    const b = document.createElement('div');
    b.id = 'igNew'; b.className = 'ig-bar ig-new';
    b.innerHTML = '<button type="button" class="ig-go">🔄 새 버전이 있어요 · 새로 고침</button>';
    b.onclick = () => { if (reg.waiting) reg.waiting.postMessage('skip'); else location.reload(); };
    document.body.appendChild(b);
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').then(reg => {
      if (reg.waiting && navigator.serviceWorker.controller) newVersion(reg);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) newVersion(reg); });
      });
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && document.getElementById('igNew')) { reloaded = true; location.reload(); } });
  }

  window.InstallGuide = { state, help, updateBar, url: APP };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateBar); else updateBar();
})();
