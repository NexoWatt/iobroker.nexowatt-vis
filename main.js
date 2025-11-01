
'use strict';

const utils = require('@iobroker/adapter-core');
const express = require('express');
const path = require('path');
const bodyParser = express.json();
const crypto = require('crypto');

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(p => {
    const idx = p.indexOf('=');
    if (idx > -1) {
      const k = p.slice(0, idx).trim();
      const v = p.slice(idx+1);
      if (k) out[k] = decodeURIComponent(v || '');
    }
  });
  return out;
}

function createToken() {
  return crypto.randomBytes(24).toString('base64url');
}
function getInstallerPassword(ctx) {
  try {
    const cfg = ctx && ctx.config;
    const pw = (cfg && cfg.installerPassword) || 'install2025!'; // default
    return pw;
  } catch (_) { return 'install2025!'; }
}



class NexoWattVis extends utils.Adapter {
  constructor(options) {
    super({
      ...options,
      name: 'nexowatt-vis',
    });

    this.stateCache = {};
    this.sseClients = new Set();

    this.on('ready', this.onReady.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    this.on('unload', this.onUnload.bind(this));
  }

  
  async ensureInstallerStates() {
    const defs = {
      adminUrl:     { type: 'string', role: 'state', def: '' },
      gridConnectionPower: { type: 'number', role: 'value.power', def: 0 },
      para14a:      { type: 'boolean', role: 'state', def: false },
      chargepoints: { type: 'number', role: 'state', def: 0 },
      storageCount: { type: 'number', role: 'state', def: 0 },
      storagePower: { type: 'number', role: 'value.power', def: 0 },
      emsMode:      { type: 'number', role: 'state', def: 1 },
      socMin:       { type: 'number', role: 'value', def: 10 },
      socPeakRange: { type: 'number', role: 'value', def: 20 },
      chargePowerMax: { type: 'number', role: 'value.power', def: 0 },
      dischargePowerMax: { type: 'number', role: 'value.power', def: 0 },
      chargeLimitMax: { type: 'number', role: 'value.power', def: 0 },
      dischargeLimitMax: { type: 'number', role: 'value.power', def: 0 },
      password:     { type: 'string', role: 'state', def: '' }
    };
    for (const [key, c] of Object.entries(defs)) {
      const id = `installer.${key}`;
      await this.setObjectNotExistsAsync(id, { type:'state', common:{ name:id, type:c.type, role:c.role, read:true, write:true, def:c.def }, native:{} });
    }
  }
  
  async ensureSettingsStates() {
    const defs = {
      notifyEnabled: { type:'boolean', role:'state', def:false },
      email:         { type:'string',  role:'state', def:'' },
      dynamicTariff: { type:'boolean', role:'state', def:false },
      storagePower:  { type:'number',  role:'value.power', def:0 },
      price:         { type:'number',  role:'value', def:0 },
      priority:      { type:'number',  role:'value', def:1 },
      tariffMode:    { type:'number',  role:'value', def:1 },
    };
    for (const [key, c] of Object.entries(defs)) {
      const id = `settings.${key}`;
      await this.setObjectNotExistsAsync(id, {
        type: 'state',
        common: { name:id, type:c.type, role:c.role, read:true, write:true, def:c.def },
        native: {}
      });
    }
  }
async syncInstallerConfigToStates() {
    const cfg = (this.config && this.config.installerConfig) || {};
    const toSet = {
      adminUrl: cfg.adminUrl || '',
      gridConnectionPower: Number(cfg.gridConnectionPower || 0),
      para14a: !!cfg.para14a,
      chargepoints: Number(cfg.chargepoints || 0),
      storageCount: Number(cfg.storageCount || 0),
      storagePower: Number(cfg.storagePower || 0),
      emsMode: Number(cfg.emsMode || 1),
      socMin: Number(cfg.socMin || 0),
      socPeakRange: Number(cfg.socPeakRange || 0),
      chargePowerMax: Number(cfg.chargePowerMax || 0),
      dischargePowerMax: Number(cfg.dischargePowerMax || 0),
      chargeLimitMax: Number(cfg.chargeLimitMax || 0),
      dischargeLimitMax: Number(cfg.dischargeLimitMax || 0),
      password: getInstallerPassword(this) || ''
    };
    for (const [k, v] of Object.entries(toSet)) {
      await this.setStateAsync(`installer.${k}`, { val: v, ack: true });
    }
  }
  async onReady() {
    try {
      // start web server
      await this.startServer();

      // subscribe to all configured datapoints and get initial values
      await this.subscribeConfiguredStates();
      await this.ensureSettingsStates();
      await this.ensureInstallerStates();
      await this.syncInstallerConfigToStates();

      this.log.info('NexoWatt VIS adapter ready.');
    } catch (e) {
      this.log.error(`onReady error: ${e.message}`);
    }
  }

  async startServer() {
    const app = express();

    app.get('/', (_req, res) => {
      res.sendFile(path.join(__dirname, 'www', 'index.html'));
    });

    app.use('/static', express.static(path.join(__dirname, 'www')));

    // JSON body parser
    app.use(bodyParser);

    // --- History page & API ---
    app.get(['/history.html','/history'], (req, res) => {
      res.sendFile(path.join(__dirname, 'www', 'history.html'));
    });

    app.get('/api/history', async (req, res) => {
      try {
        const inst = (this.config.history && this.config.history.instance) || 'influxdb.0';
        const start = Number(req.query.from || (Date.now() - 24*3600*1000));
        const end   = Number(req.query.to   || Date.now());
        const stepS = Number(req.query.step || 60); // seconds
        const dp = (this.config.history && this.config.history.datapoints) || {};
        const ids = {
          pv: dp.pvPower, load: dp.consumptionTotal, buy: dp.gridBuyPower, sell: dp.gridSellPower,
          chg: dp.storageChargePower, dchg: dp.storageDischargePower, soc: dp.storageSoc
        };
        const ask = (id) => new Promise(resolve => {
          if (!id) return resolve({id, values:[]});
          const options = { start, end, step: stepS*1000, aggregate: 'avg', addId: false, ignoreNull: true };
          try {
            this.sendTo(inst, 'getHistory', { id, options }, (resu) => {
              const arr = (resu && resu.result) ? resu.result : (Array.isArray(resu) ? resu : []);
              resolve({ id, values: arr.map(p => [p.ts || p[0], Number(p.val ?? p[1])]) });
            });
          } catch (e) {
            resolve({ id, values: [] });
          }
        });
        const out = {};
        out.pv   = await ask(ids.pv);
        out.load = await ask(ids.load);
        out.buy  = await ask(ids.buy);
        out.sell = await ask(ids.sell);
        out.chg  = await ask(ids.chg);
        out.dchg = await ask(ids.dchg);
        out.soc  = await ask(ids.soc);
        res.json({ ok:true, start, end, step: stepS, series: out });
      } catch (e) {
        res.json({ ok:false, error: String(e) });
      }
    });

    // config for client
    
    // installer session data
    this._installerToken = this._installerToken || null;
    this._installerTokenExp = this._installerTokenExp || 0;

    const isInstallerAuthed = (req) => {
      const pw = getInstallerPassword(this);
      if (!pw) return true;
      const c = parseCookies(req);
      const ok = !!(c.installer_session &&
                    this._installerToken &&
                    c.installer_session === this._installerToken &&
                    Date.now() < this._installerTokenExp);
      return ok;
    };
app.get('/config', (req, res) => {
      res.json({
        units: this.config.units || { power: 'W', energy: 'kWh' },
        settings: this.config.settings || {},
        installer: this.config.installer || {},
        adminUrl: this.config.adminUrl || null,
        installerLocked: !!(this.config.installerPassword)
      });
    });

    // snapshot
    app.get('/api/state', (_req, res) => {
      res.json(this.stateCache);
    });

    // login for installer
    
    app.post('/api/installer/login', (req, res) => {
      const pw = getInstallerPassword(this);
      const provided = (req.body && req.body.password) || '';
      if (!pw || provided === pw) {
        this._installerToken = createToken();
        this._installerTokenExp = Date.now() + 2*60*60*1000; // 2h
        res.setHeader('Set-Cookie', `installer_session=${encodeURIComponent(this._installerToken)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=7200`);
        return res.json({ ok: true });
      } else {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
    });
// logout for installer
    app.post('/api/installer/logout', (_req, res) => {
      this._installerToken = null;
      this._installerTokenExp = 0;
      res.setHeader('Set-Cookie', 'installer_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
      res.json({ ok: true });
    });


    // generic setter for settings/installer datapoints
    app.post('/api/set', async (req, res) => {
      try {
        const scope = req.body && req.body.scope;
        const key = req.body && req.body.key;
        const value = req.body && req.body.value;
        if (!scope || !key) return res.status(400).json({ ok: false, error: 'bad request' });
        let map = {};
        if (scope === 'installer') {
          if (!isInstallerAuthed(req)) return res.status(403).json({ ok: false, error: 'forbidden' });
          map = (this.config && this.config.installer) || {};
        
        } else {
          map = (this.config && this.config.settings) || {};
        }
        const id = map[key];
        if (id) {
          await this.setForeignStateAsync(id, value);
        } else {
          const localId = (scope === 'installer' ? 'installer.'+key : 'settings.'+key);
          await this.setStateAsync(localId, { val: value, ack: false });
        }
        res.json({ ok: true });
      } catch (e) {
        this.log.warn('set error: ' + e.message);
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

    // server-sent events for live updates
    app.get('/events', (req, res) => {
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.flushHeaders();

      const client = { res };
      this.sseClients.add(client);

      // send initial payload
      res.write("data: " + JSON.stringify({ type: 'init', payload: this.stateCache }) + "\n\n");

      req.on('close', () => {
        this.sseClients.delete(client);
      });
    });

    const bind = (this.config && this.config.bind) || '0.0.0.0';
    const port = (this.config && this.config.port) || 8188;

    await new Promise((resolve) => {
      this.server = app.listen(port, bind, () => {
        this.log.info(`Dashboard available at http://${bind}:${port}`);
        resolve();
      });
    });
  }

  async subscribeConfiguredStates() {
    const dps = (this.config && this.config.datapoints) || {};
    const settings = (this.config && this.config.settings) || {};
    const installer = (this.config && this.config.installer) || {};
        const namespace = this.namespace + '.';
    const settingsLocalKeys = ['notifyEnabled','email','dynamicTariff','storagePower','price','priority','tariffMode'];
    const keys = [
      ...Object.keys(dps),
      ...Object.keys(settings).map(k => 'settings.' + k),
      ...Object.keys(installer).map(k => 'installer.' + k),
    ];

    for (const key of keys) {
      let id;
      if (key.startsWith('settings.')) id = settings[key.slice(9)];
      else if (key.startsWith('installer.')) id = installer[key.slice(10)];
      else id = dps[key];
      if (!id && key.startsWith('settings.')) id = namespace + key;
      if (!id) continue;

      // subscribe
      this.subscribeForeignStates(id);

      // get initial value
      try {
        const state = await this.getForeignStateAsync(id);
        if (state && state.val !== undefined) {
          this.updateValue(key, state.val, state.ts);
        }
      } catch (e) {
        this.log.warn(`Cannot read initial state for ${key} (${id}): ${e.message}`);
      }
    }
  }

  onStateChange(id, state) {
    if (!state) return;
    try {
      const key = this.keyFromId(id);
      if (key) {
        this.updateValue(key, state.val, state.ts);
      }
    } catch (e) {
      this.log.error(`onStateChange error: ${e.message}`);
    }
  }

  keyFromId(id) {
    const dps = (this.config && this.config.datapoints) || {};
    for (const [key, dpId] of Object.entries(dps)) { if (dpId === id) return key; }
    const settings = (this.config && this.config.settings) || {};
    for (const [k, dpId] of Object.entries(settings)) { if (dpId === id) return 'settings.' + k; }
    const installer = (this.config && this.config.installer) || {};
    for (const [k, dpId] of Object.entries(installer)) { if (dpId === id) return 'installer.' + k; }
    
    // direct mapping for local states
    const prefS = this.namespace + '.settings.';
    const prefI = this.namespace + '.installer.';
    if (id && id.startsWith(prefS)) return 'settings.' + id.slice(prefS.length);
    if (id && id.startsWith(prefI)) return 'installer.' + id.slice(prefI.length);
    return null;
  }

  updateValue(key, value, ts) {
    this.stateCache[key] = { value, ts };

    const payload = { [key]: this.stateCache[key] };
    // push update to all SSE clients
    for (const client of Array.from(this.sseClients)) {
      try {
        client.res.write("data: " + JSON.stringify({ type: 'update', payload }) + "\n\n");
      } catch (e) {
        // remove broken clients
        this.sseClients.delete(client);
      }
    }
  }

  onUnload(callback) {
    try {
      if (this.server) this.server.close();
      callback();
    } catch (e) {
      callback();
    }
  }
}

if (module.parent) {
  module.exports = (options) => new NexoWattVis(options);
} else {
  // For local dev run
  new NexoWattVis();
}