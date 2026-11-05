// 사이큐브 화면 틀 1판 — 문제 · 개념 카드 · 링크 이동 (데이터: data.js, scripts/build_app.py 가 만든다)
const Q = SC['문항'], C = SC['개념'];
const byId = Object.fromEntries(Q.map(q => [q.id, q]));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const view = document.getElementById('view'), panel = document.getElementById('panel');

// 푼 결과는 기기에 먼저 남기고 서버로 보낸다(sync.js)
function loadSet(k){ try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')); } catch(e){ return new Set(); } }
function saveSet(k, s){ try { localStorage.setItem(k, JSON.stringify([...s])); } catch(e){} window.scSync.set(k, s); }
// 선 아이콘(알렌처럼 32×32 테두리 단추 안에 18px)
const sv = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  q: sv('<path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5"/><circle cx="12" cy="18" r=".6" fill="currentColor"/>'),
  memo: sv('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  check: sv('<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.7 2.7L16 9.6"/>'),
  bm: sv('<path d="M7 4h10v16l-5-4-5 4z"/>'),
  comm: sv('<path d="M4 5h11v8H8l-4 3z"/><path d="M9 16h7l4 3v-9h-3"/>'),
  ai: sv('<path d="M4 5h16v11H9l-5 4z"/><text x="12" y="13.6" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">AI</text>'),
  ul: sv('<circle cx="5" cy="7" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="17" r="1" fill="currentColor"/><path d="M9 7h11M9 12h11M9 17h11"/>'),
  ol: sv('<path d="M4 6h1.5v4M4 10h3M4 14.5c.5-1 2.5-1 2.5.3 0 1-2.5 1.7-2.5 3.2h2.7M10 7h10M10 12h10M10 17h10"/>'),
  hi: sv('<path d="M14 4l6 6-8 8H6v-6z"/><path d="M4 21h8"/>'),
  color: sv('<path d="M7 17L12 5l5 12M8.6 13h6.8"/>'),
};
// 고른 답(정답 확인 전) — 답안지에 바로 보이도록 따로 남긴다
function loadPick(){ try { return JSON.parse(localStorage.getItem('sc.pick') || '{}'); } catch(e){ return {}; } }
function savePick(id, v){ const p = loadPick(); p[id] = v; try { localStorage.setItem('sc.pick', JSON.stringify(p)); } catch(e){} }
function clearRes(id){ window.scSync.cleared(id); const r = loadRes(); delete r[id]; const p = loadPick(); delete p[id];
  try { localStorage.setItem('sc.res', JSON.stringify(r)); localStorage.setItem('sc.pick', JSON.stringify(p)); } catch(e){} }
// 풀이 기록: 한 번 풀 때마다 한 줄 → 서버로 보낸다(정답률 · 평균 시간은 서버에서 계산)
function loadAttempts(){ try { return JSON.parse(localStorage.getItem('sc.attempts') || '[]'); } catch(e){ return []; } }
function logAttempt(a){ const l = loadAttempts(); l.push(Object.assign({id: crypto.randomUUID(), 날짜: new Date().toISOString()}, a)); try { localStorage.setItem('sc.attempts', JSON.stringify(l)); } catch(e){} window.scSync.attempt(); }
function loadRes(){ try { return JSON.parse(localStorage.getItem('sc.res') || '{}'); } catch(e){ return {}; } }
function saveRes(id, v){ const r = loadRes(); r[id] = v; try { localStorage.setItem('sc.res', JSON.stringify(r)); } catch(e){} }

function conceptHTML(c, inPanel){
  const meta = [c['다른이름'] && '다른 이름: ' + esc(c['다른이름']), c['종류'], c['위'] && '위 개념: ' + esc(c['위'])].filter(Boolean).join(' · ');
  const secs = c['절'].map(s => `<h2>${esc(s['제목'])}</h2><div class="x">${s.html}</div>`).join('');
  // 지금 보고 있는 문제는 같은 주소라 눌러도 움직이지 않는다 → 「지금 보는 문제」로 표시하고 누르면 문제 맨 위로(원장 10/30)
  const cur = (decodeURIComponent(location.hash).match(/^#\/문항\/(.+)$/) || [])[1] || '';
  const qs = c['문항'].map(id => id === cur
    ? `<li><a href="javascript:void(0)" onclick="window.scrollTo({top:0,behavior:'smooth'})"><b>${esc(srcOf(id))}</b><span class="badge">지금 보는 문제 · 맨 위로</span></a></li>`
    : `<li><a href="#/문항/${id}"><b>${esc(srcOf(id))}</b><span class="badge">${esc(byId[id]['자료유형'])}</span></a></li>`).join('');
  const rel = c['관련'].map(r => `<a class="lk" href="#/개념/${esc(r['카드'])}">${esc(r['말'])}</a>`).join(' · ');
  return `<div class="cname">${esc(c['이름'])}</div><div class="cmeta">${meta}</div>${secs}
    <h2>이 개념 관련 문제 풀기 (${c['문항'].length}문항)</h2><ul class="qlist">${qs || '<li class="sub">아직 이 개념이 나오는 문제가 없습니다.</li>'}</ul>
    <h2>관련 개념</h2><div class="rel">${rel}</div>`;
}

// 개념 카드 목록(도구 · 과목 메뉴에서 같이 씀)
function conceptListHTML(){
  const groups = {};
  Object.values(C).forEach(c => (groups[c['종류']] = groups[c['종류']] || []).push(c));
  return `<input class="search" id="find" placeholder="개념 찾기 (예: 내성, 엘니뇨)">` +
    Object.keys(groups).map(g => `<div class="group"><h3>${esc(g)}</h3><div class="chips">` +
      groups[g].sort((a, b) => b['문항'].length - a['문항'].length).map(c =>
        `<a class="chip" data-k="${esc(c['이름'] + ' ' + c['다른이름'])}" href="#/개념/${esc(c['이름'])}">${esc(c['이름'])}<span class="n">${c['문항'].length}</span></a>`).join('') +
      `</div></div>`).join('');
}
function wireFind(){
  const f = document.getElementById('find');
  if (f) f.oninput = () => document.querySelectorAll('.chip[data-k]').forEach(ch => ch.style.display = ch.dataset.k.includes(f.value.trim()) ? '' : 'none');
}
// #/목록/개념 = 개념 카드 목록. 그 밖의 옛 주소(#/목록)는 홈으로
function home(tab){
  if (tab !== '개념') return homeV();
  document.body.classList.remove('done'); crumbSet('개념 카드');
  view.innerHTML = `<h1>개념 카드</h1><div class="sub">${Object.keys(C).length}장 · 파란 낱말을 누르면 그 개념으로 갑니다</div>` + conceptListHTML();
  wireFind();
}

// 소단원 이름 — 단원키(과목코드:소단원)로 찾는다. 같은 이름의 소단원이 두 과목에 있어도 과목이 섞이지 않게(검토 L9)
function UNAME(u){ const byKey = String(u).includes(':'); for (const s of (window.SC_UNITS || [])) for (const m of s.majors) for (const d of m.mids) for (const x of d.subs) if (byKey ? x.key === u : x.unit === u) return x.name; return byKey ? String(u).split(':').pop() : u; }
// 화면 맨 위 한 줄 안내(없는 주소로 왔을 때 등 — 검토 L12)
function notice(msg){ const p = document.createElement('p'); p.className = 'exnote notice'; p.textContent = msg; view.prepend(p); }

// 해설 묶음(문제 화면 · 시험 답안지 함께): 바로 가기 단추 → 해설 → 보기 해설 → 더 알아보기(접어 둠) → 관련 개념 (원장 11/03 3차 검토)
function solHTML(s){
  const jump = [['sx-ex', '해설'], s.bogi && ['sx-bogi', '보기 해설 ㄱㄴㄷ'], s.more && ['sx-more', '더 알아보기'], s.rel && ['sx-rel', '관련 개념']].filter(Boolean);
  return `<div class="jump">${jump.map(j => `<a href="javascript:void 0" data-jump="${j[0]}">${j[1]}</a>`).join('')}</div>
    <h2 class="sech" id="sx-ex">해설</h2>${s.explain ? `<div class="x">${s.explain}</div>` : '<p class="sub">이 문항은 아직 해설이 없습니다.</p>'}
    ${s.bogi ? `<h2 class="sech bg" id="sx-bogi">보기 해설</h2><div class="x">${s.bogi}</div>` : ''}
    ${s.more ? `<details class="morebox" id="sx-more"><summary><h2 class="sech mo">더 알아보기<span class="tog"></span></h2></summary><div class="x">${s.more}</div></details>` : ''}
    ${s.rel ? `<h2 class="sech mo" id="sx-rel">관련 개념</h2><div class="rel">${s.rel}</div>` : ''}`;
}
function wireJump(root){
  root.querySelectorAll('[data-jump]').forEach(a => a.onclick = () => {
    const t = document.getElementById(a.dataset.jump); if (!t) return;
    if (t.tagName === 'DETAILS') t.open = true;
    t.scrollIntoView({behavior: 'smooth', block: 'start'});
  });
}
function relHTML(id){ const q = byId[id]; return q ? q['관련'].map(r => `<a class="lk" href="#/개념/${esc(r['카드'])}">${esc(r['말'])}</a>`).join(' · ') : ''; }

// 문항 한 장 화면의 부품 — 문제 화면 · 시험 해설(exam.js)이 똑같이 쓴다. 한 곳만 고치면 두 화면이 함께 바뀐다
// (원장 11/03 「약속했는데 평가 1회로 풀면 왜 또 다 달라지나」 — 결정 D-488)
function toolsHTML(id){
  return `<span class="tools">
    <button class="ic ${loadSet('sc.bm').has(id) ? 'on' : ''}" id="bmBtn" title="북마크(나중에 다시 볼 문제)">${ICON.bm}</button>
    <button class="ic ${loadSet('sc.unsure').has(id) ? 'on' : ''}" id="unsureBtn" title="잘 모르는 문제로 표시">${ICON.q}</button>
    <button class="ic" id="memoBtn" title="암기 메모 · 오답 정리">${ICON.memo}</button>
    <button class="ic" id="sheetBtn" title="답안지">${ICON.check}</button>
    <button class="ic" id="commBtn" title="커뮤니티(게시글)">${ICON.comm}</button>
    <button class="ic" id="aiBtn" title="AI에게 물어보기">${ICON.ai}</button></span>`;
}
function resultHTML(ok, extra){ return `<div class="result ${ok ? 'ok' : 'bad'}" id="result">${ok ? '정답입니다.' : '오답입니다.'}${extra || ''}</div>`; }
// 통계 상자: 정답률 · 누적 풀이 · 평균 / 나의 풀이 시간 · 내가 푼 횟수 (서버 question_stats)
function statInner(id, secs, times){
  return `<div>정답률 <b id="stR">—</b></div><div>누적 풀이 <b id="stN">—</b></div><div>평균 풀이 시간 <b id="stS">—</b> / 나의 풀이 시간 <b>${secs != null ? secs + '초' : '—'}</b></div>`
    + `<div class="sub" style="flex-basis:100%">내가 이 문제를 푼 횟수 ${times}번</div>`;
}
function fillStats(id){
  setTimeout(() => window.scSync.stats(id).then(s => { if (!s || !document.getElementById('stR')) return;
    document.getElementById('stR').textContent = s.rate == null ? '—' : s.rate + '%'; document.getElementById('stN').textContent = s.count + '번'; document.getElementById('stS').textContent = s.seconds == null ? '—' : s.seconds + '초'; }), 300);
}
function tailHTML(id){
  const q = byId[id], refs = q && q['참고'] || [];
  return `${refs.length ? `<h2>참고 자료</h2><ul class="refs">${refs.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
    <div class="qa-head"><div><h2 style="margin:0">커뮤니티 Q&A</h2><div class="sub">위 문제와 관련된 게시글이에요.</div></div>
      <button class="btn btn-p" id="askComm">게시글 작성하기</button></div>
    <div class="ask" id="qaBox"></div>`;
}
function wireItem(id, sheet){
  const tog = (k, btn) => { const s = loadSet(k); s.has(id) ? s.delete(id) : s.add(id); saveSet(k, s); btn.classList.toggle('on', s.has(id)); };
  document.getElementById('bmBtn').onclick = e => tog('sc.bm', e.currentTarget);
  document.getElementById('unsureBtn').onclick = e => tog('sc.unsure', e.currentTarget);
  document.getElementById('memoBtn').onclick = () => openMemo(id);
  document.getElementById('sheetBtn').onclick = sheet;
  document.getElementById('aiBtn').onclick = () => openAI(id);
  document.getElementById('commBtn').onclick = () => openComm(id);
  document.getElementById('askComm').onclick = () => openComm(id);
  const posts = loadPosts(id);
  document.getElementById('qaBox').innerHTML = posts.length
    ? posts.map(p => `<div class="post"><div class="sub">${esc(p['날짜'].slice(0, 10))}</div>${esc(p['글'])}</div>`).join('')
    : `<div style="text-align:center;width:100%">이해가 안 되거나 궁금한 점이 있다면<br><a class="qlk" href="javascript:void 0" id="askComm2">커뮤니티에 질문</a>해 보세요! · <a class="qlk" href="javascript:void 0" id="askAI2">AI에게 질문</a></div>`;
  const c2 = document.getElementById('askComm2'), a2 = document.getElementById('askAI2');
  if (c2) c2.onclick = () => openComm(id);
  if (a2) a2.onclick = () => openAI(id);
  wireJump(view);
}

function problem(id){
  const q = byId[id]; if (!q){ homeV(); return notice('찾는 문항이 없어 홈으로 왔습니다.'); }
  // 풀기 묶음(단원별 · 오답노트 · 오늘의 문항) 안의 문항이면 그 차례로 넘긴다. 묶음 밖이면 같은 소단원 안에서만(검토 L7)
  const S = sess(), inS = !!(S && S.ids.includes(id)), L = inS ? S.ids.map(x => byId[x]).filter(Boolean) : Q.filter(x => keyOf(x) === keyOf(q));
  const i = L.indexOf(q), prev = L[i - 1], next = L[i + 1];
  const subj = keyOf(q).split(':')[0];   // 「단원 목록」은 그 문항의 과목으로(검토 L8)
  // 받은 시험(아직 안 낸 것)에 든 문항은 시험을 낸 뒤에 연습으로 연다 — 정답이 미리 보이지 않게(검토 L1)
  if (lockedIds().has(id)){
    document.body.classList.remove('done'); crumbSet(inS ? S.title : UNAME(keyOf(q)));
    view.innerHTML = `${inS ? sessBar(S, id) : `<div class="bar1"><h1>${esc(UNAME(keyOf(q)))}</h1><div class="nav"><a class="btn btn-s" href="#/과목/${subj}">단원 목록</a></div></div>`}
      <div class="card" style="margin-top:16px"><b>받은 시험에 들어 있는 문항입니다</b><div class="sub">시험을 낸 뒤에 여기서 풀 수 있어요. <a href="#/시험">시험 목록</a></div></div>
      <div class="check" style="justify-content:space-between;margin-top:24px">${prev ? `<a class="btn btn-s" href="#/문항/${prev.id}">‹ 이전 문제</a>` : '<span></span>'}${next ? `<a class="btn btn-s" href="#/문항/${next.id}">다음 문제 ›</a>` : inS ? `<a class="btn btn-p" href="#/풀기/끝">끝내기 ›</a>` : '<span></span>'}</div>`;
    if (inS) wireSess(S);
    return;
  }
  const saved = loadRes()[id];
  let sel = saved ? saved.sel : 0;
  let t0 = Date.now();   // 나의 풀이 시간: 문제를 연 때부터 「정답 확인」까지 — [다시 풀기]를 누르면 다시 잰다(검토 L5)
  document.body.classList.toggle('done', !!saved);
  const rel = q['관련'].map(r => `<a class="lk" href="#/개념/${esc(r['카드'])}">${esc(r['말'])}</a>`).join(' · ');
  view.innerHTML = `
    ${inS ? sessBar(S, id) : `<div class="bar1"><h1>${esc(UNAME(keyOf(q)))}</h1>
      <div class="nav"><a class="btn btn-s" href="#/과목/${subj}">단원 목록</a>
        <a class="ic" ${prev ? `href="#/문항/${prev.id}"` : 'style="color:var(--line)"'}>‹</a><span>${i + 1} / ${L.length}</span>
        <a class="ic" ${next ? `href="#/문항/${next.id}"` : 'style="color:var(--line)"'}>›</a></div></div>`}
    <div class="bar2"><span class="qno">${esc(q['출처'])}</span><span class="badge">${esc(q['자료유형'])}</span>${q['배점'] ? `<span class="sub">${esc(q['배점'])}점</span>` : ''}
      <span style="flex:1"></span>
      ${toolsHTML(id)}</div>
    <div class="stem x">${q['문제']}</div>
    <div class="choices">${q['선지'].map((c, k) => `<div class="ch" role="button" data-k="${k + 1}"><button class="oxb cx"></button><span class="num">${k + 1}</span><span class="txt">${esc(c)}</span></div>`).join('')}</div>
    <div class="check" id="check"></div>
    <div class="after">
      <div class="result" id="result"></div>
      <div class="stat" id="stat"></div>
      ${solHTML({explain: q['해설'], bogi: q['보기해설'], more: q['더'], rel})}
      ${tailHTML(id)}
      <div class="check" style="justify-content:space-between;margin-top:32px">
        ${prev ? `<a class="btn btn-s" href="#/문항/${prev.id}">‹ 이전 문제</a>` : '<span></span>'}
        ${next ? `<a class="btn btn-s" href="#/문항/${next.id}">다음 문제 ›</a>` : inS ? `<a class="btn btn-p" href="#/풀기/끝">끝내기 ›</a>` : `<a class="btn btn-s" href="#/과목/${subj}">단원 목록</a>`}</div>
    </div>`;
  wireJump(view);
  const chs = [...view.querySelectorAll('.ch')], check = document.getElementById('check');
  const out = {};   // ①~⑤만 있는 문제: 선지별 ○ / ✕ 표시 {3: 'x'}
  const src = saved || loadPick()[id] || {};
  if (src.out && !Array.isArray(src.out)) Object.assign(out, src.out);
  let outCorrect = saved ? !!saved.outCorrect : false;  // 정답을 한 번이라도 지웠는가(알렌 「오답→정답」)
  // 합답형(원장 10/28 확정): <보기>의 ㄱ·ㄴ·ㄷ 앞에 작은 [○][✕] 단추 — 맞으면 ○, 틀리면 ✕ 를 한 번만 누른다(같은 단추를 다시 누르면 지움).
  // 글자는 지우거나 흐리게 하지 않는다(문장을 여러 번 다시 읽어야 하므로) — 단추 색만 바뀐다.
  // 아래 선지는 저절로 고르거나 지우지 않는다 — 학생이 직접 골라야 실수(ㄴ,ㄷ 인데 ③을 고르는 것)를 줄이는 연습이 된다.
  // 합답형이면 선지 ①~⑤ 의 [오답] 단추는 없앤다.
  const bogi = {};   // {ㄱ: 'o' | 'x'}
  Object.entries(saved ? saved.bogi || {} : {}).forEach(([b, v]) => { if (v === 'o' || v === 'x') bogi[b] = v; });
  const bls = [];
  view.querySelectorAll('.bogi > div:not(.bt)').forEach(d => {
    const m = d.textContent.match(/^([ㄱㄴㄷㄹ])\./); if (!m) return;
    d.classList.add('bl'); d.dataset.b = m[1];
    d.innerHTML = `<button class="oxb"></button><span class="bt2">${d.innerHTML}</span>`;
    d.onclick = () => {   // 칸뿐 아니라 그 줄 아무 데나 눌러도 된다(원장 10/28 — 읽다가 동사 위에서 바로 탁). 두 가지만: 처음 ○, 그다음 ○ ↔ ✕ (맞는 문장이 더 많아 ○ 먼저)
      if (document.body.classList.contains('done')) return;
      bogi[m[1]] = bogi[m[1]] === 'o' ? 'x' : 'o';
      savePick(id, {sel, bogi}); paint();
    };
    bls.push(d);
  });
  view.classList.toggle('hapdap', bls.length > 0);
  if (!saved){ const p = loadPick()[id]; if (p){ sel = p.sel || 0; Object.entries(p.bogi || {}).forEach(([b, v]) => { if (v === 'o' || v === 'x') bogi[b] = v; }); } }
  function paint(){
    const done = document.body.classList.contains('done');
    bls.forEach(d => { const v = bogi[d.dataset.b] || '', b = d.querySelector('.oxb'); b.className = 'oxb ' + v; b.textContent = v === 'x' ? '✕' : v === 'o' ? '○' : ''; });
    chs.forEach(b => {
      const k = +b.dataset.k;
      const cx = b.querySelector('.cx'), v = out[k] || ''; cx.className = 'oxb cx ' + v; cx.textContent = v === 'x' ? '✕' : v === 'o' ? '○' : '';
      b.classList.toggle('sel', k === sel);
      b.classList.toggle('correct', done && k === q['정답']);
      b.classList.toggle('mywrong', done && k === sel && sel !== q['정답']);
    });
    if (done){
      const ok = sel === q['정답'];
      document.getElementById('result').className = 'result ' + (ok ? 'ok' : 'bad');
      document.getElementById('result').innerHTML = (ok ? '정답입니다.' : '오답입니다.') +
        (ok && outCorrect ? '<span class="tag" title="처음에 오답이라고 지웠던 선지가 정답이었습니다">지웠던 선지 → 정답</span>' : '');
      const mine = loadAttempts().filter(a => a['문항'] === id), last = loadRes()[id] || {};
      document.getElementById('stat').innerHTML = statInner(id, last.secs, mine.length);
      fillStats(id);
      check.innerHTML = `<button class="btn btn-s" id="again">다시 풀기</button>`;
      document.getElementById('again').onclick = () => { document.body.classList.remove('done'); sel = 0; t0 = Date.now(); Object.keys(out).forEach(k => delete out[k]); Object.keys(bogi).forEach(b => delete bogi[b]); outCorrect = false; clearRes(id); paint(); };
    } else {
      check.innerHTML = `<button class="btn btn-p" id="go" ${sel ? '' : 'disabled'}>정답 확인</button>`;
      document.getElementById('go').onclick = () => { if (!sel) return; const secs = Math.round((Date.now() - t0) / 1000);
        document.body.classList.add('done'); saveRes(id, {sel, ok: sel === q['정답'], out, bogi, outCorrect, secs});
        logAttempt({문항: id, 고른답: sel, 정답: q['정답'], 맞음: sel === q['정답'], 초: secs, 보기표시: bogi, 선지표시: out, 지운정답: outCorrect}); paint(); };
    }
  }
  chs.forEach(b => b.onclick = e => {
    if (document.body.classList.contains('done')) return;
    const k = +b.dataset.k;
    if (e.target.closest('.cx')){   // ○ ↔ ✕ (처음 ○)
      out[k] = out[k] === 'o' ? 'x' : 'o'; if (out[k] === 'x' && k === q['정답']) outCorrect = true;
    } else sel = sel === k ? 0 : k;   // 고른 번호를 한 번 더 누르면 고르기를 푼다(원장 10/30)
    savePick(id, {sel, bogi, out});   // 고른 답은 바로 답안지에 보인다(정답 확인 전에도)
    paint();
  });
  wireItem(id, () => openSheet());
  if (inS){ wireSess(S); if (S.pAt){ view.querySelector('.stem').style.visibility = 'hidden'; view.querySelector('.choices').style.visibility = 'hidden'; } }
  crumbSet(inS ? S.title : UNAME(keyOf(q)));
  paint();
}

function concept(name){
  const c = C[name]; if (!c) return home('개념');
  document.body.classList.remove('done');
  view.innerHTML = `<div class="bar1"><span></span><div class="nav"><button class="btn btn-s" onclick="history.back()">‹ 뒤로</button><a class="btn btn-s" href="#/목록/개념">개념 목록</a></div></div>` + conceptHTML(c);
}

// 오른쪽 패널: 문제를 보면서 파란 낱말을 누르면 개념 카드를 옆에 연다(패널 안에서도 계속 이동)
// 패널 탭: 「개념 카드」 · 「메모」 (알렌의 시험메모 · 답안지처럼)
let stack = [];
// 시험 답안지의 한 문항 화면(#/시험/MP-…/답안지/3)도 문제 화면처럼 오른쪽 패널(개념 카드 · 메모 · 커뮤니티 · AI)을 쓴다
function onExamItem(){ return /^#\/시험\/[^/]+\/답안지\/\d+$/.test(decodeURIComponent(location.hash)); }
function curQ(){ const h = decodeURIComponent(location.hash); return h.startsWith('#/문항/') ? h.slice('#/문항/'.length) : onExamItem() ? window.scExamQ || null : null; }
function srcOf(id){ return byId[id] ? byId[id]['출처'] : (window.scExamSrc || ''); }
let panelTab = '';
// 오른쪽 창이 열려 있는 동안 그 아이콘(연필 · ✓ · 커뮤니티 · AI)을 파랗게 (원장 11/03 4차 검토)
function markIcons(){
  const on = document.body.classList.contains('panel-open') ? ({'메모': 'memoBtn', '답안지': 'sheetBtn', '커뮤니티': 'commBtn', 'AI': 'aiBtn'})[panelTab] : '';
  ['memoBtn', 'sheetBtn', 'commBtn', 'aiBtn'].forEach(k => { const b = document.getElementById(k); if (b) b.classList.toggle('act', k === on); });
}
function panelHead(tab){
  panelTab = tab;
  const tabs = [['개념', '개념 카드', stack.length > 0], ['메모', '암기 메모', !!curQ()], ['답안지', onExamItem() ? '내 답안지' : '답안지', true], ['커뮤니티', '커뮤니티', !!curQ()], ['AI', 'AI 질문', !!curQ()]];
  return `<div class="ph"><div class="ptabs">${tabs.filter(t => t[2]).map(t => `<button data-t="${t[0]}" class="${tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
    <span class="sp"></span><button class="ic" id="px" aria-label="닫기">✕</button></div>`;
}
function wirePanel(){
  document.getElementById('px').onclick = closePanel;
  const go = {'메모': () => openMemo(curQ()), '답안지': () => onExamItem() && window.scExamSheet ? window.scExamSheet() : openSheet(), '커뮤니티': () => openComm(curQ()), 'AI': () => openAI(curQ()), '개념': () => showConcept()};
  panel.querySelectorAll('.ptabs button').forEach(b => b.onclick = () => go[b.dataset.t]());
  panel.scrollTop = 0;
  document.body.classList.add('panel-open');
  markIcons();
}
function showConcept(){
  const name = stack[stack.length - 1], c = C[name]; if (!c) return;
  panel.innerHTML = panelHead('개념') + `<div class="ph">${stack.length > 1 ? '<button class="btn btn-s" id="pb">‹ 뒤로</button>' : ''}<span class="sp"></span>
    <a class="btn btn-s" href="#/개념/${esc(name)}">크게 보기</a></div>` + conceptHTML(c, true);
  wirePanel();
  const pb = document.getElementById('pb');
  if (pb) pb.onclick = () => { stack.pop(); showConcept(); };
}
function openPanel(name){ if (!C[name]) return; stack.push(name); showConcept(); }

// 메모장: 알렌 · 슬랙 같은 도구줄(본문▾ · B I U S · 목록 · 형광펜▾ · 글자색▾), 문제마다 따로, 적는 대로 이 기기에 자동 저장
function memoKey(id){ return 'sc.memo.' + id; }
const HILITE = [['없음', 'transparent'], ['노랑', '#FFF3A3'], ['초록', '#CFF5DF'], ['분홍', '#FFD6E0'], ['하늘', '#D6E6FF']];
const FCOLOR = [['검정', '#111111'], ['빨강', '#E5484D'], ['파랑', '#2F6BFF'], ['초록', '#22A06B'], ['회색', '#888888']];
function openMemo(id){
  if (!id) return;
  let html = ''; try { html = localStorage.getItem(memoKey(id)) || ''; } catch(e){}
  const pal = (kind, list) => `<div class="pal" id="pal-${kind}">${list.map(c => `<button data-${kind}="${c[1]}" title="${c[0]}"><span style="${kind === 'hi' ? 'background' : 'color'}:${c[1] === 'transparent' ? '#fff' : c[1]}">${kind === 'hi' ? (c[1] === 'transparent' ? '✕' : '&nbsp;') : 'A'}</span></button>`).join('')}</div>`;
  panel.innerHTML = panelHead('메모') + `<div class="sub">${esc(srcOf(id))}</div>
    <div class="tbar">
      <select id="fmt" title="글자 모양"><option value="p">본문</option><option value="h3">제목</option><option value="h4">소제목</option></select>
      <span class="sep"></span>
      <button data-c="bold" title="굵게 (Ctrl+B)"><b>B</b></button><button data-c="italic" title="기울임 (Ctrl+I)"><i>I</i></button>
      <button data-c="underline" title="밑줄 (Ctrl+U)"><u>U</u></button><button data-c="strikeThrough" title="취소선"><s>S</s></button>
      <span class="sep"></span>
      <button data-c="insertUnorderedList" title="점 목록">${ICON.ul}</button><button data-c="insertOrderedList" title="번호 목록">${ICON.ol}</button>
      <span class="sep"></span>
      <span class="dd"><button id="hiBtn" title="형광펜 (한 번 더 누르면 지워짐)">${ICON.hi}<span class="bar" id="hiBar" style="background:#FFF3A3"></span></button><button class="caret" data-open="hi" title="형광펜 색">▾</button>${pal('hi', HILITE)}</span>
      <span class="dd"><button id="fcBtn" title="글자 색">${ICON.color}<span class="bar" id="fcBar" style="background:#E5484D"></span></button><button class="caret" data-open="fc" title="글자 색 고르기">▾</button>${pal('fc', FCOLOR)}</span>
    </div>
    <div class="memo" id="memo" contenteditable="true">${html}</div>
    <div class="mhelp">옵시디언처럼 바로 써도 됩니다 · <code># </code>제목 · <code>## </code>소제목 · <code>- </code>목록 · <code>1. </code>번호 · <code>&gt; </code>인용 · <code>**굵게**</code> · <code>==형광==</code> · <code>[[개념]]</code> 개념 카드 링크</div>
    <div class="mfoot"><span id="msave">적는 대로 자동 저장</span><span id="mcount"></span></div>`;
  wirePanel();
  const m = document.getElementById('memo'), cnt = document.getElementById('mcount'), saveTxt = document.getElementById('msave');
  let hi = '#FFF3A3', fc = '#E5484D', timer;
  const count = () => cnt.textContent = String(m.innerText.trim().length).padStart(4, '0') + ' / 10000자';
  const save = () => { count(); clearTimeout(timer); timer = setTimeout(() => {
    try { localStorage.setItem(memoKey(id), m.innerHTML); saveTxt.textContent = '저장됨 ✓'; } catch(e){ saveTxt.textContent = '이 브라우저는 저장을 막아 두었습니다'; } window.scSync.memo(id, m.innerHTML); }, 400); };
  m.oninput = e => { mdShortcut(m); save(); };
  const run = (cmd, val) => { m.focus(); document.execCommand('styleWithCSS', false, true); document.execCommand(cmd, false, val); save(); };
  // 형광펜: 이미 같은 색이 칠해진 곳을 다시 누르면 지운다(한 번 더 누르면 해제)
  const selBg = () => { const n = getSelection().anchorNode; const el = n && (n.nodeType === 3 ? n.parentElement : n); return el ? getComputedStyle(el).backgroundColor : ''; };
  const rgb = h => { const d = document.createElement('i'); d.style.color = h; document.body.appendChild(d); const v = getComputedStyle(d).color; d.remove(); return v; };
  panel.querySelectorAll('.tbar [data-c]').forEach(b => b.onmousedown = e => { e.preventDefault(); run(b.dataset.c); });
  document.getElementById('fmt').onchange = e => { run('formatBlock', e.target.value); e.target.value = 'p'; };
  document.getElementById('hiBtn').onmousedown = e => { e.preventDefault(); run('hiliteColor', selBg() === rgb(hi) ? 'transparent' : hi); };
  document.getElementById('fcBtn').onmousedown = e => { e.preventDefault(); run('foreColor', fc); };
  panel.querySelectorAll('.caret').forEach(b => b.onmousedown = e => {
    e.preventDefault(); const p = document.getElementById('pal-' + b.dataset.open); const open = p.classList.contains('on');
    panel.querySelectorAll('.pal').forEach(x => x.classList.remove('on')); p.classList.toggle('on', !open); });
  panel.querySelectorAll('[data-hi]').forEach(b => b.onmousedown = e => {
    e.preventDefault(); const v = b.dataset.hi; if (v !== 'transparent'){ hi = v; document.getElementById('hiBar').style.background = v; }
    run('hiliteColor', v); b.closest('.pal').classList.remove('on'); });
  panel.querySelectorAll('[data-fc]').forEach(b => b.onmousedown = e => {
    e.preventDefault(); fc = b.dataset.fc; document.getElementById('fcBar').style.background = fc; run('foreColor', fc); b.closest('.pal').classList.remove('on'); });
  count(); m.focus();
}


// 옵시디언식 입력: 줄 앞 「# · ## · - · 1. · > 」+띄어쓰기 → 제목 · 목록 · 인용, 「**굵게** · ==형광== · [[개념]]」 → 바로 바뀜
function mdShortcut(m){
  const sel = getSelection(); if (!sel.rangeCount) return;
  const node = sel.anchorNode; if (!node || node.nodeType !== 3 || !m.contains(node)) return;
  const off = sel.anchorOffset, text = node.textContent, before = text.slice(0, off).replace(/\u00a0/g, ' ');
  const caretTo = (n, o) => { const r = document.createRange(); r.setStart(n, o); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); };
  const blocks = [[/^## $/, 'h4'], [/^# $/, 'h3'], [/^> $/, 'blockquote'], [/^[-*] $/, 'ul'], [/^1[.)] $/, 'ol']];
  const atStart = !node.previousSibling;
  for (const [re, t] of blocks){
    if (atStart && re.test(before)){
      node.textContent = text.slice(off) || '\u200b'; caretTo(node, 0);
      setTimeout(() => {   // 입력 중에는 서식 명령이 무시되므로 바로 다음에 실행
        if (t === 'ul') document.execCommand('insertUnorderedList');
        else if (t === 'ol') document.execCommand('insertOrderedList');
        else document.execCommand('formatBlock', false, '<' + t + '>');
        m.dispatchEvent(new Event('input'));
      }, 0);
      return;
    }
  }
  const inl = [[/\*\*([^*]+)\*\*$/, 'b'], [/==([^=]+)==$/, 'mark'], [/\[\[([^\]]+)\]\]$/, 'a']];
  for (const [re, tag] of inl){
    const mm = before.match(re); if (!mm) continue;
    const r = document.createRange(); r.setStart(node, off - mm[0].length); r.setEnd(node, off); r.deleteContents();
    const el = document.createElement(tag); el.textContent = mm[1];
    if (tag === 'a'){ const name = C[mm[1]] ? mm[1] : (Object.values(C).find(c => (' · ' + c['다른이름'] + ' · ').includes(' · ' + mm[1] + ' · ')) || {})['이름'];
      if (name){ el.className = 'lk'; el.href = '#/개념/' + name; el.contentEditable = 'false'; } else { el.className = 'nolk'; el.title = '아직 개념 카드가 없는 낱말'; } }
    r.insertNode(el);
    const after = document.createTextNode('\u200b'); el.after(after); caretTo(after, 1);
    return;
  }
}


// 커뮤니티: 문제마다 게시글. 지금은 이 기기에만 남고, 서버가 생기면 학생 모두가 함께 본다(선배 글을 후배가 보는 Q&A — 원장 10/28).
function loadPosts(id){ try { return JSON.parse(localStorage.getItem('sc.comm.' + id) || '[]'); } catch(e){ return []; } }
function openComm(id){
  if (!id) return;
  const posts = loadPosts(id);
  panel.innerHTML = panelHead('커뮤니티') + `<div class="sub">${esc(srcOf(id))}</div>
    <textarea id="cq" class="search" style="height:120px;border-radius:6px;padding:12px;margin-top:8px" placeholder="이 문제에서 헷갈린 점이나 다른 학생에게 도움이 될 풀이를 적어 주세요."></textarea>
    <button class="btn btn-p" id="cqGo" style="width:100%;justify-content:center">게시글 작성하기</button>
    <div class="sub" style="margin:8px 0 16px">지금은 이 기기에만 저장됩니다. 학원 서버가 생기면 모든 학생이 함께 봅니다.</div>
    ${posts.map(p => `<div class="post"><div class="sub">${esc(p['날짜'].slice(0, 10))}</div>${esc(p['글'])}</div>`).join('') || '<div class="sub">아직 게시글이 없습니다.</div>'}`;
  wirePanel();
  document.getElementById('cqGo').onclick = () => {
    const t = document.getElementById('cq').value.trim(); if (!t) return;
    const l = loadPosts(id); l.unshift({글: t, 날짜: new Date().toISOString()});
    try { localStorage.setItem('sc.comm.' + id, JSON.stringify(l)); } catch(e){}
    openComm(id);
    const box = document.getElementById('qaBox');
    if (box) box.innerHTML = l.map(p => `<div class="post"><div class="sub">${esc(p['날짜'].slice(0, 10))}</div>${esc(p['글'])}</div>`).join('');
  };
}

// 답안지: 17문항 번호마다 내가 고른 답 · 정답 · 잘 모르는 문제(?)를 한눈에, 누르면 그 문제로
// 범위: 풀기 묶음 안이면 그 묶음, 밖이면 지금 문항의 소단원(검토 L6)
function openSheet(){
  const res = loadRes(), pick = loadPick(), un = loadSet('sc.unsure'), cur = curQ();
  const S = sess(), cq = byId[cur];
  const L = S && S.ids.includes(cur) ? S.ids.map(x => byId[x]).filter(Boolean) : cq ? Q.filter(x => keyOf(x) === keyOf(cq)) : Q;
  panel.innerHTML = panelHead('답안지') + `<div class="sheet">` + L.map((q, i) => {
    const r = res[q.id], my = r ? r.sel : (pick[q.id] || {}).sel;
    const dots = [1, 2, 3, 4, 5].map(k => {
      let c = '';
      if (r) c = k === q['정답'] ? (k === my ? 'ok' : 'ans') : (k === my ? 'bad' : '');   // 정답 확인 뒤
      else if (k === my) c = 'mine';                                                      // 정답 확인 전: 고른 답만
      return `<span class="dot ${c}">${k}</span>`;
    }).join('');
    const mark = r ? `<span class="sr ${r.ok ? 'o' : 'x'}">${r.ok ? '○' : '✕'}</span>` : `<span class="sr"></span>`;
    return `<a class="srow ${q.id === cur ? 'cur' : ''}" href="#/문항/${q.id}"><span class="sn">${i + 1}</span>${mark}${dots}<span class="sq">${un.has(q.id) ? '?' : ''}</span></a>`;
  }).join('') + `</div><div class="legend"><span><span class="dot mine"></span> 고른 답(정답 확인 전)</span><span><span class="dot ok"></span> 내가 고른 답(맞음)</span>
    <span><span class="dot bad"></span> 내가 고른 답(틀림)</span><span><span class="dot ans"></span> 정답</span><span><b class="sq">?</b> 잘 모르는 문제</span></div>`;
  wirePanel();
}

// AI 질문: 자리만 먼저(서버에 올릴 때 연결 — 지금은 적어 둔 질문이 이 기기에 남는다)
function openAI(id){
  if (!id) return;
  let t = ''; try { t = localStorage.getItem('sc.ai.' + id) || ''; } catch(e){}
  panel.innerHTML = panelHead('AI') + `<div class="sub">${esc(srcOf(id))}</div>
    <p>이 문제에서 궁금한 점을 적어 두세요. <b>AI 답변은 앱을 서버에 올릴 때 연결합니다.</b></p>
    <textarea id="aiq" class="search" style="height:140px;border-radius:6px;padding:12px" placeholder="예: ㄷ에서 비율은 왜 Ⅱ가 더 높아요?">${esc(t)}</textarea>`;
  wirePanel();
  document.getElementById('aiq').oninput = e => { try { localStorage.setItem('sc.ai.' + id, e.target.value); } catch(_){} };
}
function closePanel(){ stack = []; document.body.classList.remove('panel-open'); markIcons(); }

document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#/개념/"]');
  if (!a) return;
  const onProblem = decodeURIComponent(location.hash).startsWith('#/문항/') || onExamItem() || !!a.closest('.panel');
  if (onProblem && !a.classList.contains('btn')){
    e.preventDefault();
    openPanel(decodeURIComponent(a.getAttribute('href').slice('#/개념/'.length)));
  }
});

// ───── 태블릿 틀 · 풀기 엔진 · 오답노트 · 오늘의 10문항 (원장 11/03 — 결정 D-483 · D-484 · D-489) ─────
// 과목 · 단원 사다리는 units.js(단원체계.csv 에서 뽑음). 문항의 열쇠 = 과목코드:소단원
const UNITS = window.SC_UNITS || [], SUBJ = Object.fromEntries(UNITS.map(s => [s.code, s]));
const subsOf = s => s.majors.flatMap(m => m.mids.flatMap(d => d.subs));
const keyOf = q => q['단원키'] || ('IS1:' + q['소단원']);
const qsOfKeys = keys => { const k = new Set(keys); return Q.filter(q => k.has(keyOf(q))); };
const SCIENCE_APP = 'https://miyeongssam.github.io/choigwahak-science/science-app/';   // 링크모음 L-115
const today = () => new Date().toLocaleDateString('sv-SE');
const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '—';

// 풀이 이력(연습 + 시험)을 문항마다 시간 순으로 — 시험 풀이는 sync.js 가 sc.examAtt 에 내려 둔다
function loadExamAtt(){ try { return JSON.parse(localStorage.getItem('sc.examAtt') || '[]'); } catch(e){ return []; } }
function solveLog(){
  const h = {};
  loadAttempts().forEach(a => (h[a['문항']] = h[a['문항']] || []).push({ok: !!a['맞음'], at: a['날짜']}));
  loadExamAtt().forEach(a => (h[a.q] = h[a.q] || []).push({ok: !!a.ok, at: a.at}));
  Object.values(h).forEach(l => l.sort((x, y) => String(x.at).localeCompare(String(y.at))));
  return h;
}
// 오답노트: 한 번이라도 틀렸고, 마지막 두 번을 연달아 맞히지 않은 문항(두 번 연달아 맞히면 저절로 빠짐 — D-489)
function wrongIds(h){ return Object.keys(h).filter(id => byId[id] && h[id].some(x => !x.ok) && !(h[id].length >= 2 && h[id].slice(-2).every(x => x.ok))); }
function memoIds(){ return Q.filter(q => { try { return (localStorage.getItem('sc.memo.' + q.id) || '').replace(/<[^>]+>/g, '').trim(); } catch(e){ return false; } }).map(q => q.id); }

// 풀기 엔진 하나 — 범위(소단원 열쇠) × 어떤 문항 × 몇 문항 × 섞기. 단원별 풀기 · 오답노트 · 오늘의 10문항이 모두 이것을 쓴다
function pickIds({keys, ids, kind, n, shuffle}){
  const h = solveLog(), wrong = new Set(wrongIds(h)), un = loadSet('sc.unsure'), bm = loadSet('sc.bm');
  const F = {'전체': () => true, '안 푼 것': q => !h[q.id], '틀린 것': q => wrong.has(q.id), '헷갈림 · 북마크': q => un.has(q.id) || bm.has(q.id)};
  const lock = lockedIds();   // 받은 시험(아직 안 낸 것)의 문항은 연습 묶음에서 뺀다(검토 L1)
  let list = (ids ? ids.map(i => byId[i]).filter(Boolean) : keys ? qsOfKeys(keys) : Q).filter(q => !lock.has(q.id)).filter(F[kind] || F['전체']);
  if (shuffle) list = list.map(q => [Math.random(), q]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  return list.slice(0, n === '전부' || !n ? list.length : +n).map(q => q.id);
}

// 풀기 묶음(세션): 문제 화면을 차례로 넘긴다. 타이머는 25문항당 40분 비율, 멈춤 됨(D-492)
const SKEY2 = 'sc.sess';
function sess(){ try { return JSON.parse(localStorage.getItem(SKEY2)); } catch(e){ return null; } }
function saveSess(s){ try { s ? localStorage.setItem(SKEY2, JSON.stringify(s)) : localStorage.removeItem(SKEY2); } catch(e){} }
function startSess(title, ids, timer, keep){
  if (!ids.length) return alert('고른 조건에 맞는 문항이 없습니다.');
  if (!keep) ids.forEach(id => { if (loadRes()[id]) clearRes(id); });
  saveSess({title, ids, t0: Date.now(), mins: timer ? Math.max(1, Math.round(ids.length * 40 / 25)) : 0, paused: 0, pAt: null, day: today()});
  const first = keep ? ids.find(id => !loadRes()[id]) || ids[0] : ids[0];
  location.hash = '#/문항/' + first;
}
let sesClock = null;
function sesLeft(S){ const now = Date.now(); return Math.round(S.mins * 60 - (now - S.t0 - S.paused - (S.pAt ? now - S.pAt : 0)) / 1000); }
function sessBar(S, id){
  const i = S.ids.indexOf(id), n = S.ids.length, prev = S.ids[i - 1], next = S.ids[i + 1];
  return `<div class="bar1"><h1>${esc(S.title)}</h1>
    <div class="nav">${S.mins ? `<span class="extime" id="sesT"></span><button class="btn btn-s" id="sesP">${S.pAt ? '▶ 이어 풀기' : '⏸ 멈춤'}</button>` : ''}
      <a class="ic" ${prev ? `href="#/문항/${prev}"` : 'style="color:var(--line)"'}>‹</a><span>${i + 1} / ${n}</span>
      <a class="ic" ${next ? `href="#/문항/${next}"` : 'style="color:var(--line)"'}>›</a><a class="btn btn-s" href="#/풀기/끝">끝내기</a></div></div>`;
}
function wireSess(S){
  clearInterval(sesClock);
  const T = document.getElementById('sesT'); if (!T) return;
  const tick = () => { const s = sesLeft(S); T.textContent = s > 0 ? `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : '시간 끝'; T.classList.toggle('low', s <= 60);
    if (s <= 0 && !S.pAt){ clearInterval(sesClock); location.hash = '#/풀기/끝/시간'; } };   // 시간이 다 되면 결과로(검토 L4)
  tick(); sesClock = setInterval(tick, 1000);
  document.getElementById('sesP').onclick = () => {
    const s2 = sess(); if (s2.pAt){ s2.paused += Date.now() - s2.pAt; s2.pAt = null; } else s2.pAt = Date.now();
    saveSess(s2); problem(decodeURIComponent(location.hash).slice('#/문항/'.length));
  };
}
function sessEnd(why){
  const S = sess(); if (!S) return homeV();
  const res = loadRes(), done = S.ids.filter(id => res[id]), ok = done.filter(id => res[id].ok), bad = done.filter(id => !res[id].ok);
  // 안 푼 문항이 있으면 한 번 묻는다(검토 B5 · 원장 11/05 아이패드). 시간이 다 돼서 온 때는 묻지 않음
  if (why !== '시간' && done.length < S.ids.length && !confirm(`${S.ids.length - done.length}문항을 아직 안 풀었어요. 끝낼까요?`)){ history.back(); return; }
  saveSess(null);   // 끝낸 묶음은 지운다 — 그 문항을 다시 열어도 묶음 바 · 타이머가 다시 뜨지 않게(검토 L3)
  view.innerHTML = `<div class="excrumb"><a href="#/">홈</a> › ${esc(S.title)}</div><h1>${esc(S.title)} — 결과</h1>
    <div class="cards3"><div class="card"><div class="sub">맞힌 문항</div><div class="exscore">${ok.length} / ${S.ids.length}</div></div>
      <div class="card"><div class="sub">푼 문항</div><div class="exscore">${done.length}</div></div><div class="card"><div class="sub">틀린 문항</div><div class="exscore" style="color:var(--danger)">${bad.length}</div></div></div>
    <div class="check" style="justify-content:flex-start;gap:8px;flex-wrap:wrap">
      ${bad.length ? '<button class="btn btn-p" id="seBad">틀린 것만 다시 풀기</button>' : ''}<a class="btn btn-s" href="#/오답노트">오답노트</a><a class="btn btn-s" href="#/">홈</a></div>
    <h2 class="exh2">문항</h2>${qRows(S.ids)}`;
  const b = document.getElementById('seBad'); if (b) b.onclick = () => startSess(S.title + ' · 틀린 것', bad, !!S.mins);
}
// 문항 한 줄(번호 · 출처 · 소단원 · 첫 문장 · ○✕)
function qRows(ids, extra){
  const res = loadRes();
  return `<div class="rows">${ids.map((id, i) => { const q = byId[id]; if (!q) return ''; const r = res[id];
    const first = (q['문제'].match(/<p[^>]*>(.*?)<\/p>/) || ['', ''])[1].replace(/<[^>]+>/g, '');
    return `<a class="row" href="#/문항/${id}"><span class="no">${i + 1}</span><span class="t">${esc(q['출처'])} <span class="sub">· ${esc(UNAME(keyOf(q)))}</span><span class="pv">${first}</span></span>
      ${extra ? `<span class="sub">${extra(id)}</span>` : ''}<span class="mark ${r ? (r.ok ? 'ok' : 'bad') : ''}">${r ? (r.ok ? '○' : '✕') : ''}</span></a>`; }).join('')}</div>`;
}

// 오늘의 10문항: 하루 한 묶음 — 틀린 것 → 헷갈림 · 북마크 → 안 푼 것 차례로 채움(D-489). 설정은 마이에서
function todaySet(){ try { return Object.assign({on: true, n: 10}, JSON.parse(localStorage.getItem('sc.todaySet') || '{}')); } catch(e){ return {on: true, n: 10}; } }
function todayPack(){
  let t = null; try { t = JSON.parse(localStorage.getItem('sc.today') || 'null'); } catch(e){}
  const set = todaySet();
  if (!t || t.day !== today() || t.n !== set.n){
    const seen = new Set(), ids = [];
    ['틀린 것', '헷갈림 · 북마크', '안 푼 것', '전체'].forEach(kind => pickIds({kind, shuffle: true}).forEach(id => { if (ids.length < set.n && !seen.has(id)){ seen.add(id); ids.push(id); } }));
    t = {day: today(), n: set.n, ids, started: false};
    try { localStorage.setItem('sc.today', JSON.stringify(t)); } catch(e){}
  }
  const lock = lockedIds();   // 받은 시험이 새로 오면 그 문항은 오늘 묶음에서도 뺀다(검토 L1)
  return Object.assign({}, t, {ids: t.ids.filter(id => !lock.has(id))});
}

// 왼쪽 메뉴(태블릿 · PC) — 좁은 화면에서는 위쪽 가로 줄
const SIDE = [['홈', '#/', 'home'], ['시험', '#/시험', 'exam'], ['오답노트', '#/오답노트', 'note'], ['도구', '#/도구', 'tool'], ['마이', '#/마이', 'my']];
function sideNav(){
  let nav = document.getElementById('side');
  if (!nav){ nav = document.createElement('nav'); nav.id = 'side'; nav.className = 'side'; document.querySelector('.layout').prepend(nav); }
  const h = decodeURIComponent(location.hash || '#/');
  const on = href => href === '#/' ? (h === '#/' || h === '#' || h === '') : h.startsWith(href);
  const subj = [['수능 통합과학', 'IS1'], ['물리', 'PH2'], ['화학', 'CH2'], ['생명', 'BI2']];
  const curS = (h.match(/^#\/과목\/([^/]+)/) || [])[1];
  const grp = curS && SUBJ[curS] ? SUBJ[curS].group : '';
  nav.innerHTML = SIDE.map(([t, href]) => `<a class="si ${on(href) ? 'on' : ''}" href="${href}">${t}${t === '시험' ? '<b class="sbadge" id="sideExam"></b>' : ''}</a>`).join('')
    + `<div class="sh">과목</div>` + subj.map(([t, c]) => `<a class="si ${curS && (curS === c || (grp && grp === (SUBJ[c] || {}).group && c !== 'IS1')) ? 'on' : ''}" href="#/과목/${c}">${t}</a>`).join('');
}
// 시험 목록은 1분 동안 기억해 화면을 옮길 때마다 서버를 부르지 않는다(검토 L11). 시험을 시작 · 멈춤 · 제출하면 exam.js 가 지운다
let examCache = null, examCacheAt = 0;
async function examList(force){
  if (!force && examCache && Date.now() - examCacheAt < 60000) return examCache;
  const { data } = await sb.rpc('exam_list');
  examCache = data || []; examCacheAt = Date.now();
  // 받은 시험 가운데 아직 한 번도 안 낸 것의 문항 = 연습에서 잠글 문항(검토 L1). 원장님(관리자)은 잠그지 않음
  const lock = window.scIsAdmin ? [] : examCache.filter(s => s.open && !(s.tries || []).length).flatMap(s => s.qids || []);
  try { localStorage.setItem('sc.lock', JSON.stringify(lock)); } catch(e){}
  return examCache;
}
window.scExamListReset = () => { examCache = null; };
function lockedIds(){ try { return new Set(JSON.parse(localStorage.getItem('sc.lock') || '[]')); } catch(e){ return new Set(); } }
async function examCount(){
  try { return (await examList()).filter(s => s.open && (s.started || !(s.tries || []).length)); } catch(e){ return []; }
}
function crumbSet(t){ const c = document.querySelector('.top .crumb'); if (c) c.textContent = t; }

// 홈: 위 세 칸(오늘의 10문항 · 받은 시험 · 다시 볼 것) → 수능 통합과학 대단원 6 → 과목별(물리 · 화학 · 생명) — 확정 D-484
function homeV(){
  document.body.classList.remove('done'); crumbSet('홈');
  const h = solveLog(), wrong = wrongIds(h), un = loadSet('sc.unsure'), bm = loadSet('sc.bm');
  const t = todayPack(), set = todaySet(), res = loadRes(), solved = t.ids.filter(id => res[id]).length;
  const IS = SUBJ.IS1;
  const majorStat = m => { const qs = qsOfKeys(m.mids.flatMap(d => d.subs.map(s => s.key))); let a = 0, c = 0; qs.forEach(q => (h[q.id] || []).forEach(x => { a++; if (x.ok) c++; })); return {n: qs.length, rate: pct(c, a)}; };
  const groups = [['물리', ['PH2', 'ME2', 'EQ3']], ['화학', ['CH2', 'MT2', 'CR3']], ['생명', ['BI2', 'CM2', 'BG3']]];
  view.innerHTML = `<h1>오늘도 해 볼까요</h1>
    <div class="cards3">
      ${set.on ? `<a class="card hl" href="javascript:void 0" id="hmToday"><b>오늘의 ${set.n}문항</b><div class="sub">${solved >= t.ids.length && t.ids.length ? '오늘 끝 ✓' : `${solved} / ${t.ids.length} 풂 · 시작 ›`}</div></a>` : ''}
      <a class="card" href="#/시험"><b>받은 시험 <span id="hmExamN"></span></b><div class="sub" id="hmExam">불러오는 중…</div></a>
      <a class="card" href="#/오답노트"><b>다시 볼 것</b><div class="sub">틀림 ${wrong.length} · 헷갈림 ${un.size} · 북마크 ${bm.size}</div></a></div>
    <h2 class="exh2">수능 통합과학</h2>
    <div class="g6">${IS.majors.map((m, i) => { const st = majorStat(m); return `<a class="ucard ${st.n ? '' : 'off'}" href="#/과목/IS1/단원/${i}"><b>${esc(m.name.split(' ')[0])}</b><span>${esc(m.name.split(' ').slice(1).join(' '))}</span><small>${st.n ? `${st.n}문항 · 정답률 ${st.rate}` : '준비 중'}</small></a>`; }).join('')}</div>
    <h2 class="exh2">과목별</h2>
    <div class="cards3">${groups.map(([g, codes]) => `<div class="card"><b>${g}</b><div class="sub">${codes.map(c => { const n = qsOfKeys(subsOf(SUBJ[c]).map(s => s.key)).length; return `<a href="#/과목/${c}">${esc(SUBJ[c].name)}</a>${n ? '' : ' <span class="muted">준비 중</span>'}`; }).join(' · ')}</div></div>`).join('')}</div>`;
  const hb = document.getElementById('hmToday');
  if (hb) hb.onclick = () => { const S = sess(), tp = todayPack(); startSess(`오늘의 ${tp.n}문항`, tp.ids, false, S && S.day === today() && S.title.startsWith('오늘의')); };
  examCount().then(list => { const e1 = document.getElementById('hmExam'); if (!e1) return;
    document.getElementById('hmExamN').textContent = list.length || '';
    e1.innerHTML = list.length ? list.slice(0, 2).map(s => esc(s.name) + (s.closes_at ? ` · ${new Date(s.closes_at).toLocaleDateString('ko-KR', {month: 'numeric', day: 'numeric'})}까지` : '')).join('<br>') : '지금 풀 시험이 없습니다'; });
}

// 과목 화면: 위 메뉴(단원별로 풀기 · 기출 모의고사 · 학원 모의평가 · 개념 카드 · 개념 영상 · 학교 기출은 관리자만)
function subjectV(code, tab, arg){
  const S0 = SUBJ[code] || SUBJ.IS1; code = S0.code; tab = tab || '단원';
  document.body.classList.remove('done'); crumbSet(S0.name);
  const sibs = S0.group === '통합' ? [] : UNITS.filter(s => s.group === S0.group);
  const tabs = [['단원', '단원별로 풀기'], ['기출', '기출 모의고사'], ['평가', '학원 모의평가'], ['개념', '개념 카드'], ['영상', '개념 영상']].concat(window.scIsAdmin ? [['학교', '학교 기출 · 관리자만']] : []);
  const head = `${sibs.length ? `<div class="chips" style="margin-bottom:8px">${sibs.map(s => `<a class="chip ${s.code === code ? 'on' : ''}" href="#/과목/${s.code}">${esc(s.name)}</a>`).join('')}</div>` : ''}
    <h1>${esc(S0.name)}</h1><div class="menu">${tabs.map(([k, t]) => `<a class="${k === tab ? 'on' : ''}" href="#/과목/${code}/${k}">${t}</a>`).join('')}</div>`;
  if (tab === '단원') return unitPick(S0, head, arg);
  if (tab === '개념'){ view.innerHTML = head + conceptListHTML(); wireFind(); return; }
  // 학원 모의평가: 그 과목 시험만(원장 11/04 ⑥ · 검토 S8). 단추를 누르면 시험 목록을 거치지 않고 바로(검토 B4)
  if (tab === '평가'){ view.innerHTML = head + '<p class="exnote">불러오는 중…</p>';
    examList().then(data => {
      const mine = data.filter(s => (s.subjects || []).includes(code));
      const btn = s => { const n = (s.tries || []).length; return !s.open ? (n ? ['복습', `#/시험/${s.id}/답안지`] : null) : s.started ? ['이어 풀기', `#/시험/${s.id}`] : n ? ['다시 풀기', ''] : ['시작하기', '']; };
      view.innerHTML = head + (mine.map(s => { const b = btn(s); return `<div class="exrow"><div class="top"><div class="grow"><b>${esc(s.name)}</b><div class="exnote">${s.count}문항 · ${s.minutes || '—'}분${(s.tries || []).length ? ` · ${s.tries.length}회 풂 · 최근 ${s.tries[s.tries.length - 1].score}점` : ''}</div></div>${b ? `<a class="btn btn-s" href="${b[1] || 'javascript:void 0'}" ${b[1] ? '' : `data-go="${esc(s.id)}"`}>${b[0]} ›</a>` : ''}</div></div>`; }).join('') || '<p class="exnote">이 과목의 학원 모의평가는 아직 없습니다.</p>');
      view.querySelectorAll('[data-go]').forEach(a => a.onclick = () => window.scExamGo(data.find(s => s.id === a.dataset.go)));
    }).catch(() => {}); return; }
  if (tab === '기출'){
    // 기출 머리 글은 과목마다(원장 11/04 ⑦). 40분 · 25문항 · 50점은 수능 통합과학만(D-486). 2022 선택과목은 아직 시행된 학평 · 모평 · 수능이 없다
    if (code !== 'IS1'){ view.innerHTML = head + '<p class="exnote">이 과목은 아직 시행된 시험(학평 · 모평 · 수능)이 없습니다. 시험이 시행되면 여기에 회차별로 생깁니다.</p>'; return; }
    const M = {'학평': {'고1': [3, 6, 9, 11], '고2': [3, 6, 9, 11], '고3': [3, 5, 7, 10]}, '모평': {'고3': [6, 9]}, '수능': {'고3': [11]}};
    const st = Object.assign({e: '학평', g: '고2'}, (() => { try { return JSON.parse(sessionStorage.getItem('sc.gichul') || '{}'); } catch(e){ return {}; } })());
    if (!M[st.e][st.g]) st.g = Object.keys(M[st.e])[0];
    const months = M[st.e][st.g], years = [2026, 2025, 2024];
    view.innerHTML = head + `<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">
        <div><div class="sub">시험</div><span class="exseg">${['학평', '모평', '수능'].map(x => `<a href="javascript:void 0" data-ge="${x}" class="${x === st.e ? 'on' : ''}">${{학평: '학평(교육청)', 모평: '모평(평가원)', 수능: '수능'}[x]}</a>`).join('')}</span></div>
        <div><div class="sub">학년</div><span class="exseg">${['고1', '고2', '고3'].map(x => `<a href="javascript:void 0" data-gg="${x}" class="${x === st.g ? 'on' : ''} ${M[st.e][x] ? '' : 'muted'}">${x}</a>`).join('')}</span></div>
        <div class="sub" style="padding-bottom:6px">시험 시간 40분 · 25문항 · 50점 만점</div></div>
      <table class="extab" style="margin-top:12px"><thead><tr><th>시행연도</th>${months.map(m => `<th>${m}월</th>`).join('')}</tr></thead>
      <tbody>${years.map(y => `<tr><td>${y}</td>${months.map(() => '<td class="muted">준비 중</td>').join('')}</tr>`).join('')}</tbody></table>
      <p class="exnote">모의고사 회차 문항을 올리면 칸마다 [풀기] · 내 점수가 생깁니다.</p>`;
    view.querySelectorAll('[data-ge]').forEach(a => a.onclick = () => { st.e = a.dataset.ge; sessionStorage.setItem('sc.gichul', JSON.stringify(st)); subjectV(code, '기출'); });
    view.querySelectorAll('[data-gg]').forEach(a => a.onclick = () => { if (!M[st.e][a.dataset.gg]) return; st.g = a.dataset.gg; sessionStorage.setItem('sc.gichul', JSON.stringify(st)); subjectV(code, '기출'); });
    return;
  }
  view.innerHTML = head + `<p class="exnote">${tab === '영상' ? '개념 설명 영상을 준비하고 있습니다.' : '학교 기출은 원장님 화면에만 보입니다. 준비 중입니다.'}</p>`;
}
// 단원별로 풀기 — 한 화면 세 칸: 대단원 | 소단원(번호 · 체크 · 문항 수 · 정답률) | 어떻게 풀까요 (확정 D-484)
function unitPick(S0, head, arg){
  const PK = 'sc.unitpick.' + S0.code;
  let st; try { st = JSON.parse(sessionStorage.getItem(PK)) || {}; } catch(e){ st = {}; }
  st = Object.assign({m: 0, keys: [], kind: '전체', n: '10', shuffle: true, timer: false}, st);
  if (arg != null && arg !== '') st.m = +arg;
  const M = S0.majors[st.m] || S0.majors[0];
  const h = solveLog(), save = () => { try { sessionStorage.setItem(PK, JSON.stringify(st)); } catch(e){} };
  const stat = keys => { const qs = qsOfKeys(keys); let a = 0, c = 0; qs.forEach(q => (h[q.id] || []).forEach(x => { a++; if (x.ok) c++; })); return {n: qs.length, rate: pct(c, a)}; };
  const mySubs = M.mids.flatMap(d => d.subs).map(s => s.key);
  const keys = st.keys.filter(k => mySubs.includes(k));
  const counts = ['전체', '안 푼 것', '틀린 것', '헷갈림 · 북마크'].map(k => [k, pickIds({keys, kind: k, n: '전부'}).length]);
  const got = pickIds({keys, kind: st.kind, n: st.n});
  let no = 0;
  view.innerHTML = head + `<div class="col3">
    <div class="c1">${S0.majors.map((m, i) => { const sm = stat(m.mids.flatMap(d => d.subs.map(s => s.key))); return `<a href="javascript:void 0" data-m="${i}" class="mrow ${i === st.m ? 'on' : ''} ${sm.n ? '' : 'muted'}">${esc(m.name)}<small>${sm.n ? sm.n + '문항' : '준비 중'}</small></a>`; }).join('')}</div>
    <div class="c2"><div class="sub" style="display:flex;justify-content:space-between"><span>소단원</span><a href="javascript:void 0" id="upAll">전체 선택</a></div>
      ${M.mids.map(d => `<div class="mid">${esc(d.name)}</div>` + d.subs.map(s => { no++; const sm = stat([s.key]); return `<label class="srow2 ${sm.n ? '' : 'muted'}"><input type="checkbox" data-k="${esc(s.key)}" ${keys.includes(s.key) ? 'checked' : ''} ${sm.n ? '' : 'disabled'}><span class="sn2">${no}</span><span class="st2">${esc(s.name)}</span><small>${sm.n ? `${sm.n}문항 · ${sm.rate}` : '준비 중'}</small></label>`; }).join('')).join('')}</div>
    <div class="c3"><div class="sub">어떤 문항</div>
      ${counts.map(([k, c]) => `<label class="opt"><input type="radio" name="kind" value="${k}" ${k === st.kind ? 'checked' : ''}> ${k} <small>${keys.length ? c : ''}</small></label>`).join('')}
      <div class="sub" style="margin-top:12px">문항 수</div><span class="exseg">${['10', '20', '25', '30', '전부'].map(x => `<a href="javascript:void 0" data-n="${x}" class="${x === st.n ? 'on' : ''}">${x}</a>`).join('')}</span>
      <label class="opt" style="margin-top:12px"><input type="checkbox" id="upSh" ${st.shuffle ? 'checked' : ''}> 섞어서</label>
      <label class="opt"><input type="checkbox" id="upTm" ${st.timer ? 'checked' : ''}> 타이머 <small>25문항당 40분</small></label>
      <button class="btn btn-p" id="upGo" style="width:100%;justify-content:center;margin-top:12px" ${keys.length && got.length ? '' : 'disabled'}>${keys.length ? (got.length ? got.length + '문항 시작' : '고른 조건에 맞는 문항이 없습니다') : '소단원을 고르세요'}</button>
      ${keys.length && got.length && st.n !== '전부' && got.length < +st.n ? `<div class="sub" style="margin-top:6px">조건에 맞는 문항이 ${got.length}개뿐이에요</div>` : ''}</div></div>`;
  view.querySelectorAll('[data-m]').forEach(a => a.onclick = () => { st.m = +a.dataset.m; save(); history.replaceState(null, '', `#/과목/${S0.code}/단원/${st.m}`); unitPick(S0, head); });
  view.querySelectorAll('[data-k]').forEach(c => c.onchange = () => { const s = new Set(st.keys); c.checked ? s.add(c.dataset.k) : s.delete(c.dataset.k); st.keys = [...s]; save(); unitPick(S0, head); });
  document.getElementById('upAll').onclick = () => { const live = mySubs.filter(k => qsOfKeys([k]).length); const all = live.every(k => st.keys.includes(k)); st.keys = all ? st.keys.filter(k => !live.includes(k)) : [...new Set(st.keys.concat(live))]; save(); unitPick(S0, head); };
  view.querySelectorAll('input[name=kind]').forEach(r => r.onchange = () => { st.kind = r.value; save(); unitPick(S0, head); });
  view.querySelectorAll('[data-n]').forEach(a => a.onclick = () => { st.n = a.dataset.n; save(); unitPick(S0, head); });
  document.getElementById('upSh').onchange = e => { st.shuffle = e.target.checked; save(); };
  document.getElementById('upTm').onchange = e => { st.timer = e.target.checked; save(); };
  document.getElementById('upGo').onclick = () => {
    const ids = pickIds({keys, kind: st.kind, n: st.n, shuffle: st.shuffle});
    const names = M.mids.flatMap(d => d.subs).filter(s => keys.includes(s.key)).map(s => s.name);
    startSess(`${names.length > 1 ? names[0] + ' 외 ' + (names.length - 1) : names[0]} · ${st.kind}`, ids, st.timer);
  };
}

// 오답노트: 틀림 · 헷갈림 · 북마크 · 메모 → 섞어 풀기
function noteV(tab){
  document.body.classList.remove('done'); crumbSet('오답노트'); tab = tab || '틀림';
  const h = solveLog(), lists = {'틀림': wrongIds(h), '헷갈림': [...loadSet('sc.unsure')].filter(id => byId[id]), '북마크': [...loadSet('sc.bm')].filter(id => byId[id]), '메모': memoIds()};
  const ids = lists[tab] || [];
  view.innerHTML = `<h1>오답노트</h1><div class="menu">${Object.keys(lists).map(k => `<a class="${k === tab ? 'on' : ''}" href="#/오답노트/${k}">${k} ${lists[k].length}</a>`).join('')}</div>
    <div class="check" style="justify-content:flex-start;gap:8px;flex-wrap:wrap;margin:8px 0">
      <button class="btn btn-p" id="nGo" ${ids.length ? '' : 'disabled'}>${tab} ${ids.length}문항 섞어 풀기</button>
      <label class="opt" style="margin:0"><input type="checkbox" id="nTm"> 타이머</label></div>
    ${tab === '틀림' ? '<p class="exnote">틀린 문항은 두 번 연달아 맞히면 저절로 빠집니다.</p>' : ''}
    ${ids.length ? qRows(ids, tab === '틀림' ? id => { const l = h[id] || []; return `틀림 ${l.filter(x => !x.ok).length}번 · 최근 ${l.slice(-3).map(x => x.ok ? '○' : '✕').join('')}`; } : null) : '<p class="exnote">아직 없습니다.</p>'}`;
  document.getElementById('nGo').onclick = () => startSess(`오답노트 · ${tab}`, pickIds({ids, n: '전부', shuffle: true}), document.getElementById('nTm').checked);
}

// 도구: 과목과 상관없는 것 — 개념 카드 · 타이머 · 메모장 · 플래시카드 · 실험 앱(과학 앱 L-115 것을 그대로)
function toolV(){
  document.body.classList.remove('done'); crumbSet('도구');
  // 칸마다 과학 앱의 그 화면으로 바로(원장 11/05 「타이머만 누르면 타이머로 딱 가야지」). 개념 수는 세어서
  const T = [['개념 카드', '#/목록/개념', `개념 ${Object.keys(C).length}장`], ['타이머', SCIENCE_APP + 'timer/', '최과학 과학 앱'], ['메모장', SCIENCE_APP + 'notes/', '최과학 과학 앱'], ['플래시카드', SCIENCE_APP + 'quiz/', '9,000장이 넘는 카드'], ['실험 앱', SCIENCE_APP, '중화 반응 · 단진동 등']];
  view.innerHTML = `<h1>공부 도구</h1><div class="g6">${T.map(([t, href, s]) => `<a class="ucard" href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}><b>${t}</b><small>${s}</small></a>`).join('')}</div>
    <p class="exnote">문항에 단 메모는 오답노트 「메모」에 모입니다.</p>`;
}

// 마이: 오늘의 10문항 설정 · 단원별 정답률 · 로그아웃
function myV(){
  document.body.classList.remove('done'); crumbSet('마이');
  const set = todaySet(), h = solveLog();
  const rows = UNITS.flatMap(s => subsOf(s).map(u => { const qs = qsOfKeys([u.key]); let a = 0, c = 0; qs.forEach(q => (h[q.id] || []).forEach(x => { a++; if (x.ok) c++; })); return a ? `<tr><td>${esc(s.name)}</td><td>${esc(u.name)}</td><td>${a}번</td><td><b>${pct(c, a)}</b></td></tr>` : ''; })).join('');
  view.innerHTML = `<h1>마이</h1>
    <h2 class="exh2">오늘의 문항</h2>
    <label class="opt"><input type="checkbox" id="myOn" ${set.on ? 'checked' : ''}> 홈에 오늘의 문항 보이기</label>
    <div class="sub" style="margin-top:8px">하루 문항 수</div><span class="exseg">${[5, 10, 20].map(n => `<a href="javascript:void 0" data-tn="${n}" class="${n === set.n ? 'on' : ''}">${n}</a>`).join('')}</span>
    <p class="exnote">틀린 것 → 헷갈림 · 북마크 → 안 푼 것 차례로 골라 줍니다.</p>
    <h2 class="exh2">단원별 정답률</h2>${rows ? `<table class="extab"><thead><tr><th>과목</th><th>소단원</th><th>푼 횟수</th><th>정답률</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="exnote">아직 푼 문항이 없습니다.</p>'}
    <h2 class="exh2">앱으로 설치</h2><p class="exnote">휴대폰 · 아이패드 홈 화면이나 컴퓨터 바탕 화면에 사이큐브를 앱으로 깔 수 있어요.</p>
    <button class="btn btn-p" id="myInst">📲 앱 설치 방법</button>
    <div style="margin-top:24px"><button class="btn btn-s" id="myOut">로그아웃</button></div>`;
  const save = s => { try { localStorage.setItem('sc.todaySet', JSON.stringify(s)); } catch(e){} myV(); };
  document.getElementById('myOn').onchange = e => save(Object.assign(set, {on: e.target.checked}));
  view.querySelectorAll('[data-tn]').forEach(a => a.onclick = () => save(Object.assign(set, {n: +a.dataset.tn})));
  document.getElementById('myInst').onclick = () => window.InstallGuide && window.InstallGuide.help();
  document.getElementById('myOut').onclick = async () => { try { await sb.auth.signOut(); } catch(e){} location.reload(); };
}

let lastHash = location.hash;
function route(){
  // 시험을 보는 중에 다른 곳으로 가면: 멈출 수 있는 시험은 저절로 멈춰 두고, 멈출 수 없는 시험은 한 번 묻는다(검토 L2)
  if (window.scExamGuard && !window.scExamGuard(location.hash)){ history.replaceState(null, '', lastHash); return; }
  lastHash = location.hash;
  const h = decodeURIComponent(location.hash.slice(1) || '/');
  const p = h.split('/'), kind = p[1], arg = p[2];
  document.body.classList.toggle('athome', !kind);
  closePanel();   // 화면이 바뀌면 패널은 닫는다(패널 안 개념 이동은 주소를 바꾸지 않음)
  window.scExamStop(); clearInterval(sesClock);
  // 화면을 그리다 오류가 나면 빈 화면 대신 오류 글을 보인다(원장 11/04 갤럭시에서 빈 화면 — 원인 찾기용)
  try {
    sideNav();
    if (kind === '시험'){ document.body.classList.remove('done'); crumbSet('시험'); window.scExam(arg, p[3], p[4]); }
    else if (kind === '문항') problem(arg);
    else if (kind === '개념') concept(arg);
    else if (kind === '목록') home(arg);
    else if (kind === '과목'){ subjectV(arg, p[3], p[4]); if (arg && !SUBJ[arg]) notice('없는 과목이라 수능 통합과학을 보여 드립니다.'); }
    else if (kind === '풀기') sessEnd(p[3]);
    else if (kind === '오답노트') noteV(arg);
    else if (kind === '도구') toolV();
    else if (kind === '마이') myV();
    else homeV();
  } catch (err) {
    view.innerHTML = `<h1>화면을 그리지 못했습니다</h1><p class="sub">이 화면을 찍어 원장님께 보내 주세요.</p><pre style="white-space:pre-wrap;font-size:13px;background:var(--soft);padding:12px;border-radius:8px">${esc(h)}\n${esc(err && (err.stack || err.message) || err)}\n${esc(navigator.userAgent)}</pre>`;
  }
  window.scrollTo(0, 0);
  examCount().then(l => { const b = document.getElementById('sideExam'); if (b) b.textContent = l.length || ''; });
}
window.scUI = { ICON, loadSet, saveSet, openMemo, openComm, openAI, solHTML, wireJump, relHTML,
  toolsHTML, resultHTML, statInner, fillStats, tailHTML, wireItem, loadAttempts, esc, UNAME,
  panelOpen: (tab, html) => { panel.innerHTML = panelHead(tab) + html; wirePanel(); } };
window.addEventListener('hashchange', route);
route();
