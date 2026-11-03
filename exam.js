// 시험 화면 — 목록 → 풀기(타이머 · OMR) → 제출 → 채점 → 답안지 · 해설 (2026-11-03, 결정 D-457)
// 문제 · 정답은 서버 함수로만 받는다. 정답 · 해설은 제출한 뒤에만 오고, 시험이 닫히면 점수만 남는다
(function () {
  const st = document.createElement('style');
  st.textContent = `
.exhead{position:sticky;top:57px;z-index:10;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 0;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.extime{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
.extime.low{color:var(--danger)}
.exomr{display:flex;flex-wrap:wrap;gap:4px;width:100%}
.exomr a{min-width:32px;height:32px;padding:0 4px;border:1px solid var(--line-strong);border-radius:6px;display:grid;place-items:center;font-size:13px}
.exomr a.on{background:var(--primary);border-color:var(--primary);color:#fff}
.exomr a.ok{border-color:var(--ok);color:var(--ok)}
.exomr a.bad{border-color:var(--danger);color:var(--danger)}
.exq{padding:24px 0;border-bottom:1px solid var(--line);scroll-margin-top:150px}
.exno{font-size:18px;font-weight:700;margin-bottom:8px}
.exrow{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;padding:14px 16px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px}
.exrow .grow{flex:1;min-width:200px}
.exscore{font-size:28px;font-weight:700;margin:8px 0}
.exnote{color:var(--sub);font-size:14px}
.exq .ch{cursor:pointer}
.exq.rev .ch{cursor:default}
.exq .ch.ans{border-color:var(--ok);background:rgba(34,160,107,.08)}
.exq .ch.wrong{border-color:var(--danger);background:rgba(229,72,77,.08)}
.exq .ch.sel{background:rgba(47,107,255,.08)}
.exqn{font-size:24px;font-weight:700;margin-right:4px}
.exmask{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:50;display:grid;place-items:center;padding:16px}
.exbox{background:var(--bg);border-radius:12px;padding:24px;width:100%;max-width:380px;box-shadow:0 10px 30px rgba(0,0,0,.2)}
.exbox h3{margin:0 0 12px;font-size:19px}
.exbox p{margin:6px 0}
.exbox .left a{display:inline-block;margin:4px 4px 0 0;min-width:32px;padding:2px 6px;border:1px solid var(--danger);color:var(--danger);border-radius:6px;text-align:center}
.exbox .btns{display:flex;gap:8px;margin-top:20px}.exbox .btns .btn{flex:1;justify-content:center}
.exgrid{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
.exgrid a{width:56px;height:56px;border-radius:10px;border:2px solid;display:grid;place-items:center;font-weight:700;font-size:15px;line-height:1.1;text-align:center}
.exgrid a.ok{border-color:var(--primary);color:var(--primary)}
.exgrid a.bad{border-color:var(--danger);color:var(--danger);background:rgba(229,72,77,.06)}
.exgrid a small{display:block;font-size:18px}
.exbig{display:flex;align-items:center;gap:14px;margin:14px 0 4px;padding:12px 16px;border-radius:10px;font-size:20px;font-weight:700}
.exbig.ok{background:rgba(47,107,255,.08);color:var(--primary)}
.exbig.bad{background:rgba(229,72,77,.08);color:var(--danger)}
.exbig .mk{font-size:30px;line-height:1}
.exbig .my{font-size:17px;color:var(--text);font-weight:600}
.exbody h2{margin-top:28px}
.exres{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:20px;align-items:start;margin-top:12px}
@media(max-width:760px){.exres{grid-template-columns:minmax(0,1fr)}.excard{order:-1}}
.exli{display:grid;grid-template-columns:40px minmax(0,1fr) 160px;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px;color:inherit;text-decoration:none}
.exli:hover{border-color:var(--line-strong)}
.exli.bad{border-left:4px solid var(--danger)}
.exln{font-size:20px;font-weight:700}
.exlt{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.5}
.exlr .o{color:var(--primary);font-weight:700}.exlr .x{color:var(--danger);font-weight:700}
.excard{position:sticky;top:80px;border:1px solid var(--line);border-radius:12px;padding:16px}
.excard .btn{width:100%;justify-content:center;margin-top:8px}
.excard details{margin-top:14px}.excard summary{cursor:pointer;color:var(--sub);font-size:14px}
.omrpage .excard .sheet{columns:auto}`;
  document.head.appendChild(st);
  const NUM = ['', '①', '②', '③', '④', '⑤'];
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const v = () => document.getElementById('view');
  let clock = null, track = null;
  const stopClock = () => { if (clock) clearInterval(clock); if (track) clearInterval(track); clock = track = null; const m = document.getElementById('exM'); if (m) m.remove(); };
  const mmss = s => `${Math.floor(s / 60)}분 ${s % 60}초`;
  const firstLine = h => { const d = document.createElement('template'); d.innerHTML = String(h || '').replace(/<img[^>]*>/g, ' ').replace(/<[^>]+>/g, ' '); return d.content.textContent.replace(/\s+/g, ' ').trim().slice(0, 90); };
  const key = id => 'sc.exam.' + id;
  const loadAns = id => { try { return JSON.parse(localStorage.getItem(key(id)) || '{}'); } catch (x) { return {}; } };
  const saveAns = (id, a) => { try { localStorage.setItem(key(id), JSON.stringify(a)); } catch (x) {} };
  const when = t => t ? new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';

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

  async function list() {
    stopClock();
    v().innerHTML = '<p class="exnote">시험 목록을 불러오는 중입니다…</p>';
    const { data, error } = await sb.rpc('exam_list');
    if (error) { v().innerHTML = '<p>시험 목록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>'; return; }
    const admin = !!window.scIsAdmin;
    const rows = data.map(s => {
      const state = s.submitted ? `<b>${s.score ?? ''}점</b>` : s.open ? (s.started ? '푸는 중' : '') : '닫힘';
      const go = s.submitted ? (s.open ? `<a class="btn btn-s" href="#/시험/${s.id}/답안지">답안지</a>` : '')
        : s.open ? `<a class="btn btn-p" href="#/시험/${s.id}">${s.started ? '이어 풀기' : admin && s.status !== 'published' ? '미리 풀기' : '시작하기'}</a>` : '';
      return `<div class="exrow"><div class="grow"><b>${e(s.name)}</b><div class="exnote">${s.count}문항${s.minutes ? ' · ' + s.minutes + '분' : ''}${s.closes_at ? ' · ' + when(s.closes_at) + ' 닫힘' : ''}${admin ? ' · ' + e(s.status) : ''}</div></div><span>${state}</span>${go}</div>`;
    }).join('');
    v().innerHTML = `<h1>시험</h1><div class="sub">게시된 시험을 풀고 답안지와 해설을 봅니다.</div>
      <div class="tabs"><a class="tab" href="#/">문제</a><a class="tab" href="#/목록/개념">개념 카드</a><a class="tab on" href="#/시험">시험</a></div>
      ${rows || '<p class="exnote">지금 풀 수 있는 시험이 없습니다.</p>'}`;
  }

  async function take(id) {
    stopClock();
    v().innerHTML = '<p class="exnote">시험을 여는 중입니다…</p>';
    const { data: x, error } = await sb.rpc('exam_start', { p_set: id });
    if (error) { v().innerHTML = '<p>시험을 열지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>'; return; }
    if (x.result !== 'ok') { v().innerHTML = '<p>이 시험은 지금 열려 있지 않습니다.</p><a class="btn btn-s" href="#/시험">시험 목록</a>'; return; }
    if (x.submitted) { location.hash = `#/시험/${id}/답안지`; return; }
    const fix = await signed(x.items.map(q => q.stem));
    const ans = loadAns(id), skey = key(id) + '.s';
    let secs = {}; try { secs = JSON.parse(localStorage.getItem(skey) || '{}'); } catch (y) {}
    v().innerHTML = `<h1>${e(x.name)}</h1>
      <div class="exhead"><span class="extime" id="exT"></span><span class="exnote" id="exC"></span><span style="flex:1"></span><button class="btn btn-p" id="exGo">제출하기</button>
        <div class="exomr" id="exO">${x.items.map(q => `<a href="javascript:void 0" data-j="${q.no}"></a>`).join('')}</div></div>
      ${x.items.map(q => `<div class="exq" id="exq${q.no}"><div class="exno">${q.no}번${q.points ? ` <span class="exnote">${q.points}점</span>` : ''}</div>
        <div class="stem x">${fix(q.stem)}</div>
        <div class="choices">${(q.choices || []).map((c, k) => `<div class="ch" role="button" data-q="${e(q.id)}" data-k="${k + 1}"><span class="num">${k + 1}</span><span class="txt">${e(c)}</span></div>`).join('')}</div></div>`).join('')}
      <div style="margin:24px 0"><button class="btn btn-p" id="exGo2">제출하기</button></div>`;
    // 고른 선지는 번호 동그라미를 채운다(문제 화면과 같은 모양, 원장 검토 A1). 「답함 · 안 품」 글씨는 2차 검토에서 뺐다 — 선지 색으로 충분
    const paint = () => {
      let n = 0;
      x.items.forEach(q => {
        const a = ans[q.id], o = document.querySelector(`#exO [data-j="${q.no}"]`);
        if (a) n++;
        o.textContent = q.no; o.className = a ? 'on' : '';
      });
      document.getElementById('exC').textContent = `답한 문항 ${n} / ${x.items.length}`;
      document.querySelectorAll('.exq .ch').forEach(c => c.classList.toggle('sel', ans[c.dataset.q] === +c.dataset.k));
      return n;
    };
    v().querySelectorAll('.exq .ch').forEach(c => c.onclick = () => {
      const q = c.dataset.q, k = +c.dataset.k;
      if (ans[q] === k) delete ans[q]; else ans[q] = k;
      saveAns(id, ans); paint();
    });
    const jump = no => document.getElementById('exq' + no).scrollIntoView({ behavior: 'smooth' });
    v().querySelectorAll('#exO a').forEach(a => a.onclick = () => jump(a.dataset.j));
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
      try { localStorage.removeItem(key(id)); localStorage.removeItem(skey); } catch (y) {}
      location.hash = `#/시험/${id}/답안지`;
    };
    // 제출 확인 창: 화면 가운데에 답한 수 · 안 푼 번호 · 주의 문구 (원장 검토 A3)
    const ask = () => {
      closeAsk();
      const n = paint(), miss = x.items.filter(q => !ans[q.id]);
      const m = document.createElement('div');
      m.className = 'exmask'; m.id = 'exM';
      m.innerHTML = `<div class="exbox" role="dialog" aria-modal="true"><h3>제출할까요?</h3>
        <p>답한 문항 <b>${n} / ${x.items.length}</b></p>
        ${miss.length ? `<p class="left">안 푼 번호 ${miss.map(q => `<a href="javascript:void 0" data-j="${q.no}">${q.no}</a>`).join('')}</p>` : '<p>모든 문항에 답했습니다.</p>'}
        <p class="exnote">제출하면 답을 고칠 수 없습니다. 한 번 더 확인해 보세요.</p><p class="exnote" id="exMW" style="color:var(--danger)"></p>
        <div class="btns"><button class="btn btn-s" id="exMB">계속 풀기</button><button class="btn btn-p" id="exMS">제출하기</button></div></div>`;
      document.body.appendChild(m);
      m.onclick = ev => { if (ev.target === m) closeAsk(); };
      document.getElementById('exMB').onclick = closeAsk;
      document.getElementById('exMS').onclick = send;
      m.querySelectorAll('.left a').forEach(a => a.onclick = () => { closeAsk(); jump(a.dataset.j); });
    };
    document.getElementById('exGo').onclick = ask;
    document.getElementById('exGo2').onclick = ask;
    paint();
    // 문항별 시간(원장 11/03 6판 — 내 풀이 시간 · 평균 시간): 1초마다 화면 가운데 위쪽에 있는 문항에 1초를 더한다
    track = setInterval(() => {
      if (document.hidden || !document.getElementById('exO')) return;
      const y = window.innerHeight * 0.4;
      const box = [...document.querySelectorAll('.exq')].find(d => { const b = d.getBoundingClientRect(); return b.top <= y && b.bottom >= y; });
      if (!box) return;
      const q = x.items.find(it => 'exq' + it.no === box.id); if (!q) return;
      secs[q.id] = (secs[q.id] || 0) + 1;
      try { localStorage.setItem(skey, JSON.stringify(secs)); } catch (y2) {}
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

  // 답안지 — 첫 화면은 점수 · 번호표 요약, 번호를 누르면 그 문항 한 화면(위 문제 · 아래 해설, 문제 화면과 같은 꼴 — 원장 검토 B1~B5)
  let cache = null;   // {id, r, fix} — 문항을 넘길 때마다 서버를 다시 부르지 않는다
  const WKEY = 'sc.exam.wrongOnly';
  const wrongOnly = () => { try { return sessionStorage.getItem(WKEY) === '1'; } catch (x) { return false; } };
  const setWrongOnly = on => { try { sessionStorage.setItem(WKEY, on ? '1' : '0'); } catch (x) {} };
  async function loadReview(id) {
    if (cache && cache.id === id) return cache;
    const { data: r, error } = await sb.rpc('exam_review', { p_set: id });
    if (error || r.result === 'not_submitted') return { bad: true };
    const fix = r.result === 'closed' ? null : await signed(r.items.flatMap(q => [q.stem, q.explain, q.bogi, q.more]));
    cache = { id, r, fix };
    return cache;
  }

  // 내 답안지(OMR 꼴): 번호 · ○✕ · ①~⑤ (파랑 채움 = 맞힌 답, 빨강 = 틀리게 고른 답, 파랑 테두리 = 정답). 줄을 누르면 그 문항 해설
  const omrHTML = (r, id, cur) => `<div class="sheet">${r.items.map(x => {
      const n = (x.choices || []).length || 5;
      const dots = Array.from({ length: n }, (_, j) => j + 1).map(k => `<span class="dot ${k === x.picked ? (x.ok ? 'ok' : 'bad') : k === x.answer ? 'ans' : ''}">${k}</span>`).join('');
      return `<a class="srow ${String(x.no) === String(cur) ? 'cur' : ''}" href="#/시험/${e(id)}/답안지/${x.no}"><span class="sn">${x.no}</span><span class="sr ${x.ok ? 'o' : 'x'}">${x.ok ? '○' : '✕'}</span>${dots}</a>`;
    }).join('')}</div>
    <div class="legend"><span><span class="dot ok"></span> 내가 고른 답(맞음)</span><span><span class="dot bad"></span> 내가 고른 답(틀림)</span><span><span class="dot ans"></span> 정답</span></div>`;

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
    // 결과 화면(원장 11/03 6판 · 결정 D-486): 왼쪽 = 문항 목록(무슨 문제를 틀렸는지), 오른쪽 = 점수만 · 걸린 시간 · 해설 단추.
    // ○✕ 채점표는 종이에 푼 학생만 쓰므로 접어 둔다
    const firstBad = r.items.find(q => !q.ok), U = window.scUI;
    const row = q => `<a class="exli ${q.ok ? '' : 'bad'}" href="#/시험/${e(id)}/답안지/${q.no}" data-all="1">
        <span class="exln">${q.no}</span>
        <span class="exlt">${e(firstLine(q.stem))}${q.unit ? ` <span class="sub">· ${e(U.UNAME(q.unit))}</span>` : ''}</span>
        <span class="exlr">${q.ok ? '<span class="o">○ 맞음</span>' : `<span class="x">✕ ${q.picked ? '내 답 ' + NUM[q.picked] : '답 안 씀'}</span>`}
          <br><span class="sub">${q.ok ? '' : '정답 ' + NUM[q.answer] + ' · '}정답률 <b data-rate="${e(q.id)}">—</b></span></span></a>`;
    v().innerHTML = `<div class="omrpage"><div class="excrumb"><a href="#/시험">시험</a> › <b>${e(r.name)}</b></div>
      <div class="exres"><div>${r.items.map(row).join('')}<div class="sub">줄을 누르면 그 문항의 해설이 열립니다</div></div>
        <aside class="excard"><div class="sub">점수</div><div class="exscore">${r.score}점</div>
          <div class="sub">${r.count}문항 중 ${r.correct}문항 맞힘${r.elapsed ? ' · 걸린 시간 ' + mmss(r.elapsed) : ''}</div>
          ${firstBad ? `<a class="btn btn-p" href="#/시험/${e(id)}/답안지/${firstBad.no}" id="exBad">틀린 문항만 해설</a>` : ''}
          <a class="btn ${firstBad ? 'btn-s' : 'btn-p'}" href="#/시험/${e(id)}/답안지/${r.items[0].no}" id="exAll">1번부터 해설</a>
          <a class="btn btn-s" href="#/시험">‹ 시험 목록</a>
          <details><summary>종이에 푼 학생용 채점표(○✕)</summary>${omrHTML(r, id)}</details></aside></div></div>`;
    document.getElementById('exAll').onclick = () => setWrongOnly(false);
    v().querySelectorAll('.exli').forEach(a => a.addEventListener('click', () => setWrongOnly(false)));
    const b = document.getElementById('exBad'); if (b) b.onclick = () => setWrongOnly(true);
    r.items.forEach(q => window.scSync.stats(q.id).then(s => {
      const el = v().querySelector(`[data-rate="${CSS.escape(q.id)}"]`);
      if (el && s && s.rate != null) el.textContent = s.rate + '%';
    }).catch(() => {}));
  }

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
    window.scExamSheet = () => U.panelOpen('답안지', `<div class="sub">${e(r.name)} · ${r.score}점</div>` + omrHTML(r, id, q.no));
    // 문제 화면과 같은 부품(app.js toolsHTML · resultHTML · statInner · solHTML · tailHTML · wireItem — 결정 D-487).
    // 시험에서 온 때만 위 위치 줄 · 아래 「틀린 문항만 넘기기」가 다르다
    const times = U.loadAttempts().filter(a => a['문항'] === q.id).length + 1;
    v().innerHTML = `<div class="bar1"><div class="excrumb"><a href="#/시험">시험</a> › <a href="#/시험/${e(id)}/답안지">${e(r.name)}</a> › <b>${q.no}번</b></div>
        <div class="nav"><a class="btn btn-s" href="#/시험/${e(id)}/답안지">결과</a><a class="ic" ${prev ? `href="${href(prev)}"` : 'style="color:var(--line)"'}>‹</a><span>${W ? '틀린 문항만' : `${i + 1} / ${seq.length}`}</span>
          <a class="ic" ${next ? `href="${href(next)}"` : 'style="color:var(--line)"'}>›</a></div></div>
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
          <label class="exnote" style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="exWO" ${W ? 'checked' : ''}>틀린 문항만 넘기기</label>
          ${next ? `<a class="btn btn-s" href="${href(next)}">다음 문항 ›</a>` : `<a class="btn btn-s" href="#/시험/${e(id)}/답안지">결과로</a>`}</div></div>`;
    U.wireItem(q.id, window.scExamSheet);
    U.fillStats(q.id);
    document.getElementById('exWO').onchange = ev => { setWrongOnly(ev.target.checked); reviewItem(id, no); };
  }

  window.scExam = (id, sub, no) => {
    if (!id) return list();
    if (sub === '답안지') return no ? reviewItem(id, no) : review(id);
    cache = null;
    return take(id);
  };
  window.scExamStop = stopClock;
})();
