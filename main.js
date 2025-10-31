'use strict';
const express = require('express');
const http = require('http');

let adapter;
try { adapter = require('@iobroker/adapter-core').Adapter('nexowatt-vis'); }
catch { adapter = { namespace:'nexowatt-vis.0', config:{port:8188}, log:{ info:console.log, warn:console.warn, error:console.error }, setObjectNotExistsAsync:async()=>{}, setStateAsync:async()=>{}, getStateAsync:async()=>null, on:()=>{} }; }

const SETTINGS = ['notify','email','dynamicTariff','storagePower','price','priority','tariffMode'];
const INSTALLER = ['gridConnectionPower','para14a','chargepoints','storageCountMode','storagePower','emsMode','socMin','socPeakRange','chargePowerMax','dischargePowerMax','adminUrl','password'];

function idOf(key){ if(key.startsWith('settings.')) return adapter.namespace+'.settings.'+key.slice(9); if(key.startsWith('installer.')) return adapter.namespace+'.installer.'+key.slice(10); return adapter.namespace+'.'+key; }

async function ensureObjects(){
  const mk = async (id,type)=>adapter.setObjectNotExistsAsync(id,{type:'state',common:{name:id.split('.').pop(),type,role:'state',read:true,write:true},native:{}});
  for(const k of SETTINGS) await mk(adapter.namespace+'.settings.'+k, k==='email'?'string':(['notify','dynamicTariff'].includes(k)?'boolean':'number'));
  for(const k of INSTALLER) await mk(adapter.namespace+'.installer.'+k, (k==='password'||k==='adminUrl')?'string':(k==='para14a'?'boolean':'number'));
}

async function start(){
  await ensureObjects();
  const app = express(); app.use(express.json());
  app.use('/static', express.static(__dirname+'/www'));
  app.get('/favicon.ico', (_q,res)=>res.sendFile(__dirname+'/www/favicon.ico'));
  app.get('/', (_q,res)=>res.sendFile(__dirname+'/www/index.html'));
  app.post('/api/set', async (req,res)=>{ try{ await adapter.setStateAsync(idOf(req.body.key||''), req.body.value); res.json({ok:true}); }catch(e){ res.status(500).json({ok:false}); } });
  const server = http.createServer(app); server.listen(Number(adapter.config?.port||8188));
}
start();
