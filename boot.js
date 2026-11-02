// 사이큐브 입구 — 구글 로그인 → 계정 상태 확인 → 서버에서 문항 · 개념 읽기 → 화면(app.js) 시작 (2026-11-03, 결정 D-449 · D-450)
// 문제 · 해설 · 그림은 이 저장소에 없다. 권한은 슈퍼베이스 권한 규칙이 막는다(이 파일의 키는 공개용).
const sb = supabase.createClient('https://psndtmacrcgtxwhidxsl.supabase.co', 'sb_publishable_eJ6ntCud7lCioSVBabpqkA_CqCNqeXQ', {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
});
const UNIT_ORDER = ['자연선택과진화', '생물다양성과보전'];
const gate = document.getElementById('gate');
const layout = document.querySelector('.layout');

function showGate(html) { layout.style.display = 'none'; gate.style.display = 'block'; gate.innerHTML = `<div class="gatebox"><div class="gatelogo">사이큐브</div>${html}</div>`; }
function inApp() { return /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line\//i.test(navigator.userAgent); }

function loginScreen(msg) {
  if (inApp()) {
    showGate(`<p>카카오톡 등 앱 안의 브라우저에서는 구글 로그인이 막혀 있습니다.</p>
      <p><b>이 주소를 복사해 크롬이나 사파리에서 열어 주세요.</b></p><p class="gatesub">${location.origin}</p>`);
    return;
  }
  showGate(`${msg ? `<p class="gateerr">${msg}</p>` : ''}
    <button class="gatebtn" id="gglogin">구글로 로그인</button>
    <p class="gatesub">학교 계정이 아니라 <b>개인 구글 계정</b>으로 로그인하세요. 학교 계정은 막혀 있을 수 있고, 졸업하면 기록이 사라질 수 있습니다.</p>`);
  document.getElementById('gglogin').onclick = () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
}

function waitScreen(html) {
  showGate(`${html}<button class="gatebtn gatesec" id="logout">로그아웃</button>`);
  document.getElementById('logout').onclick = async () => { await sb.auth.signOut(); loginScreen(); };
}

async function fetchAll(table, cols) {
  let out = [], from = 0, size = 1000;
  for (;;) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + size - 1);
    if (error) throw error;
    out = out.concat(data);
    if (data.length < size) return out;
    from += size;
  }
}

// 서버 표 → 화면이 쓰는 꼴(window.SC). 화면 코드 app.js 는 그대로 둔다
async function loadData() {
  const [qs, cs, qc, cl] = await Promise.all([
    fetchAll('questions', '*'), fetchAll('concepts', '*'),
    fetchAll('question_concepts', 'question_id,concept,role,label'), fetchAll('concept_links', 'concept,label,target')]);
  const live = qs.filter(q => q.status === 'live');
  // 그림: 비공개 저장소 → 잠깐 쓰는 주소로 바꾼다
  const htmls = live.flatMap(q => [q.stem_html, q.explain_html, q.bogi_html, q.more_html]).concat(cs.flatMap(c => c.sections.map(s => s.html)));
  const keys = [...new Set(htmls.flatMap(h => [...h.matchAll(/src="img\/([^"]+)"/g)].map(m => m[1])))];
  const urls = {};
  if (keys.length) {
    const { data, error } = await sb.storage.from('question-images').createSignedUrls(keys, 60 * 60 * 24);
    if (error) throw error;
    data.forEach(d => { if (d.signedUrl) urls[d.path] = d.signedUrl; });
  }
  const fix = h => h.replace(/src="img\/([^"]+)"/g, (m, k) => `src="${urls[k] || ''}"`);
  const rank = u => { const i = UNIT_ORDER.indexOf(u); return i < 0 ? 99 : i; };
  live.sort((a, b) => rank(a.unit) - rank(b.unit) || a.sort_order - b.sort_order);
  const byQ = {};
  qc.forEach(r => (byQ[r.question_id] = byQ[r.question_id] || []).push(r));
  const Q = live.map(q => {
    const rows = (byQ[q.id] || []).sort((a, b) => (a.role === 'related') - (b.role === 'related'));
    return {
      id: q.id, '순서': q.sort_order, '출처': q.source_label, '자료유형': q.item_type || '', '소단원': q.unit, '배점': q.points == null ? '' : String(q.points), '정답': q.answer,
      '문제': fix(q.stem_html), '선지': q.choices, '해설': fix(q.explain_html), '보기해설': fix(q.bogi_html), '더': fix(q.more_html),
      '관련': rows.map(r => ({ '말': r.label || r.concept, '카드': r.concept })), '참고': q.refs,
      '메타': { '학년': q.grade || '', '시험종류': q.exam_type || '', '출제기관': q.agency || '', '연도': q.year == null ? '' : String(q.year), '월': q.month == null ? '' : String(q.month), '원과목': q.orig_subject || '', '교육과정': q.curriculum || '' },
      '핵심': rows.filter(r => r.role !== 'related').map(r => r.concept)
    };
  });
  const C = {};
  cs.forEach(c => {
    C[c.name] = {
      '이름': c.name, '다른이름': c.aliases.join(' · '), '종류': c.kind || '', '범위': c.scope || '', '위': c.parent || '',
      '절': c.sections.map(s => ({ '제목': s.title, html: fix(s.html) })),
      '관련': cl.filter(l => l.concept === c.name).map(l => ({ '말': l.label, '카드': l.target })),
      '문항': Q.filter(q => q['핵심'].includes(c.name)).map(q => q.id)
    };
  });
  window.SC = { '문항': Q, '개념': C, '모의평가': [] };
}

function startApp() {
  gate.style.display = 'none'; layout.style.display = '';
  const s = document.createElement('script');
  s.src = 'app.js?v=1';
  document.body.appendChild(s);
  const top = document.querySelector('.top .in');
  const out = document.createElement('button');
  out.textContent = '로그아웃'; out.className = 'btn btn-s'; out.style.marginLeft = 'auto';
  out.onclick = async () => { await sb.auth.signOut(); location.reload(); };
  top.appendChild(out);
}

async function main() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return loginScreen();
  const { data: acc, error } = await sb.from('accounts').select('role,status').eq('user_id', session.user.id).maybeSingle();
  if (error || !acc) return waitScreen('<p>계정을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>');
  const { data: ok } = acc.role === 'admin' ? { data: true } : await sb.rpc('has_any_pass');
  if (!ok) {
    if (acc.status === 'pending') return waitScreen('<p><b>원장 승인을 기다리는 중입니다.</b></p>');
    if (acc.status === 'revoked') return waitScreen('<p>이용이 끝난 계정입니다. 학원에 문의해 주세요.</p>');
    return waitScreen('<p><b>계정 연결하기</b></p><p class="gatesub">학원생 계정 연결 화면은 곧 열립니다.</p>');
  }
  showGate('<p>문제를 불러오는 중입니다…</p>');
  try { await loadData(); startApp(); }
  catch (e) { waitScreen('<p>문제를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>'); }
}
main();
