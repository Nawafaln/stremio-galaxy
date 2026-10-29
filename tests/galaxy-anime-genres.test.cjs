// Galaxy GPL-3.0. Multi-genre behavior across all catalog routes, not just visible cards.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {createAddon}=require('../utils/stremio/galaxy-anime/server.cjs');
const {parseGenres}=require('../utils/stremio/galaxy-anime/genre-filter.cjs');
(async()=>{
 const root=path.resolve(__dirname,'../release-staging/galaxy-anime-tests');fs.mkdirSync(root,{recursive:true});const requests=[];
 const data=[{id:'1',names:['Action','Adventure']},{id:'2',names:['Action']},{id:'3',names:['Drama']},{id:'4',names:['Action','Adventure']}];
 const getJson=async value=>{requests.push(value);const url=new URL(value);if(url.hostname==='kitsu.io'){const ids=url.searchParams.get('filter[id]').split(',');return {included:[{id:'g1',type:'genres',attributes:{name:'Action'}},{id:'g2',type:'genres',attributes:{name:'Adventure'}},{id:'g3',type:'genres',attributes:{name:'Drama'}}],data:data.filter(x=>ids.includes(x.id)).map(x=>({id:x.id,relationships:{genres:{data:x.names.map(n=>({id:({Action:'g1',Adventure:'g2',Drama:'g3'})[n]}))}}}))}}return {metas:data.map(x=>({id:'kitsu:'+x.id,type:'series',name:'Anime '+x.id,description:'original'}))}};
 const addon=createAddon({dataDir:fs.mkdtempSync(path.join(root,'genres-')),getJson});
 assert.deepEqual(parseGenres('adventure,Action,action'),['Action','Adventure']);assert.equal(parseGenres('Action,Unknown'),null);
 for(const c of addon.manifest().catalogs)assert(c.extra.some(e=>e.name==='genre'));
 for(const id of ['popular','airing','trending','search']){const extra='genre=Action%2CAdventure'+(id==='search'?'&search=space':'');const result=await addon.catalog(id,extra);assert.deepEqual(result.metas.map(x=>x.id),['kitsu:1','kitsu:4']);assert(!result.metas.some(x=>x.description));assert(result.metas.every(x=>x.genres.includes('Adventure')));if(id==='trending'||id==='search')assert.deepEqual((await addon.catalog(id,extra+'&skip=20')).metas,[],'filtered pagination must not repeat first page')}
 assert(requests.some(u=>decodeURIComponent(u).includes('genre=Action,Adventure')));assert(requests.some(u=>u.includes('search=space')));
 const count=requests.length;assert.deepEqual((await addon.catalog('popular','genre=Wrong')).metas,[]);assert.equal(requests.length,count);assert.deepEqual((await addon.catalog('popular','skip=-1')).metas,[]);
 console.log('PASS: AND genres, all four catalogs, Kitsu relationship verification, invalid filters, canonical cache keys and finite pagination');
})().catch(e=>{console.error(e);process.exitCode=1});
