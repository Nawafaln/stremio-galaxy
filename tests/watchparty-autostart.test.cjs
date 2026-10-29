const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http'),{once}=require('node:events');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),os=require('node:os');
const project=path.resolve(__dirname,'..');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'galaxy-autostart-test-'));
let start;
before(async()=>{
 const {packWatchParty}=require('../build/pack-watchparty.cjs');
 const target=await packWatchParty({project,party:path.resolve(process.env.GALAXY_WATCHPARTY_SOURCE||path.join(project,'../stremio-watchparty')),payload:temporary});
 assert.ok(fs.existsSync(path.join(target,'companion/config.cjs')));
 assert.ok(fs.existsSync(path.join(target,'watchparty.config.json')));
 assert.equal(fs.existsSync(path.join(target,'node_modules')),false);
 ({start}=require(path.join(target,'start.cjs')));
});
after(()=>{
 assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir())+path.sep+'galaxy-autostart-test-'));
 fs.rmSync(temporary,{recursive:true,force:true});
});
test('packaged companion starts offline, reuses matching service and closes only what it owns',async t=>{
 const worker='https://offline.example.invalid';
 const owned=await start({port:0,worker});t.after(()=>owned.close());
 const origin=owned.app.origin;
 assert.ok((await (await fetch(origin)).text()).includes(`name="room-service" content="${worker}"`));
 const reused=await start({port:Number(new URL(origin).port),worker});
 assert.equal(reused.app,undefined);await reused.close();assert.equal((await fetch(origin)).status,200);
 await assert.rejects(()=>start({port:Number(new URL(origin).port),worker:'https://different.example.invalid'}),/older companion/);
 await owned.close();await assert.rejects(()=>fetch(origin));
});
test('an older local companion is not silently reused or stopped',async t=>{
 const server=http.createServer((req,res)=>res.end('Old companion'));server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 const port=server.address().port;
 await assert.rejects(()=>start({port}),/older companion/);
 assert.equal(await (await fetch('http://127.0.0.1:'+port)).text(),'Old companion');
});
test('native panel port supports UTF-8 and UTF-16 settings',()=>{
 const source=fs.readFileSync(path.join(project,'utils/stremio/watch-party/start.cjs'),'utf8');
 for(const utf16 of [false,true]){
  const text='[Other]\nPort=1234\n[GalaxyWatchParty]\nPort=4321\n';
  const bytes=utf16?Buffer.concat([Buffer.from([255,254]),Buffer.from(text,'utf16le')]):Buffer.from(text);
  const context={module:{exports:{}},__dirname:temporary,console,require:name=>name==='node:fs'?{readFileSync:()=>bytes}:name==='node:path'?path:{},Buffer};
  vm.runInNewContext(source,context);assert.equal(context.module.exports.configuredPort(),4321);
 }
});
