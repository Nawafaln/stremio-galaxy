// Galaxy-owned companion: starts with the streaming server and shares its shutdown job.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {configuredWorker,workerURL}=require('./companion/config.cjs');
function configuredPort(){
 let text='';
 try{const bytes=fs.readFileSync(path.join(__dirname,'../portable_config/stremio-settings.ini'));text=bytes[0]===255&&bytes[1]===254?bytes.subarray(2).toString('utf16le'):bytes.toString('utf8');}catch{}
 const block=text.match(/\[GalaxyWatchParty\]([^]*?)(?=\n\[|$)/i)?.[1]||'';
 const value=Number(block.match(/^\s*Port\s*=\s*(\d+)/mi)?.[1]||3210);
 return Number.isInteger(value)&&value>=1024&&value<=65535?value:3210;
}
async function probe(url){
 try{const r=await fetch(url,{signal:AbortSignal.timeout(2000)});if(!r.ok)throw Error('Unexpected local service');return await r.text();}
 catch(error){
  // A refused connection means the companion is absent. Do not replace a hung
  // or unrelated listener just because it did not answer in time.
  if(error.cause?.code==='ECONNREFUSED')return null;
  throw Error('Could not check the existing local companion');
 }
}
async function start(options={}){
 const port=options.port??configuredPort();
 const worker=workerURL(options.worker||configuredWorker().origin).origin;
 const page=port===0?null:await probe('http://127.0.0.1:'+port+'/');
 let app;
 if(page){
  if(!page.includes('name="player-backend" content="mpv"')||!page.includes(`name="room-service" content="${worker}"`)){
   throw Error('An older companion is using the room port. Close it and restart Galaxy.');
  }
 }else{
  // Start even while offline: local MPV stays available and the room UI can
  // reconnect once the internet returns. No local Worker is started.
  app=await require('./companion/server.cjs').createCompanion({port,worker,playerMode:'mpv'});
 }
 console.log('[Galaxy Watch Party] shared-service companion ready');
 return {app,worker,close:async()=>{app?.close();}};
}
if(require.main===module)start().then(service=>{
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{service.close().finally(()=>process.exit());});
}).catch(error=>{console.error('[Galaxy Watch Party] '+error.message);process.exitCode=1;});
module.exports={start,configuredPort};
