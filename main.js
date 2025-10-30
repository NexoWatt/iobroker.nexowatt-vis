
'use strict';
const express = require('express');
const http = require('http');

// Minimal ioBroker adapter shim (works when started by controller; also runs standalone for test)
let adapter = null;
try {
  adapter = require('@iobroker/adapter-core').Adapter('nexowatt-vis');
} catch (e) {
  // Fallback: mock minimal methods to test outside ioBroker
  adapter = {
    namespace: 'nexowatt-vis.0',
    config: { port: 8188 },
    log: { info: console.log, warn: console.warn, error: console.error, debug: console.debug },
    setObjectNotExistsAsync: async (_id, _obj) => {},
    extendObjectAsync: async (_id, _obj) => {},
    setStateAsync: async (_id, val) => { stateStore[_id] = { val, ack: true, ts: Date.now() }; },
    getStateAsync: async (_id) => stateStore[_id] || null,
    subscribeForeignStates: (_id) => {},
    on: () => {},
    getPort: (p, cb) => cb(p),
  };
}

const SETTINGS = [
  'notify', 'email', 'dynamicTariff', 'storagePower', 'price',
  'priority', 'tariffMode',
];
const INSTALLER = [
  'gridConnectionPower', 'para14a', 'chargepoints',
  'storageCountMode', 'storagePower', 'emsMode',
  'socMin', 'socPeakRange', 'chargePowerMax', 'dischargePowerMax',
  'adminUrl', 'password'
];

const stateStore = {}; // only for standalone test
const clients = new Set();
let lastSnapshot = {};

function idOf(key) {
  if (key.startsWith('settings.')) return `${adapter.namespace}.settings.${key.slice(9)}`;
  if (key.startsWith('installer.')) return `${adapter.namespace}.installer.${key.slice(10)}`;
  return `${adapter.namespace}.${key}`;
}

async function ensureObjects() {
  for (const k of SETTINGS) {
    await adapter.setObjectNotExistsAsync(`${adapter.namespace}.settings.${k}`, {
      type: 'state',
      common: { name: k, type: ['email'].includes(k) ? 'string' : (['notify','dynamicTariff'].includes(k) ? 'boolean' : 'number'), role: 'state', read: true, write: true, def: null },
      native: {}
    });
  }
  for (const k of INSTALLER) {
    const type = (k === 'password' || k === 'adminUrl') ? 'string' : (k === 'para14a' ? 'boolean' : 'number');
    await adapter.setObjectNotExistsAsync(`${adapter.namespace}.installer.${k}`, {
      type: 'state',
      common: { name: k, type, role: 'state', read: true, write: true, def: null },
      native: {}
    });
  }
}

async function onReady() {
  const port = Number(adapter.config?.port) || 8188;
  await ensureObjects();

  const app = express();
  app.use(express.json());

  // Static files
  app.use('/static', express.static(__dirname + '/www'));
  app.get('/', (_req, res) => res.sendFile(__dirname + '/www/index.html'));

  // Config endpoint (minimal)
  app.get('/config', async (_req, res) => {
    res.json({ ok: true });
  });

  // Current states snapshot for UI
  app.get('/api/state', async (_req, res) => {
    res.json(lastSnapshot);
  });

  // Write value from UI
  app.post('/api/set', async (req, res) => {
    try{
      const { key, value } = req.body || {};
      const id = idOf(key);
      if (!id) return res.status(400).json({ ok:false, error:'bad_key' });
      await adapter.setStateAsync(id, value);
      res.json({ ok: true });
    } catch(e){
      adapter.log.error(e);
      res.status(500).json({ ok:false, error: String(e) });
    }
  });

  // Installer login: compare with state installer.password (empty -> deny)
  app.post('/api/installer/login', async (req, res) => {
    try{
      const provided = (req.body && String(req.body.password || '')) || '';
      const ps = await adapter.getStateAsync(`${adapter.namespace}.installer.password`);
      const pw = ps && ps.val ? String(ps.val) : '';
      if (!pw || provided !== pw) return res.json({ ok:false });
      const token = Math.random().toString(36).slice(2);
      lastSnapshot._token = token; // for demo
      res.json({ ok:true, token });
    } catch(e){
      adapter.log.error(e);
      res.status(500).json({ ok:false, error:String(e) });
    }
  });

  // SSE for live updates (demo only emits snapshot heartbeat)
  app.get('/events', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.flushHeaders();
    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    clients.add(send);
    send({ type:'init', payload: lastSnapshot });
    req.on('close', ()=> clients.delete(send));
  });

  const server = http.createServer(app);
  server.listen(port, ()=> adapter.log.info(`VIS listening on ${port}`));

  // Subscribe to adapter namespace: mirror into snapshot
  // In a real adapter, you'd use adapter.subscribeForeignStates with patterns
  // Here we just read all our known states periodically
  async function refresh() {
    const snap = {};
    for (const k of SETTINGS) {
      const st = await adapter.getStateAsync(`${adapter.namespace}.settings.${k}`);
      if (st) snap[`settings.${k}`] = st.val;
    }
    for (const k of INSTALLER) {
      const st = await adapter.getStateAsync(`${adapter.namespace}.installer.${k}`);
      if (st) snap[`installer.${k}`] = st.val;
    }
    lastSnapshot = snap;
    for (const send of clients) send({ type:'update', payload:snap });
  }
  setInterval(refresh, 2000);
}

if (adapter.on) {
  adapter.on('ready', onReady);
} else {
  onReady(); // standalone
}
