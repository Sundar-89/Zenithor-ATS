// assets/js/app.js

// Helper
const $ = (sel, root=document) => root.querySelector(sel);
const app = $('#app');

// Routes
const routes = {
  '/login': renderLogin,
  '/home': renderHome,
  '/candidates': renderDepartments,
  '/designation': renderDesignation,
  '/viewer': renderViewer,
  '/jobs': renderJobs,
  '/interviews': renderInterviews,
  '/reports': renderReports
};

// State
let CONFIG = null;
let session = { loggedIn: false };
let ctx = { deptKey: null, roleKey: null, images: [], index: 0 };

// Load config.json
async function loadConfig() {
  if (CONFIG) return CONFIG;
  const res = await fetch('data/config.json');
  if (!res.ok) {
    console.error('Failed to load config.json:', res.status, res.statusText);
    throw new Error('config.json load failed');
  }
  CONFIG = await res.json();
  return CONFIG;
}

function setAuthUI() {
  const nav = document.querySelector('nav[data-auth="true"]');
  if (nav) nav.style.display = session.loggedIn ? 'flex' : 'none';
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

// -------- Login --------
function renderLogin() {
  app.innerHTML = $('#login-tpl').innerHTML;
  $('#loginBtn').onclick = () => {
    localStorage.setItem('zr_session','1');
    session.loggedIn = true;
    setAuthUI();
    navigate('/home');
  };
}

// -------- Home (Dashboard) --------
async function renderHome() {
  if (!requireAuth()) return;
  app.innerHTML = $('#home-tpl').innerHTML;
  const cfg = await loadConfig();
  // Cards
  $('#openReqsNum').textContent = cfg.widgets.openReqs;
  $('#newCandsNum').textContent = cfg.widgets.newCandidates;
  // Lists
  $('#interviewsList').innerHTML = `<h3>Interviews This Week</h3><ul>${cfg.widgets.interviews.map(i=>`<li>${i}</li>`).join('')}</ul>`;
  $('#tasksList').innerHTML = `<h3>Tasks</h3><ul>${cfg.widgets.tasks.map(t=>`<li>${t}</li>`).join('')}</ul>`;
  // Charts
  if (window.renderDashboardCharts) window.renderDashboardCharts(cfg);
}

// -------- Candidates: Departments --------
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

// -------- Candidates: Designations --------
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

// -------- Viewer --------
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

// -------- Jobs (with jd.json) --------
async function renderJobs(){
  if (!requireAuth()) return;
  app.innerHTML = $('#jobs-tpl').innerHTML;

  const cfg = await loadConfig();

  // Load JDs
  let jd = {};
  try {
    const r = await fetch('data/jd.json');
    if (!r.ok) throw new Error('jd.json HTTP '+r.status);
    jd = await r.json();
    console.log('JD loaded. Keys:', Object.keys(jd));
  } catch(e) {
    console.error('Failed to load jd.json:', e);
    jd = {};
  }

  // Flatten roles from config
  const roles = [];
  Object.entries(cfg.departments).forEach(([deptKey, dep])=>{
    Object.keys(dep.designations).forEach(roleKey=>{
      roles.push({
        deptKey,
        deptName: dep.name,
        roleKey,
        roleName: roleKey.replace(/-/g,' '),
        openings: 1
      });
    });
  });

  const list = $('#jobsList');

  const renderList = (items)=>{
    list.innerHTML = items.map(job=>{
      const j = jd[job.roleKey] || {};
      const hasJD = !!jd[job.roleKey];
      if (!hasJD) console.warn('Missing JD for roleKey:', job.roleKey);

      const resps = (j.responsibilities||[]).map(x=>`<li>${x}</li>`).join('');
      const reqs = (j.requirements||[]).map(x=>`<li>${x}</li>`).join('');
      const quals = (j.qualifications||[]).map(x=>`<li>${x}</li>`).join('');
      const mets = (j.metrics||[]).map(x=>`<li>${x}</li>`).join('');

      return `
        <div class="job-card" data-role="${job.roleKey}" data-dept="${job.deptKey}">
          <div class="job-head">
            <div>
              <div class="job-title">${j.title || job.roleName}</div>
              <div class="hint">${j.department || job.deptName} • Openings: ${job.openings}</div>
            </div>
            <div class="job-actions">
              <button class="btn-ghost toggle">View JD</button>
              <button class="btn-primary glow apply" data-nav="#/candidates">Screen</button>
            </div>
          </div>
          <div class="job-body">
            ${hasJD && j.summary ? `<p>${j.summary}</p>` : `<p class="hint">JD not found for ${job.roleName}. Check jd.json key "${job.roleKey}".</p>`}
            <h4>Key Responsibilities</h4>
            <ul>${resps || '<li class="hint">—</li>'}</ul>
            <h4>Required Skills and Competencies</h4>
            <ul>${reqs || '<li class="hint">—</li>'}</ul>
            <h4>Qualifications</h4>
            <ul>${quals || '<li class="hint">—</li>'}</ul>
            <h4>Performance Metrics</h4>
            <ul>${mets || '<li class="hint">—</li>'}</ul>
          </div>
        </div>
      `;
    }).join('');

    // Toggle JD body
    list.querySelectorAll('.toggle').forEach(btn=>{
      btn.onclick = (e)=>{
        const body = e.target.closest('.job-card').querySelector('.job-body');
        body.classList.toggle('open');
      };
    });
    // Go to screening
    list.querySelectorAll('.apply').forEach(btn=>{
      btn.onclick = ()=> navigate('/candidates');
    });
  };

  renderList(roles);

  // Search
  const search = $('#jobSearch');
  search.oninput = ()=>{
    const q = search.value.toLowerCase();
    const filtered = roles.filter(r=> (r.roleName.toLowerCase().includes(q) || r.deptName.toLowerCase().includes(q)));
    renderList(filtered);
  };
}

// -------- Interviews --------
async function renderInterviews(){
  if (!requireAuth()) return;
  app.innerHTML = $('#interviews-tpl').innerHTML;

  const rows = [
    ['Finance','financial analyst','ANJALI JOSEPH','HR Screen','Priya S','2025-09-01','15:00','Scheduled'],
    ['Marketing','marketing manager','AKSHIN','Panel','Ravi T','2025-09-01','16:30','Scheduled'],
    ['Operations','operations team lead','PRIYA SHARMA','Tech','Divya N','2025-09-02','11:00','Completed'],
    ['Finance','fpa analyst','MICHAEL MORONNE','Final','CFO','2025-09-03','12:00','Pending']
  ];

  const tbody = $('#interviewsBody');
  tbody.innerHTML = rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
}

// -------- Reports --------
async function renderReports(){
  if (!requireAuth()) return;
  app.innerHTML = $('#reports-tpl').innerHTML;

  $('#kpiTTF').textContent = '24';
  $('#kpiOAR').textContent = '78%';
  $('#kpiI2H').textContent = '4.2:1';
  $('#kpiConv').textContent = '12%';

  const funnel = document.getElementById('reportFunnel');
  const sources = document.getElementById('reportSources');
  if (typeof Chart !== 'undefined'){
    new Chart(funnel, {
      type:'bar',
      data:{
        labels:['Sourced','Applied','Screen','Interview','Offer','Hired'],
        datasets:[{label:'Pipeline', data:[320,220,140,75,30,18], backgroundColor:'#16a6ff88'}]
      },
      options:{animation:{duration:700, easing:'easeOutQuart'}, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
    });
    new Chart(sources, {
      type:'doughnut',
      data:{
        labels:['LinkedIn','Referral','Job Board','Campus','Direct'],
        datasets:[{data:[42,18,22,10,8], backgroundColor:['#00e5c388','#16a6ff88','#a66bff88','#ffcb1f88','#ff6b6b88']}]
      },
      options:{plugins:{legend:{position:'bottom'}}}
    });
  }
}

// Wiring
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
