'use strict';
const KEY = 'volunteerHub.v1';
const CATS = { env: '🌿 สิ่งแวดล้อม', edu: '📚 การศึกษา', community: '🤝 ชุมชน', animal: '🐶 สัตว์เลี้ยง' };
const STATUS = {
  registered: ['ลงทะเบียนแล้ว', 'info'],
  pending: ['รอตรวจสอบชั่วโมง', 'warning'],
  approved: ['อนุมัติแล้ว', 'success']
};
const TIERS = [[60, 'ระดับทอง 🥇'], [30, 'ระดับเงิน 🥈'], [10, 'ระดับทองแดง 🥉']];
const ACTIVITIES = [
  { id: 1, cat: 'community', title: 'จิตอาสาแพ็คถุงยังชีพช่วยผู้ประสบภัย', org: 'สมาคมกู้ภัยบรรเทาสาธารณภัย', date: '2026-11-22', time: '10:00 - 15:00', hours: 4, total: 50, taken: 28, location: 'คลังสินค้าบรรเทาทุกข์ ดอนเมือง', desc: 'ช่วยคัดแยกสิ่งของบริจาคและบรรจุถุงยังชีพ เพื่อส่งไปยังพื้นที่ที่ประสบภัย' },
  { id: 2, cat: 'animal', title: 'Care & Clean บ้านสุนัขจรจัด', org: 'มูลนิธิเคียงข้างเพื่อนสี่ขา', date: '2026-11-28', time: '09:00 - 14:00', hours: 5, total: 30, taken: 28, location: 'ศูนย์พักพิงสัตว์จรจัด นครปฐม', desc: 'อาบน้ำทำความสะอาดสุนัข ปรับปรุงกรงพัก และคัดแยกอาหารบริจาค' },
  { id: 3, cat: 'env', title: 'ปลูกป่าชายเลน อนุรักษ์ระบบนิเวศอ่าวไทย', org: 'มูลนิธิเพื่อการอนุรักษ์ธรรมชาติ', date: '2026-12-06', time: '08:00 - 15:00', hours: 6, total: 40, taken: 26, location: 'ศูนย์ศึกษาธรรมชาติป่าชายเลน สมุทรปราการ', desc: 'ร่วมปลูกกล้าไม้ 1,000 ต้นเพื่อฟื้นฟูแนวชายฝั่ง มีรถบัสรับส่งจาก BTS บางนา' },
  { id: 4, cat: 'community', title: 'ทาสีลานกิจกรรมชุมชนคลองเตย', org: 'เครือข่ายพัฒนาเมืองน่าอยู่', date: '2026-12-13', time: '08:30 - 16:00', hours: 7, total: 25, taken: 17, location: 'ชุมชนพัฒนาคลองเตย กรุงเทพฯ', desc: 'ปรับภูมิทัศน์ วาดภาพบนกำแพง และทาสีสนามเด็กเล่นให้ปลอดภัยและน่าอยู่' },
  { id: 5, cat: 'edu', title: 'ครูอาสาอ่านหนังสือให้น้องบนดอย', org: 'กลุ่มอาสาปัญญาดี', date: '2026-12-20', time: '09:00 - 16:00', hours: 8, total: 20, taken: 15, location: 'โรงเรียนบ้านห้วยหญ้าไซ จ.เชียงราย', desc: 'เล่านิทาน จัดกิจกรรมนันทนาการ และมอบอุปกรณ์การเรียนให้เด็กในพื้นที่ห่างไกล' }
];

let db = load();
let filter = { cat: 'all', q: '' };
let currentId = null;
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { users: {}, session: null }; }
  catch { return { users: {}, session: null }; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } }
const user = () => db.users[db.session];
const act = id => ACTIVITIES.find(a => a.id === id);
const entry = id => user().history.find(h => h.actId === id);
const seatsLeft = a => a.total - a.taken - (entry(a.id) ? 1 : 0);
const upcoming = a => new Date(a.date + 'T23:59:59') >= new Date();
const fmt = iso => new Date(iso + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
const sum = s => user().history.filter(h => h.status === s).reduce((t, h) => t + act(h.actId).hours, 0);
const tier = h => (TIERS.find(t => h >= t[0]) || [0, 'อาสาสมัครใหม่ 🌱'])[1];

function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'error' ? 'error' : '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ---------- auth ---------- */
function setAuthMode(mode) {
  const reg = mode === 'register';
  $('#loginForm').hidden = reg;
  $('#registerForm').hidden = !reg;
  $('#authTitle').textContent = reg ? 'สร้างบัญชีใหม่' : 'เข้าสู่ระบบ';
  $('#authSub').textContent = reg ? 'สมัครสมาชิกเพื่อเริ่มทำกิจกรรมดีๆ ไปด้วยกัน' : 'เข้าสู่ระบบเพื่อค้นหาและสมัครกิจกรรมอาสา';
  $('#authPrompt').textContent = reg ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชี?';
  $('#authSwitch').textContent = reg ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก';
  $('#authSwitch').dataset.mode = reg ? 'login' : 'register';
}

function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function handleAuth(e, mode) {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const email = String(f.get('email')).trim().toLowerCase();
  if (!validEmail(email)) return toast('กรุณากรอกอีเมลให้ถูกต้อง เช่น you@example.com', 'error');
  if (mode === 'register') {
    const phone = String(f.get('phone')).trim();
    if (!/^[0-9\-\s+]{9,15}$/.test(phone)) return toast('กรุณากรอกเบอร์โทรศัพท์เป็นตัวเลข 9-10 หลัก', 'error');
    if (String(f.get('password')).length < 8) return toast('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', 'error');
    if (!f.get('consent')) return toast('กรุณายอมรับการเก็บข้อมูลส่วนบุคคลก่อนสมัครนะ', 'error');
    if (db.users[email]) return toast('อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบได้เลย', 'error');
    db.users[email] = {
      name: String(f.get('name')).trim(), email, phone, role: 'อาสาสมัครใหม่', skills: [],
      memberId: 'VOL-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000)),
      history: []
    };
  } else if (!db.users[email]) {
    return toast('ไม่พบบัญชีนี้ กรุณาสมัครสมาชิกก่อนนะ', 'error');
  }
  db.session = email;
  save();
  e.currentTarget.reset();
  showApp();
  toast(mode === 'register' ? 'สมัครสมาชิกเรียบร้อย ยินดีต้อนรับสู่ชุมชนอาสา' : 'เข้าสู่ระบบเรียบร้อยแล้ว');
}

function showApp() {
  $('#auth').hidden = true;
  $('#app').hidden = false;
  renderAll();
  switchTab('catalog');
}

function logout() {
  db.session = null;
  save();
  $('#app').hidden = true;
  $('#auth').hidden = false;
  setAuthMode('login');
}

/* ---------- tabs ---------- */
function switchTab(id) {
  document.querySelectorAll('.panel').forEach(p => p.hidden = p.id !== 'tab-' + id);
  document.querySelectorAll('.tab').forEach(t => {
    if (t.dataset.tab === id) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0 });
}

/* ---------- catalog ---------- */
function renderCats() {
  const all = { all: 'ทั้งหมด', ...CATS };
  $('#cats').innerHTML = Object.entries(all).map(([k, v]) =>
    `<button type="button" class="pill" data-cat="${k}" aria-pressed="${filter.cat === k}">${v}</button>`).join('');
}

function seatBadge(a) {
  if (entry(a.id)) return '<span class="badge info">สมัครแล้ว</span>';
  const n = seatsLeft(a);
  if (n <= 0) return '<span class="badge danger">เต็มแล้ว</span>';
  if (n <= 5) return `<span class="badge warning">เหลือ ${n} ที่</span>`;
  return '<span class="badge success">เปิดรับสมัคร</span>';
}

function renderCatalog() {
  const q = filter.q.toLowerCase();
  const list = ACTIVITIES.filter(a => upcoming(a)
    && (filter.cat === 'all' || a.cat === filter.cat)
    && [a.title, a.org, a.location].some(s => s.toLowerCase().includes(q)));
  $('#grid').innerHTML = list.map(a => `
    <article class="card act" data-id="${a.id}">
      <div class="cover" aria-hidden="true">${CATS[a.cat].split(' ')[0]}</div>
      <div class="body">
        <div class="row"><small>${esc(CATS[a.cat])}</small>${seatBadge(a)}</div>
        <h3>${esc(a.title)}</h3>
        <p class="muted">${esc(a.org)}</p>
        <div class="row"><span>📅 ${fmt(a.date)}</span><b>${a.hours} ชม.</b></div>
        <button type="button" class="btn secondary" data-open="${a.id}">ดูรายละเอียด</button>
      </div>
    </article>`).join('');
  $('#emptyCatalog').hidden = list.length > 0;
}

function openActivity(id) {
  const a = act(id);
  if (!a) return;
  currentId = id;
  const mine = entry(id), full = seatsLeft(a) <= 0;
  const label = mine ? 'ลงทะเบียนแล้ว' : full ? 'กิจกรรมเต็มแล้ว' : 'ลงชื่อเข้าร่วมกิจกรรม';
  $('#actDialog').innerHTML = `
    <h3 id="actTitle">${esc(a.title)}</h3>
    <p class="muted">${esc(a.org)} · ${esc(CATS[a.cat])}</p>
    <div class="dl">
      <div><small>วันที่</small><b>${fmt(a.date)}<br>${a.time}</b></div>
      <div><small>ชั่วโมงจิตอาสา</small><b>${a.hours} ชั่วโมง</b></div>
      <div><small>ที่นั่งคงเหลือ</small><b>${Math.max(seatsLeft(a), 0)} / ${a.total}</b></div>
    </div>
    <p>${esc(a.desc)}</p>
    <p class="muted" style="margin-top:8px">📍 ${esc(a.location)}</p>
    <div class="actions">
      <button class="btn secondary" type="button" data-close>ปิด</button>
      <button class="btn primary" type="button" id="regBtn" ${mine || full ? 'disabled' : ''}>${label}</button>
    </div>`;
  $('#actDialog').showModal();
}

function register() {
  const a = act(currentId);
  if (!a || entry(a.id)) return;
  if (seatsLeft(a) <= 0) return toast('กิจกรรมนี้เต็มแล้ว ลองเลือกกิจกรรมอื่นนะ', 'error');
  user().history.unshift({ actId: a.id, status: 'registered' });
  save();
  $('#actDialog').close();
  renderAll();
  toast('สมัครเข้าร่วมกิจกรรมสำเร็จ เจอกันวันที่ ' + fmt(a.date));
}

function cancelRegistration(id) {
  const u = user();
  u.history = u.history.filter(h => !(h.actId === id && h.status === 'registered'));
  save();
  renderAll();
  toast('ยกเลิกการสมัครเรียบร้อยแล้ว');
}

/* ---------- tracker ---------- */
function renderTracker() {
  const u = user(), h = sum('approved');
  $('#stats').innerHTML = [
    ['ชั่วโมงที่อนุมัติแล้ว', h + ' ชม.'],
    ['กิจกรรมที่สมัครทั้งหมด', u.history.length + ' โครงการ'],
    ['รอตรวจสอบชั่วโมง', sum('pending') + ' ชม.'],
    ['ระดับปัจจุบัน', tier(h)]
  ].map(([l, v]) => `<div class="stat"><span>${l}</span><b>${v}</b></div>`).join('');
  $('#history').innerHTML = u.history.map(item => {
    const a = act(item.actId), [txt, cls] = STATUS[item.status];
    const action = item.status === 'approved'
      ? `<button class="btn secondary rowbtn" data-cert="${a.id}" type="button">ใบรับรอง</button>`
      : item.status === 'registered'
        ? `<button class="btn danger-outline rowbtn" data-cancel="${a.id}" type="button">ยกเลิก</button>` : '<small>รอผู้ดูแลตรวจสอบ</small>';
    return `<tr><td><b>${esc(a.title)}</b><small>${esc(a.org)}</small></td><td>${fmt(a.date)}</td><td>${a.hours} ชม.</td><td><span class="badge ${cls}">${txt}</span></td><td>${action}</td></tr>`;
  }).join('');
  $('#emptyHistory').hidden = u.history.length > 0;
  document.querySelector('#tab-tracker table').hidden = u.history.length === 0;
}

function showCert(title, desc) {
  $('#certTitle').textContent = user().name;
  $('#certDesc').textContent = desc;
  $('#certMeta').textContent = title + ' · ออกให้เมื่อ ' + new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  $('#certDialog').showModal();
}

/* ---------- profile ---------- */
function renderProfile() {
  const u = user(), h = sum('approved'), done = user().history.filter(x => x.status === 'approved').length;
  $('#avatar').textContent = u.name.trim().charAt(0);
  $('#pName').textContent = u.name;
  $('#pRole').textContent = u.role;
  $('#pTier').textContent = tier(h);
  $('#pId').textContent = u.memberId;
  $('#pEmail').textContent = u.email;
  $('#pPhone').textContent = u.phone;
  $('#pSkills').innerHTML = u.skills.length
    ? u.skills.map(s => `<span class="chip">${esc(s)}</span>`).join('')
    : '<p class="muted">ยังไม่ได้ระบุทักษะ กด “แก้ไขข้อมูลส่วนตัว” เพื่อเพิ่มได้เลย</p>';
  $('#pBadges').innerHTML = [
    ['🌱', 'ก้าวแรก', 'ทำกิจกรรมครั้งแรก', done >= 1],
    ['⏱️', '10 ชั่วโมง', 'สะสมครบ 10 ชม.', h >= 10],
    ['🌟', '30 ชั่วโมง', 'สะสมครบ 30 ชม.', h >= 30]
  ].map(([i, n, d, ok]) => `<div class="bdg ${ok ? '' : 'locked'}"><i>${i}</i><b>${n}</b><small>${d}</small></div>`).join('');
}

function renderAll() { renderCats(); renderCatalog(); renderTracker(); renderProfile(); }

/* ---------- events ---------- */
$('#loginForm').addEventListener('submit', e => handleAuth(e, 'login'));
$('#registerForm').addEventListener('submit', e => handleAuth(e, 'register'));
$('#authSwitch').addEventListener('click', e => setAuthMode(e.currentTarget.dataset.mode || 'register'));
$('#logoutBtn').addEventListener('click', logout);
$('#search').addEventListener('input', e => { filter.q = e.target.value.trim(); renderCatalog(); });

document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('dialog') && t === t.closest('dialog')) return t.close(); // click backdrop
  const closeBtn = t.closest('[data-close]'); if (closeBtn) return closeBtn.closest('dialog').close();
  const tabBtn = t.closest('[data-tab]'); if (tabBtn) return switchTab(tabBtn.dataset.tab);
  const cat = t.closest('[data-cat]'); if (cat) { filter.cat = cat.dataset.cat; renderCats(); return renderCatalog(); }
  const cancel = t.closest('[data-cancel]'); if (cancel) return cancelRegistration(+cancel.dataset.cancel);
  const cert = t.closest('[data-cert]');
  if (cert) { const a = act(+cert.dataset.cert); return showCert(a.title, `ได้ปฏิบัติงานอาสาสมัครในกิจกรรม “${a.title}” จำนวน ${a.hours} ชั่วโมง ด้วยความอุทิศตนเพื่อชุมชน`); }
  if (t.id === 'regBtn') return register();
  const card = t.closest('.act'); if (card) return openActivity(+card.dataset.id);
});

$('#summaryBtn').addEventListener('click', () => {
  const h = sum('approved');
  if (!h) return toast('ยังไม่มีชั่วโมงที่อนุมัติ เมื่อผู้ดูแลอนุมัติแล้วจะพิมพ์สรุปได้', 'error');
  showCert('สรุปชั่วโมงจิตอาสา', `ได้ปฏิบัติงานอาสาสมัครเพื่อประโยชน์แก่สังคมและชุมชน รวม ${h} ชั่วโมง ด้วยความอุทิศตนและเสียสละ`);
});
$('#printBtn').addEventListener('click', () => window.print());

$('#editBtn').addEventListener('click', () => {
  const f = $('#editForm'), u = user();
  f.name.value = u.name; f.phone.value = u.phone; f.role.value = u.role; f.skills.value = u.skills.join(', ');
  $('#editDialog').showModal();
});
$('#editForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.currentTarget, u = user();
  u.name = f.name.value.trim(); u.phone = f.phone.value.trim(); u.role = f.role.value.trim();
  u.skills = f.skills.value.split(',').map(s => s.trim()).filter(Boolean);
  save(); renderProfile();
  $('#editDialog').close();
  toast('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว');
});

/* ---------- init ---------- */
setAuthMode('login');
if (db.session && db.users[db.session]) showApp();