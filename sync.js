// 풀이 기록 · 메모 · 표시를 계정마다 서버에 저장한다(2026-11-03, 결정 D-457). 기기에 먼저 남기고 서버로 보낸다 — 끊겨도 다음에 다시 보낸다
window.scSync = (function () {
  let uid = null, marks = { 'sc.bm': new Set(), 'sc.unsure': new Set() };
  const KIND = { 'sc.bm': 'bookmark', 'sc.unsure': 'unsure' };
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // 같은 기기에서 다른 사람이 로그인하면 앞사람 기록을 지운다
  function forOwner(id) {
    let prev = null; try { prev = localStorage.getItem('sc.user'); } catch (e) {}
    if (prev === id) return;
    try {
      Object.keys(localStorage).filter(k => k.startsWith('sc.')).forEach(k => localStorage.removeItem(k));
      localStorage.setItem('sc.user', id);
    } catch (e) {}
  }

  const row = a => ({
    user_id: uid, question_id: a['문항'], picked: a['고른답'], correct: !!a['맞음'], seconds: a['초'],
    marks: { bogi: a['보기표시'] || {}, out: a['선지표시'] || {}, outCorrect: !!a['지운정답'] },
    client_id: a.id, solved_at: a['날짜'] });

  async function sendAttempts() {
    const list = get('sc.attempts', []), todo = list.filter(a => !a.sent && a.id);
    if (!todo.length) return;
    const { error } = await sb.from('attempts').upsert(todo.map(row), { onConflict: 'user_id,client_id', ignoreDuplicates: true });
    if (error) return;
    const fresh = get('sc.attempts', []);
    todo.forEach(t => { const f = fresh.find(a => a.id === t.id); if (f) f.sent = true; });
    put('sc.attempts', fresh);
  }

  async function all(table, cols, order) {
    let out = [], from = 0;
    for (;;) {
      let q = sb.from(table).select(cols).eq('user_id', uid);
      if (order) q = q.order(order);
      const { data, error } = await q.range(from, from + 999);
      if (error) throw error;
      out = out.concat(data);
      if (data.length < 1000) return out;
      from += 1000;
    }
  }

  const putExam = rows => put('sc.examAtt', rows.filter(r => r.set_id).map(r => ({ q: r.question_id, ok: !!r.correct, at: r.solved_at })));

  async function pull() {
    const [rows, ms, notes] = await Promise.all([
      all('attempts', 'question_id,picked,correct,seconds,marks,client_id,solved_at,set_id', 'solved_at'),
      all('user_marks', 'question_id,kind'), all('user_notes', 'question_id,html')]);
    // 시험 풀이는 시험 화면에서만 본다. 연습 풀이만 문제 화면에 되살린다. 시험 풀이는 오답노트 · 정답률용으로 따로 둔다
    putExam(rows);
    const practice = rows.filter(r => !r.set_id);
    const local = get('sc.attempts', []), seen = new Set(practice.map(r => r.client_id));
    const merged = practice.map(r => ({ id: r.client_id, sent: true, 날짜: r.solved_at, 문항: r.question_id, 고른답: r.picked, 맞음: r.correct, 초: r.seconds,
      보기표시: (r.marks || {}).bogi || {}, 선지표시: (r.marks || {}).out || {}, 지운정답: !!(r.marks || {}).outCorrect }))
      .concat(local.filter(a => !seen.has(a.id)));
    merged.sort((a, b) => String(a['날짜']).localeCompare(String(b['날짜'])));
    put('sc.attempts', merged);
    const cleared = get('sc.cleared', {}), res = {};
    merged.forEach(a => {
      if (cleared[a['문항']] && cleared[a['문항']] >= a['날짜']) return;
      res[a['문항']] = { sel: a['고른답'], ok: a['맞음'], out: a['선지표시'], bogi: a['보기표시'], outCorrect: a['지운정답'], secs: a['초'] };
    });
    put('sc.res', res);
    Object.keys(KIND).forEach(k => {
      marks[k] = new Set(ms.filter(m => m.kind === KIND[k]).map(m => m.question_id));
      put(k, [...marks[k]]);
    });
    notes.forEach(n => { try { localStorage.setItem('sc.memo.' + n.question_id, n.html); } catch (e) {} });
  }

  return {
    async init(id) { uid = id; forOwner(id); await sendAttempts(); await pull(); },
    attempt() { sendAttempts(); },
    cleared(qid) { const c = get('sc.cleared', {}); c[qid] = new Date().toISOString(); put('sc.cleared', c); },
    async set(k, s) {
      if (!KIND[k]) return;
      const now = new Set(s), old = marks[k];
      const add = [...now].filter(x => !old.has(x)), del = [...old].filter(x => !now.has(x));
      marks[k] = now;
      if (add.length) await sb.from('user_marks').upsert(add.map(q => ({ user_id: uid, question_id: q, kind: KIND[k] })), { onConflict: 'user_id,question_id,kind', ignoreDuplicates: true });
      if (del.length) await sb.from('user_marks').delete().eq('user_id', uid).eq('kind', KIND[k]).in('question_id', del);
    },
    async memo(qid, html) {
      if (html && html.replace(/<[^>]+>/g, '').trim()) await sb.from('user_notes').upsert({ user_id: uid, question_id: qid, html, updated_at: new Date().toISOString() });
      else await sb.from('user_notes').delete().eq('user_id', uid).eq('question_id', qid);
    },
    // 시험을 낸 뒤 오답노트 · 정답률을 바로 맞춘다
    async exams() { if (!uid) return; try { putExam(await all('attempts', 'question_id,correct,solved_at,set_id', 'solved_at')); } catch (e) {} },
    async stats(qid) { const { data } = await sb.rpc('question_stats', { p_id: qid }); return data; }
  };
})();
