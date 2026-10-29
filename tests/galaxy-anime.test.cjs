// Galaxy GPL-3.0. Protocol, locale, quota and isolation tests; no remote requests.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createAddon,language}=require('../utils/stremio/galaxy-anime/server.cjs');
(async()=>{
 const testRoot=path.resolve(__dirname,'../release-staging/galaxy-anime-tests');fs.mkdirSync(testRoot,{recursive:true});const dir=fs.mkdtempSync(path.join(testRoot,'case-'));let translations=0,requests=[];
 const getJson=async url=>{requests.push(url);if(url.includes('mymemory'))throw Error('machine translation forbidden');if(url.includes('aiometadata')){translations++;return {meta:{id:'kitsu:1',description:'نبذة عربية جاهزة عن مغامرات الفضاء.'}}}if(url.includes('/catalog/'))return {metas:[{id:'kitsu:1',type:'series',name:'Cowboy Bebop',description:'English preview'}]};return {meta:{id:'kitsu:1',type:'series',name:'Cowboy Bebop',description:'An anime about space adventures.',videos:[{id:'kitsu:1:1',title:'Episode 1'}]}}};
 fs.writeFileSync(path.join(dir,'budget.json'),JSON.stringify({day:new Date().toISOString().slice(0,10),chars:999999}));
 const addon=createAddon({dataDir:dir,port:0,getJson,postJson:async()=>({success:true,userUUID:'11111111-1111-1111-1111-111111111111'})});const addr=await addon.listen(),base='http://127.0.0.1:'+addr.port;
 try{
 assert.equal(language('ara'),'ar');assert.equal(language('eng'),'en');assert.equal(language('pt-BR'),'pt');
 let res=await fetch(base+'/manifest.json'),manifest=await res.json();assert.equal(manifest.id,'community.stremio.galaxy.anime');assert.equal(manifest.resources.includes('stream'),false);
 let result=await (await fetch(base+'/catalog/anime/galaxy-trending.json')).json();assert.equal(result.metas[0].id,'kitsu:1');assert.equal(result.metas[0].description,undefined,'never publish an English catalog synopsis under an Arabic UI');
 result=await (await fetch(base+'/meta/series/kitsu%3A1.json?lang=en')).json();assert.equal(result.meta.description,'An anime about space adventures.');assert.equal(translations,0);
 res=await fetch(base+'/language',{method:'POST',headers:{Origin:'https://web.stremio.com','Content-Type':'application/json'},body:JSON.stringify({language:'ara'})});assert.equal((await res.json()).language,'ar');
 result=await (await fetch(base+'/meta/series/kitsu%3A1.json')).json();assert.equal(result.meta.description,'An anime about space adventures.','original synopsis is retained for the central localization service');assert.equal(result.galaxy.language,'ar');assert.equal(result.meta.videos[0].id,'kitsu:1:1','playback provider IDs retained');assert.equal(translations,0);
 await fetch(base+'/meta/series/kitsu%3A1.json');assert.equal(translations,0,'central service owns localized metadata; addon does not call AIO');
 res=await fetch(base+'/language',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});assert.equal(res.status,403);
 res=await fetch(base+'/meta/series/../../etc.json');assert.notEqual(res.status,200);
 await addon.catalog('search','search=space&skip=20');assert(requests.some(s=>s.includes('/search=space&skip=20.json')));
 const config=JSON.parse(fs.readFileSync(path.join(dir,'state.json'),'utf8'));assert.deepEqual(config,{language:'ar'});
 const failed=createAddon({dataDir:fs.mkdtempSync(path.join(testRoot,'failure-')),port:0,postJson:async()=>({success:true,userUUID:'11111111-1111-1111-1111-111111111111'}),getJson:async url=>{return {meta:{id:'kitsu:1',description:'English only'}}}});const data=await failed.meta('series','kitsu:1','ar');assert.equal(data.galaxy.status,'original');assert.equal(data.meta.description,'English only','unavailable translations keep the original synopsis');
 assert(!requests.some(u=>u.includes('mymemory')));assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'budget.json'),'utf8')).chars,999999,'old translation budget is ignored and untouched');
 console.log('PASS: independent manifest/catalog/meta, preserved Kitsu playback IDs, original synopsis preserved across languages, central localization ownership, cache, search/skip, origin and path guards');
 }finally{await addon.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
