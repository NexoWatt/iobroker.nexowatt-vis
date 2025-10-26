'use strict';

const utils = require('@iobroker/adapter-core');

class NexowattVis extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'nexowatt-vis' });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.mapping = {};
    }

    async onReady() {
        try {
            await this.setStateAsync('info.connection', true, true);

            await this.extendObjectAsync('flow', { type: 'channel', common: { name: 'Energy flow' }, native: {} });

            const defs = [
                ['flow.pvPower',      'number', 'value.power',   'PV power (W)'],
                ['flow.gridPower',    'number', 'value.power',   'Grid power (W), import > 0, export < 0'],
                ['flow.housePower',   'number', 'value.power',   'House power (W)'],
                ['flow.batteryPower', 'number', 'value.power',   'Battery power (W), discharge > 0, charge < 0'],
                ['battery.soc',       'number', 'value.battery', 'Battery SoC (%)']
            ];

            for (const [id, type, role, name] of defs) {
                await this.extendObjectAsync(id, {
                    type: 'state', common: { name, type, role, read: true, write: false, def: 0 }, native: {}
                });
            }

            const cfg = this.config;
            this.mapping = {};
            if (cfg.pvPowerId)      this.mapping[cfg.pvPowerId]      = 'flow.pvPower';
            if (cfg.gridPowerId)    this.mapping[cfg.gridPowerId]    = 'flow.gridPower';
            if (cfg.housePowerId)   this.mapping[cfg.housePowerId]   = 'flow.housePower';
            if (cfg.batteryPowerId) this.mapping[cfg.batteryPowerId] = 'flow.batteryPower';
            if (cfg.batterySocId)   this.mapping[cfg.batterySocId]   = 'battery.soc';

            const rawIds = Object.keys(this.mapping);
            for (const rawId of rawIds) {
                this.subscribeForeignStates(rawId);
                const st = await this.getForeignStateAsync(rawId);
                if (st && st.val !== undefined) {
                    await this.setStateAsync(this.mapping[rawId], st.val, true);
                }
            }

            this.log.info(`Subscribed to ${rawIds.length} raw datapoints.`);
        } catch (e) {
            this.log.error('onReady error: ' + e.message);
        }
    }

    async onStateChange(id, state) {
        if (!state) return;
        const target = this.mapping[id];
        if (target) {
            await this.setStateAsync(target, state.val, true);
        }
    }

    async onUnload(callback) {
        try {
            await this.setStateAsync('info.connection', false, true);
            callback();
        } catch (e) {
            callback();
        }
    }
}

if (module && module.parent) {
    module.exports = (options) => new NexowattVis(options);
} else {
    new NexowattVis();
}
