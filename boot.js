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

// 앱 안 브라우저 → 바깥 브라우저로 넘기기. 카톡은 iOS · 안드로이드 모두 openExternal, 그 밖의 안드로이드는 크롬 intent
function outerUrl() {
  const u = location.origin + location.pathname;
  if (/KAKAOTALK/i.test(navigator.userAgent)) return 'kakaotalk://web/openExternal?url=' + encodeURIComponent(u);
  if (/Android/i.test(navigator.userAgent)) return 'intent://' + location.host + location.pathname + '#Intent;scheme=https;package=com.android.chrome;end';
  return '';
}

function loginScreen(msg) {
  if (inApp()) {
    const out = outerUrl();
    showGate(`<p>카카오톡 등 앱 안의 브라우저에서는 구글 로그인이 막혀 있습니다.</p>
      ${out ? `<button class="gatebtn" id="goOut">크롬 · 사파리로 열기</button>` : ''}
      <button class="gatebtn gatesec" id="copyUrl">주소 복사하기</button>
      <p class="gatesub">열리지 않으면 주소를 복사해 크롬이나 사파리에 붙여 넣어 주세요.<br>${location.origin}</p>`);
    if (out) { document.getElementById('goOut').onclick = () => { location.href = out; }; location.href = out; }
    document.getElementById('copyUrl').onclick = async e => {
      try { await navigator.clipboard.writeText(location.origin); e.target.textContent = '복사했습니다'; } catch (_) { prompt('주소를 길게 눌러 복사하세요', location.origin); }
    };
    return;
  }
  showGate(`${msg ? `<p class="gateerr">${msg}</p>` : ''}
    <button class="gatebtn" id="gglogin">구글로 로그인</button>
    <p class="gatesub">학교 계정이 아니라 <b>개인 구글 계정</b>으로 로그인하세요. 학교 계정은 막혀 있을 수 있고, 졸업하면 기록이 사라질 수 있습니다.</p>
    <p class="gatesub">사이큐브는 최과학 과학전문학원 학생이 과학 문제를 풀고 해설과 기록을 보는 서비스입니다. <a href="privacy.html">개인정보처리방침</a></p>`);
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

function gEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// 계정 연결 — 학원 웹사이트와 같은 순서(결정 D-432 · D-449): 이름 · 학생 전화번호 · 학부모 전화번호
function linkScreen(msg, vals, askDesk) {
  vals = vals || {};
  showGate(`<p><b>계정 연결하기</b></p>
    <p class="gatesub">출석부에 있는 정보로 학원생을 확인합니다.</p>
    ${msg ? `<p class="gateerr">${msg}</p>` : ''}
    <input class="gatein" id="lkName" placeholder="학생 이름" autocomplete="off" value="${gEsc(vals.name)}">
    <input class="gatein" id="lkStudent" placeholder="학생 전화번호 (없으면 비워 두세요)" inputmode="tel" autocomplete="off" value="${gEsc(vals.student)}">
    <input class="gatein" id="lkParent" placeholder="학부모 전화번호" inputmode="tel" autocomplete="off" value="${gEsc(vals.parent)}">
    <button class="gatebtn" id="lkGo">연결하기</button>
    ${askDesk ? `<button class="gatebtn gatesec" id="lkDesk">${askDesk}</button>` : ''}
    <button class="gatebtn gatesec" id="logout">로그아웃</button>`);
  document.getElementById('logout').onclick = async () => { await sb.auth.signOut(); loginScreen(); };
  const send = async request => {
    const v = { name: document.getElementById('lkName').value, student: document.getElementById('lkStudent').value, parent: document.getElementById('lkParent').value };
    const { data, error } = await sb.rpc('link_account', { p_name: v.name, p_student_phone: v.student, p_parent_phone: v.parent, p_request: request });
    if (error) return linkScreen('연결하지 못했습니다. 잠시 뒤 다시 해 주세요.', v);
    const r = data.result;
    if (r === 'invalid') return linkScreen('이름과 학부모 전화번호를 넣어 주세요.', v);
    if (r === 'not_enrolled') return linkScreen('재학 중인 학생만 쓸 수 있습니다. 궁금한 점은 학원 데스크에 문의해 주세요.', v);
    if (r === 'nomatch') return linkScreen('출석부와 맞지 않습니다. 이름이나 전화번호를 잘못 입력했는지 확인해 주세요. 그래도 안 되면 아래 단추를 눌러 주세요.', v, '데스크에 계정 확인 요청하기');
    if (r === 'taken') return linkScreen('이 학생은 이미 다른 구글 계정으로 연결되어 있습니다. 전에 쓰던 구글 계정으로 로그인해 주세요. 계정을 바꾸려면 아래 단추를 눌러 주세요.', v, '데스크에 계정 변경 요청하기');
    location.reload();
  };
  document.getElementById('lkGo').onclick = () => send(false);
  const d = document.getElementById('lkDesk');
  if (d) d.onclick = () => send(true);
}

function pendingScreen() {
  showGate(`<p><b>데스크 확인을 기다리는 중입니다.</b></p>
    <p class="gatesub">확인이 끝나면 이 화면을 새로 고침하세요. 잘못 입력했다면 다시 입력할 수 있습니다.</p>
    <button class="gatebtn" id="lkAgain">다시 입력하기</button>
    <button class="gatebtn gatesec" id="logout">로그아웃</button>`);
  document.getElementById('lkAgain').onclick = () => linkScreen();
  document.getElementById('logout').onclick = async () => { await sb.auth.signOut(); loginScreen(); };
}

// 관리자 화면 — 승인 · 거절 · 해제 · 복구
async function adminScreen(msg) {
  const { data, error } = await sb.rpc('admin_people');
  if (error) return showGate('<p>관리 화면을 열지 못했습니다.</p>');
  const pend = data.pending.map(q => `<div class="adrow"><div><b>${gEsc(q.name)}</b> <span class="gatesub">${gEsc(q.email)}</span><br><span class="gatesub">${gEsc(q.note)}</span></div>
      <div class="adact"><input class="gatein adno" id="no${q.id}" placeholder="학생번호" value="${gEsc(q.no)}"><button class="btn btn-p" data-ok="${q.id}">승인</button><button class="btn btn-s" data-no="${q.id}">거절</button></div></div>`).join('')
    || '<p class="gatesub">승인을 기다리는 사람이 없습니다.</p>';
  const acc = data.accounts.map(a => `<div class="adrow"><div><b>${gEsc(a.name || '')}</b> ${gEsc(a.no || '')} <span class="gatesub">${gEsc(a.email)}</span>${a.status === 'revoked' ? ' <span class="gateerr">해제됨</span>' : ''}</div>
      <div class="adact">${a.role === 'admin' ? '<span class="gatesub">관리자</span>' : `<button class="btn btn-s" data-acc="${a.user}" data-on="${a.status === 'revoked'}">${a.status === 'revoked' ? '복구' : '해제'}</button>`}</div></div>`).join('')
    || '<p class="gatesub">연결된 학생이 없습니다.</p>';
  layout.style.display = 'none'; gate.style.display = 'block';
  gate.innerHTML = `<div class="adbox"><div class="adhead"><h2>사이큐브 관리</h2><button class="btn btn-s" id="adBack">문제로 돌아가기</button></div>
    ${msg ? `<p class="gateerr">${gEsc(msg)}</p>` : ''}
    <h3>승인 대기 (${data.pending.length})</h3>${pend}<h3>연결된 학생 (${data.accounts.length})</h3>${acc}</div>`;
  document.getElementById('adBack').onclick = () => { gate.style.display = 'none'; layout.style.display = ''; };
  gate.querySelectorAll('[data-ok]').forEach(b => b.onclick = async () => {
    const id = +b.dataset.ok;
    const { error: er } = await sb.rpc('admin_approve', { p_request: id, p_student_no: document.getElementById('no' + id).value });
    adminScreen(er ? '승인하지 못했습니다.' : '');
  });
  gate.querySelectorAll('[data-no]').forEach(b => b.onclick = async () => { await sb.rpc('admin_reject', { p_request: +b.dataset.no }); adminScreen(); });
  gate.querySelectorAll('[data-acc]').forEach(b => b.onclick = async () => { await sb.rpc('admin_set_access', { p_user: b.dataset.acc, p_on: b.dataset.on === 'true' }); adminScreen(); });
}

function startApp(isAdmin) {
  gate.style.display = 'none'; layout.style.display = '';
  const s = document.createElement('script');
  s.src = 'app.js?v=3';
  window.scIsAdmin = isAdmin;
  document.body.appendChild(s);
  const top = document.querySelector('.top .in');
  if (isAdmin) {
    const ad = document.createElement('button');
    ad.textContent = '관리'; ad.className = 'btn btn-s'; ad.style.marginLeft = 'auto';
    ad.onclick = () => adminScreen();
    top.appendChild(ad);
  }
  const out = document.createElement('button');
  out.textContent = '로그아웃'; out.className = 'btn btn-s'; out.style.marginLeft = isAdmin ? '8px' : 'auto';
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
    if (acc.status === 'pending') return pendingScreen();
    if (acc.status === 'revoked') return waitScreen('<p>이용이 끝난 계정입니다. 학원에 문의해 주세요.</p>');
    return linkScreen();
  }
  showGate('<p>문제를 불러오는 중입니다…</p>');
  try { await loadData(); try { await window.scSync.init(session.user.id); } catch (e) {} startApp(acc.role === 'admin'); }
  catch (e) { waitScreen('<p>문제를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>'); }
}
main();
