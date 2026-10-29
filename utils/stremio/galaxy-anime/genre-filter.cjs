// Stremio Galaxy community modification, GPL-3.0. Genre facts verified against Anime Kitsu manifest.
'use strict';
const genres=require('./genres.json');
const byName=new Map(genres.map(g=>[g.id.toLowerCase(),g.id]));
function parseGenres(value){if(typeof value!=='string'||value.length>2000)return null;const parts=value.split(',').map(x=>x.trim()).filter(Boolean);if(parts.some(x=>!byName.has(x.toLowerCase())))return null;return [...new Set(parts.map(x=>byName.get(x.toLowerCase())))].sort()}
function readGenres(data){
 const names=new Map((data.included||[]).filter(x=>x.type==='genres').map(x=>[x.id,x.attributes?.name]));
 const isekai=new Set((data.included||[]).filter(x=>x.type==='categories'&&x.attributes?.slug==='isekai').map(x=>x.id));
 return new Map((data.data||[]).filter(x=>/^\d+$/.test(x.id)).map(x=>{const values=(x.relationships?.genres?.data||[]).map(g=>names.get(g.id)).filter(Boolean);if((x.relationships?.categories?.data||[]).some(c=>isekai.has(c.id)))values.push('Isekai');return [x.id,values]}));
}
async function filterCatalog(metas,selected,get,memo){
 const found=new Map();
 for(let i=0;i<metas.length;i+=20){const ids=metas.slice(i,i+20).map(m=>m.id.slice(6));const key=ids.slice().sort((a,b)=>Number(a)-Number(b)).join(',');
  const group=await memo('genres:'+(selected.includes('Isekai')?'categories:':'')+key,async()=>{
   const url=new URL('https://kitsu.io/api/edge/anime');url.searchParams.set('filter[id]',key);url.searchParams.set('include',selected.includes('Isekai')?'genres,categories':'genres');url.searchParams.set('page[limit]','20');
   const data=await get(url.href);return [...readGenres(data)].filter(([id])=>ids.includes(id));
  });for(const [id,names] of group)found.set('kitsu:'+id,names);
 }
 return metas.filter(m=>{const names=found.get(m.id)||[];return selected.every(g=>names.includes(g))}).map(m=>({...m,genres:found.get(m.id)}));
}
module.exports={genres,parseGenres,filterCatalog,readGenres};
