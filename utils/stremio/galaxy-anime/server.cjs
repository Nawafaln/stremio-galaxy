// Stremio Galaxy community modification, GPL-3.0. Independent local metadata addon.
'use strict';
const http=require('http'),https=require('https'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ORIGINS=new Set(['https://stremio.zarg.me','https://zaarrg.github.io','https://web.stremio.com']);
const CATALOGS={trending:'kitsu-anime-trending',airing:'kitsu-anime-airing',popular:'kitsu-anime-popular',search:'kitsu-anime-list'};
const aliases={eng:'en',ara:'ar',fra:'fr',fre:'fr',deu:'de',ger:'de',spa:'es',ita:'it',por:'pt',tur:'tr',jpn:'ja',kor:'ko',zho:'zh',chi:'zh',rus:'ru',hin:'hi',heb:'he',fas:'fa',per:'fa',nld:'nl',dut:'nl',ukr:'uk',pol:'pl',ind:'id',vie:'vi',tha:'th',swe:'sv',dan:'da',nor:'no',fin:'fi',ell:'el',gre:'el',ron:'ro',rum:'ro',ces:'cs',cze:'cs',hun:'hu',bul:'bg'};
function language(value){const raw=String(value||'en').toLowerCase().replace('_','-').split('-')[0];return aliases[raw]||(/^[a-z]{2}$/.test(raw)?raw:'en')}
const {createMetadata}=require('./aio-metadata.cjs');
const {genres,parseGenres,filterCatalog}=require('./genre-filter.cjs');
const {isekaiCatalog}=require('./isekai.cjs');
const {years,parseYear,matchesYear}=require('./year-filter.cjs');
function createAddon(options={}){
 const dir=options.dataDir||path.resolve(__dirname,'../portable_config/galaxy-anime');fs.mkdirSync(dir,{recursive:true});
 const {requestJson}=require('./aio-metadata.cjs');const get=options.getJson||requestJson,localized=createMetadata({dir,get,post:options.postJson}),port=options.port===undefined?11471:options.port;
 let state={language:'en'};
 try{state=JSON.parse(fs.readFileSync(path.join(dir,'state.json'),'utf8'))}catch{}
 state.language=language(state.language);
 const memory=new Map(),inflight=new Map();
 function write(name,value){const file=path.join(dir,name),temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(value));fs.renameSync(temp,file)}
 function manifest(){const ar=state.language==='ar';return {id:'community.stremio.galaxy.anime',version:'1.4.0',name:'Galaxy Anime',description:ar?'فهرس أنمي جالكسي. النبذة تتبع لغة الواجهة؛ بيانات من TMDB وKitsu حسب توفرها، مع الرجوع للوصف الأصلي.':'Galaxy anime catalog. Synopsis follows Galaxy interface language; localized metadata via TMDB and Kitsu when available, with original synopsis fallback.',types:['anime','series','movie'],resources:['catalog',{name:'meta',types:['anime','series','movie'],idPrefixes:['kitsu:']}],catalogs:Object.keys(CATALOGS).map(id=>({type:'anime',id:'galaxy-'+id,name:ar?({trending:'أنمي جالكسي — الرائج',airing:'أنمي جالكسي — يُعرض الآن',popular:'أنمي جالكسي — الأشهر',search:'بحث أنمي جالكسي'})[id]:({trending:'Galaxy Anime — Trending',airing:'Galaxy Anime — Airing',popular:'Galaxy Anime — Popular',search:'Galaxy Anime — Search'})[id],extra:[...(id==='search'?[{name:'search',isRequired:true}]:[]),{name:'genre',options:genres.map(g=>g.id)},{name:'year',options:years()},{name:'skip'}]})),behaviorHints:{configurable:false,configurationRequired:false}}}
 async function memo(key,fn,ttl=300000){const hit=memory.get(key);if(hit&&hit.until>Date.now())return hit.value;if(inflight.has(key))return inflight.get(key);const work=Promise.resolve().then(fn).then(value=>{memory.set(key,{until:Date.now()+ttl,value});if(memory.size>300)memory.delete(memory.keys().next().value);return value}).finally(()=>inflight.delete(key));inflight.set(key,work);return work}
 async function meta(type,id,lang){
  if(!['anime','series','movie'].includes(type)||!/^kitsu:[1-9]\d*$/.test(id))return {meta:null,cacheMaxAge:0};
  const original=await memo('meta:'+id,async()=>{const data=await get('https://anime-kitsu.strem.fun/meta/'+type+'/'+encodeURIComponent(id)+'.json');if(data.meta?.id!==id)throw Error('id');return data.meta});
  // The app's central TMDB/Kitsu service localizes display fields; preserve the original synopsis for fallback.
  return {meta:{...original},cacheMaxAge:0,staleRevalidate:0,galaxy:{language:lang,status:'original',metadataProvider:null}};
 }
 async function catalog(id,extra){
  const name=CATALOGS[id];if(!name)return {metas:[]};const values=new URLSearchParams(extra||''),params=new URLSearchParams();
  const selected=parseGenres(values.get('genre')||'');if(selected===null)return {metas:[]};
  if(values.has('search'))params.set('search',values.get('search').slice(0,200));
  const skip=Number(values.get('skip')||0);if(!Number.isInteger(skip)||skip<0||skip>10000)return {metas:[]};
  if(id==='search'&&!params.has('search'))return {metas:[]};
  const year=parseYear(values.get('year'));if(year===null)return {metas:[]};
  if((selected.includes('Isekai')||year)&&['airing','popular'].includes(id))return memo('kitsu-filter:'+id+':'+selected.join(',')+':'+skip+':'+year,()=>isekaiCatalog(id,selected,skip,get,year));
  // Kitsu's trending/search handlers ignore genre and paging: filter the complete returned set before slicing.
  const finite=id==='trending'||id==='search';
  if(selected.length&&!finite)params.set('genre',selected.join(','));
  if(!finite||(!selected.length&&!year)){if(values.has('skip'))params.set('skip',String(skip))}
  const suffix=params.toString()?'/'+params.toString():'';
  return memo('catalog:'+id+suffix+':'+selected.join(',')+':skip='+skip+':year='+year,async()=>{
   const data=await get('https://anime-kitsu.strem.fun/catalog/anime/'+name+suffix+'.json');
   let metas=(data.metas||[]).filter(m=>/^kitsu:[1-9]\d*$/.test(m.id));
   if(year)metas=metas.filter(m=>matchesYear(m,year));
   if(selected.length)metas=await filterCatalog(metas,selected,get,memo);
   if(finite&&(selected.length||year))metas=metas.slice(skip,skip+20);
   return {metas:metas.map(m=>{const copy={...m};delete copy.description;return copy}),cacheMaxAge:300};
  });
 }

 const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Private-Network','true')}
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  function reply(value,code=200){res.statusCode=code;res.end(JSON.stringify(value))}
  if(origin&&!ORIGINS.has(origin)){reply({error:'origin'},403);return}
  if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||'')){reply({error:'host'},403);return}
  if(req.method==='OPTIONS'){res.statusCode=204;res.end();return}
  try{
   const url=new URL(req.url,'http://127.0.0.1'),parts=url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
   if(req.method==='POST'&&url.pathname==='/language'){
    if(!origin||!ORIGINS.has(origin)){reply({error:'origin'},403);return}
    let body='';for await(const chunk of req){body+=chunk;if(body.length>256){reply({error:'size'},413);return}}
    const value=JSON.parse(body);if(typeof value.language!=='string'||value.language.length>20){reply({error:'language'},400);return}state.language=language(value.language);write('state.json',state);reply({language:state.language});return;
   }
   if(req.method!=='GET'){reply({error:'method'},405);return}
   if(url.pathname==='/health'){reply({id:'community.stremio.galaxy.anime',language:state.language});return}
   if(url.pathname==='/years.json'){reply({years:years()});return}
   if(url.pathname==='/genres.json'){reply({genres});return}
   if(url.pathname==='/manifest.json'){reply(manifest());return}
   if(parts[0]==='meta'&&parts.length===3&&parts[2].endsWith('.json')){reply(await meta(parts[1],parts[2].slice(0,-5),language(url.searchParams.get('lang')||state.language)));return}
   if(parts[0]==='catalog'&&parts[1]==='anime'&&parts.length<=4){let id=parts[2]||'',extra=parts[3]||'';if(parts.length===3)id=id.replace(/\.json$/,'');else extra=extra.replace(/\.json$/,'');reply(await catalog(id.replace(/^galaxy-/,''),extra));return}
   reply({error:'not found'},404);
  }catch{reply({error:'upstream unavailable'},502)}
 });
 return {server,manifest,meta,catalog,language,close:()=>new Promise(resolve=>server.close(resolve)),listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server.address()))})};
}
function start(){const addon=createAddon();addon.listen().then(()=>console.log('[Galaxy Anime] local addon started')).catch(()=>console.error('[Galaxy Anime] local addon unavailable; streaming server continues'));return addon}
module.exports={createAddon,start,language};
