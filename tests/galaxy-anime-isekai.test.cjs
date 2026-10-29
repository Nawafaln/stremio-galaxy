// Galaxy GPL-3.0. Isekai is a verified Kitsu category, not a guessed title keyword.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {createAddon}=require('../utils/stremio/galaxy-anime/server.cjs');
const {readGenres,parseGenres}=require('../utils/stremio/galaxy-anime/genre-filter.cjs');
(async()=>{
 const root=path.resolve(__dirname,'../release-staging/galaxy-anime-tests');fs.mkdirSync(root,{recursive:true});const requests=[];
 const include=[{id:'a',type:'genres',attributes:{name:'Action'}},{id:'246',type:'categories',attributes:{title:'Isekai',slug:'isekai'}}];
 function item(id,isekai=true){return {id,attributes:{canonicalTitle:'Example '+id,subtype:'TV',posterImage:{medium:'https://example.org/poster.jpg'},startDate:'2020-01-01'},relationships:{genres:{data:[{id:'a'}]},categories:{data:isekai?[{id:'246'}]:[]}}}}
 const getJson=async value=>{requests.push(value);const u=new URL(value);if(u.hostname==='kitsu.io')return {included:include,data:[item(u.searchParams.get('page[offset]')==='20'?'4':'1'),item('2',false)]};return {metas:[{id:'kitsu:1',name:'No genre in title',type:'series'},{id:'kitsu:2',name:'Isekai in title but NOT category',type:'series'}]}};
 const a=createAddon({dataDir:fs.mkdtempSync(path.join(root,'isekai-')),getJson});assert.deepEqual(parseGenres('isekai,Action'),['Action','Isekai']);
 for(const id of ['popular','airing','trending','search']){const extra='genre=Isekai%2CAction'+(id==='search'?'&search=Example':'');const r=await a.catalog(id,extra);assert.deepEqual(r.metas.map(x=>x.id),['kitsu:1']);assert(r.metas[0].genres.includes('Isekai'));if(['popular','airing'].includes(id)){const next=await a.catalog(id,extra+'&skip=20');assert.equal(next.metas[0].id,'kitsu:4');assert.equal(r.metas[0].poster,'https://example.org/poster.jpg')}}
 assert(requests.filter(u=>u.includes('filter%5Bcategories%5D')).every(u=>new URL(u).searchParams.get('filter[genres]')==='Action'));
 assert(requests.some(u=>new URL(u).searchParams.get('filter[status]')==='current'));
 assert(!readGenres({included:[],data:[item('1')]}).get('1').includes('Isekai'),'missing category definition is not positive evidence');
 assert.equal(a.manifest().catalogs.every(c=>c.extra.find(x=>x.name==='genre').options.includes('Isekai')),true);
 console.log('PASS: verified Isekai relationships, all catalogs, AND with Action, paging, airing status, poster/IDs and no title guessing');
})().catch(e=>{console.error(e);process.exitCode=1});
