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
.exq .ch.pick{border-color:var(--primary);background:rgba(47,107,255,.08)}`;
  document.head.appendChild(st);
  const NUM = ['', '①', '②', '③', '④', '⑤'];
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const v = () => document.getElementById('view');
  let clock = null;
  const stopClock = () => { if (clock) clearInterval(clock); clock = null; };
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
      const state = s.submitted ? `<b>${s.score ?? ''} / ${s.total ?? ''}점</b>` : s.open ? (s.started ? '푸는 중' : '') : '닫힘';
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
    const ans = loadAns(id);
    v().innerHTML = `<h1>${e(x.name)}</h1>
      <div class="exhead"><span class="extime" id="exT"></span><span class="exnote" id="exC"></span><span style="flex:1"></span><button class="btn btn-p" id="exGo">제출하기</button>
        <div class="exomr" id="exO">${x.items.map(q => `<a href="javascript:void 0" data-j="${q.no}"></a>`).join('')}</div></div>
      ${x.items.map(q => `<div class="exq" id="exq${q.no}"><div class="exno">${q.no}번${q.points ? ` <span class="exnote">${q.points}점</span>` : ''}</div>
        <div class="stem x">${fix(q.stem)}</div>
        <div class="choices">${(q.choices || []).map((c, k) => `<div class="ch" role="button" data-q="${e(q.id)}" data-k="${k + 1}"><span class="num">${k + 1}</span><span class="txt">${e(c)}</span></div>`).join('')}</div></div>`).join('')}
      <div style="margin:24px 0"><button class="btn btn-p" id="exGo2">제출하기</button> <span class="exnote" id="exW"></span></div>`;
    const paint = () => {
      let n = 0;
      x.items.forEach(q => {
        const a = ans[q.id], o = document.querySelector(`#exO [data-j="${q.no}"]`);
        if (a) n++;
        o.textContent = a ? `${q.no}${NUM[a]}` : q.no; o.className = a ? 'on' : '';
      });
      document.getElementById('exC').textContent = `답한 문항 ${n} / ${x.items.length}`;
      document.querySelectorAll('.exq .ch').forEach(c => c.classList.toggle('pick', ans[c.dataset.q] === +c.dataset.k));
      return n;
    };
    v().querySelectorAll('.exq .ch').forEach(c => c.onclick = () => {
      const q = c.dataset.q, k = +c.dataset.k;
      if (ans[q] === k) delete ans[q]; else ans[q] = k;
      saveAns(id, ans); armed = false; paint();
    });
    v().querySelectorAll('#exO a').forEach(a => a.onclick = () => document.getElementById('exq' + a.dataset.j).scrollIntoView({ behavior: 'smooth' }));
    let armed = false, sending = false;
    const send = async () => {
      if (sending) return; sending = true; stopClock();
      const { data: r, error: er } = await sb.rpc('exam_submit', { p_set: id, p_answers: ans });
      if (er || r.result === 'not_started') { sending = false; document.getElementById('exW').textContent = '제출하지 못했습니다. 다시 눌러 주세요.'; return; }
      try { localStorage.removeItem(key(id)); } catch (y) {}
      location.hash = `#/시험/${id}/답안지`;
    };
    const ask = () => {
      const n = paint(), left = x.items.length - n, w = document.getElementById('exW');
      if (!armed) { armed = true; w.textContent = (left ? `빈 문항이 ${left}개 있습니다. ` : '') + '제출하면 고칠 수 없습니다. 한 번 더 누르면 제출합니다.'; document.getElementById('exGo2').scrollIntoView({ block: 'center' }); return; }
      send();
    };
    document.getElementById('exGo').onclick = ask;
    document.getElementById('exGo2').onclick = ask;
    paint();
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

  async function review(id, onlyWrong) {
    stopClock();
    v().innerHTML = '<p class="exnote">답안지를 불러오는 중입니다…</p>';
    const { data: r, error } = await sb.rpc('exam_review', { p_set: id });
    if (error || r.result === 'not_submitted') { v().innerHTML = '<p>제출한 답안이 없습니다.</p><a class="btn btn-s" href="#/시험">시험 목록</a>'; return; }
    if (r.result === 'closed') {
      v().innerHTML = `<h1>시험 결과</h1><div class="exscore">${r.score} / ${r.total}점</div><p>맞힌 문항 ${r.correct} / ${r.count}</p><p class="exnote">이 시험은 닫혀서 문제와 해설은 볼 수 없습니다.</p><a class="btn btn-s" href="#/시험">시험 목록</a>`;
      return;
    }
    const fix = await signed(r.items.flatMap(q => [q.stem, q.explain, q.bogi, q.more]));
    const show = r.items.filter(q => !onlyWrong || !q.ok);
    v().innerHTML = `<h1>${e(r.name)} 답안지</h1><div class="exscore">${r.score} / ${r.total}점</div><div class="sub">맞힌 문항 ${r.correct} / ${r.count}</div>
      <div class="exhead"><div class="exomr">${r.items.map(q => `<a href="javascript:void 0" class="${q.ok ? 'ok' : 'bad'}" data-j="${q.no}">${q.no}${q.ok ? '○' : '✕'}</a>`).join('')}</div>
        <button class="btn btn-s" id="exW2">${onlyWrong ? '모든 문항 보기' : '틀린 문항만 보기'}</button><a class="btn btn-s" href="#/시험">시험 목록</a></div>
      ${show.map(q => `<div class="exq rev" id="exq${q.no}"><div class="exno">${q.no}번 ${q.ok ? '○' : '✕'} <span class="exnote">내 답 ${q.picked ? NUM[q.picked] : '안 씀'} · 정답 ${NUM[q.answer] || ''}${q.points ? ' · ' + q.points + '점' : ''}</span></div>
        <div class="exnote">${e(q.source)}</div><div class="stem x">${fix(q.stem)}</div>
        <div class="choices">${(q.choices || []).map((c, k) => `<div class="ch ${k + 1 === q.answer ? 'ans' : k + 1 === q.picked ? 'wrong' : ''}"><span class="num">${k + 1}</span><span class="txt">${e(c)}</span></div>`).join('')}</div>
        ${q.explain ? `<h2>해설</h2><div class="x">${fix(q.explain)}</div>` : '<p class="exnote">이 문항은 아직 해설이 없습니다.</p>'}
        ${q.more ? `<div class="more"><h2>더 알아보기</h2><div class="x">${fix(q.more)}</div></div>` : ''}
        ${q.bogi ? `<h2>보기 해설</h2><div class="x">${fix(q.bogi)}</div>` : ''}</div>`).join('') || '<p class="exnote">틀린 문항이 없습니다.</p>'}`;
    document.getElementById('exW2').onclick = () => review(id, !onlyWrong);
    v().querySelectorAll('.exomr a').forEach(a => a.onclick = () => { const t = document.getElementById('exq' + a.dataset.j); if (t) t.scrollIntoView({ behavior: 'smooth' }); });
  }

  window.scExam = (id, sub) => { if (!id) return list(); if (sub === '답안지') return review(id); return take(id); };
  window.scExamStop = stopClock;
})();
