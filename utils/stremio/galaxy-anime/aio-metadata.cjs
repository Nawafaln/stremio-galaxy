// Stremio Galaxy community modification, GPL-3.0. Existing localized metadata only.
'use strict';
const https=require('https'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const HOST='https://aiometadata.elfhosted.com';
function requestJson(url,body){return new Promise((resolve,reject)=>{const payload=body===undefined?null:JSON.stringify(body);const req=https.request(url,{method:payload?'POST':'GET',headers:{Accept:new URL(url).hostname==='kitsu.io'?'application/vnd.api+json':'application/json','User-Agent':'StremioGalaxy-Anime/1.1',...(payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{})}},res=>{let data='',size=0;res.setEncoding('utf8');res.on('data',s=>{size+=Buffer.byteLength(s);if(size>4*1024*1024)req.destroy(Error('size'));else data+=s});res.on('end',()=>{if(res.statusCode!==200)return reject(Error('metadata unavailable'));try{resolve(JSON.parse(data))}catch{reject(Error('json'))}})});req.setTimeout(20000,()=>req.destroy(Error('timeout')));req.on('error',reject);req.end(payload)})}
function createMetadata({dir,get=requestJson,post=requestJson}){
 const file=path.join(dir,'aio-configs.json'),pending=new Map();let configs={};try{configs=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}
 async function configuration(lang){
  if(/^[a-f0-9-]{36}$/i.test(configs[lang]?.userUUID||''))return configs[lang].userUUID;
  if(pending.has(lang))return pending.get(lang);
  const work=(async()=>{const password=crypto.randomBytes(24).toString('hex');const config={language:lang==='ar'?'ar-SA':lang==='en'?'en-US':lang,addonName:'Galaxy Anime metadata',catalogSetupComplete:true,catalogs:[],apiKeys:{},includeAdult:false,showMetaProviderAttribution:true,search:{enabled:false,ai_enabled:false},providers:{movie:'tmdb',series:'tvdb',anime:'tvdb',anime_id_provider:'kitsu',forceAnimeForDetectedImdb:true},tvdbSeasonType:'default'};const response=await post(HOST+'/api/config/save',{config,password});if(!response.success||!/^[a-f0-9-]{36}$/i.test(response.userUUID||''))throw Error('configuration');configs[lang]={userUUID:response.userUUID,password};const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(configs));fs.renameSync(temp,file);return response.userUUID})().finally(()=>pending.delete(lang));pending.set(lang,work);return work;
 }
 const clean=text=>String(text||'').replace(/\[Meta provided by[^\]]*\]/gi,'').replace(/\s+/g,' ').trim();
 return async(type,id,lang)=>{
  const uuid=await configuration(lang),kind=type==='movie'?'movie':'series';
  const result=await get(HOST+'/stremio/'+uuid+'/meta/'+kind+'/'+encodeURIComponent(id)+'.json');
  if(result.meta?.id!==id||!clean(result.meta.description))throw Error('metadata');
  const text=result.meta.description;
  if(lang==='ar'){if((clean(text).match(/[\u0600-\u06ff]/g)||[]).length<10)throw Error('language')}
  else if(lang!=='en'){const english=await configuration('en');const fallback=await get(HOST+'/stremio/'+english+'/meta/'+kind+'/'+encodeURIComponent(id)+'.json');if(clean(text)===clean(fallback.meta?.description))throw Error('language fallback')}
  return text;
 };
}
module.exports={createMetadata,requestJson};
