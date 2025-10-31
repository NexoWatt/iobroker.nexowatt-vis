
'use strict';

const utils = require('@iobroker/adapter-core');
const express = require('express');
const path = require('path');
const bodyParser = express.json();

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

  async onReady() {
    try {
      // start web server
      await this.startServer();

      // subscribe to all configured datapoints and get initial values
      await this.subscribeConfiguredStates();

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

    // config for client
    app.get('/config', (_req, res) => {
      res.json({
        units: this.config.units || { power: 'W', energy: 'kWh' },
        settings: this.config.settings || {},
        installer: this.config.installer || {},
        adminUrl: this.config.adminUrl || null,
        installerLocked: true
      });
    });

    // snapshot
    app.get('/api/state', (_req, res) => {
      res.json(this.stateCache);
    });

    
    // login for installer (fixed password, cleanly bracketed)
    app.post('/api/installer/login', (req, res) => {
      try {
        const provided = String((req?.body?.password) ?? '').trim();
        const PW = 'install2025!'; // fixed password for installer
        if (provided === PW) {
          this._installerToken = Math.random().toString(36).slice(2);
          return res.json({ ok: true, token: this._installerToken });
        }
        return res.status(401).json({ ok: false, error: 'unauthorized' });
      } catch (e) {
        this.log.warn('login error: ' + e.message);
        return res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

    // generic setter for settings/installer datapoints (hardened)
    app.post('/api/set', async (req, res) => {
      try {
        const scope = req.body?.scope;
        const key   = req.body?.key;
        const value = req.body?.value;
        if (!scope || !key) return res.status(400).json({ ok: false, error: 'bad request' });

        // Installer scope needs token
        if (scope === 'installer') {
          const token = req.body?.token;
          if (!token || token !== this._installerToken) {
            return res.status(403).json({ ok: false, error: 'forbidden' });
          }
        }

        // resolve id from config or fallback to local
        let id;
        if (scope === 'installer') {
          id = this.config?.installer?.[key];
        } else if (scope === 'settings') {
          id = this.config?.settings?.[key];
        } else {
          id = this.config?.datapoints?.[key];
        }
        if (!id) id = `${this.namespace}.${scope}.${key}`;

        // create local object if missing
        if (id.startsWith(this.namespace + '.')) {
          const isBool = typeof value === 'boolean';
          const isNum  = typeof value === 'number';
          const type = isBool ? 'boolean' : (isNum ? 'number' : 'string');
          const role = isBool ? 'switch'   : (isNum ? 'level'   : 'text');
          await this.setObjectNotExistsAsync(id, {
            type: 'state',
            common: { name: id.slice(this.namespace.length + 1), type, role, read: true, write: true },
            native: {}
          });
        }

        if (id.startsWith(this.namespace + '.')) {
          await this.setStateAsync(id, { val: value, ack: true });
        } else {
          await this.setForeignStateAsync(id, value);
        }
        res.json({ ok: true });
      } catch (e) {
        this.log.warn('set error: ' + e.message);
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });
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
