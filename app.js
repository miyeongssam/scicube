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

// 골라 풀기 상태는 이 기기에만(다음에 열어도 그대로)
function loadFilter(){ try { return JSON.parse(localStorage.getItem('sc.filter') || '{}'); } catch(e){ return {}; } }
function saveFilter(f){ try { localStorage.setItem('sc.filter', JSON.stringify(f)); } catch(e){} }
function examOf(q){ const m = q['메타'] || {}; return m['출제기관'] === '평가원' ? '평가원' : m['출제기관'] === 'EBS' ? 'EBS' : m['시험종류'] === '학평' ? '학평' : m['시험종류']; }
function fsel(F, k){ const v = F[k]; return Array.isArray(v) ? v : (v ? [v] : []); }   // 옛 저장 꼴(한 값)도 읽는다
document.addEventListener('click', e => { const b = e.target.closest('.fch'); if (!b) return;
  const f = loadFilter(), k = b.dataset.fk, v = b.dataset.fv;
  if (v === '') f[k] = [];                                   // 「전체」 = 모두 풀기
  else { const s = new Set(fsel(f, k)); s.has(v) ? s.delete(v) : s.add(v); f[k] = [...s]; }   // 누를 때마다 넣고 · 빼고
  saveFilter(f); home(); });

function home(tab){
  const res = loadRes();
  const done = Object.keys(res).filter(k => byId[k]).length;
  let body;
  if (tab === '개념'){
    const groups = {};
    Object.values(C).forEach(c => (groups[c['종류']] = groups[c['종류']] || []).push(c));
    body = `<input class="search" id="find" placeholder="개념 찾기 (예: 내성, 엘니뇨)">` +
      Object.keys(groups).map(g => `<div class="group"><h3>${esc(g)}</h3><div class="chips">` +
        groups[g].sort((a, b) => b['문항'].length - a['문항'].length).map(c =>
          `<a class="chip" data-k="${esc(c['이름'] + ' ' + c['다른이름'])}" href="#/개념/${esc(c['이름'])}">${esc(c['이름'])}<span class="n">${c['문항'].length}</span></a>`).join('') +
        `</div></div>`).join('');
  } else {
    let lastU = '';
    // 골라 풀기(원장 10/30 · D-366): 단원 · 학년 · 시험(학평 / 평가원 / EBS) · 월 — 메타데이터는 build_app.py 의 문항메타
    const F = loadFilter();
    const opts = {
      단원: [...new Set(Q.map(q => q['소단원']))].map(u => [u, UNAME(u)]),
      학년: ['고1', '고2', '고3'].filter(g => Q.some(q => q['메타']['학년'] === g)).map(g => [g, g]),
      시험: [['학평', '학평'], ['평가원', '평가원(모평 · 수능)'], ['EBS', 'EBS']].filter(([k]) => Q.some(q => examOf(q) === k)),
      월: [...new Set(Q.map(q => q['메타']['월']).filter(Boolean))].sort((a, b) => a - b).map(m => [m, m + '월'])};
    const bar = Object.entries(opts).map(([k, list]) => `<div class="fbar"><span class="fk">${k}</span>` +
      [['', '전체'], ...list].map(([v, t]) => `<button class="fch ${v === '' ? (fsel(F, k).length ? '' : 'on') : (fsel(F, k).includes(v) ? 'on' : '')}" data-fk="${k}" data-fv="${esc(v)}">${esc(t)}</button>`).join('') + `</div>`).join('');
    const has = (k, v) => !fsel(F, k).length || fsel(F, k).includes(v);   // 여러 개 고르기 — 같은 칸 안은 「또는」
    const QF = Q.filter(q => has('단원', q['소단원']) && has('학년', q['메타']['학년']) && has('시험', examOf(q)) && has('월', q['메타']['월']));
    body = `<div class="filters">${bar}<div class="fcount">${QF.length}문항</div></div><div class="rows">` + QF.map(q => {
      const r = res[q.id];
      const uh = q['소단원'] !== lastU ? `<h2 style="margin:24px 0 8px;font-size:20px">${esc(UNAME(q['소단원']))}</h2>` : ''; lastU = q['소단원'];
      // 출처만으로는 무슨 문제인지 모르니 문제 첫 문장을 함께 보인다(원장 10/28)
      const first = (q['문제'].match(/<p[^>]*>(.*?)<\/p>/) || ['', ''])[1].replace(/<[^>]+>/g, '');
      return uh + `<a class="row" href="#/문항/${q.id}"><span class="no">${q['순서']}</span><span class="t">${esc(q['출처'])}<span class="pv">${first}</span></span>
        <span class="badge">${esc(q['자료유형'])}</span><span class="mark ${r ? (r.ok ? 'ok' : 'bad') : ''}">${r ? (r.ok ? '○' : '✕') : ''}</span><span class="bmk">${loadSet('sc.bm').has(q.id) ? ICON.bm : ''}</span></a>`;
    }).join('') + `</div>`;
  }
  view.innerHTML = `<h1>진화와 생물다양성</h1><div class="sub">통합과학 · 문제 ${Q.length} · 개념 카드 ${Object.keys(C).length} · 푼 문제 ${done}</div>
    <div class="tabs"><a class="tab ${tab !== '개념' ? 'on' : ''}" href="#/">문제</a><a class="tab ${tab === '개념' ? 'on' : ''}" href="#/목록/개념">개념 카드</a><a class="tab" href="#/시험">시험</a></div>${body}`;
  const f = document.getElementById('find');
  if (f) f.oninput = () => document.querySelectorAll('.chip').forEach(ch => ch.style.display = ch.dataset.k.includes(f.value.trim()) ? '' : 'none');
}

function UNAME(u){ return ({'자연선택과진화': '자연선택과 진화', '생물다양성과보전': '생물다양성과 보전'})[u] || u; }

function problem(id){
  const q = byId[id]; if (!q) return home();
  const i = Q.indexOf(q), prev = Q[i - 1], next = Q[i + 1];
  const saved = loadRes()[id];
  let sel = saved ? saved.sel : 0;
  const t0 = Date.now();   // 나의 풀이 시간: 문제를 연 때부터 「정답 확인」까지
  document.body.classList.toggle('done', !!saved);
  const rel = q['관련'].map(r => `<a class="lk" href="#/개념/${esc(r['카드'])}">${esc(r['말'])}</a>`).join(' · ');
  view.innerHTML = `
    <div class="bar1"><h1>${esc(UNAME(q['소단원']))}</h1>
      <div class="nav"><a class="btn btn-s" href="#/">목록</a>
        <a class="ic" ${prev ? `href="#/문항/${prev.id}"` : 'style="color:var(--line)"'}>‹</a><span>${i + 1} / ${Q.length}</span>
        <a class="ic" ${next ? `href="#/문항/${next.id}"` : 'style="color:var(--line)"'}>›</a></div></div>
    <div class="bar2"><span class="qno">${esc(q['출처'])}</span><span class="badge">${esc(q['자료유형'])}</span>${q['배점'] ? `<span class="sub">${esc(q['배점'])}점</span>` : ''}
      <span style="flex:1"></span>
      <span class="tools">
        <button class="ic ${loadSet('sc.bm').has(id) ? 'on' : ''}" id="bmBtn" title="북마크(나중에 다시 볼 문제)">${ICON.bm}</button>
        <button class="ic ${loadSet('sc.unsure').has(id) ? 'on' : ''}" id="unsureBtn" title="잘 모르는 문제로 표시">${ICON.q}</button>
        <button class="ic" id="memoBtn" title="암기 메모">${ICON.memo}</button>
        <button class="ic" id="sheetBtn" title="답안지">${ICON.check}</button>
        <button class="ic" id="commBtn" title="커뮤니티(게시글)">${ICON.comm}</button>
        <button class="ic" id="aiBtn" title="AI에게 물어보기">${ICON.ai}</button>
      </span></div>
    <div class="stem x">${q['문제']}</div>
    <div class="choices">${q['선지'].map((c, k) => `<div class="ch" role="button" data-k="${k + 1}"><button class="oxb cx"></button><span class="num">${k + 1}</span><span class="txt">${esc(c)}</span></div>`).join('')}</div>
    <div class="check" id="check"></div>
    <div class="after">
      <div class="result" id="result"></div>
      <div class="stat" id="stat"></div>
      <h2>해설</h2><div class="x">${q['해설']}</div>
      ${q['더'] ? `<div class="more"><h2>더 알아보기</h2><div class="x">${q['더']}</div></div>` : ''}
      ${q['보기해설'] ? `<h2>보기 해설</h2><div class="x">${q['보기해설']}</div>` : ''}
      <h2>관련 개념</h2><div class="rel">${rel}</div>
      <h2>참고 자료</h2><ul class="refs">${(q['참고'] || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      <div class="qa-head"><div><h2 style="margin:0">커뮤니티 Q&A</h2><div class="sub">위 문제와 관련된 게시글이에요.</div></div>
        <button class="btn btn-p" id="askComm">게시글 작성하기</button></div>
      <div class="ask" id="qaBox"></div>
      <div class="check" style="justify-content:space-between;margin-top:32px">
        ${prev ? `<a class="btn btn-s" href="#/문항/${prev.id}">‹ 이전 문제</a>` : '<span></span>'}
        ${next ? `<a class="btn btn-s" href="#/문항/${next.id}">다음 문제 ›</a>` : `<a class="btn btn-s" href="#/">목록으로</a>`}</div>
    </div>`;
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
      document.getElementById('stat').innerHTML = `<div>정답률 <b id="stR">—</b></div><div>누적 풀이 <b id="stN">—</b></div><div>평균 풀이 시간 <b id="stS">—</b> / 나의 풀이 시간 <b>${last.secs != null ? last.secs + '초' : '—'}</b></div>`
        + `<div class="sub" style="flex-basis:100%">내가 이 문제를 푼 횟수 ${mine.length}번</div>`;
      setTimeout(() => window.scSync.stats(id).then(s => { if (!s || !document.getElementById('stR')) return;
        document.getElementById('stR').textContent = s.rate == null ? '—' : s.rate + '%'; document.getElementById('stN').textContent = s.count + '번'; document.getElementById('stS').textContent = s.seconds == null ? '—' : s.seconds + '초'; }), 800);
      check.innerHTML = `<button class="btn btn-s" id="again">다시 풀기</button>`;
      document.getElementById('again').onclick = () => { document.body.classList.remove('done'); sel = 0; Object.keys(out).forEach(k => delete out[k]); Object.keys(bogi).forEach(b => delete bogi[b]); outCorrect = false; clearRes(id); paint(); };
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
  document.getElementById('memoBtn').onclick = () => openMemo(id);
  document.getElementById('sheetBtn').onclick = () => openSheet();
  document.getElementById('aiBtn').onclick = () => openAI(id);
  document.getElementById('askComm').onclick = () => openComm(id);
  document.getElementById('commBtn').onclick = () => openComm(id);
  document.getElementById('bmBtn').onclick = e => {
    const s = loadSet('sc.bm'); s.has(id) ? s.delete(id) : s.add(id); saveSet('sc.bm', s);
    e.currentTarget.classList.toggle('on', s.has(id));
  };
  const posts = loadPosts(id);
  document.getElementById('qaBox').innerHTML = posts.length
    ? posts.map(p => `<div class="post"><div class="sub">${esc(p['날짜'].slice(0, 10))}</div>${esc(p['글'])}</div>`).join('')
    : `<div style="text-align:center;width:100%">이해가 안 되거나 궁금한 점이 있다면<br><a class="qlk" href="javascript:void 0" id="askComm2">커뮤니티에 질문</a>해 보세요! · <a class="qlk" href="javascript:void 0" id="askAI2">AI에게 질문</a></div>`;
  const c2 = document.getElementById('askComm2'), a2 = document.getElementById('askAI2');
  if (c2) c2.onclick = () => openComm(id);
  if (a2) a2.onclick = () => openAI(id);
  document.getElementById('unsureBtn').onclick = e => {
    const s = loadSet('sc.unsure'); s.has(id) ? s.delete(id) : s.add(id); saveSet('sc.unsure', s);
    e.currentTarget.classList.toggle('on', s.has(id));
  };
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
function panelHead(tab){
  const tabs = [['개념', '개념 카드', stack.length > 0], ['메모', '암기 메모', !!curQ()], ['답안지', '답안지', !onExamItem()], ['커뮤니티', '커뮤니티', !!curQ()], ['AI', 'AI 질문', !!curQ()]];
  return `<div class="ph"><div class="ptabs">${tabs.filter(t => t[2]).map(t => `<button data-t="${t[0]}" class="${tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
    <span class="sp"></span><button class="ic" id="px" aria-label="닫기">✕</button></div>`;
}
function wirePanel(){
  document.getElementById('px').onclick = closePanel;
  const go = {'메모': () => openMemo(curQ()), '답안지': () => openSheet(), '커뮤니티': () => openComm(curQ()), 'AI': () => openAI(curQ()), '개념': () => showConcept()};
  panel.querySelectorAll('.ptabs button').forEach(b => b.onclick = () => go[b.dataset.t]());
  panel.scrollTop = 0;
  document.body.classList.add('panel-open');
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
function openSheet(){
  const res = loadRes(), pick = loadPick(), un = loadSet('sc.unsure'), cur = curQ();
  panel.innerHTML = panelHead('답안지') + `<div class="sheet">` + Q.map((q, i) => {
    const r = res[q.id], my = r ? r.sel : (pick[q.id] || {}).sel;
    const dots = [1, 2, 3, 4, 5].map(k => {
      let c = '';
      if (r) c = k === q['정답'] ? (k === my ? 'ok' : 'ans') : (k === my ? 'bad' : '');   // 정답 확인 뒤
      else if (k === my) c = 'mine';                                                      // 정답 확인 전: 고른 답만
      return `<span class="dot ${c}">${k}</span>`;
    }).join('');
    const mark = r ? `<span class="sr ${r.ok ? 'o' : 'x'}">${r.ok ? '○' : '✕'}</span>` : `<span class="sr"></span>`;
    return `<a class="srow ${q.id === cur ? 'cur' : ''}" href="#/문항/${q.id}"><span class="sn">${i + 1}</span>${mark}${dots}<span class="sq">${un.has(q.id) ? '?' : ''}</span></a>`;
  }).join('') + `</div><div class="legend"><span><span class="dot mine">3</span> 고른 답(정답 확인 전)</span><span><span class="dot ok">3</span> 맞힌 답</span>
    <span><span class="dot bad">3</span> 틀리게 고른 답</span><span><span class="dot ans">3</span> 정답</span><span><b class="sq">?</b> 잘 모르는 문제</span></div>`;
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
function closePanel(){ stack = []; document.body.classList.remove('panel-open'); }

document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#/개념/"]');
  if (!a) return;
  const onProblem = decodeURIComponent(location.hash).startsWith('#/문항/') || onExamItem() || !!a.closest('.panel');
  if (onProblem && !a.classList.contains('btn')){
    e.preventDefault();
    openPanel(decodeURIComponent(a.getAttribute('href').slice('#/개념/'.length)));
  }
});

function route(){
  const h = decodeURIComponent(location.hash.slice(1) || '/');
  const [, kind, arg] = h.split('/');
  closePanel();   // 화면이 바뀌면 패널은 닫는다(패널 안 개념 이동은 주소를 바꾸지 않음)
  window.scExamStop();
  if (kind === '시험'){ document.body.classList.remove('done'); window.scExam(arg, h.split('/')[3], h.split('/')[4]); }
  else if (kind === '문항') problem(arg);
  else if (kind === '개념') concept(arg);
  else if (kind === '목록') home(arg);
  else { document.body.classList.remove('done'); home(); }
  window.scrollTo(0, 0);
}
window.scUI = { ICON, loadSet, saveSet, openMemo, openComm, openAI };
window.addEventListener('hashchange', route);
route();
