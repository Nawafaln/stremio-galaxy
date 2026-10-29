const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../utils/stremio/galaxy-launcher.cjs'),'utf8');
function run(settings,available=true){
 const calls=[];
 vm.runInNewContext(code,{__dirname:'D:/Galaxy',console,require:name=>{
  if(name==='fs')return {readFileSync:()=>Buffer.from(settings),existsSync:()=>available};
  if(name==='path')return path;
  if(name==='child_process')return {spawn:(binary,args,options)=>{calls.push({binary,args,options});return {on(){}};}};
  if(name==='./galaxy-anime/server.cjs')return {start:()=>calls.push('anime')};
  if(name==='./server.js'){calls.push('streaming');return {};}
  throw Error('Unexpected import '+name);
 }});return calls;
}
test('both services start by default with hidden local-only helper, alongside streaming',()=>{
 const calls=run('');assert.equal(calls[0],'anime');assert.equal(calls.at(-1),'streaming');
 const helper=calls.find(x=>x.binary);assert.ok(helper.binary.endsWith('watch-party\\node.exe')||helper.binary.endsWith('watch-party/node.exe'));
 assert.equal(helper.options.windowsHide,true);assert.equal(helper.options.shell,undefined);
});
test('disabling either service leaves the other service and streaming enabled',()=>{
 let calls=run('[GalaxyAnime]\nEnabled=0\n[GalaxyWatchParty]\nEnabled=1\n');assert.ok(!calls.includes('anime'));assert.ok(calls.some(x=>x.binary));assert.equal(calls.at(-1),'streaming');
 calls=run('[GalaxyWatchParty]\nEnabled=0\n[GalaxyAnime]\nEnabled=1\n');assert.ok(calls.includes('anime'));assert.ok(!calls.some(x=>x.binary));assert.equal(calls.at(-1),'streaming');
});
test('missing optional helper never prevents the streaming server from starting',()=>{assert.equal(run('',false).at(-1),'streaming');});
