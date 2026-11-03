// 시험 화면 — 목록 → 풀기(한 문항 한 쪽 · 타이머) → 제출 → 점수 · 답안지 → 복습 (2026-11-03, 결정 D-457 · D-486 · D-488)
// 원장 11/03 밤: 본 시험은 [복습하기] [다시 풀기] — 풀 때마다 몇 번째 · 날짜 · 점수 · 걸린 시간이 쌓인다. 문제는 한 쪽에 하나씩
// 문제 · 정답은 서버 함수로만 받는다. 정답 · 해설은 제출한 뒤에만 온다
(function () {
  const st = document.createElement('style');
  st.textContent = `
.exhead{position:sticky;top:57px;z-index:10;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 0;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.extime{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
.extime.low{color:var(--danger)}
.exomr{display:flex;flex-wrap:wrap;gap:4px;width:100%}
.exomr a{min-width:32px;height:32px;padding:0 4px;border:1px solid var(--line-strong);border-radius:6px;display:grid;place-items:center;font-size:13px}
.exomr a.on{background:var(--primary);border-color:var(--primary);color:#fff}
.exomr a.cur{outline:2px solid var(--primary);outline-offset:1px}
.exq{padding:20px 0 8px}
.exno{font-size:22px;font-weight:700;margin-bottom:8px}
.exq .ch{cursor:pointer}
.exq .ch.sel{background:rgba(47,107,255,.08)}
.expg{display:flex;justify-content:space-between;align-items:center;margin:20px 0 32px}
.exrow{padding:14px 16px;border:1px solid var(--line);border-radius:10px;margin-bottom:10px}
.exrow .top{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
.exrow .grow{flex:1;min-width:200px}
.exhist{margin-top:10px;border-top:1px solid var(--line);padding-top:8px;display:grid;grid-template-columns:auto auto auto auto 1fr;gap:4px 16px;font-size:14px;color:var(--sub)}
.exhist b{color:var(--text)}
.exhist a{color:var(--primary)}
.exscore{font-size:30px;font-weight:700;margin:6px 0}
.exnote{color:var(--sub);font-size:14px}
.exqn{font-size:24px;font-weight:700;margin-right:4px}
.exmask{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:50;display:grid;place-items:center;padding:16px}
.exbox{background:var(--bg);border-radius:12px;padding:24px;width:100%;max-width:380px;box-shadow:0 10px 30px rgba(0,0,0,.2)}
.exbox h3{margin:0 0 12px;font-size:19px}
.exbox p{margin:6px 0}
.exbox .left a{display:inline-block;margin:4px 4px 0 0;min-width:32px;padding:2px 6px;border:1px solid var(--danger);color:var(--danger);border-radius:6px;text-align:center}
.exbox .btns{display:flex;gap:8px;margin-top:20px}.exbox .btns .btn{flex:1;justify-content:center}
.exres{display:grid;grid-template-columns:260px minmax(0,1fr);gap:24px;align-items:start;margin-top:12px}
@media(max-width:760px){.exres{grid-template-columns:minmax(0,1fr)}}
.excard{border:1px solid var(--line);border-radius:12px;padding:16px}
.excard .btn{width:100%;justify-content:center;margin-top:8px}
.omrpage .exres .sheet{columns:auto;margin:0}
.exseg{display:inline-flex;border:1px solid var(--line-strong);border-radius:8px;overflow:hidden}
.exseg a{padding:6px 12px;font-size:14px;color:var(--text)}
.exseg a+a{border-left:1px solid var(--line)}
.exseg a.on{background:var(--primary);color:#fff}
.exh2{font-size:18px;margin:24px 0 10px}
.extab{width:100%;border-collapse:collapse;font-size:15px}
.extab th{text-align:left;font-weight:600;color:var(--sub);font-size:14px;padding:8px;border-bottom:2px solid var(--line);cursor:pointer;user-select:none;white-space:nowrap}
.extab th:last-child{cursor:default}
.extab td{padding:10px 8px;border-bottom:1px solid var(--line)}
.extab .exact{white-space:nowrap;text-align:right}
@media(max-width:760px){.extab{font-size:13px}.extab th,.extab td{padding:6px 4px}}`;
  document.head.appendChild(st);
  const NUM = ['', '①', '②', '③', '④', '⑤'];
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const v = () => document.getElementById('view');
  let clock = null, track = null;
  const stopClock = () => { if (clock) clearInterval(clock); if (track) clearInterval(track); clock = track = null; const m = document.getElementById('exM'); if (m) m.remove(); };
  const mmss = s => s == null ? '—' : `${Math.floor(s / 60)}분 ${s % 60}초`;
  const day = t => t ? new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' }) : '';
  const when = t => t ? new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
  const key = (id, t) => 'sc.exam.' + id + '.t' + (t || 1);
  const getJ = k => { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (x) { return {}; } };
  const putJ = (k, o) => { try { localStorage.setItem(k, JSON.stringify(o)); } catch (x) {} };
  // 복습할 풀이 번호(몇 번째) — 없으면 마지막 풀이
  const TKEY = id => 'sc.exam.view.' + id;
  const viewTry = id => { try { return +sessionStorage.getItem(TKEY(id)) || null; } catch (x) { return null; } };
  const setViewTry = (id, t) => { try { t ? sessionStorage.setItem(TKEY(id), t) : sessionStorage.removeItem(TKEY(id)); } catch (x) {} };

  // 그림은 비공개 저장소 → 잠깐 쓰는 주소
  async function signed(htmls) {
    const keys = [...new Set(htmls.filter(Boolean).flatMap(h => [...h.matchAll(/src="img\/([^"]+)"/g)].map(m => m[1])))];
    const urls = {};
    if (keys.length) {
      const { data } = await sb.storage.from('question-images').createSignedUrls(keys, 60 * 60 * 3);
      (data || []).forEach(d => { if (d.signedUrl) urls[d.path] = d.signedUrl; });
    }
    return h => (h || '').replace(/src="img\/([^"]+)"/g, (m, k) => `src="${urls[k] || ''}"`);
  }

  // 시험 목록(원장 11/03 밤): 위 = 아직 안 푼 시험 [시작하기] · 푸는 중 [이어 풀기]
  // 아래 = 문제풀이 이력 표 — 줄 하나가 한 번 푼 것. 번호 · 시험명 · 점수 · 걸린 시간 · 맞힘 · 풀이 횟수 · 푼 날짜 · [복습] [다시 풀기]
  // 머리 칸을 누르면 그 칸으로 정렬(파일 탐색기처럼), 한 번 더 누르면 거꾸로
  const SKEY = 'sc.exam.sort';
  let sortBy = (() => { try { return JSON.parse(sessionStorage.getItem(SKEY)) || { k: 'at', d: -1 }; } catch (x) { return { k: 'at', d: -1 }; } })();
  async function list() {
    stopClock();
    v().innerHTML = '<p class="exnote">시험 목록을 불러오는 중입니다…</p>';
    const { data, error } = await sb.rpc('exam_list');
    if (error) { v().innerHTML = '<p>시험 목록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>'; return; }
    const admin = !!window.scIsAdmin;
    const todo = data.filter(s => s.open && (s.started || !(s.tries || []).length)).map(s => `<div class="exrow"><div class="top"><div class="grow"><b>${e(s.name)}</b>
        <div class="exnote">${s.count}문항${s.minutes ? ' · ' + s.minutes + '분' : ''}${s.closes_at ? ' · ' + when(s.closes_at) + '까지' : ''}${admin ? ' · ' + e(s.status) : ''}</div></div>
        <a class="btn btn-p" href="#/시험/${e(s.id)}">${s.started ? '이어 풀기' : admin && s.status !== 'published' ? '미리 풀기' : '시작하기'}</a></div></div>`).join('');
    const hist = data.flatMap(s => (s.tries || []).map(t => ({ id: s.id, name: s.name, open: s.open, next: (s.tries || []).length + 1, ...t })))
      .sort((a, b) => String(a.at).localeCompare(String(b.at))).map((r, i) => ({ ...r, no: i + 1, rate: r.count ? r.correct / r.count : 0 }));
    const COLS = [['no', '번호'], ['name', '시험명'], ['score', '점수'], ['secs', '걸린 시간'], ['rate', '맞힘'], ['try', '풀이 횟수'], ['at', '푼 날짜']];
    const draw = () => {
      const k = sortBy.k, d = sortBy.d;
      const rows = [...hist].sort((a, b) => { const x = a[k] ?? -1, y = b[k] ?? -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * d || (a.no - b.no) * -1; });
      document.getElementById('exHist').innerHTML = `<table class="extab"><thead><tr>${COLS.map(([c, t]) => `<th data-k="${c}">${t}${c === k ? (d > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}<th></th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${r.no}</td><td>${e(r.name)}</td><td><b>${r.score}점</b></td><td>${mmss(r.secs)}</td><td>${r.correct}/${r.count}</td><td>${r.try}회</td><td>${day(r.at)}</td>
          <td class="exact"><a class="btn btn-s" href="#/시험/${e(r.id)}/답안지/1" data-rv="${e(r.id)}" data-t="${r.try}">복습</a>${r.open ? ` <a class="btn btn-s" href="javascript:void 0" data-retry="${e(r.id)}" data-n="${r.next}">다시 풀기</a>` : ''}</td></tr>`).join('')}</tbody></table>`;
      document.querySelectorAll('#exHist th[data-k]').forEach(h => h.onclick = () => {
        sortBy = sortBy.k === h.dataset.k ? { k: h.dataset.k, d: -sortBy.d } : { k: h.dataset.k, d: h.dataset.k === 'name' ? 1 : -1 };
        try { sessionStorage.setItem(SKEY, JSON.stringify(sortBy)); } catch (x) {}
        draw();
      });
      wire();
    };
    v().innerHTML = `<h1>시험 목록</h1>
      <div class="tabs"><a class="tab" href="#/">문제</a><a class="tab" href="#/목록/개념">개념 카드</a><a class="tab on" href="#/시험">시험</a></div>
      <h2 class="exh2">아직 안 푼 시험</h2>${todo || '<p class="exnote">지금 새로 풀 시험이 없습니다.</p>'}
      <h2 class="exh2">문제풀이 이력</h2><div id="exHist">${hist.length ? '' : '<p class="exnote">아직 푼 시험이 없습니다.</p>'}</div>`;
    if (hist.length) draw();
  }
  function wire() {
    v().querySelectorAll('[data-rv]').forEach(a => a.onclick = () => { setViewTry(a.dataset.rv, +a.dataset.t); setWrongOnly(false); cache = null; });
    v().querySelectorAll('[data-retry]').forEach(a => a.onclick = () => {
      const m = document.createElement('div');
      m.className = 'exmask'; m.id = 'exM';
      m.innerHTML = `<div class="exbox" role="dialog" aria-modal="true"><h3>처음부터 다시 풀까요?</h3>
        <p>${a.dataset.n}회 풀이로 새로 시작합니다.</p><p class="exnote">앞에서 푼 기록과 점수는 그대로 남습니다.</p>
        <div class="btns"><button class="btn btn-s" id="exMB">취소</button><button class="btn btn-p" id="exMS">다시 풀기</button></div></div>`;
      document.body.appendChild(m);
      m.onclick = ev => { if (ev.target === m) m.remove(); };
      document.getElementById('exMB').onclick = () => m.remove();
      document.getElementById('exMS').onclick = () => { m.remove(); location.hash = `#/시험/${a.dataset.retry}/다시`; };
    });
  }

  // 풀기: 한 쪽에 한 문항(원장 11/03 — 25문항을 아래로 끌지 않게). 위 번호표 · ‹ 이전 · 다음 › 으로 넘김
  async function take(id, retry) {
    stopClock();
    v().innerHTML = '<p class="exnote">시험을 여는 중입니다…</p>';
    const { data: x, error } = await sb.rpc('exam_start', { p_set: id, p_retry: !!retry });
    if (error) { v().innerHTML = '<p>시험을 열지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>'; return; }
    if (x.result !== 'ok') { v().innerHTML = '<p>이 시험은 지금 열려 있지 않습니다.</p><a class="btn btn-s" href="#/시험">시험 목록</a>'; return; }
    if (x.submitted) { location.replace(`#/시험/${id}/답안지`); return; }
    if (retry) history.replaceState(null, '', `#/시험/${id}`);
    const fix = await signed(x.items.map(q => q.stem));
    const akey = key(id, x.try), skey = akey + '.s';
    const ans = getJ(akey), secs = getJ(skey);
    let cur = 0;
    v().innerHTML = `<h1>${e(x.name)}${x.try > 1 ? ` <span class="exnote">${x.try}회 풀이</span>` : ''}</h1>
      <div class="exhead"><span class="extime" id="exT"></span><span class="exnote" id="exC"></span><span style="flex:1"></span><button class="btn btn-p" id="exGo">제출하기</button>
        <div class="exomr" id="exO">${x.items.map((q, i) => `<a href="javascript:void 0" data-i="${i}">${q.no}</a>`).join('')}</div></div>
      <div id="exP"></div>`;
    const P = document.getElementById('exP');
    const paintBar = () => {
      let n = 0;
      x.items.forEach((q, i) => { const o = document.querySelector(`#exO [data-i="${i}"]`); if (ans[q.id]) n++; o.className = (ans[q.id] ? 'on' : '') + (i === cur ? ' cur' : ''); });
      document.getElementById('exC').textContent = `답한 문항 ${n} / ${x.items.length}`;
      return n;
    };
    const show = i => {
      cur = Math.max(0, Math.min(x.items.length - 1, i));
      const q = x.items[cur], last = cur === x.items.length - 1;
      P.innerHTML = `<div class="exq"><div class="exno">${q.no}번${q.points ? ` <span class="exnote">${q.points}점</span>` : ''}</div>
          <div class="stem x">${fix(q.stem)}</div>
          <div class="choices">${(q.choices || []).map((c, k) => `<div class="ch ${ans[q.id] === k + 1 ? 'sel' : ''}" role="button" data-k="${k + 1}"><span class="num">${k + 1}</span><span class="txt">${e(c)}</span></div>`).join('')}</div></div>
        <div class="expg">${cur ? '<button class="btn btn-s" id="exPrev">‹ 이전 문항</button>' : '<span></span>'}
          <span class="exnote">${cur + 1} / ${x.items.length}</span>
          ${last ? '<button class="btn btn-p" id="exGo2">제출하기</button>' : '<button class="btn btn-p" id="exNext">다음 문항 ›</button>'}</div>`;
      P.querySelectorAll('.ch').forEach(c => c.onclick = () => {
        const k = +c.dataset.k;
        if (ans[q.id] === k) delete ans[q.id]; else ans[q.id] = k;
        putJ(akey, ans);
        P.querySelectorAll('.ch').forEach(d => d.classList.toggle('sel', ans[q.id] === +d.dataset.k));
        paintBar();
      });
      const pv = document.getElementById('exPrev'), nx = document.getElementById('exNext'), g2 = document.getElementById('exGo2');
      if (pv) pv.onclick = () => show(cur - 1);
      if (nx) nx.onclick = () => show(cur + 1);
      if (g2) g2.onclick = ask;
      paintBar();
      window.scrollTo(0, 0);
    };
    v().querySelectorAll('#exO a').forEach(a => a.onclick = () => show(+a.dataset.i));
    let sending = false;
    const closeAsk = () => { const m = document.getElementById('exM'); if (m) m.remove(); };
    const send = async () => {
      if (sending) return; sending = true; stopClock();
      const { data: r, error: er } = await sb.rpc('exam_submit', { p_set: id, p_answers: ans, p_seconds: secs });
      if (er || r.result === 'not_started') {
        sending = false;
        const w = document.getElementById('exMW');
        if (w) w.textContent = '제출하지 못했습니다. 다시 눌러 주세요.'; else alert('제출하지 못했습니다. 다시 눌러 주세요.');
        return;
      }
      closeAsk();
      try { localStorage.removeItem(akey); localStorage.removeItem(skey); } catch (y) {}
      setViewTry(id, x.try); cache = null;
      location.hash = `#/시험/${id}/답안지`;
    };
    // 제출 확인 창: 답한 수 · 안 푼 번호(누르면 그 문항) · 주의 문구
    function ask() {
      closeAsk();
      const n = paintBar(), miss = x.items.map((q, i) => ({ q, i })).filter(o => !ans[o.q.id]);
      const m = document.createElement('div');
      m.className = 'exmask'; m.id = 'exM';
      m.innerHTML = `<div class="exbox" role="dialog" aria-modal="true"><h3>제출할까요?</h3>
        <p>답한 문항 <b>${n} / ${x.items.length}</b></p>
        ${miss.length ? `<p class="left">안 푼 번호 ${miss.map(o => `<a href="javascript:void 0" data-i="${o.i}">${o.q.no}</a>`).join('')}</p>` : '<p>모든 문항에 답했습니다.</p>'}
        <p class="exnote">제출하면 답을 고칠 수 없습니다. 한 번 더 확인해 보세요.</p><p class="exnote" id="exMW" style="color:var(--danger)"></p>
        <div class="btns"><button class="btn btn-s" id="exMB">계속 풀기</button><button class="btn btn-p" id="exMS">제출하기</button></div></div>`;
      document.body.appendChild(m);
      m.onclick = ev => { if (ev.target === m) closeAsk(); };
      document.getElementById('exMB').onclick = closeAsk;
      document.getElementById('exMS').onclick = send;
      m.querySelectorAll('.left a').forEach(a => a.onclick = () => { closeAsk(); show(+a.dataset.i); });
    }
    document.getElementById('exGo').onclick = ask;
    show(0);
    // 문항별 시간: 지금 열린 쪽의 문항에 1초씩
    track = setInterval(() => {
      if (document.hidden || !document.getElementById('exO')) return;
      const q = x.items[cur]; secs[q.id] = (secs[q.id] || 0) + 1; putJ(skey, secs);
    }, 1000);
    // 타이머: 서버가 시작을 기록한 때부터. 새로 고침해도 이어진다. 끝나면 저절로 낸다
    const ends = [x.minutes ? new Date(x.started_at).getTime() + x.minutes * 60000 : null, x.closes_at ? new Date(x.closes_at).getTime() : null].filter(Boolean);
    const end = ends.length ? Math.min(...ends) : null, T = document.getElementById('exT');
    if (end) {
      const tick = () => {
        if (!document.getElementById('exT')) return stopClock();
        const s = Math.max(0, Math.round((end - Date.now()) / 1000));
        T.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
        T.classList.toggle('low', s <= 300);
        if (s === 0) send();
      };
      tick(); clock = setInterval(tick, 1000);
    }
  }

  let cache = null;   // {id, t, r, fix} — 문항을 넘길 때마다 서버를 다시 부르지 않는다
  const WKEY = 'sc.exam.wrongOnly';
  const wrongOnly = () => { try { return sessionStorage.getItem(WKEY) === '1'; } catch (x) { return false; } };
  const setWrongOnly = on => { try { sessionStorage.setItem(WKEY, on ? '1' : '0'); } catch (x) {} };
  async function loadReview(id) {
    const t = viewTry(id);
    if (cache && cache.id === id && cache.t === t) return cache;
    const { data: r, error } = await sb.rpc('exam_review', { p_set: id, p_try: t });
    if (error || r.result === 'not_submitted') return { bad: true };
    const fix = r.result === 'closed' ? null : await signed(r.items.flatMap(q => [q.stem, q.explain, q.bogi, q.more]));
    cache = { id, t, r, fix };
    return cache;
  }

  // 내 답안지: 번호 · ○✕ · ①~⑤ 를 한 줄로 아래로(토막 내지 않음). 파랑 채움 = 맞힌 답, 빨강 = 틀리게 고른 답, 파랑 테두리 = 정답. 줄을 누르면 그 문항 복습
  const omrHTML = (r, id, cur) => `<div class="sheet">${r.items.map(x => {
      const n = (x.choices || []).length || 5;
      const dots = Array.from({ length: n }, (_, j) => j + 1).map(k => `<span class="dot ${k === x.picked ? (x.ok ? 'ok' : 'bad') : k === x.answer ? 'ans' : ''}">${k}</span>`).join('');
      return `<a class="srow ${String(x.no) === String(cur) ? 'cur' : ''}" href="#/시험/${e(id)}/답안지/${x.no}"><span class="sn">${x.no}</span><span class="sr ${x.ok ? 'o' : 'x'}">${x.ok ? '○' : '✕'}</span>${dots}</a>`;
    }).join('')}</div>
    <div class="legend"><span><span class="dot ok"></span> 내가 고른 답(맞음)</span><span><span class="dot bad"></span> 내가 고른 답(틀림)</span><span><span class="dot ans"></span> 정답</span></div>`;

  // 제출 직후 · 답안지 화면: 왼쪽 점수 · 맞힌 수 · 걸린 시간 · [복습하기] [시험 목록], 오른쪽 내 답안지
  async function review(id) {
    stopClock();
    v().innerHTML = '<p class="exnote">답안지를 불러오는 중입니다…</p>';
    const c = await loadReview(id);
    if (c.bad) { v().innerHTML = '<p>제출한 답안이 없습니다.</p><a class="btn btn-s" href="#/시험">시험 목록</a>'; return; }
    const r = c.r;
    if (r.result === 'closed') {
      v().innerHTML = `<h1>시험 결과</h1><div class="exscore">${r.score}점</div><p>맞힌 문항 ${r.correct} / ${r.count}</p><p class="exnote">이 시험은 닫혀서 문제와 해설은 볼 수 없습니다.</p><a class="btn btn-s" href="#/시험">시험 목록</a>`;
      return;
    }
    v().innerHTML = `<div class="omrpage"><div class="excrumb"><a href="#/시험">시험 목록</a> › <b>${e(r.name)}</b> › ${r.try}회 풀이</div>
      <div class="exres"><div class="excard"><div class="sub">${r.try}회 풀이 · ${day(r.at)}</div><div class="exscore">${r.score}점</div>
          <div class="sub">${r.count}문항 중 ${r.correct}문항 맞힘<br>걸린 시간 ${mmss(r.elapsed)}</div>
          <a class="btn btn-p" href="#/시험/${e(id)}/답안지/${r.items[0].no}" id="exAll">복습하기</a>
          <a class="btn btn-s" href="#/시험">시험 목록</a></div>
        <div><div class="sub" style="margin-bottom:6px">내 답안지 — 줄을 누르면 그 문항 복습</div>${omrHTML(r, id)}</div></div></div>`;
    document.getElementById('exAll').onclick = () => setWrongOnly(false);
    v().querySelectorAll('.srow').forEach(a => a.addEventListener('click', () => setWrongOnly(false)));
  }

  // 복습: 문제 화면과 같은 부품(app.js — 결정 D-488). 위 줄 = 시험 › 이름 › 몇 번째 풀이 · ‹ › · [전체 문항] [틀린 문항만]
  async function reviewItem(id, no) {
    stopClock();
    const c = await loadReview(id);
    if (c.bad || c.r.result === 'closed') return review(id);
    const r = c.r, fix = c.fix, q = r.items.find(x => String(x.no) === String(no));
    if (!q) return review(id);
    const W = wrongOnly(), seq = W ? r.items.filter(x => !x.ok || x.no === q.no) : r.items;
    const i = seq.indexOf(q), prev = seq[i - 1], next = seq[i + 1];
    const href = x => `#/시험/${e(id)}/답안지/${x.no}`;
    const U = window.scUI;
    window.scExamQ = q.id; window.scExamSrc = q.source;
    document.body.classList.add('done');
    window.scExamSheet = () => U.panelOpen('답안지', `<div class="sub">${e(r.name)} · ${r.try}회 풀이 · ${r.score}점</div>` + omrHTML(r, id, q.no));
    const times = U.loadAttempts().filter(a => a['문항'] === q.id).length + r.try;
    const firstBad = r.items.find(x => !x.ok);
    v().innerHTML = `<div class="bar1"><div class="excrumb"><a href="#/시험">시험 목록</a> › <a href="#/시험/${e(id)}/답안지">${e(r.name)}</a> › <b>${r.try}회 풀이 · ${r.score}점</b></div>
        <div class="nav"><a class="ic" ${prev ? `href="${href(prev)}"` : 'style="color:var(--line)"'}>‹</a><span>${i + 1} / ${seq.length}</span>
          <a class="ic" ${next ? `href="${href(next)}"` : 'style="color:var(--line)"'}>›</a></div></div>
      <div style="display:flex;justify-content:flex-end;margin:8px 0"><span class="exseg">
        <a href="javascript:void 0" id="exAllQ" class="${W ? '' : 'on'}">전체 문항</a><a href="javascript:void 0" id="exBadQ" class="${W ? 'on' : ''}">틀린 문항만</a></span></div>
      <div class="bar2"><span class="exqn">${q.no}번</span><span class="sub">${e(q.source)}${q.points ? ` · ${q.points}점` : ''}</span>
        <span style="flex:1"></span>${U.toolsHTML(q.id)}</div>
      <div class="stem x">${fix(q.stem)}</div>
      <div class="choices">${(q.choices || []).map((t, k) => `<div class="ch ${k + 1 === q.answer ? 'correct' : ''} ${k + 1 === q.picked && !q.ok ? 'mywrong' : ''} ${k + 1 === q.picked ? 'sel' : ''}"><span class="num">${k + 1}</span><span class="txt">${e(t)}</span></div>`).join('')}</div>
      <div class="after">
        ${U.resultHTML(q.ok, q.picked ? '' : ' <span class="sub">답을 쓰지 않았습니다</span>')}
        <div class="stat" id="stat">${U.statInner(q.id, q.seconds, times)}</div>
        ${U.solHTML({ explain: q.explain ? fix(q.explain) : '', bogi: q.bogi ? fix(q.bogi) : '', more: q.more ? fix(q.more) : '', rel: U.relHTML(q.id) })}
        ${U.tailHTML(q.id)}
        <div class="check" style="justify-content:space-between;margin-top:32px">
          ${prev ? `<a class="btn btn-s" href="${href(prev)}">‹ 이전 문항</a>` : '<span></span>'}
          ${next ? `<a class="btn btn-s" href="${href(next)}">다음 문항 ›</a>` : `<a class="btn btn-s" href="#/시험/${e(id)}/답안지">답안지로</a>`}</div></div>`;
    U.wireItem(q.id, window.scExamSheet);
    U.fillStats(q.id);
    document.getElementById('exAllQ').onclick = () => { setWrongOnly(false); reviewItem(id, no); };
    document.getElementById('exBadQ').onclick = () => {
      setWrongOnly(true);
      if (q.ok && firstBad) location.hash = href(firstBad); else reviewItem(id, no);
    };
  }

  window.scExam = (id, sub, no) => {
    if (!id) return list();
    if (sub === '답안지') return no ? reviewItem(id, no) : review(id);
    cache = null;
    return take(id, sub === '다시');
  };
  window.scExamStop = stopClock;
})();
