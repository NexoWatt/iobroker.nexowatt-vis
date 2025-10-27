
// --- Precise donut placement (anchor angles like OpenEMS) ---
function arcLenFromDeg(r, deg){ return 2 * Math.PI * r * (deg/360); }
function setArcAtAngle(selector, r, angleDeg, arcDeg){
  const C = 2 * Math.PI * r;
  const Ldeg = Math.max(0, Math.min(359.9, arcDeg));
  const dash = arcLenFromDeg(r, Ldeg);
  const offset = arcLenFromDeg(r, angleDeg) - dash/2; // center arc
  const el = document.querySelector(selector);
  if (!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1) + ' ' + (C - dash).toFixed(1));
  el.setAttribute('stroke-dashoffset', offset.toFixed(1));
}
function placeIconAtAngle(sel, angleDeg){
  const wrap = document.querySelector('.card.energy-donut .donut-wrap');
  const el = document.querySelector(sel);
  const svg = document.querySelector('.card.energy-donut .donut');
  if (!wrap || !el || !svg) return;
  const size = wrap.getBoundingClientRect().width;
  const R = size/2; 
  const nudge = Math.max(8, size/28);
  const a = (angleDeg - 90) * Math.PI / 180;
  const cx = size/2 + (R + nudge) * Math.cos(a);
  const cy = size/2 + (R + nudge) * Math.sin(a);
  el.style.left = cx + 'px';
  el.style.top  = cy + 'px';
  el.style.position='absolute';
  el.style.transform = 'translate(-50%, -50%)';
}

// Draw an arc inside a quadrant slot with small gaps between quadrants
function setArcInSlot(selector, r, slotIndex, slotFillPct){
  const C = 2 * Math.PI * r;
  const Q = C / 4;               // quarter length
  const gap = 4;                 // pixels gap in each slot
  const slotMax = Q - gap;       // usable track
  const fill = Math.max(0, Math.min(100, slotFillPct||0));
  const L = (fill/100) * slotMax;
  const start = slotIndex * Q + gap/2 + (slotMax - L)/2; // center arc in slot
  const el = document.querySelector(selector);
  if (!el) return;
  el.setAttribute('stroke-dasharray', L.toFixed(1) + ' ' + (C-L).toFixed(1));
  el.setAttribute('stroke-dashoffset', start.toFixed(1));
}

function setArc(selector, r, valuePct){
  const max = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, valuePct||0));
  const dash = (v/100)*max, rest = max-dash;
  const el=document.querySelector(selector);
  if(!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1)+' '+rest.toFixed(1));
}

function setDonut(cls, pct, inner=false) {
  const r = inner ? 34 : 42;
  const max = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct || 0));
  const dash = (v / 100) * max;
  const rest = max - dash;
  const q = '.donut .seg.' + cls;
  const el = document.querySelector(q);
  if (!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1) + ' ' + rest.toFixed(1));
}

// Format hours to "h:mm"
function formatHours(h) {
  if (!h || !isFinite(h) || h <= 0) return '--';
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return hh + 'h ' + (mm<10?'0':'') + mm + 'm';
}

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
  const el = document.querySelector?.('.ring .seg.' + cls);
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

async function bootstrap() {
  try {
    const cfgRes = await fetch('/config');
    const cfg = await cfgRes.json();
  window._cfg = cfg;
  units = cfg.units || units;
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

  // ---- Energy donut update ----
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const chg = +(d('storageChargePower') ?? 0);
    const dchg = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    const A = { pv: 330, load: 30, bat: 180, grid: 210 };
    const MAX = { pv: 110, load: 45, bat: 60, grid: 45 };
    const total = Math.max(1, pv + buy + load + (chg + dchg));
    const pctDeg = (val, maxDeg) => Math.max(2, Math.min(maxDeg, (val/total) * maxDeg));

    setArcAtAngle('.donut .arc.pv',   42, A.pv,   pctDeg(pv,   MAX.pv));
    setArcAtAngle('.donut .arc.load', 42, A.load, pctDeg(load, MAX.load));
    setArcAtAngle('.donut .arc.bat',  42, A.bat,  pctDeg(chg + dchg, MAX.bat));
    setArcAtAngle('.donut .arc.grid', 42, A.grid, pctDeg(buy,  MAX.grid));

    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvLbl', formatPower(pv));
    setText('gridLbl', formatPower(buy));
    setText('loadLbl', formatPower(load));
    setText('centerLbl', formatPower(0));

    if (soc !== undefined && !isNaN(Number(soc))) {
      setText('socLbl', Number(soc).toFixed(0)+' %');
      setArc('.donut .arc.soc', 34, Math.max(0, Math.min(100, Number(soc))));
    }
    if (cap && soc !== undefined) {
      const socPct = Number(soc)/100;
      const tFull = chg>0 ? ((cap*(1-socPct))*1000)/chg : null;
      const tEmpty= dchg>0 ? ((cap*socPct)*1000)/dchg : null;
      setText('tFull', 'Voll '+(tFull?formatHours(tFull):'--'));
      setText('tEmpty','Leer '+(tEmpty?formatHours(tEmpty):'--'));
    }

    placeIconAtAngle('.energy-donut .icon-block.pv',   A.pv);
    placeIconAtAngle('.energy-donut .icon-block.grid', A.grid);
    placeIconAtAngle('.energy-donut .icon-block.load', A.load);
  } catch(e){ console.warn('donut update', e); }

  /* DONUT-HOOK */

  // --- Runde Energieanzeige ---
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const sell = +(d('gridSellPower') ?? 0);
    const charge = +(d('storageChargePower') ?? 0);
    const discharge = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    // Values
    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvVal', formatPower(pv));
    setText('gridBuyVal', formatPower(buy));
    setText('gridSellVal', formatPower(sell));
    setText('chargeVal', formatPower(charge));
    setText('dischargeVal', formatPower(discharge));
    setText('centerLoad', formatPower(load));
    if (soc !== undefined && !isNaN(Number(soc))) setText('socText', 'SoC ' + Number(soc).toFixed(0) + ' %');

    // Times
    if (cap && soc !== undefined) {
      const socPct = Number(soc) / 100;
      const remToFull_kWh = cap * (1 - socPct);
      const remToEmpty_kWh = cap * (socPct);
      const tFull_h = charge > 0 ? (remToFull_kWh * 1000) / charge : null;
      const tEmpty_h = discharge > 0 ? (remToEmpty_kWh * 1000) / discharge : null;
      setText('tFull', 'Voll ' + (tFull_h?formatHours(tFull_h):'--'));
      setText('tEmpty', 'Leer ' + (tEmpty_h?formatHours(tEmpty_h):'--'));
      // SoC ring
      setDonut('soc', Math.max(0, Math.min(100, Number(soc))), true);
    }

    // Arcs relative to max flow
    const totalFlow = Math.max(1, pv + buy + load + (chg + dchg));
    const pct = (v) => Math.min(100, Math.max(0, (v / totalFlow) * 100));
    setDonut('pv', pct(pv));
    setDonut('gridbuy', pct(buy));
    setDonut('gridsell', pct(sell));
    setDonut('load', pct(load));
    setDonut('storage', pct(charge + discharge));
  } catch(e) { console.warn('donut render error', e); }

  _renderOrig();
  renderSmartHome();
}


// Zusätzliche Anzeige-Updates für Energiefluss
const _renderEF = render;
render = function(){

  // ---- Energy donut update ----
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const chg = +(d('storageChargePower') ?? 0);
    const dchg = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    const A = { pv: 330, load: 30, bat: 180, grid: 210 };
    const MAX = { pv: 110, load: 45, bat: 60, grid: 45 };
    const total = Math.max(1, pv + buy + load + (chg + dchg));
    const pctDeg = (val, maxDeg) => Math.max(2, Math.min(maxDeg, (val/total) * maxDeg));

    setArcAtAngle('.donut .arc.pv',   42, A.pv,   pctDeg(pv,   MAX.pv));
    setArcAtAngle('.donut .arc.load', 42, A.load, pctDeg(load, MAX.load));
    setArcAtAngle('.donut .arc.bat',  42, A.bat,  pctDeg(chg + dchg, MAX.bat));
    setArcAtAngle('.donut .arc.grid', 42, A.grid, pctDeg(buy,  MAX.grid));

    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvLbl', formatPower(pv));
    setText('gridLbl', formatPower(buy));
    setText('loadLbl', formatPower(load));
    setText('centerLbl', formatPower(0));

    if (soc !== undefined && !isNaN(Number(soc))) {
      setText('socLbl', Number(soc).toFixed(0)+' %');
      setArc('.donut .arc.soc', 34, Math.max(0, Math.min(100, Number(soc))));
    }
    if (cap && soc !== undefined) {
      const socPct = Number(soc)/100;
      const tFull = chg>0 ? ((cap*(1-socPct))*1000)/chg : null;
      const tEmpty= dchg>0 ? ((cap*socPct)*1000)/dchg : null;
      setText('tFull', 'Voll '+(tFull?formatHours(tFull):'--'));
      setText('tEmpty','Leer '+(tEmpty?formatHours(tEmpty):'--'));
    }

    placeIconAtAngle('.energy-donut .icon-block.pv',   A.pv);
    placeIconAtAngle('.energy-donut .icon-block.grid', A.grid);
    placeIconAtAngle('.energy-donut .icon-block.load', A.load);
  } catch(e){ console.warn('donut update', e); }

  /* DONUT-HOOK */

  // --- Runde Energieanzeige ---
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const sell = +(d('gridSellPower') ?? 0);
    const charge = +(d('storageChargePower') ?? 0);
    const discharge = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    // Values
    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvVal', formatPower(pv));
    setText('gridBuyVal', formatPower(buy));
    setText('gridSellVal', formatPower(sell));
    setText('chargeVal', formatPower(charge));
    setText('dischargeVal', formatPower(discharge));
    setText('centerLoad', formatPower(load));
    if (soc !== undefined && !isNaN(Number(soc))) setText('socText', 'SoC ' + Number(soc).toFixed(0) + ' %');

    // Times
    if (cap && soc !== undefined) {
      const socPct = Number(soc) / 100;
      const remToFull_kWh = cap * (1 - socPct);
      const remToEmpty_kWh = cap * (socPct);
      const tFull_h = charge > 0 ? (remToFull_kWh * 1000) / charge : null;
      const tEmpty_h = discharge > 0 ? (remToEmpty_kWh * 1000) / discharge : null;
      setText('tFull', 'Voll ' + (tFull_h?formatHours(tFull_h):'--'));
      setText('tEmpty', 'Leer ' + (tEmpty_h?formatHours(tEmpty_h):'--'));
      // SoC ring
      setDonut('soc', Math.max(0, Math.min(100, Number(soc))), true);
    }

    // Arcs relative to max flow
    const totalFlow = Math.max(1, pv + buy + load + (chg + dchg));
    const pct = (v) => Math.min(100, Math.max(0, (v / totalFlow) * 100));
    setDonut('pv', pct(pv));
    setDonut('gridbuy', pct(buy));
    setDonut('gridsell', pct(sell));
    setDonut('load', pct(load));
    setDonut('storage', pct(charge + discharge));
  } catch(e) { console.warn('donut render error', e); }

  _renderEF();
  try {
    const s = state;
    const d = (k) => s[k]?.value;
    const pv = d('pvPower') ?? d('productionTotal');
    const load = d('consumptionTotal');
    function setText(id, txt){ const el = document.getElementById(id); if (el) el.textContent = txt; }
    setText('pvPowerBig', (pv===undefined?'--':formatPower(pv)));
    setText('consumptionTotalBig', (load===undefined?'--':formatPower(load)));
  } catch(e) { console.warn(e); }
}

// SIDE-VALUES
function setSideValue(id, val){ const el=document.getElementById(id); if(el) el.textContent = val; }

// ---- Energy Web update ----
function updateEnergyWeb() {
  const d = (k) => state[k]?.value;
  const pv = +(d('pvPower') ?? 0);
  const buy = +(d('gridBuyPower') ?? 0);
  const sell = +(d('gridSellPower') ?? 0);
  const load = Math.max(0, +(d('consumptionTotal') ?? 0));
  const c1 = +(d('consumer1Power') ?? 0);
  const c2 = +(d('consumer2Power') ?? 0);
  const soc = d('storageSoc');
  const cap = +(d('storageCapacityKwh') ?? 0);
  const charge = +(d('storageChargePower') ?? 0);
  const discharge = +(d('storageDischargePower') ?? 0);

  // Rest = load - c1 - c2 (>=0)
  const rest = Math.max(0, load - (c1+c2));

  function T(id, txt){ const el=document.getElementById(id); if(el) el.textContent = txt; }
  T('pvVal', formatPower(pv));
  T('gridVal', formatPower(buy));
  T('c1Val', formatPower(c1));
  T('c2Val', formatPower(c2));
  T('restVal', formatPower(rest));
  T('centerPower', formatPower(load));
  if (soc !== undefined && !isNaN(Number(soc))) T('centerSoc', Number(soc).toFixed(0)+' %');

  if (cap && soc !== undefined) {
    const socPct = Number(soc)/100;
    const tFull = charge>0 ? ((cap*(1-socPct))*1000)/charge : null;
    const tEmpty= discharge>0 ? ((cap*socPct)*1000)/discharge : null;
    T('centerTime', 'Voll ' + (tFull?formatHours(tFull):'--') + ' • Leer ' + (tEmpty?formatHours(tEmpty):'--'));
  }

  // Show/hide lines based on values
  const show = (id, on)=>{ const el=document.getElementById(id); if(el) el.style.opacity = on ? 1 : 0.15; };
  show('linePV', pv>1);
  show('lineGrid', buy>1);
  show('lineC1', c1>1);
  show('lineC2', c2>1);
  show('lineRest', rest>1);
}

// Patch render to also update energy web
const _renderOld = render;
render = function(){ _renderOld(); try{ updateEnergyWeb(); }catch(e){ console.warn('energy web', e); } }


// === Dynamic Energy Graph (up to 10 nodes) ===
(function(){
  const svg = document.querySelector('.energy-web .web');
  if (!svg) return;

  // Helpers
  const $ = (sel) => document.querySelector(sel);
  const d = (k)=> (window.state && window.state[k]?.value != null) ? window.state[k].value : window.state?.[k];
  const VBOX = { w: 640, h: 460 };
  svg.setAttribute('viewBox', `0 0 ${VBOX.w} ${VBOX.h}`);

  function getConfigNodes(){
    const base = (window._cfg && window._cfg.graph) || {};
    let nodes = [];
    nodes.push({ key:'load', label:'Verbrauch', kind:'center', fixed:true });
    nodes.push({ key:'pvPower', label:'PV', kind:'producer', fixed:true, icon:'pv' });
    nodes.push({ key:'grid', label:'Netz', kind:'grid', fixed:true, icon:'grid' });

    if (Array.isArray(base.nodes)) {
      for (const it of base.nodes.slice(0,7)) {
        if (!it || !it.id) continue;
        nodes.push({
          key: it.id,
          label: it.label || it.id,
          kind: it.role === 'producer' ? 'producer' : 'consumer',
          icon: it.icon || (it.role === 'producer' ? 'gen' : 'load'),
        });
      }
    } else {
      for (let i=1;i<=7;i++){
        const id = (window._cfg?.datapoints && window._cfg.datapoints[`extra${i}Power`]) || null;
        if (id) {
          const role = window._cfg?.graph?.[`extra${i}Role`] || 'consumer';
          const label = window._cfg?.graph?.[`extra${i}Label`] || `Knoten ${i}`;
          nodes.push({ key:id, label, kind: role === 'producer' ? 'producer' : 'consumer' });
        }
      }
    }

    const cascade = base.cascade || {};
    if (cascade.enabled) {
      nodes.push({ key:'cascade', label: (cascade.label || 'Kaskade'), kind:'cascade', fixed:true, icon:'cascade' });
      if (cascade.pvPowerId) {
        nodes.push({ key: cascade.pvPowerId, label: (cascade.pvLabel || 'PV (Kaskade)'), kind:'producer', icon:'pv' });
      }
    }

    return nodes;
  }

  function computePowers(){
    const pv = +(d('pvPower') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const sell = +(d('gridSellPower') ?? 0);
    const load = +(d('loadPower') ?? (+(d('consumer1Power') ?? 0) + +(d('consumer2Power') ?? 0) + +(d('restPower') ?? 0)));
    const soc = d('storageSoc');
    return { pv, buy, sell, load, soc };
  }

  function layout(nodes){
    const center = { x: VBOX.w/2, y: VBOX.h/2 };
    const pos = { grid: { x: VBOX.w/2, y: 80 }, pvPower: { x: VBOX.w*0.78, y: 130 } };

    const dynamic = nodes.filter(n => !n.fixed && n.key !== 'cascade');
    const R = 150;
    const startAngle = -20;
    const step = (dynamic.length > 0) ? (260 / Math.max(1,dynamic.length-1)) : 120;

    dynamic.forEach((n, i) => {
      const a = (startAngle + i*step) * (Math.PI/180);
      n.x = center.x + R * Math.cos(a);
      n.y = center.y + R * Math.sin(a);
    });

    for (const n of nodes){
      if (n.key === 'load') { n.x = center.x; n.y = center.y; }
      if (n.key === 'grid') { n.x = pos.grid.x; n.y = pos.grid.y; }
      if (n.key === 'pvPower') { n.x = pos.pvPower.x; n.y = pos.pvPower.y; }
      if (n.key === 'cascade') { n.x = center.x; n.y = center.y - 120; }
    }
  }

  function iconSvg(kind){
    if (kind === 'grid') return '<path d="M-8,14 L-2,2 L-6,2 L2,-14 L2,0 L6,0 L-2,14 Z"/>';
    if (kind === 'pv' || kind === 'producer') return '<rect x="-12" y="-8" width="24" height="12" rx="2" /><rect x="-10" y="6" width="20" height="4" rx="1" />';
    if (kind === 'cascade') return '<circle r="7" /><path d="M-12,0 h24" />';
    return '<circle r="6" />';
  }

  function renderGraph(){
    const nodes = getConfigNodes();
    const available = nodes.filter(n => n.fixed || n.key === 'grid' || n.key === 'pvPower' || (n.key && d(n.key) != null));

    layout(available);
    const map = {}; available.forEach(n => map[n.key] = n);

    const links = [];
    const base = (window._cfg && window._cfg.graph) || {};
    const cascade = base.cascade || {};
    const P = computePowers();

    if (cascade.enabled && map['cascade']) {
      links.push({ from:'grid', to:'cascade', cls:'grid' });
      links.push({ from:'cascade', to:'load', cls:'consumer' });
      if (cascade.pvPowerId && map[cascade.pvPowerId]) {
        links.push({ from:cascade.pvPowerId, to:'cascade', cls:'producer' });
      }
    } else {
      links.push({ from:'pvPower', to:'load', cls:'producer' });
      if (P.buy > 0 && P.sell <= 0) { links.push({ from:'grid', to:'load', cls:'grid' }); }
      else if (P.sell > 0 && P.buy <= 0) { links.push({ from:'load', to:'grid', cls:'grid' }); }
      else { links.push({ from:'grid', to:'load', cls:'grid' }); }
    }

    for (const n of available){
      if (['load','grid','pvPower','cascade'].includes(n.key)) continue;
      links.push({ from: (n.kind === 'producer' ? n.key : 'load'), to: (n.kind === 'producer' ? 'load' : n.key), cls: (n.kind === 'producer' ? 'producer' : 'consumer') });
    }

    const linksG = document.getElementById('graphLinks');
    const nodesG = document.getElementById('graphNodes');
    if (!linksG || !nodesG) return;

    linksG.innerHTML = links.map(l => {
      const a = map[l.from], b = map[l.to];
      if (!a || !b) return '';
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="flow ${l.cls}"/>`;
    }).join('');

    nodesG.innerHTML = available.map(n => {
      const label = n.label || n.key;
      const valKey = (n.key==='grid') ? null : n.key;
      const valTxt = (valKey && d(valKey) != null) ? `${Math.round(+d(valKey))} W` : (n.key==='grid' ? '' : '--');
      const ringCls = (n.key==='grid') ? 'grid' : (n.kind==='producer' ? 'producer' : (n.kind==='cascade' ? 'grid' : 'consumer'));
      return `<g class="node" transform="translate(${n.x},${n.y})">
        <circle r="28" class="ring ${ringCls}"/>
        <g class="ico">${iconSvg(n.icon || n.kind || 'consumer')}</g>
        <text class="lbl" y="40" text-anchor="middle">${label}</text>
        <text class="val" y="58" text-anchor="middle">${valTxt}</text>
      </g>`;
    }).join('');

    const centerTxt = document.getElementById('centerPower'), socTxt = document.getElementById('centerSoc'), timeTxt = document.getElementById('centerTime');
    if (centerTxt) centerTxt.textContent = `${Math.round(P.load || 0)} W`;
    if (socTxt) socTxt.textContent = (P.soc != null ? `${P.soc} %` : '-- %');
    if (timeTxt) timeTxt.textContent = '';
  }

  const oldRender = window.render;
  window.render = function(){
    try { if (oldRender) oldRender(); } catch(e){}
    try { renderGraph(); } catch(e){ console.warn('graph render', e); }
  };
  try { setTimeout(renderGraph, 0); } catch(e){}
})();
