'use strict';

const utils = require('@iobroker/adapter-core');

class NexowattVis extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'nexowatt-vis' });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.mapping = {};   // rawId -> alias state id
    }

    async ensureState(id, name, role) {
        await this.extendObjectAsync(id, {
            type: 'state',
            common: { name, type: 'number', role, read: true, write: false, def: 0 },
            native: {}
        });
    }

    async setAliasPropertyIfWanted(stateId, targetId) {
        if (!this.config.setAliasProperty) return;
        const obj = await this.getObjectAsync(stateId);
        if (obj && obj.common) {
            obj.common.alias = { id: targetId };
            await this.setObjectAsync(stateId, obj);
        }
    }

    async onReady() {
        try {
            await this.setStateAsync('info.connection', true, true);

            // channels
            await this.extendObjectAsync('alias', { type: 'channel', common: { name: 'Alias datapoints' }, native: {} });

            // states under alias.* (stable)
            await this.ensureState('alias.pvPower',      'PV power (W)', 'value.power');
            await this.ensureState('alias.gridPower',    'Grid power (W), import > 0, export < 0', 'value.power');
            await this.ensureState('alias.housePower',   'House power (W)', 'value.power');
            await this.ensureState('alias.batteryPower', 'Battery power (W), discharge > 0, charge < 0', 'value.power');
            await this.ensureState('alias.soc',          'Battery SoC (%)', 'value.battery');

            // subscribe to user-provided source ids and mirror -> alias.*
            const cfg = this.config;
            const map = [
                [cfg.aliasPvId,      'alias.pvPower'],
                [cfg.aliasGridId,    'alias.gridPower'],
                [cfg.aliasHouseId,   'alias.housePower'],
                [cfg.aliasBatteryId, 'alias.batteryPower'],
                [cfg.aliasSocId,     'alias.soc']
            ];

            this.mapping = {};
            for (const [sourceId, aliasId] of map) {
                if (sourceId) {
                    this.mapping[sourceId] = aliasId;
                    this.subscribeForeignStates(sourceId);
                    const st = await this.getForeignStateAsync(sourceId);
                    if (st && st.val !== undefined) {
                        await this.setStateAsync(aliasId, st.val, true);
                    }
                    await this.setAliasPropertyIfWanted(aliasId, sourceId);
                }
            }

            this.log.info(`Alias mapping enabled for ${Object.keys(this.mapping).length} datapoints.`);

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
