// Stremio Galaxy, GPL-3.0. Addon titles with localized summaries; never changes playback IDs or credits.
((config)=>{
'use strict';
if(window.top!==window||!window.__galaxyAppearance||window.GalaxyMetadata)return;
const TTL=7*86400000,PREFIX='galaxy-metadata-v1:',OVERRIDE='galaxy-tmdb-key-v1';
const aliases={ara:'ar',eng:'en',fra:'fr',fre:'fr',spa:'es',tur:'tr',por:'pt',pob:'pt-BR',deu:'de',ger:'de',ita:'it',jpn:'ja',kor:'ko',zho:'zh',chi:'zh',heb:'he',fas:'fa',per:'fa',urd:'ur',rus:'ru',ukr:'uk',nld:'nl',dut:'nl',pol:'pl',ces:'cs',cze:'cs',ron:'ro',rum:'ro',ell:'el',gre:'el',swe:'sv',dan:'da',nor:'no',nob:'nb',nno:'nn',fin:'fi',ind:'id',vie:'vi',tha:'th',hin:'hi',hun:'hu',bul:'bg',ben:'bn',cat:'ca',hrv:'hr',srp:'sr',slk:'sk',slv:'sl',mya:'my',tel:'te',eus:'eu',epo:'eo'};
const regions={ar:'SA',en:'US',fr:'FR',es:'ES',tr:'TR',pt:'PT',zh:'CN',he:'IL',fa:'IR',ur:'PK',de:'DE',it:'IT',ja:'JP',ko:'KR',ru:'RU',uk:'UA',nl:'NL',pl:'PL',cs:'CZ',ro:'RO',el:'GR',sv:'SE',da:'DK',no:'NO',nb:'NO',nn:'NO',fi:'FI',id:'ID',vi:'VN',th:'TH',hi:'IN',hu:'HU',bg:'BG',bn:'BD',ca:'ES',hr:'HR',sr:'RS',sk:'SK',sl:'SI',my:'MM',te:'IN',eu:'ES'};
function normalize(value){let raw=String(value||'en').replaceAll('_','-'),parts=raw.split('-'),base=aliases[parts[0].toLowerCase()]||parts[0].toLowerCase();raw=parts.length>1?base+'-'+parts.slice(1).join('-'):base;try{raw=Intl.getCanonicalLocales(raw)[0]}catch{return 'en-US'}if(raw==='ar-AR')raw='ar-SA';return raw.includes('-')?raw:raw+(regions[raw]?'-'+regions[raw]:'')}
const direction=value=>['ar','he','fa','ur'].includes(normalize(value).split('-')[0])?'rtl':'ltr';
let language=normalize(document.documentElement?.lang||'en'),dead=false,revision=0,domJob,active=0;const queue=[],pending=new Map(),failures=new Map(),memory=new Map();
const clean=v=>typeof v==='string'?v.trim():'';
function read(key){if(memory.has(key)&&memory.get(key).expires>Date.now())return memory.get(key).value;try{const x=JSON.parse(localStorage.getItem(PREFIX+key));if(x&&x.expires>Date.now()){memory.set(key,x);return x.value}localStorage.removeItem(PREFIX+key)}catch{}return undefined}
function write(key,value){const x={expires:Date.now()+TTL,value};memory.set(key,x);if(memory.size>500)memory.delete(memory.keys().next().value);try{localStorage.setItem(PREFIX+key,JSON.stringify(x));const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith(PREFIX))keys.push(k)}if(keys.length>500)for(const k of keys.slice(0,keys.length-500))localStorage.removeItem(k)}catch{}}
function apiKey(){try{return clean(localStorage.getItem(OVERRIDE))||config.apiKey}catch{return config.apiKey}}
function setApiKey(value){const key=clean(value);if(key&&!/^[a-f\d]{32}$/i.test(key))throw Error('Invalid TMDB API key');if(key)localStorage.setItem(OVERRIDE,key);else localStorage.removeItem(OVERRIDE);revision++;pending.clear();failures.clear();memory.clear();for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith(PREFIX+'text:'))localStorage.removeItem(k)}changed();}
async function json(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);try{const r=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',headers:{Accept:new URL(url).hostname==='kitsu.io'?'application/vnd.api+json':'application/json'}});if(!r.ok)throw Error('Metadata HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}}
async function tmdb(path,lang,params={}){const url=new URL('https://api.themoviedb.org/3'+path);url.searchParams.set('api_key',apiKey());url.searchParams.set('language',lang);for(const [k,v]of Object.entries(params))if(v!=null)url.searchParams.set(k,String(v));return json(url.href)}
const year=value=>String(value||'').match(/\b(?:19|20)\d{2}\b/)?.[0]||'';
const normalized=value=>clean(value).normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu,'');
const kind=meta=>meta.type==='movie'?'movie':'tv';
const idOf=meta=>String(meta.id||meta._id||meta.metaId||'');
const animeId=id=>/^(kitsu|mal|anilist):\d+$/.test(id);
// Immediate Arabic genre labels avoid a source-language flash while network metadata arrives.
const arabicGenres={action:'حركة',adventure:'مغامرة',actionadventure:'حركة ومغامرة',animation:'رسوم متحركة',anime:'أنمي',comedy:'كوميديا',crime:'جريمة',documentary:'وثائقي',drama:'دراما',family:'عائلي',fantasy:'فانتازيا',history:'تاريخ',horror:'رعب',music:'موسيقى',mystery:'غموض',romance:'رومانسية',sciencefiction:'خيال علمي',scifi:'خيال علمي',scififantasy:'خيال علمي وفانتازيا',thriller:'إثارة',war:'حرب',western:'ويسترن',reality:'واقع',talk:'حوار',kids:'أطفال',news:'أخبار',soap:'دراما يومية',warpolitics:'حرب وسياسة',tvmovie:'فيلم تلفزيوني'};
function displayGenres(genres,labels={}){const ar=language.split('-')[0]==='ar',dictionary={...(ar?arabicGenres:{}),...(read('genres:'+language)||{}),...labels};return {labels:dictionary,genres:(Array.isArray(genres)?genres:[]).map(g=>dictionary[normalized(g)]||g).filter(g=>typeof g==='string'&&(!ar||!/[a-z]/i.test(g)))}}
function original(meta){const d=displayGenres(meta.genres);return {...meta,description:clean(meta.description)||clean(meta.overview),genres:d.genres,_galaxyGenreLabels:d.labels}}
function combine(meta,text){const out=original(meta);if(!text)return out;return {...out,name:out.name,description:clean(text.description)||out.description,genres:displayGenres(text.genres?.length?text.genres:out.genres,text.genreLabels).genres,_galaxyOriginalName:meta.name,_galaxyLocalized:false,_galaxyGenreLabels:displayGenres([],text.genreLabels).labels}}
function keyFor(meta,lang){return 'text:'+kind(meta)+':'+idOf(meta)+'_'+lang}
function notify(lang){if(!dead&&lang===language){window.dispatchEvent(new CustomEvent('galaxy-metadata-updated',{detail:{language}}));scheduleDom()}}
function changed(){window.dispatchEvent(new CustomEvent('galaxy-language-changed',{detail:{language,direction:direction(language)}}));notify(language)}
function setLanguage(value){const next=normalize(value);if(next===language)return;language=next;for(let i=queue.length-1;i>=0;i--)if(queue[i].lang!==language)queue.splice(i,1)[0].resolve({_cancelled:true});changed()}
function limit(fn,lang){return new Promise((resolve,reject)=>{queue.push({fn,resolve,reject,lang});pump()})}
function pump(){while(!dead&&active<4&&queue.length){const job=queue.shift();active++;Promise.resolve().then(job.fn).then(job.resolve,job.reject).finally(()=>{active--;pump()})}}
async function kitsu(meta){
 const id=idOf(meta),hit=read('kitsu:'+id);if(hit)return hit;
 let kitsuId=id.split(':')[1];
 if(!id.startsWith('kitsu:')){const site=id.startsWith('mal:')?'myanimelist/anime':'anilist/anime',u=new URL('https://kitsu.io/api/edge/mappings');u.searchParams.set('filter[externalSite]',site);u.searchParams.set('filter[externalId]',kitsuId);u.searchParams.set('include','item');const data=await json(u.href),matches=(data.data||[]).map(x=>x.relationships?.item?.data).filter(x=>x?.type==='anime');const ids=[...new Set(matches.map(x=>x.id))];if(ids.length!==1)return null;kitsuId=ids[0]}
 const data=await json('https://kitsu.io/api/edge/anime/'+encodeURIComponent(kitsuId)+'?include=mappings'),item=data.data;if(item?.type!=='anime'||String(item.id)!==String(kitsuId))return null;
 const value={id:kitsuId,attributes:item.attributes||{},mappings:(data.included||[]).filter(x=>x.type==='mappings').map(x=>x.attributes||{})};write('kitsu:'+id,value);return value;
}
function kitsuText(k,lang){if(!k)return {};const a=k.attributes,base=lang.split('-')[0],locale=lang.replace('-','_').toLowerCase(),values=obj=>obj&&typeof obj==='object'?(clean(obj[locale])||clean(obj[base])||clean(obj[base+'_us'])||Object.entries(obj).find(([key,v])=>key.split(/[-_]/)[0]===base&&clean(v))?.[1]||''):'';return {name:values(a.titles)||clean(a.canonicalTitle)||clean(a.titles?.en),description:values(a.descriptions)||clean(a.synopsis)||clean(a.description)}}
async function find(id,source,lang,type){const data=await tmdb('/find/'+encodeURIComponent(id),lang,{external_source:source}),items=type==='movie'?data.movie_results:data.tv_results;if(items?.length===1)return {type,id:items[0].id};if(type==='tv'&&data.tv_season_results?.length===1){const x=data.tv_season_results[0];return {type:'tv',id:x.show_id,season:x.season_number}}return null}
async function safeAnimeReference(ref,k,lang){
 if(!ref)return null;const a=k.attributes,y=year(a.startDate),titles=Object.values(a.titles||{}).concat(a.canonicalTitle).filter(Boolean),titleSet=new Set(titles.map(normalized));
 const data=await tmdb('/'+ref.type+'/'+ref.id,'en-US');if(!data||!data.id)return null;
 if(ref.type==='movie')return y&&year(data.release_date)===y&&[data.title,data.original_title].some(n=>titleSet.has(normalized(n)))?ref:null;
 if(ref.season!=null){const s=(data.seasons||[]).find(s=>s.season_number===ref.season);return s&&y&&year(s.air_date)===y?ref:null}
 const firstYear=year(data.first_air_date),sameTitle=[data.name,data.original_name].some(n=>titleSet.has(normalized(n))),seasonHint=titles.some(t=>/\b(?:season|part|cour|2nd|3rd|4th)\b|第.+期/i.test(t));
 if(y&&firstYear===y&&sameTitle&&!seasonHint)return ref;
 const seasons=(data.seasons||[]).filter(s=>s.season_number>0&&year(s.air_date)===y&&titleSet.has(normalized(s.name)));
 return seasons.length===1?{...ref,season:seasons[0].season_number}:null;
}
async function animeReference(meta,k,lang){
 const cacheKey='match:'+idOf(meta),hit=read(cacheKey);if(hit!==undefined)return hit;
 if(!k)return null;const a=k.attributes,type=String(a.subtype||'').toLowerCase()==='movie'?'movie':'tv';
 for(const m of k.mappings){let ref=null;const site=String(m.externalSite||'').toLowerCase(),external=String(m.externalId||'');
  if(/imdb/.test(site)&&/^tt\d+$/.test(external))ref=await find(external,'imdb_id',lang,type);
  else if(type==='tv'&&site.startsWith('thetvdb')&&/^\d+(?:\/\d+)?$/.test(external)){const [id,season]=external.split('/');ref=await find(id,'tvdb_id',lang,'tv');if(ref&&season!=null)ref.season=Number(season)}
  if(ref){const safe=await safeAnimeReference(ref,k,lang);if(safe){write(cacheKey,safe);return safe}}
 }
 // Require exact title, exact year, animation genre, expected media type and a unique candidate.
 const y=year(a.startDate),titles=[...new Set([a.canonicalTitle,...Object.values(a.titles||{})].filter(Boolean))],accepted=new Map();
 if(y)for(const title of titles.slice(0,2)){
  const data=await tmdb('/search/'+type,lang,{query:title,[type==='tv'?'first_air_date_year':'year']:y,include_adult:false});
  for(const item of data.results||[]){const names=[item.name,item.title,item.original_name,item.original_title];if(year(item.first_air_date||item.release_date)!==y||!item.genre_ids?.includes(16)||!names.some(n=>titles.some(t=>normalized(t)===normalized(n))))continue;accepted.set(item.id,{type,id:item.id})}
 }
 const value=accepted.size===1?await safeAnimeReference([...accepted.values()][0],k,lang):null;write(cacheKey,value);return value;
}
async function reference(meta,lang,k){const id=idOf(meta),direct=id.match(/^tmdb:(?:(movie|tv|series):)?(\d+)(?::season:(\d+))?$/);if(direct)return {type:direct[1]==='movie'?'movie':direct[1]?'tv':kind(meta),id:Number(direct[2]),...(direct[3]?{season:Number(direct[3])}:{})};if(/^tt\d+$/.test(id))return find(id,'imdb_id',lang,kind(meta));if(animeId(id))return animeReference(meta,k,lang);return null}
async function details(ref,lang){const parent=await tmdb('/'+ref.type+'/'+ref.id,lang);if(ref.season==null)return parent;const scoped=await tmdb('/tv/'+ref.id+'/season/'+ref.season,lang);return {...scoped,name:clean(scoped.name)?clean(parent.name)+' — '+scoped.name:parent.name,genres:parent.genres}}
const genreRequests=new Map();
async function genreLabelsFor(lang){
 if(lang==='en-US')return {};const key='genres:'+lang,hit=read(key);if(hit)return hit;if(failures.get(key)>Date.now())return {};if(genreRequests.has(key))return genreRequests.get(key);
 const work=(async()=>{try{const labels={};for(const type of ['movie','tv']){const en=await tmdb('/genre/'+type+'/list','en-US'),local=await tmdb('/genre/'+type+'/list',lang);for(const g of en.genres||[]){const translated=local.genres?.find(x=>x.id===g.id);if(clean(translated?.name))labels[normalized(g.name)]=translated.name}}if(labels.sciencefiction)labels.scifi=labels.sciencefiction;write(key,labels);return labels}catch{failures.set(key,Date.now()+60000);return {}}})().finally(()=>genreRequests.delete(key));genreRequests.set(key,work);return work;
}
async function resolveText(meta,lang){
 let k=null;if(animeId(idOf(meta)))try{k=await kitsu(meta)}catch{}
 const fallback=kitsuText(k,lang);let ref;try{ref=await reference(meta,lang,k)}catch(error){if(k)return {...fallback,_transient:true};throw error}
 if(!ref){const labels=await genreLabelsFor(lang);return {...fallback,genreLabels:labels,genres:(meta.genres||[]).map(g=>labels[normalized(g)]||g)}}
 let localized=null,english=null;try{localized=await details(ref,lang)}catch{}
 if(lang==='en-US')english=localized;else try{english=await details(ref,'en-US')}catch{}
 if(!localized&&!english)return {...fallback,_transient:true};
 const genreLabels={...await genreLabelsFor(lang)};for(const g of english?.genres||[]){const translated=localized?.genres?.find(v=>v.id===g.id);if(translated?.name)genreLabels[normalized(g.name)]=translated.name}
 const genres=(localized?.genres?.length?localized.genres:english?.genres||[]).map(g=>clean(g.name)).filter(Boolean);
 return {name:clean(localized?.title||localized?.name)||clean(english?.title||english?.name)||fallback.name,description:clean(localized?.overview)||clean(english?.overview)||fallback.description,genres,genreLabels};
}
function request(meta,lang=language){const key=keyFor(meta,lang),hit=read(key);if(hit!==undefined)return Promise.resolve(combine(meta,hit));if(!idOf(meta)||failures.get(key)>Date.now())return Promise.resolve(original(meta));if(pending.has(key))return pending.get(key).then(text=>combine(meta,text));const rev=revision;
 const work=limit(()=>resolveText({...meta,genres:Array.isArray(meta.genres)?meta.genres:[]},lang),lang).then(text=>{if(text?._cancelled||rev!==revision)return {};if(text._transient){failures.set(key,Date.now()+60000);memory.set(key,{expires:Date.now()+60000,value:text})}else write(key,text);notify(lang);return text}).catch(()=>{failures.set(key,Date.now()+60000);return {}}).finally(()=>{if(pending.get(key)===work)pending.delete(key)});pending.set(key,work);return work.then(text=>combine(meta,text));}
function get(meta){const text=read(keyFor(meta,language));if(text!==undefined)return combine(meta,text);void request(meta);return original(meta)}
function props(node,test){const key=node&&Object.keys(node).find(k=>k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$'));for(let f=key&&node[key],i=0;f&&i<70;f=f.return,i++)for(const x of [f,f.alternate])if(x?.memoizedProps&&test(x.memoizedProps))return x.memoizedProps;return null}
function fromNode(node){const p=props(node,p=>typeof p.name==='string'&&(p.description!==undefined||p.metaId||p.deepLinks));if(!p)return null;let id=p.metaId||p.id||p._id;const route=String(p.deepLinks?.metaDetailsVideos||p.deepLinks?.metaDetailsStreams||location.hash).match(/#\/(?:detail|metadetails)\/([^/]+)\/([^/?]+)/);if(!id&&route)try{id=decodeURIComponent(route[2])}catch{}if(!id)return null;return {...p,id,type:p.type||route?.[1]||'series',genres:p.genres||p.links?.filter(x=>/genre/i.test(x.category)).map(x=>x.name)||[]}}
const patches=new Map();
function patchText(node,value){if(!node||!clean(value))return;if(!patches.has(node))patches.set(node,{text:node.textContent,dir:node.getAttribute('dir')});if(node.textContent!==value)node.textContent=value;node.dir=direction(language);node.style.textAlign='start';node.style.unicodeBidi='plaintext'}
function patchDescription(node,value){if(!node||!clean(value))return;let texts=Array.from(node.childNodes).filter(n=>n.nodeType===3);if(!texts.length&&node.children.length)return;if(!patches.has(node))patches.set(node,{description:texts.map(n=>n.nodeValue),dir:node.getAttribute('dir')});if(!texts.length){node.append(document.createTextNode(value));texts=Array.from(node.childNodes).filter(n=>n.nodeType===3)}texts.forEach((n,i)=>{const v=i?'':value;if(n.nodeValue!==v)n.nodeValue=v});node.dir=direction(language);node.style.textAlign='start';node.style.unicodeBidi='plaintext'}
function refreshDom(){if(dead)return;for(const info of document.querySelectorAll('[class*="meta-preview-container-"] [class*="meta-info-container-"]')){
 const native=fromNode(info)||fromNode(info.querySelector('[class*="description-container-"]'));if(!native)continue;const meta=get(native);
 patchDescription(info.querySelector('[class*="description-container-"]'),meta.description);
 const placeholder=info.querySelector('[class*="logo-placeholder-"]');if(placeholder)patchText(placeholder,meta.name);
 const logo=info.querySelector('img[class*="logo-"]');let text=info.querySelector('[data-galaxy-localized-title]');if(logo&&meta._galaxyLocalized){if(!text){text=document.createElement('div');text.dataset.galaxyLocalizedTitle='';text.className=logo.className;text.style.height=getComputedStyle(logo).height;logo.after(text)}text.style.minHeight='2em';text.style.fontSize='1.7rem';text.style.display='flex';text.style.alignItems='center';patchText(text,meta.name);logo.hidden=true;logo.style.display='none'}else{if(logo){logo.hidden=false;logo.style.removeProperty('display')}text?.remove()}
 for(const link of info.querySelectorAll('[class*="meta-links-"] a[href]')){const target=link.querySelector('[class*="label-"]')||link,saved=patches.get(target)?.text||target.textContent;let href=link.getAttribute('href')||'';try{href=decodeURIComponent(href)}catch{}const group=props(link,p=>Array.isArray(p.links)&&typeof p.label==='string');if(!/genre[=:/]/i.test(href)&&!/genre/i.test(group?.label||''))continue;const label=meta._galaxyGenreLabels?.[normalized(saved)];if(label)patchText(target,label);else if(patches.has(target))patchText(target,saved)}
 }}
function scheduleDom(){if(dead||domJob!==undefined)return;domJob=setTimeout(()=>{domJob=undefined;refreshDom()},40)}
const observer=new MutationObserver(scheduleDom);
function start(){if(document.documentElement){observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});scheduleDom()}}
const languageEvent=e=>{if(e.detail?.language)setLanguage(e.detail.language)};
window.GalaxyMetadata={normalize,direction,getLanguage:()=>language,setLanguage,get,request,setApiKey,getAttributionLogo:()=>config.logoData||'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg',hasCustomKey:()=>{try{return !!localStorage.getItem(OVERRIDE)}catch{return false}},refreshDom,destroy(){dead=true;clearTimeout(domJob);observer.disconnect();window.removeEventListener('hashchange',scheduleDom);window.removeEventListener('galaxy-language-changed',languageEvent);document.removeEventListener('DOMContentLoaded',start);for(const [node,p]of patches){if(!node.isConnected)continue;if(p.text!=null)node.textContent=p.text;else if(p.description)Array.from(node.childNodes).filter(n=>n.nodeType===3).forEach((n,i)=>n.nodeValue=p.description[i]||'');if(p.dir==null)node.removeAttribute('dir');else node.dir=p.dir;node.style.removeProperty('text-align');node.style.removeProperty('unicode-bidi')}document.querySelectorAll('[data-galaxy-localized-title]').forEach(n=>{if(n.previousElementSibling)n.previousElementSibling.hidden=false;n.remove()});patches.clear();delete window.GalaxyMetadata}};
window.addEventListener('hashchange',scheduleDom);window.addEventListener('galaxy-language-changed',languageEvent);if(document.documentElement)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
})(__GALAXY_METADATA_CONFIG__);
