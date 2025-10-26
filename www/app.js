
let state = {};
let units = { power: 'W', energy: 'kWh' };

function formatPower(v) {
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  // If configured for kW, convert automatically from W
  if (units.power === 'kW') {
    return (n / 1000).toFixed(2) + ' kW';
  }
  return n.toFixed(0) + ' W';
}

function formatNum(v, suffix='') {
  if (v === undefined || v === null || isNaN(v)) return '--';
  return Number(v).toFixed(1) + (suffix || '');
}

function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = Math.max(0, Math.min(100, pct || 0)) + '%';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
}

function setRingSegment(cls, pct) {
  const max = 2 * Math.PI * 42; // circumference
  const v = Math.max(0, Math.min(100, pct || 0));
  const dash = (v / 100) * max;
  const rest = max - dash;
  const el = document.querySelector('.ring .seg.' + cls);
  if (el) el.setAttribute('stroke-dasharray', `${dash} ${rest}`);
}

function computeDerived() {
  // derive some percentages if not provided
  const pv = pick('pvPower', 'productionTotal');
  const load = pick('consumptionTotal');
  const buy = pick('gridBuyPower');
  const sell = pick('gridSellPower');

  const autarky = get('autarky');
  const selfc = get('selfConsumption');

  const res = {};
  if (autarky == null && pv != null && load != null) {
    // simple heuristic: share of load supplied by PV + battery (ignore battery for simplicity)
    const suppliedByPv = Math.max(0, Math.min(100, (pv / Math.max(1, load)) * 100));
    res.autarky = Math.max(0, Math.min(100, suppliedByPv));
  }
  if (selfc == null && pv != null) {
    // share of production used locally (pv - sell)/pv
    const local = Math.max(0, pv - (sell || 0));
    const pct = pv > 0 ? (local / pv) * 100 : 0;
    res.selfConsumption = Math.max(0, Math.min(100, pct));
  }
  return res;

  function get(k){ return state[k]?.value; }
  function pick(...keys){
    for (const k of keys) { const v = get(k); if (v != null && !isNaN(v)) return Number(v); }
    return null;
  }
}

function render() {
  const s = state;

  const d = (k) => s[k]?.value;

  // Top ring values: map PV, Grid, Load, Bat flows to percent of max for visualization
  const pv = d('pvPower') ?? d('productionTotal');
  const load = d('consumptionTotal');
  const buy = d('gridBuyPower');
  const sell = d('gridSellPower');
  const charge = d('storageChargePower');
  const discharge = d('storageDischargePower');
  const soc = d('storageSoc');

  const maxVal = Math.max(1, ...[pv, load, buy, sell, charge, discharge].filter(x => typeof x === 'number').map(Math.abs));
  const pct = (v) => typeof v === 'number' ? (Math.abs(v) / maxVal) * 100 : 0;

  setRingSegment('pv', pct(pv));
  setRingSegment('grid', pct((buy||0)+(sell||0)));
  setRingSegment('load', pct(load));
  setRingSegment('bat', pct((charge||0)+(discharge||0)));

  setText('pvPower', formatPower(pv ?? 0));
  setText('gridBuyPower', formatPower(buy ?? 0));
  setText('gridSellPower', formatPower(sell ?? 0));
  const batPower = (charge||0) - (discharge||0);
  setText('storagePower', formatPower(batPower));
  setText('consumptionTotal', formatPower(load ?? 0));

  // Cards
  const derived = computeDerived();
  const autarky = d('autarky') ?? derived.autarky;
  const selfc = d('selfConsumption') ?? derived.selfConsumption;

  setWidth('autarkyBar', autarky || 0);
  setText('autarkyValue', (autarky != null ? autarky.toFixed(0) : '--') + ' %');

  setWidth('selfConsumptionBar', selfc || 0);
  setText('selfConsumptionValue', (selfc != null ? selfc.toFixed(0) : '--') + ' %');

  setWidth('storageSocBar', soc || 0);
  setText('storageSocValue', (soc != null ? soc.toFixed(0) : '--') + ' %');

  setText('storageChargePower', formatPower(charge ?? 0));
  setText('storageDischargePower', formatPower(discharge ?? 0));

  setText('gridBuyPowerCard', formatPower(buy ?? 0));
  setText('gridSellPowerCard', formatPower(sell ?? 0));

  setText('productionTotal', formatPower(d('productionTotal') ?? pv ?? 0));
  setText('gridFrequency', d('gridFrequency') != null ? d('gridFrequency').toFixed(2) + ' Hz' : '--');

  setText('consumptionEvcs', formatPower(d('consumptionEvcs') ?? 0));
  setText('consumptionOther', formatPower(d('consumptionOther') ?? 0));

  setText('evcsStatus', (d('evcsStatus') ?? '--'));
  setText('evcsLastChargeKwh', d('evcsLastChargeKwh') != null ? d('evcsLastChargeKwh').toFixed(2) + ' kWh' : '--');
}

async 

// Brand/logo + sections
let sections = ['live','history','settings','smarthome'];
function applyBranding(cfg){
  const logo = (cfg.branding && cfg.branding.logoUrl) || '';
  const img = document.getElementById('logo');
  if (img && logo) img.src = logo;
  sections = cfg.sections || sections;
}

// Flow scaling
function updateFlows(){
  const pv = state['pvPower']?.value ?? state['productionTotal']?.value ?? 0;
  const load = state['consumptionTotal']?.value ?? 0;
  const buy  = state['gridBuyPower']?.value ?? 0;
  const sell = state['gridSellPower']?.value ?? 0;
  const ch   = state['storageChargePower']?.value ?? 0;
  const dis  = state['storageDischargePower']?.value ?? 0;

  // heuristics
  const pvLocal = Math.max(0, pv - sell);
  const pvToLoad = Math.max(0, Math.min(load, pvLocal));
  const pvToBat  = Math.max(0, ch);
  const pvToGrid = Math.max(0, sell);
  const gridToLoad = Math.max(0, buy);
  const batToLoad = Math.max(0, dis);

  const flows = {
    'flow-pv-load': pvToLoad,
    'flow-pv-bat': pvToBat,
    'flow-pv-grid': pvToGrid,
    'flow-grid-load': gridToLoad,
    'flow-bat-load': batToLoad
  };
  const max = Math.max(1, ...Object.values(flows));
  for (const [id, val] of Object.entries(flows)){
    const el = document.getElementById(id);
    if (!el) continue;
    const w = 3 + (val / max) * 9; // 3..12px
    el.style.strokeWidth = w + 'px';
    // color arrow marker according to class
    const marker = document.querySelector('#arrow path');
    if (el.classList.contains('grid')) marker && (marker.setAttribute('fill', '#f9a825'));
    else if (el.classList.contains('bat')) marker && (marker.setAttribute('fill', '#ab47bc'));
    else marker && (marker.setAttribute('fill', 'var(--nx-green)'));
  }
}

// History chart (ECharts)
let chart, chartInited=false;
async function renderHistory(){
  if (!window.echarts) return;
  const el = document.getElementById('historyChart');
  if (!el) return;
  if (!chart){ chart = echarts.init(el); chartInited=true; }
  const res = await fetch('/api/live-series').then(r=>r.json()).catch(()=>({keys:[],data:[]}));
  const keys = res.keys || [];
  const data = res.data || [];
  const x = data.map(r=>r.ts);
  const series = keys.map(k=>({ name:k, type:'line', showSymbol:false, data: data.map(r=>[r.ts, r[k]]) }));
  chart.setOption({
    animation:true,
    tooltip:{ trigger:'axis' },
    legend:{ textStyle:{ color:'#ccc' } },
    xAxis:{ type:'time', axisLabel:{ color:'#aaa' } },
    yAxis:{ type:'value', axisLabel:{ color:'#aaa' } },
    grid:{ left:40, right:10, top:30, bottom:30 },
    series
  });
}

// SmartHome control handlers
async function apiSet(key, value){
  await fetch('/api/set', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ key, value })
  }).catch(()=>{});
}
function initSmhControls(){
  const btnHeat = document.getElementById('btnHeatPumpToggle');
  const btnLock = document.getElementById('btnWallboxLock');
  const btnSave = document.getElementById('btnSaveSmh');
  const inRt    = document.getElementById('inpRoomTemp');
  const inGrid  = document.getElementById('inpGridLimit');
  const inPv    = document.getElementById('inpPvCurt');
  if (btnHeat) btnHeat.onclick = ()=> apiSet('smartHome_heatPumpOn', !(state['smartHome_heatPumpOn']?.value));
  if (btnLock) btnLock.onclick = ()=> apiSet('smartHome_wallboxLock', !(state['smartHome_wallboxLock']?.value));
  if (btnSave) btnSave.onclick = ()=> {
    if (inRt && inRt.value) apiSet('smartHome_roomTemp', parseFloat(inRt.value));
    if (inGrid && inGrid.value) apiSet('smartHome_gridLimit', parseFloat(inGrid.value));
    if (inPv && inPv.value) apiSet('smartHome_pvCurtailment', parseFloat(inPv.value));
  };
}

function bootstrap() {
  try {
    const cfgRes = await fetch('/config');
    const cfg = await cfgRes.json();
    units = cfg.units || units;
      applyBranding(cfg);
  } catch(e) {}

  const snap = await fetch('/api/state').then(r => r.json());
  state = snap || {};
  render();

  const es = new EventSource('/events');
  const dot = document.getElementById('liveDot');
  es.onopen = () => dot.classList.add('live');
  es.onerror = () => dot.classList.remove('live');
  es.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'init' && msg.payload) {
        state = msg.payload;
      } else if (msg.type === 'update' && msg.payload) {
        Object.assign(state, msg.payload);
      }
      render();
    updateFlows();
    renderHistory();
    initSmhControls();
    const al=document.getElementById('adminLink'); if(al){al.href=location.protocol+'//'+location.hostname+':8081/';}
    } catch (e) {
      console.warn(e);
    }
  };
}

bootstrap();


// Simple tab switching
function initTabs(){
  const buttons = document.querySelectorAll('.tabs .tab');
  const sections = {
    live: document.querySelector('.content'),
    history: document.querySelector('[data-tab-content="history"]'),
    settings: document.querySelector('[data-tab-content="settings"]'),
    smarthome: document.querySelector('[data-tab-content="smarthome"]'),
  };
  buttons.forEach(btn => btn.addEventListener('click', () => {
    buttons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.getAttribute('data-tab');

    // Show/hide groups
    // main ".content" holds live top sections; other sections are siblings
    document.querySelector('.content').style.display = (tab==='live') ? 'grid' : 'none';
    for (const k of ['history','settings','smarthome']) {
      const el = sections[k];
      if (el) el.classList.toggle('hidden', tab !== k);
    }
  }));
}

function renderSmartHome(){
  const onTxt = (v)=> v ? 'AN' : 'AUS';
  const d = (k)=> state[k]?.value;
  const get = (path) => {
    // allow mapping from smartHome.datapoints.* in the future
    return d(path);
  };
  const hp = get('smartHome_heatPumpOn');
  const rt = get('smartHome_roomTemp');
  const wl = get('smartHome_wallboxLock');
  const hpEl = document.getElementById('smhHeatPump');
  const rtEl = document.getElementById('smhRoomTemp');
  const wlEl = document.getElementById('smhWallboxLock');
  if (hpEl) hpEl.textContent = (hp===undefined?'--':onTxt(!!hp));
  if (rtEl) rtEl.textContent = (rt===undefined?'--':Number(rt).toFixed(1)+' °C');
  if (wlEl) wlEl.textContent = (wl===undefined?'--':(wl?'Gesperrt':'Freigabe'));
}

const _renderOrig = render;
render = function(){
  _renderOrig();
  renderSmartHome();
}
