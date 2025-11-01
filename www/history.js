(function(){
  // simple line chart renderer on canvas
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  function resize(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
  window.addEventListener('resize', ()=>{ resize(); draw(); });
  function fmt(ts){ const d=new Date(ts); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }

  let data=null;

  function draw(){
    if(!data){ ctx.clearRect(0,0,canvas.width,canvas.height); return; }
    const {series, start, end} = data;
    const W=canvas.width, H=canvas.height, L=50, R=40, T=10, B=26;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#0e1216'; ctx.fillRect(0,0,W,H);

    // build unified time axis
    const times = new Set();
    Object.values(series).forEach(s=>s.values.forEach(p=>times.add(p[0])));
    const xs = Array.from(times).sort((a,b)=>a-b);
    if(xs.length<2) return;

    // Y scales
    // compute max power (kW)
    let maxW = 0;
    ['pv','load','buy','sell','chg','dchg'].forEach(k=>{
      (series[k] && series[k].values || []).forEach(p=>{ if (Math.abs(p[1])>maxW) maxW=Math.abs(p[1]); });
    });
    if (maxW<=0) maxW=1;
    const yPow = v => H-B - (Math.max(0,v)/maxW)*(H-B-T);
    const ySoc = v => H-B - (Math.max(0,v)/100)*(H-B-T);

    // X scale
    const x = t => L + (t-start)/(end-start)*(W-L-R);

    // grid
    ctx.strokeStyle='#1d242b'; ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ const yy = T + i*(H-B-T)/5; ctx.beginPath(); ctx.moveTo(L,yy); ctx.lineTo(W-R,yy); ctx.stroke(); }

    // helpers
    function line(k, color, accessor='val', dash){
      const vals = (series[k] && series[k].values) || [];
      if(!vals.length) return;
      ctx.save(); ctx.beginPath();
      if (dash) ctx.setLineDash(dash);
      ctx.lineWidth = 2; ctx.strokeStyle = color;
      vals.forEach((p,i)=>{
        const xx=x(p[0]); const yy = (k==='soc')? ySoc(p[1]) : yPow(Math.abs(p[1])/1000); // convert W→kW
        if (i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
      });
      ctx.stroke(); ctx.restore();
    }

    line('pv',  '#27ae60');
    line('chg', '#1abc9c');
    line('dchg','#e67e22');
    line('sell','#9b59b6');
    line('buy', '#e74c3c');
    line('load','#f1c40f');
    line('soc', '#95a5a6', 'val', [6,6]);

    // axes labels
    ctx.fillStyle='#cbd3db'; ctx.font='12px system-ui, sans-serif';
    ctx.fillText('kW', 6, T+12);
    ctx.fillText('%', W-R+6, T+12);
    // x ticks
    ctx.textAlign='center';
    for(let i=0;i<6;i++){
      const tt = start + i*(end-start)/5;
      ctx.fillText(fmt(tt), x(tt), H-6);
    }
  }

  function sumEnergyKWh(vals, stepSec){
    if(!vals || !vals.length) return 0;
    // W * s → Ws, divide by 3600*1000 → kWh
    let s=0; for(let i=0;i<vals.length;i++){ s += Math.abs(vals[i][1]) * stepSec; }
    return s / 3600000;
  }

  async function load(){
    const from = new Date(document.getElementById('from').value || new Date(Date.now()-24*3600*1000).toISOString().slice(0,16));
    const to   = new Date(document.getElementById('to').value   || new Date().toISOString().slice(0,16));
    const url = `/api/history?from=${from.getTime()}&to=${to.getTime()}&step=60`;
    const res = await fetch(url).then(r=>r.json()).catch(()=>null);
    if(!res || !res.ok){ alert('History kann nicht geladen werden'); return; }
    data = res;
    draw();
    // cards
    const stepSec = res.step;
    const s = res.series;
    const cards = document.getElementById('cards');
    function card(title, val){ const el=document.createElement('div'); el.className='card'; el.innerHTML = `<small>${title}</small><b>${val}</b>`; cards.appendChild(el); }
    cards.innerHTML='';
    card('Erzeugung',  sumEnergyKWh(s.pv.values, stepSec).toFixed(1) + ' kWh');
    card('Beladung',   sumEnergyKWh(s.chg.values, stepSec).toFixed(1) + ' kWh');
    card('Entladung',  sumEnergyKWh(s.dchg.values, stepSec).toFixed(1) + ' kWh');
    card('Einspeisung',sumEnergyKWh(s.sell.values, stepSec).toFixed(1) + ' kWh');
    card('Bezug',      sumEnergyKWh(s.buy.values, stepSec).toFixed(1) + ' kWh');
    card('Verbrauch',  sumEnergyKWh(s.load.values, stepSec).toFixed(1) + ' kWh');
  }

  // init date inputs (today)
  const now = new Date();
  const start = new Date(); start.setHours(0,0,0,0);
  function toLocal(dt){ const z=dt.getTimezoneOffset(); const d=new Date(dt.getTime()-z*60000); return d.toISOString().slice(0,16); }
  document.getElementById('from').value = toLocal(start);
  document.getElementById('to').value   = toLocal(now);
  document.getElementById('loadBtn').addEventListener('click', load);

  resize(); load();
})();

  // --- header interactions (same as index) ---
  (function(){
    const menuBtn = document.getElementById('menuBtn');
    const menu = document.getElementById('menuDropdown');
    if (menuBtn && menu) {
      menuBtn.addEventListener('click', ()=> menu.classList.toggle('hidden'));
      document.addEventListener('click', (e)=>{
        if (!menu.contains(e.target) && e.target !== menuBtn) menu.classList.add('hidden');
      });
    }
    const liveBtn = document.getElementById('liveTabBtn');
    if (liveBtn) liveBtn.addEventListener('click', ()=>{ window.location.href = '/'; });
    const histBtn = document.getElementById('historyTabBtn');
    if (histBtn) histBtn.addEventListener('click', ()=>{ /* already here */ });
    const openInstallerAdmin = document.getElementById('openInstallerAdmin');
    if (openInstallerAdmin) {
      openInstallerAdmin.addEventListener('click', ()=>{
        // same behavior: forward to ioBroker Admin (host:8081) – try to derive host dynamically
        const host = window.location.hostname;
        const proto = window.location.protocol;
        window.top.location.href = proto + '//' + host + ':8081/';
      });
    }
  })();
