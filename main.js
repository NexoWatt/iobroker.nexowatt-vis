
'use strict';

const utils = require('@iobroker/adapter-core');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');

class NexowattVis extends utils.Adapter {
  constructor(options = {}) {
    super({ ...options, name: 'nexowatt-vis' });
    this.app = null;
    this.server = null;
    this.tokens = new Set();
  }

  async onReady() {
    await this._ensureStates();

    const app = express();
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use('/', express.static(path.join(__dirname, 'public')));

    app.get('/api/check', (req, res) => {
      const token = req.headers['x-auth-token'];
      if (token && this.tokens.has(token)) res.json({ ok: true });
      else res.status(401).json({ ok: false });
    });

    app.post('/api/auth', (req, res) => {
      const pw = (req.body && String(req.body.password || '')) || '';
      const expected = String(this.config.installerPassword || '');
      if (!expected) return res.status(403).json({ ok: false });
      if (pw && expected && pw === expected) {
        const token = crypto.randomBytes(24).toString('hex');
        this.tokens.add(token);
        setTimeout(() => this.tokens.delete(token), 12 * 60 * 60 * 1000);
        return res.json({ ok: true, token });
      }
      res.status(401).json({ ok: false });
    });

    app.post('/api/state', async (req, res) => {
      const token = req.headers['x-auth-token'];
      const { id, val } = req.body || {};
      if (id && id.startsWith('installer.') && !(token && this.tokens.has(token))) {
        return res.status(401).json({ ok: false });
      }
      try {
        await this.setStateAsync(id, { val: val, ack: true });
        res.json({ ok: true });
      } catch (e) {
        this.log.error('state write failed: ' + e);
        res.status(500).json({ ok: false });
      }
    });

    app.get('/api/states', async (req, res) => {
      try {
        const ids = [
          'settings.switchA','settings.switchB','settings.slider1','settings.slider2',
          'installer.switchA','installer.switchB','installer.slider1','installer.slider2'
        ].map(s => `${this.namespace}.${s}`);
        const data = {};
        for (const fullId of ids) {
          const st = await this.getStateAsync(fullId);
          data[fullId.replace(this.namespace + '.', '')] = st ? st.val : null;
        }
        res.json(data);
      } catch (e) {
        this.log.error('states read failed: ' + e);
        res.status(500).json({ ok: false });
      }
    });

    const port = Number(this.config.port || 8188);
    this.server = app.listen(port, () => this.log.info(`NexoWatt VIS listening on port ${port}`));
    this.app = app;
  }

  async _ensureStates() {
    const defs = [
      { id: 'settings.switchA', type:'boolean', role:'switch', def:false },
      { id: 'settings.switchB', type:'boolean', role:'switch', def:false },
      { id: 'settings.slider1', type:'number', role:'level', def:1, min:1, max:2 },
      { id: 'settings.slider2', type:'number', role:'level', def:1, min:1, max:2 },
      { id: 'installer.switchA', type:'boolean', role:'switch', def:false },
      { id: 'installer.switchB', type:'boolean', role:'switch', def:false },
      { id: 'installer.slider1', type:'number', role:'level', def:1, min:1, max:2 },
      { id: 'installer.slider2', type:'number', role:'level', def:1, min:1, max:2 },
    ];
    for (const d of defs) {
      const fullId = `${this.namespace}.${d.id}`;
      await this.setObjectNotExistsAsync(fullId, {
        type: 'state',
        common: { name: d.id, type: d.type, role: d.role, read: true, write: true, def: d.def, min: d.min, max: d.max },
        native: {}
      });
      const st = await this.getStateAsync(fullId);
      if (!st) await this.setStateAsync(fullId, { val: d.def, ack: true });
    }
  }

  onUnload(callback) {
    try {
      if (this.server) this.server.close();
      callback();
    } catch (e) { callback(); }
  }
}

if (module.parent) {
  module.exports = (options) => new NexowattVis(options);
} else {
  new NexowattVis();
}
