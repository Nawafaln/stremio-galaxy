// Stremio Galaxy community modification, GPL-3.0.
// Kitsu category slug `isekai` verified via /categories?filter[slug]=isekai (category 246).
'use strict';
const {readGenres}=require('./genre-filter.cjs');
async function isekaiCatalog(catalog,selected,skip,get,year=''){
 const url=new URL('https://kitsu.io/api/edge/anime');
 if(selected.includes('Isekai'))url.searchParams.set('filter[categories]','isekai');
 if(year)url.searchParams.set('filter[seasonYear]',year);
 const legacy=selected.filter(g=>g!=='Isekai');if(legacy.length)url.searchParams.set('filter[genres]',legacy.join(','));
 url.searchParams.set('filter[subtype]','TV,OVA,ONA,movie,special');
 url.searchParams.set('filter[status]',catalog==='airing'?'current':'finished,current,upcoming');
 url.searchParams.set('sort',catalog==='airing'?'-average_rating':'-user_count');
 url.searchParams.set('include','genres,categories');url.searchParams.set('page[limit]','20');url.searchParams.set('page[offset]',String(skip));
 const data=await get(url.href),facts=readGenres(data);
 return {metas:(data.data||[]).filter(x=>facts.has(x.id)&&selected.every(g=>facts.get(x.id).includes(g))&&(!year||String(x.attributes?.startDate||'').startsWith(year+'-'))).map(x=>{
  const a=x.attributes||{},start=/^\d{4}/.exec(a.startDate||'')?.[0]||'',end=/^\d{4}/.exec(a.endDate||'')?.[0]||'';
  return {id:'kitsu:'+x.id,type:a.subtype==='movie'?'movie':'series',name:a.canonicalTitle||a.titles?.en||'Kitsu '+x.id,poster:a.posterImage?.medium||a.posterImage?.large,posterShape:'poster',background:a.coverImage?.large||a.coverImage?.original,releaseInfo:start+(end&&end!==start?'-'+end:''),...(a.episodeLength?{runtime:a.episodeLength+' min'}:{}),genres:facts.get(x.id)};
 }),cacheMaxAge:300};
}
module.exports={isekaiCatalog};
