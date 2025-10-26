
'use strict';

const utils = require('@iobroker/adapter-core');
const express = require('express');
const path = require('path');

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

  
aliasSpecForKey(key) {
  // Return spec {type, role, read, write}
  const num = {type: 'number', read: true, write: false};
  const bool = {type: 'boolean', read: true, write: true};
  const text = {type: 'string', read: true, write: false};

  const map = {
    autarky: num, selfConsumption: num,
    pvPower: num, productionTotal: num, consumptionTotal: num,
    gridBuyPower: num, gridSellPower: num,
    storageChargePower: num, storageDischargePower: num, storageSoc: num,
    consumptionEvcs: num, consumptionOther: num,
    evcsStatus: text, evcsLastChargeKwh: num,
    gridFrequency: num, gridVoltage: num,
    // SmartHome controls
    smartHome_heatPumpOn: bool,
    smartHome_roomTemp: num,
    smartHome_wallboxLock: bool,
    smartHome_gridLimit: num,
    smartHome_pvCurtailment: num
  };
  return map[key] || num;
}

async ensureAliases() {
  const dps = (this.config && this.config.datapoints) || {};
  const smh = (this.config && this.config.smartHome && this.config.smartHome.datapoints) || {};
  const ali = (this.config && this.config.alias) || { create: true, root: 'alias' };

  const pairs = Object.entries(dps).concat([
    ['smartHome_heatPumpOn', smh.heatPumpOn || ''],
    ['smartHome_roomTemp', smh.roomTemp || ''],
    ['smartHome_wallboxLock', smh.wallboxLock || ''],
    ['smartHome_gridLimit', smh.gridLimit || ''],
    ['smartHome_pvCurtailment', smh.pvCurtailment || ''],
  ]);

  if (!ali.create) return;

  for (const [key, targetId] of pairs) {
    const aliasId = `${this.namespace}.${ali.root}.${key}`;
    const spec = this.aliasSpecForKey(key);
    const common = {
      name: `NexoWatt ${key}`,
      role: spec.role || (spec.type === 'boolean' ? 'switch' : 'value'),
      type: spec.type,
      read: spec.read,
      write: spec.write,
    };
    if (targetId) {
      common.alias = { id: targetId };
    }

    // Create/update alias state
    await this.setObjectNotExistsAsync(aliasId, {
      type: 'state',
      common,
      native: { key }
    });

    // If alias already exists and target changed, update it
    if (targetId) {
      try {
        const obj = await this.getObjectAsync(aliasId);
        if (obj?.common?.alias?.id !== targetId) {
          obj.common.alias = { id: targetId };
          await this.setObjectAsync(aliasId, obj);
          this.log.info(`Alias ${aliasId} -> ${targetId}`);
        }
      } catch (e) {
        this.log.warn(`Cannot update alias ${aliasId}: ${e.message}`);
      }
    }
  }
}

initHistory() {
  // simple in-memory history ring buffer
  this.history = {
    size: 600, // ~10 min @ 1s updates if used that frequently
    keys: ['pvPower','gridBuyPower','gridSellPower','consumptionTotal','storageChargePower','storageDischargePower'],
    data: []
  };
  // timer to push snapshot every 5s
  if (this.historyTimer) this.clearTimeout(this.historyTimer);
  const push = () => {
    const ts = Date.now();
    const row = { ts };
    for (const k of this.history.keys) {
      row[k] = this.stateCache[k]?.value ?? null;
    }
    this.history.data.push(row);
    if (this.history.data.length > this.history.size) this.history.data.shift();
    this.historyTimer = this.setTimeout(push, 5000);
  };
  push();
}

pushHistory() {
  // could be used for event-driven history; currently timer-based
}

async onReady() {
  try {
    // start web server
    await this.startServer();

    // ensure aliases for configured datapoints
    await this.ensureAliases();

    // subscribe to all configured alias states and get initial values
    await this.subscribeConfiguredStates(true);

    // init history buffer
    this.initHistory();

    this.log.info('NexoWatt VIS adapter ready.');
  } catch (e) {
    this.log.error(`onReady error: ${e.message}`);
  }
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

    // config for client
    app.get('/config', (_req, res) => {
  res.json({ 
    units: this.config.units || { power: 'W', energy: 'kWh' },
    branding: this.config.branding || {},
    sections: (this.config.sections && this.config.sections.tabs) || ['live','history','settings','smarthome']
  });
});
    });

    // snapshot
    app.get('/api/state', (_req, res) => {
      res.json(this.stateCache);
    });

    // server-sent events for live updates
    app.get('/api/live-series', (_req, res) => {
  const hist = this.history || { data: [], keys: [] };
  res.json({ keys: hist.keys, data: hist.data });
});

app.use(express.json());
app.post('/api/set', async (req, res) => {
  try {
    const { key, value } = req.body || {};
    if (!key) return res.status(400).json({ error: 'key required' });
    const ali = (this.config && this.config.alias) || { root: 'alias' };
    const id = `${this.namespace}.${ali.root}.${key}`;
    await this.setForeignStateAsync(id, value, true);
    res.json({ ok: true });
  } catch (e) {
    this.log.error(`set API error: ${e.message}`);
    res.status(500).json({ error: e.message });
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

  async subscribeConfiguredStates(useAliases=false) {
  const dps = (this.config && this.config.datapoints) || {};
  const ali = (this.config && this.config.alias) || { root: 'alias' };

  const keys = Object.keys(dps);

  for (const key of keys) {
    const originalId = dps[key];
    if (!originalId) continue;

    const id = useAliases ? `${this.namespace}.${ali.root}.${key}` : originalId;

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

  // SmartHome aliases (read values for UI)
  const smh = (this.config && this.config.smartHome && this.config.smartHome.datapoints) || {};
  const smhMap = {
    smartHome_heatPumpOn: smh.heatPumpOn,
    smartHome_roomTemp: smh.roomTemp,
    smartHome_wallboxLock: smh.wallboxLock,
    smartHome_gridLimit: smh.gridLimit,
    smartHome_pvCurtailment: smh.pvCurtailment
  };
  for (const [key, originalId] of Object.entries(smhMap)) {
    if (!originalId) continue;
    const id = useAliases ? `${this.namespace}.${ali.root}.${key}` : originalId;
    this.subscribeForeignStates(id);
    try {
      const state = await this.getForeignStateAsync(id);
      if (state && state.val !== undefined) {
        this.updateValue(key, state.val, state.ts);
      }
    } catch(e) {
      this.log.warn(`Cannot read initial state for ${key} (${id}): ${e.message}`);
    }
  }
};
    const keys = Object.keys(dps);

    for (const key of keys) {
      const id = dps[key];
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
    for (const [key, dpId] of Object.entries(dps)) {
      if (dpId === id) return key;
    }
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
