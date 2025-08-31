// assets/js/app.js
const $ = (sel, root=document) => root.querySelector(sel);
const app = $('#app');

const routes = {
  '/login': renderLogin,
  '/home': renderHome,
  '/candidates': renderDepartments,
  '/designation': renderDesignation,
  '/viewer': renderViewer
};

let CONFIG = null;
let session = { loggedIn: false };
let ctx = { deptKey: null, roleKey: null, images: [], index: 0 };

async function loadConfig() {
  if (CONFIG) return CONFIG;
  const res = await fetch('data/config.json');
  CONFIG = await res.json();
  return CONFIG;
}

function setAuthUI() {
  const nav = document.querySelector('nav[data-auth="true"]');
  nav.style.display = session.loggedIn ? 'flex' : 'none';
}

function navigate(hash) { window.location.hash = hash; }

function parseHash() {
  const raw = window.location.hash || '#/login';
  const [path, query] = raw.slice(1).split('?');
  const params = new URLSearchParams(query || '');
  return { path: '/' + (path.replace(/^\//,'') || 'login'), params };
}

async function router() {
  session.loggedIn = localStorage.getItem('zr_session') === '1';
  setAuthUI();
  const { path, params } = parseHash();
  const handler = routes[path] || renderLogin;
  await handler(params);
}

function requireAuth() {
  if (!session.loggedIn) { navigate('/login'); return false; }
  return true;
}

function renderLogin() {
  app.innerHTML = $('#login-tpl').innerHTML;
  $('#loginBtn').onclick = () => {
    localStorage.setItem('zr_session','1');
    session.loggedIn = true;
    setAuthUI();
    navigate('/home');
  };
}

async function renderHome() {
  if (!requireAuth()) return;
  app.innerHTML = $('#home-tpl').innerHTML;
  const cfg = await loadConfig();
  $('#openReqsNum').textContent = cfg.widgets.openReqs;
  $('#newCandsNum').textContent = cfg.widgets.newCandidates;
  $('#interviewsList').innerHTML = `<h3>Interviews This Week</h3><ul>${cfg.widgets.interviews.map(i=>`<li>${i}</li>`).join('')}</ul>`;
  $('#tasksList').innerHTML = `<h3>Tasks</h3><ul>${cfg.widgets.tasks.map(t=>`<li>${t}</li>`).join('')}</ul>`;
  if (window.renderDashboardCharts) window.renderDashboardCharts(cfg);
}

async function renderDepartments() {
  if (!requireAuth()) return;
  app.innerHTML = $('#candidates-tpl').innerHTML;
  const cfg = await loadConfig();
  const grid = $('#deptGrid');
  grid.innerHTML = Object.entries(cfg.departments).map(([key,dep])=>`
    <div class="tile" data-dept="${key}">
      <h3>${dep.name}</h3>
      <p>4 designations</p>
    </div>
  `).join('');
  grid.querySelectorAll('.tile').forEach(el=>{
    el.onclick = () => {
      ctx.deptKey = el.dataset.dept;
      navigate(`#/designation?dept=${ctx.deptKey}`);
    };
  });
}

async function renderDesignation(params) {
  if (!requireAuth()) return;
  app.innerHTML = $('#designation-tpl').innerHTML;
  const cfg = await loadConfig();
  const deptKey = params.get('dept');
  const dep = cfg.departments[deptKey];
  $('#designationTitle').textContent = `${dep.name} — Select designation`;
  const grid = $('#candGrid');
  grid.innerHTML = Object.keys(dep.designations).map(roleKey => `
    <div class="tile" data-role="${roleKey}">
      <h3>${roleKey.replace(/-/g,' ')}</h3>
      <p>4 resumes</p>
    </div>
  `).join('');
  grid.querySelectorAll('.tile').forEach(el=>{
    el.onclick = () => {
      ctx.deptKey = deptKey;
      ctx.roleKey = el.dataset.role;
      const imgs = dep.designations[ctx.roleKey];
      ctx.images = imgs;
      ctx.index = 0;
      navigate(`#/viewer?dept=${deptKey}&role=${ctx.roleKey}&i=0`);
    };
  });
}

async function renderViewer(params) {
  if (!requireAuth()) return;
  app.innerHTML = $('#viewer-tpl').innerHTML;
  const cfg = await loadConfig();
  const deptKey = params.get('dept'); const roleKey = params.get('role');
  const i = parseInt(params.get('i')||'0',10);
  ctx.deptKey = deptKey; ctx.roleKey = roleKey; ctx.index = i;
  ctx.images = cfg.departments[deptKey].designations[roleKey];

  $('#viewerTitle').textContent = `${cfg.departments[deptKey].name} / ${roleKey.replace(/-/g,' ')}`;
  $('#backToDesignation').onclick = () => navigate(`#/designation?dept=${deptKey}`);
  $('#prevBtn').onclick = () => navigate(`#/viewer?dept=${deptKey}&role=${roleKey}&i=${(i+3)%4}`);
  $('#nextBtn').onclick = () => navigate(`#/viewer?dept=${deptKey}&role=${roleKey}&i=${(i+1)%4}`);
  $('#selectBestBtn').onclick = () => {
    const key = `${deptKey}:${roleKey}`;
    const store = JSON.parse(localStorage.getItem('zr_best')||'{}');
    store[key] = i;
    localStorage.setItem('zr_best', JSON.stringify(store));
    alert('Best resume selected for this designation.');
    navigate(`#/designation?dept=${deptKey}`);
  };

  $('#hudDept').textContent = cfg.departments[deptKey].name;
  $('#hudRole').textContent = roleKey.replace(/-/g,' ');
  $('#hudIndex').textContent = `${i+1}/4`;
  $('#resumeImage').src = `assets/resumes/${deptKey}/${roleKey}/${ctx.images[i]}`;
}

window.addEventListener('hashchange', router);
window.addEventListener('load', ()=>{
  document.getElementById('logoutBtn')?.addEventListener('click', ()=>{
    localStorage.removeItem('zr_session');
    localStorage.removeItem('zr_best');
    session.loggedIn = false;
    setAuthUI();
    navigate('/login');
  });
  router();
});
