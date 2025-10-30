
let state = {};
let INSTALLER_TOKEN = null;

function T(id, val){
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

async function bootstrap(){
  // initial snapshot
  try{
    const r = await fetch('/api/state'); state = await r.json();
  }catch(_){} render();

  // SSE with reconnect
  function startEvents(){
    try{
      const es = new EventSource('/events');
      const dot = document.getElementById('liveDot'); if (dot) dot.classList.remove('live');
      es.onopen = ()=> dot && dot.classList.add('live');
      es.onerror = ()=> { dot && dot.classList.remove('live'); try{es.close()}catch(_){ } setTimeout(startEvents, 3000); };
      es.onmessage = (ev)=>{
        try{
          const msg = JSON.parse(ev.data);
          if (msg.type === 'init' && msg.payload) state = msg.payload;
          else if (msg.type === 'update' && msg.payload) Object.assign(state, msg.payload);
          render();
        }catch(e){ console.warn(e); }
      };
    }catch(e){ setTimeout(startEvents, 3000); }
  }
  startEvents();
}

function render(){
  // show battery SoC at bottom
  const soc = Number(state['installer.socMin'] ?? state['settings.soc'] ?? 0);
  T('batterySocIn', isFinite(soc) ? (soc.toFixed(0)+' %') : '-- %');
}

function hideAllPanels(){
  document.querySelectorAll('[data-tab-content]').forEach(el=> el.classList.add('hidden'));
  document.querySelector('.content').style.display = 'block';
}

function initTabs(){
  const tabs = document.querySelectorAll('.status .tab');
  tabs.forEach((btn)=>{
    btn.addEventListener('click', ()=>{
      tabs.forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      hideAllPanels();
    });
  });
}

function initMenu(){
  const menu = document.getElementById('menuDropdown');
  const btn = document.getElementById('menuBtn');
  const open = ()=> menu.classList.remove('hidden');
  const close = ()=> menu.classList.add('hidden');
  document.addEventListener('click', close);
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); open(); });
  menu.addEventListener('click', (e)=> e.stopPropagation());

  const settingsBtn = document.getElementById('menuOpenSettings');
  const installerBtn = document.getElementById('menuOpenInstaller');

  settingsBtn.addEventListener('click', ()=>{
    close(); hideAllPanels();
    document.querySelector('[data-tab-content="settings"]').classList.remove('hidden');
  });

  installerBtn.addEventListener('click', async ()=>{
    close();
    const pw = prompt('Passwort eingeben (Installer)');
    if (pw === null) return; // Abbrechen -> nicht öffnen
    try{
      const r = await fetch('/api/installer/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pw })});
      const j = await r.json();
      if (!j || !j.ok){ alert('Passwort falsch'); return; }
      INSTALLER_TOKEN = j.token;
      hideAllPanels();
      document.querySelector('[data-tab-content="installer"]').classList.remove('hidden');
      setupInstaller();
    }catch(e){ alert('Login fehlgeschlagen'); }
  });
}

function bindInput(selector, key){
  const el = document.querySelector(selector);
  if (!el) return;
  const isCheck = el.type === 'checkbox';
  // init value
  const v = state[key];
  if (v !== undefined){
    if (isCheck) el.checked = !!v; else el.value = v;
  }
  el.addEventListener('change', async ()=>{
    const value = isCheck ? el.checked : (el.type==='number' ? Number(el.value) : el.value);
    try{ await fetch('/api/set', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, value })}); }catch(_){}
  });
}

function setupSettings(){
  bindInput('#s_notify', 'settings.notify');
  bindInput('#s_email', 'settings.email');
  bindInput('#s_dynamicTariff', 'settings.dynamicTariff');
  bindInput('#s_storagePower', 'settings.storagePower');
  bindInput('#s_price', 'settings.price');
  bindInput('#s_priority', 'settings.priority');
  bindInput('#s_tariffMode', 'settings.tariffMode');
}

function setupInstaller(){
  bindInput('#i_gridConnectionPower', 'installer.gridConnectionPower');
  bindInput('#i_para14a', 'installer.para14a');
  bindInput('#i_chargepoints', 'installer.chargepoints');
  bindInput('#i_storageCountMode', 'installer.storageCountMode');
  bindInput('#i_storagePower', 'installer.storagePower');
  bindInput('#i_emsMode', 'installer.emsMode');
  bindInput('#i_socMin', 'installer.socMin');
  bindInput('#i_socPeakRange', 'installer.socPeakRange');
  bindInput('#i_chargePowerMax', 'installer.chargePowerMax');
  bindInput('#i_dischargePowerMax', 'installer.dischargePowerMax');
  bindInput('#i_adminUrl', 'installer.adminUrl');

  const a = document.getElementById('openAdmin');
  const url = state['installer.adminUrl'] || '';
  if (a) a.href = url || '#';
}

window.addEventListener('DOMContentLoaded', ()=>{
  bootstrap();
  initTabs();
  initMenu();
  setupSettings();
  hideAllPanels(); // show live by default
});
