// Galaxy GPL-3.0. Year AND genre, bounded catalogs, paging and input validation.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {createAddon}=require('../utils/stremio/galaxy-anime/server.cjs');const {parseYear,matchesYear}=require('../utils/stremio/galaxy-anime/year-filter.cjs');
(async()=>{
 const root=path.resolve(__dirname,'../release-staging/galaxy-anime-tests');fs.mkdirSync(root,{recursive:true});let requests=[];
 const included=[{id:'a',type:'genres',attributes:{name:'Action'}},{id:'246',type:'categories',attributes:{slug:'isekai'}}];
 const record=(id,date)=>({id,attributes:{canonicalTitle:'Title '+id,subtype:'TV',startDate:date},relationships:{genres:{data:[{id:'a'}]},categories:{data:[{id:'246'}]}}});
 const getJson=async url=>{requests.push(url);const u=new URL(url);if(u.hostname==='kitsu.io')return {included,data:[record(u.searchParams.get('page[offset]')==='20'?'4':'1','2024-04-01'),record('2','2023-04-01')]};return {metas:[{id:'kitsu:1',name:'new',releaseInfo:'2024-2026'},{id:'kitsu:2',name:'ongoing old',releaseInfo:'2023-2024'},{id:'kitsu:3',name:'no year'}]}};
 const a=createAddon({dataDir:fs.mkdtempSync(path.join(root,'year-')),getJson});assert.equal(parseYear('2024'),'2024');assert.equal(parseYear('2024,2025'),null);assert.equal(parseYear('1899'),null);assert.equal(matchesYear({releaseInfo:'2023-2024'},'2024'),false);assert.equal(matchesYear({releaseInfo:'2024-2026'},'2024'),true);
 for(const id of ['popular','airing','trending','search']){const extra='year=2024&genre=Isekai%2CAction'+(id==='search'?'&search=Title':'');const r=await a.catalog(id,extra);assert.deepEqual(r.metas.map(m=>m.id),['kitsu:1']);assert(r.metas[0].genres.includes('Isekai'));if(['popular','airing'].includes(id))assert.equal((await a.catalog(id,extra+'&skip=20')).metas[0].id,'kitsu:4');else assert.deepEqual((await a.catalog(id,extra+'&skip=20')).metas,[])}
 const count=requests.length;assert.deepEqual((await a.catalog('popular','year=nope')).metas,[]);assert.equal(count,requests.length);assert(requests.some(u=>new URL(u).searchParams.get('filter[seasonYear]')==='2024'));assert(a.manifest().catalogs.every(c=>c.extra.some(e=>e.name==='year'&&e.options.includes('2024'))));
 console.log('PASS: first release year, no end-year false match, year+Isekai+Action, all catalogs, paging, manifest and invalid-year rejection');
})().catch(e=>{console.error(e);process.exitCode=1});
