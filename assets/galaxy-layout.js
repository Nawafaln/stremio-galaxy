/* Stremio Galaxy, GPL-3.0. Native production UI enhancement; upstream cards own routing/playback. */
((css)=>{
'use strict';
if(window.top!==window||!window.__galaxyAppearance||window.GalaxyLayout)return;
const q=(root,s)=>root?.querySelector(s),all=(root,s)=>Array.from(root?.querySelectorAll(s)||[]);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const safeImage=value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:null}catch{return null}};
const score=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value))&&Number(value)>0&&Number(value)<=10?String(value):null;
const props=(node,test)=>{const key=node&&Object.keys(node).find(k=>k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$'));for(let f=key&&node[key],i=0;f&&i<60;f=f.return,i++)for(const v of [f,f.alternate])if(v?.memoizedProps&&test(v.memoizedProps))return v.memoizedProps;return null};
let transport,observer,timer,job,busy=false,dead=false,language='',hero,heroHost,heroKey='',slides=[],slide=0,renderVersion=0;
let eventSource,profileState=null,coreEvents;
const libraryStates=new Map(),libraryRequests=new Set();let accountKey;
function findCoreEvents(){
 for(const node of [document.getElementById('app'),...all(document,'[class*="horizontal-nav-bar-container-"] *').slice(0,100)]){
  const key=node&&Object.keys(node).find(k=>k.startsWith('__reactFiber$'));
  for(let f=key&&node[key],i=0;f&&i<60;f=f.return,i++)for(let d=f.dependencies?.firstContext,j=0;d&&j<20;d=d.next,j++){
   const v=d.memoizedValue,c=v?.core||v;if(c?.transport===transport&&typeof c.on==='function')return c;
  }
 }return null;
}
function libraryPayload(meta){
 // UI props contain callbacks; Cinemeta and continue-watching records omit core fields.
 // Send the core MetaItem schema, never React props or a LibraryItem record.
 const id=meta.id||meta._id;
 if(typeof id!=='string'||!id.trim()||typeof meta.type!=='string'||!meta.type.trim()||typeof meta.name!=='string'||!meta.name.trim())throw new Error(t('This title is missing its ID, type or name. Open its details and try again.','بيانات العمل ناقصة (المعرف أو النوع أو الاسم). افتح تفاصيله ثم أعد المحاولة.'));
 const text=k=>typeof meta[k]==='string'?meta[k]:null;
 const hints=meta.behaviorHints||{};
 const payload={id,type:meta.type,name:meta.name,description:text('description'),logo:text('logo'),background:text('background'),poster:text('poster'),posterShape:['poster','square','landscape'].includes(meta.posterShape)?meta.posterShape:'poster',releaseInfo:text('releaseInfo'),runtime:text('runtime'),released:null,
  links:Array.isArray(meta.links)?meta.links.filter(x=>x&&typeof x.name==='string'&&typeof x.category==='string'&&typeof x.url==='string').map(({name,category,url})=>({name,category,url})):[],
  trailerStreams:[],videos:[],behaviorHints:{defaultVideoId:typeof hints.defaultVideoId==='string'?hints.defaultVideoId:null,featuredVideoId:typeof hints.featuredVideoId==='string'?hints.featuredVideoId:null,hasScheduledVideos:hints.hasScheduledVideos===true}};
 if(meta.released&&Number.isFinite(Date.parse(meta.released)))payload.released=new Date(meta.released).toISOString();
 return payload;
}
function bindCoreEvents(){const next=findCoreEvents();if(next===coreEvents)return;coreEvents?.off?.('state',schedule);coreEvents=next;coreEvents?.on('state',schedule)}

const cache=new Map(),pending=new Map(),cards=new WeakMap(),queue=[];let running=0;
const ar=()=>/^(ar|ara)(?:[-_]|$)/i.test(window.GalaxyMetadata?.getLanguage()||language||document.documentElement.lang);
const t=(en,arabic)=>ar()?arabic:en;
function findTransport(){
 if(window.core?.transport?.getState)return window.core.transport;if(window.core?.getState)return window.core;
 for(const node of [document.getElementById('app'),...all(document,'[class*="horizontal-nav-bar-container-"] *,[class*="board-content-"] > *,[class*="settings-container-"] *').slice(0,160)]){
  const key=node&&Object.keys(node).find(k=>k.startsWith('__reactFiber$'));
  for(let f=key&&node[key],i=0;f&&i<60;f=f.return,i++)for(let d=f.dependencies?.firstContext,j=0;d&&j<20;d=d.next,j++){const v=d.memoizedValue;if(v?.core?.transport?.getState)return v.core.transport;if(v?.transport?.getState)return v.transport}
 }
 return null;
}
function applyLanguage(value){
 if(typeof value!=='string'||!value)return;
 window.GalaxyMetadata?.setLanguage(value);const html=document.documentElement,dir=window.GalaxyMetadata?.direction(value)||(/^(ar|ara|he|heb|fa|fas|ur|urd)(?:[-_]|$)/i.test(value)?'rtl':'ltr'),changed=language!==value||html.dataset.galaxyDirection!==dir;
 language=value;if(html.dir!==dir)html.dir=dir;if(html.lang!==value)html.lang=value;
 html.dataset.galaxyDirection=dir;
 if(changed){renderVersion++;heroKey='';for(const rail of all(document,'.galaxy-detail-rail,[data-galaxy-home-rail]'))rail.scrollLeft=0;window.dispatchEvent(new CustomEvent('galaxy-language-changed',{detail:{language:value,direction:dir}}));schedule()}
}
function coreEvent(event){if(event?.event==='SettingsUpdated'&&event.args?.settings?.interfaceLanguage)applyLanguage(event.args.settings.interfaceLanguage)}
function bindTransport(next){if(next===transport)return;if(eventSource?.off)eventSource.off('CoreEvent',coreEvent);transport=next;eventSource=next;if(next?.on)next.on('CoreEvent',coreEvent)}
// Enrichment adds facts/artwork without replacing the selected addon's title.
function mergeAddonMetadata(meta,extra){return {...meta,...extra,name:typeof meta.name==='string'&&meta.name.trim()?meta.name:extra.name}}
function load(meta){
 const id=meta?.id||meta?._id,type=meta?.type;if(!/^tt\d+$/.test(id||'')||!['movie','series'].includes(type))return Promise.resolve(window.GalaxyMetadata?.get(meta||{})||meta||{});
 const key=type+'/'+id;if(cache.has(key))return Promise.resolve(window.GalaxyMetadata?.get(mergeAddonMetadata(meta,cache.get(key)))||mergeAddonMetadata(meta,cache.get(key)));if(pending.has(key))return pending.get(key).then(extra=>window.GalaxyMetadata?.get(mergeAddonMetadata(meta,extra))||(mergeAddonMetadata(meta,extra)));
 // Bounded metadata queue: only cards entering the viewport are enriched.
 const promise=new Promise(resolve=>queue.push({key,resolve}));pending.set(key,promise);pump();return promise.then(extra=>window.GalaxyMetadata?.get(mergeAddonMetadata(meta,extra))||(mergeAddonMetadata(meta,extra)));
}
function pump(){while(running<4&&queue.length){const {key,resolve}=queue.shift();running++;fetch('https://v3-cinemeta.strem.io/meta/'+key+'.json',{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000)}).then(r=>r.ok?r.json():null).then(data=>{const meta=data?.meta;const value=meta?.id===key.split('/')[1]?meta:{};cache.set(key,value);if(cache.size>300)cache.delete(cache.keys().next().value);resolve(value)}).catch(()=>{cache.set(key,{});resolve({})}).finally(()=>{pending.delete(key);running--;pump()})}}
function sourceMeta(node,row,index){
 const cat=props(row,p=>p.catalog)?.catalog,items=cat?.items||cat?.content?.content;
 const item=Array.isArray(items)?items[index]:null;
 const own=props(node,p=>typeof p.name==='string'&&(p.poster!==undefined||p.deepLinks));
 const m={...(item||{}),...(own||{})};
 if(!m.id)m.id=m._id;
 const href=node.getAttribute('href')||m.deepLinks?.metaDetailsVideos||m.deepLinks?.metaDetailsStreams||'';
 const route=href.match(/#\/(?:detail|metadetails)\/([^/]+)\/([^/?]+)/);
 if(route){try{if(!m.type)m.type=decodeURIComponent(route[1]);if(!m.id)m.id=decodeURIComponent(route[2])}catch{}}
 if(typeof m.inLibrary!=='boolean'&&m._id&&('removed' in m||'temp' in m))m.inLibrary=!m.removed&&!m.temp;
 if(!m.name)m.name=node.getAttribute('title')||'';
 if(!m.type){const href=node.getAttribute('href')||m.deepLinks?.metaDetailsVideos||m.deepLinks?.metaDetailsStreams||'';m.type=href.match(/#\/detail\/([^/]+)\//)?.[1]}
 return m;
}
function detailsBody(node,meta,continued){
 if(!node.isConnected)return;
 let box=q(node,'.galaxy-poster-details');if(!box){box=el('div','galaxy-poster-details');node.append(box)}
 const key=JSON.stringify([meta.id,meta.name,meta.imdbRating,meta.releaseInfo,meta.year,meta.quality,meta.behaviorHints?.videoQuality,meta.genres,meta.videoId,meta.state?.video_id,continued]);if(box.dataset.signature===key)return;box.dataset.signature=key;box.replaceChildren();
 const title=el('strong','galaxy-poster-title',meta.name);title.dir='auto';box.append(title);
 if(continued){const video=meta.videoId||meta.state?.video_id||meta.deepLinks?.metaDetailsStreams?.split('/').pop();let text=meta.video?.season!=null&&meta.video?.episode!=null?`S${meta.video.season} · E${meta.video.episode}`:'';try{const match=decodeURIComponent(video||'').match(/^tt\d+:(\d+):(\d+)$/);if(match)text=`S${match[1]} · E${match[2]}`}catch{}if(text)box.append(el('small','galaxy-poster-episode',text))}
 const info=el('div','galaxy-poster-facts'),rating=score(meta.imdbRating);if(rating){const badge=el('span','galaxy-poster-rating','★ '+rating);badge.title='IMDb';badge.dir='ltr';info.append(badge)}
 const year=String(meta.releaseInfo||meta.year||'').match(/\b(?:19|20)\d{2}\b/)?.[0];if(year)info.append(el('span','galaxy-poster-year',year));
 // Display quality only when the catalog actually reports it; never invent HD/4K.
 const quality=meta.quality||meta.behaviorHints?.videoQuality;if(typeof quality==='string'&&quality)info.append(el('span','galaxy-poster-quality',quality));
 box.append(info);
 if(!continued){const genres=el('div','galaxy-poster-genres');for(const g of (Array.isArray(meta.genres)?meta.genres:[]).slice(0,2)){if(typeof g==='string')genres.append(el('span',null,g))}box.append(genres)}
}
const railGap=rail=>parseFloat(getComputedStyle(rail).columnGap)||parseFloat(getComputedStyle(rail).gap)||20;
const railPage=rail=>rail.clientWidth+railGap(rail);
function fitHomeRail(rail){
 const width=rail.clientWidth;if(!width)return;
 const continued=!!rail.closest('[class*="continue-watching-row-"]'),gap=railGap(rail);
 const preferred=window.innerWidth<760?170:continued?Math.max(210,Math.min(290,window.innerWidth*.14)):Math.max(180,Math.min(240,window.innerWidth*.12));
 const columns=Math.max(1,Math.floor((width+gap)/(preferred+gap)));
 const size=((width-gap*(columns-1))/columns)+'px';
 if(rail.style.getPropertyValue('--galaxy-home-card-width')!==size)rail.style.setProperty('--galaxy-home-card-width',size);
}
// Hide only horizontally clipped cards; keep their layout slots and native scroll actions.
let edgeFrame;
function schedulePosterEdges(){
 if(dead||edgeFrame!==undefined)return;
 edgeFrame=requestAnimationFrame(()=>{
  edgeFrame=undefined;if(dead)return;
  for(const rail of all(document,'[data-galaxy-home-rail]'))fitHomeRail(rail);
  const updates=[];
  for(const rail of all(document,'[data-galaxy-home-rail]')){
   const bounds=rail.getBoundingClientRect();if(!rail.clientWidth)continue;
   const left=bounds.left+rail.clientLeft,right=left+rail.clientWidth;
   for(const card of Array.from(rail.children).filter(n=>n.hasAttribute('data-galaxy-poster'))){
    const box=card.getBoundingClientRect();
    updates.push([card,box.width<=rail.clientWidth&&(box.left<left-.5||box.right>right+.5)]);
   }
  }
  for(const [card,clipped] of updates)card.toggleAttribute('data-galaxy-clipped-card',clipped);
 });
}
let visibility;
function enhanceCard(node,row,index){
 const meta=sourceMeta(node,row,index),continued=row.className.includes('continue-watching-row-');
 const stamp=JSON.stringify([meta.id,meta.name,meta.imdbRating,meta.releaseInfo,meta.videoId,renderVersion]);
 if(cards.get(node)===stamp)return;cards.set(node,stamp);node.dataset.galaxyPoster='';const known=cache.get(meta.type+'/'+(meta.id||meta._id)),initial=known?mergeAddonMetadata(meta,known):meta;detailsBody(node,window.GalaxyMetadata?.get(initial)||initial,continued);
 node._galaxyMetadata={meta,continued};if(visibility)visibility.observe(node);else enrich(node);
}
function enrich(node){const data=node._galaxyMetadata;if(!data)return;const id=data.meta.id;load(data.meta).then(meta=>{if(!dead&&node.isConnected&&node._galaxyMetadata?.meta.id===id)detailsBody(node,{...meta,deepLinks:data.meta.deepLinks,videoId:data.meta.videoId,state:data.meta.state},data.continued)})}
function go(meta,node){const target=meta.deepLinks?.metaDetailsVideos||meta.deepLinks?.metaDetailsStreams;if(node?.isConnected)node.click();else if(typeof target==='string'&&/^#\/(detail|metadetails)\//.test(target))location.hash=target;else if(meta.id&&meta.type)location.hash='#/detail/'+encodeURIComponent(meta.type)+'/'+encodeURIComponent(meta.id)}
function button(label,cls,action){const b=el('button',cls,label);b.type='button';b.onclick=action;return b}
// Verified 3840 x 2160 landscape artwork from this title's official Crunchyroll page.
// Match the anime identity, never use it as a generic background for other works.
const cheatFuyoBanner='https://imgsrv.crunchyroll.com/catalog/crunchyroll/1f72e4937240317e52af0568fb47cb88.png';
function featuredBackdrop(meta){
 if(meta?.type!=='series')return null;
 const name=String(meta.name||'').normalize('NFKC').toLowerCase().trim();
 const romaji='tsuihou sareta cheat fuyo majutsushi wa kimama na second life wo ouka suru';
 const english='the laid-off cheat-granting mage enjoys a second lease on life';
 const matches=prefix=>name===prefix||name.startsWith(prefix+'.')||name.startsWith(prefix+':');
 return /^(?:anilist:207329|mal:63431)$/.test(meta.id||'')||matches(romaji)||matches(english)?cheatFuyoBanner:null;
}
function heroTitle(name){const title=el('h1',null,name);title.dir='auto';title.title=name;return title}
async function renderHero(container,entries){
 if(!entries.length){hero?.remove();hero=null;heroKey='';return}
 const key=JSON.stringify([entries.slice(0,4).map(e=>e.meta.id||e.meta.name),slide,renderVersion]);if(heroHost===container&&hero?.isConnected&&heroKey===key)return;
 heroHost=container;heroKey=key;slides=entries.slice(0,4);slide=Math.min(slide,slides.length-1);
 if(!hero?.isConnected||hero.parentElement!==container){hero?.remove();hero=el('section','galaxy-home-hero');hero.setAttribute('aria-roledescription',t('carousel','عارض أعمال'));container.prepend(hero)}
 const active=slides[slide],known=cache.get(active.meta.type+'/'+(active.meta.id||active.meta._id)),initial=known?mergeAddonMetadata(active.meta,known):active.meta;
 const meta=window.GalaxyMetadata?.get(initial)||initial;
 // Paint provider metadata/poster immediately; slow enrichment must not leave an empty banner.
 void load(active.meta).then(ready=>{if(!dead&&heroKey===key&&hero?.isConnected&&JSON.stringify(ready)!==JSON.stringify(meta)){heroKey='';schedule()}});
 if(dead||heroKey!==key||!hero?.isConnected)return;
 const signature=JSON.stringify([accountKey,slide,language,meta.id,meta.name,meta.description,meta.genres,meta.background,meta.logo,meta.poster,meta.imdbRating,meta.releaseInfo,meta.runtime,meta.inLibrary]);
 if(hero.dataset.contentSignature===signature)return;
 const retainedArtwork=hero.dataset.workId===String(meta.id)?q(hero,'.galaxy-home-backdrop'):null;hero.dataset.workId=String(meta.id);
 hero.dataset.contentSignature=signature;hero.replaceChildren();hero.setAttribute('aria-label',meta.name||t('Featured','عمل مميز'));
 const verifiedArt=featuredBackdrop(active.meta),art=verifiedArt||safeImage(meta.background)||safeImage(active.meta.background),fallback=safeImage(meta.poster)||safeImage(active.meta.poster),currentHero=hero;
 const artStatus=el('span','galaxy-home-art-status',t('Loading artwork…','جارٍ تحميل صورة العمل…'));artStatus.setAttribute('role','status');hero.append(artStatus);
 if(art||fallback){
  const retained=retainedArtwork&&(retainedArtwork.getAttribute('src')===art||retainedArtwork.hasAttribute('data-poster-fallback')&&retainedArtwork.getAttribute('src')===fallback&&retainedArtwork.dataset.primaryArt===(art||''));
  const img=retained?retainedArtwork:el('img','galaxy-home-backdrop');img.alt='';img.decoding='async';img.setAttribute('fetchpriority','high');if(!retained)img.style.opacity='0';
  const provisional=!retained&&retainedArtwork?.naturalWidth>0?retainedArtwork:null;if(provisional)hero.append(provisional);
  img.toggleAttribute('data-verified-backdrop',!!verifiedArt&&!img.hasAttribute('data-poster-fallback'));img.dataset.primaryArt=art||'';if(!art)img.dataset.posterFallback='';
  img.onload=()=>{if(!img.isConnected)return;provisional?.remove();img.style.opacity='1';currentHero.dataset.artState='ready';artStatus.textContent=img.hasAttribute('data-poster-fallback')?t('Work poster','ملصق العمل'):'';artStatus.hidden=!img.hasAttribute('data-poster-fallback')};
  img.onerror=()=>{if(!img.isConnected)return;if(fallback&&!img.hasAttribute('data-poster-fallback')&&img.getAttribute('src')!==fallback){img.removeAttribute('data-verified-backdrop');img.dataset.posterFallback='';img.src=fallback}else{img.remove();currentHero.dataset.artState='unavailable';artStatus.hidden=false;artStatus.textContent=t('Artwork unavailable','صورة العمل غير متاحة')}};
  currentHero.dataset.artState='loading';hero.append(img);if(!retained)img.src=art||fallback;if(img.complete&&img.naturalWidth>0)img.onload();
 }else{hero.dataset.artState='unavailable';artStatus.textContent=t('Artwork unavailable','صورة العمل غير متاحة')}

 const content=el('div','galaxy-home-hero-copy'),logo=meta._galaxyLocalized?null:safeImage(meta.logo);
 if(logo){const img=el('img','galaxy-home-logo');img.src=logo;img.alt=meta.name;img.onerror=()=>img.replaceWith(heroTitle(meta.name));content.append(img)}else content.append(heroTitle(meta.name));
 const facts=el('div','galaxy-home-hero-facts'),year=String(meta.releaseInfo||'').match(/\b(?:19|20)\d{2}\b/)?.[0];
 if(year)facts.append(el('span',null,year));if(meta.runtime)facts.append(el('span',null,meta.runtime));if(score(meta.imdbRating)){const rating=el('span','galaxy-home-hero-rating',score(meta.imdbRating)+' IMDb');rating.dir='ltr';facts.append(rating)}
 const genres=Array.isArray(meta.genres)?meta.genres.filter(g=>typeof g==='string').slice(0,3):[];for(const g of genres)facts.append(el('span',null,g));content.append(facts);
 if(meta.description){const p=el('p','galaxy-home-summary',meta.description);p.dir='auto';content.append(p)}
 const actions=el('div','galaxy-home-actions');actions.append(button('▶  '+t('Watch now','شاهد الآن'),'galaxy-home-watch',()=>{const play=q(active.node,'[class*="play-icon-layer-"]');if(play)play.click();else go(active.meta,active.node)}));
 const libraryKey=String(accountKey||'guest')+'/'+meta.type+'/'+meta.id;
 let inLibrary=libraryStates.has(libraryKey)?libraryStates.get(libraryKey):!!meta.inLibrary,libraryVersion=0;
 const status=el('span','galaxy-home-library-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const library=button('','galaxy-home-library',async()=>{
  if(libraryRequests.has(libraryKey))return;
  libraryRequests.add(libraryKey);libraryVersion++;library.disabled=true;status.textContent='';
  let sourceError,stopListening=()=>{};
  try{
   if(!transport?.dispatch)throw new Error(t('Library connection is not ready. Please try again shortly.','الاتصال بالمكتبة غير جاهز. أعد المحاولة بعد قليل.'));
   const ctx=await transport.getState('ctx');
   const user=ctx?.profile?.auth?.user?._id||'guest';
   if(String(accountKey||'guest')!==user)throw new Error(t('Your account changed. Please try again.','تغيّر الحساب. أعد المحاولة.'));
   const payload=libraryPayload(meta),next=!inLibrary;
   // Core API/storage errors arrive separately from the dispatch promise.
   const onError=(source,error)=>{if(/Library|UserAuthenticated/.test(source?.event||'')){
    sourceError=new Error(error?.message||t('Could not save the library change.','تعذّر حفظ تعديل المكتبة.'));
    status.textContent=t('Library error: ','خطأ في المكتبة: ')+sourceError.message;
    void syncLibrary();
   }};
   const errorBus=coreEvents;errorBus?.on('error',onError);stopListening=()=>errorBus?.off?.('error',onError);
   let timeout;
   try{await Promise.race([transport.dispatch({action:'Ctx',args:{action:next?'AddToLibrary':'RemoveFromLibrary',args:next?payload:payload.id}}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error(t('No response from the library. Check the library before retrying.','لم يصل رد من المكتبة. راجع المكتبة قبل إعادة المحاولة.'))),10000)})])}finally{clearTimeout(timeout)}
   if(sourceError)throw sourceError;
   inLibrary=next;libraryStates.set(libraryKey,next);paintLibrary();
   status.textContent=ctx?.profile?.auth?t('Library updated on this device; account sync is handled by Stremio.','حُدّثت المكتبة على هذا الجهاز؛ يتولى Stremio مزامنة الحساب.'):t('Saved on this device. Sign in to sync across devices.','حُفظ على هذا الجهاز. سجّل الدخول للمزامنة بين الأجهزة.');
   // Keep asynchronous storage/network errors visible after the click completes.
   setTimeout(stopListening,15000);
  }catch(error){stopListening();status.textContent=t('Could not update library: ','تعذّر تعديل المكتبة: ')+(error?.message||t('Please try again.','أعد المحاولة.'))}
  finally{libraryRequests.delete(libraryKey);library.disabled=false;if(!library.isConnected){heroKey='';schedule()}}
 });
 function paintLibrary(){library.textContent=(inLibrary?'✓  ':'＋  ')+(inLibrary?t('In Library','في المكتبة'):t('Add to Library','أضف إلى المكتبة'));library.setAttribute('aria-pressed',String(inLibrary))}
 async function syncLibrary(){
  const version=libraryVersion;
  try{
   const state=await transport?.getState('library');
   const item=state?.catalog?.find?.(x=>(x._id||x.id)===meta.id&&x.type===meta.type);
   const details=await transport?.getState('meta_details');
   const ready=details?.metaItem?.content?.type==='Ready'?details.metaItem.content.content:null;
   const known=item?!item.removed&&!item.temp:ready?.id===meta.id&&ready.type===meta.type?ready.inLibrary:undefined;
   if(version===libraryVersion&&typeof known==='boolean'){inLibrary=known;libraryStates.set(libraryKey,known);paintLibrary()}
  }catch{/* An unloaded model is not evidence that a title is absent. */}
 }
 paintLibrary();library.disabled=libraryRequests.has(libraryKey);actions.append(library,status);content.append(actions);hero.append(content);void syncLibrary();

 const dots=el('div','galaxy-home-dots');for(let i=0;i<slides.length;i++){const b=button('','',()=>{slide=i;heroKey='';schedule()});b.setAttribute('aria-label',t('Show ','عرض ')+slides[i].meta.name);if(i===slide)b.setAttribute('aria-current','true');dots.append(b)}hero.append(dots);
 for(const [name,delta,text] of [['previous',-1,'‹'],['next',1,'›']]){const b=button(text,'galaxy-home-'+name,()=>{slide=(slide+delta+slides.length)%slides.length;heroKey='';schedule()});b.setAttribute('aria-label',name==='next'?t('Next featured title','العمل التالي'):t('Previous featured title','العمل السابق'));hero.append(b)}
}
function home(){
 const isHome=/^#?\/(?:board)?(?:[?]|$)/.test(location.hash||'#/');
 const container=isHome?q(document,'[class*="board-content-"]:not([class*="board-content-container-"])'):null;
 if(!container){hero?.remove();hero=null;heroHost=null;heroKey='';document.documentElement.removeAttribute('data-galaxy-home');return}
 document.documentElement.dataset.galaxyHome='';container.dataset.galaxyHomeContent='';
 const rows=all(container,'[class*="meta-row-container-"]'),featured=[];
 for(const row of rows){const rail=q(row,'[class*="meta-items-container-"]');if(!rail)continue;
  if(!rail.hasAttribute('data-galaxy-home-rail')){rail.dataset.galaxyHomeRail='';rail.tabIndex=0;rail.setAttribute('aria-label',q(row,'[class*="title-container-"]')?.textContent||t('Titles','الأعمال'));rail.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key)||e.target!==rail)return;e.preventDefault();rail.scrollBy({left:(e.key==='ArrowRight'?1:-1)*railPage(rail),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})})}
  const items=Array.from(rail.children).filter(n=>n.matches('[class*="meta-item-container-"]'));
  items.forEach((node,i)=>{enhanceCard(node,row,i);if(featured.length<4&&row.className.includes('continue-watching-row-'))featured.push({node,meta:sourceMeta(node,row,i)})});
  if(!q(row,'.galaxy-home-row-controls')){const controls=el('div','galaxy-home-row-controls');for(const [delta,label] of [[-1,'‹'],[1,'›']]){const b=button(label,'',()=>rail.scrollBy({left:delta*railPage(rail),behavior:'smooth'}));b.setAttribute('aria-label',delta<0?t('Scroll left','تمرير لليسار'):t('Scroll right','تمرير لليمين'));controls.append(b)}q(row,'[class*="header-container-"]')?.append(controls)}
 }
 if(!featured.length&&rows.length){const row=rows[0];all(row,'[data-galaxy-poster]').slice(0,4).forEach((node,i)=>featured.push({node,meta:sourceMeta(node,row,i)}))}
 schedulePosterEdges();
 void renderHero(container,featured);
}
// Catalogs share Home card decoration without replacing React-owned controls.
function catalogCards(route,selector,flag,gridFlag){
 const active=route.test(location.hash),html=document.documentElement;
 if(!active){
  html.removeAttribute(flag);
  for(const grid of all(document,'['+gridFlag+']')){
   for(const node of all(grid,'[data-galaxy-poster]')){visibility?.unobserve(node);cards.delete(node);delete node._galaxyMetadata;node.removeAttribute('data-galaxy-poster');q(node,'.galaxy-poster-details')?.remove()}
   grid.removeAttribute(gridFlag);
  }return;
 }
 html.setAttribute(flag,'');
 for(const grid of all(document,selector)){
  grid.setAttribute(gridFlag,'');
  Array.from(grid.children).filter(n=>n.matches('[class*="meta-item-container-"]')).forEach((node,index)=>enhanceCard(node,grid,index));
 }
}
function discover(){catalogCards(/^#\/discover(?:[/?]|$)/,'[class*="discover-container-"] [class*="catalog-container-"] [class*="meta-items-container-"]','data-galaxy-discover','data-galaxy-discover-grid')}
function library(){catalogCards(/^#\/library(?:[/?]|$)/,'[class*="library-container-"] [class*="library-content-"] [class*="meta-items-container-"]','data-galaxy-library','data-galaxy-library-grid')}
function schedule(){if(dead||job!==undefined)return;job=setTimeout(()=>{job=undefined;void refresh()},40)}
async function refresh(){
 if(dead||busy)return;busy=true;try{const next=findTransport();if(next)bindTransport(next);if(transport){try{const ctx=await transport.getState('ctx');profileState=ctx;const nextAccount=ctx?.profile?.auth?.user?._id||'guest';if(accountKey!==nextAccount){accountKey=nextAccount;libraryStates.clear();heroKey=''}bindCoreEvents();applyLanguage(ctx?.profile?.settings?.interfaceLanguage||document.documentElement.lang||navigator.language)}catch{}}else applyLanguage(document.documentElement.lang||navigator.language);if(!dead){home();discover();library()}}finally{busy=false}
}
function start(){if(!document.documentElement||observer)return;const style=el('style');style.id='galaxy-layout-style';style.textContent=css;document.documentElement.append(style);
 if(window.IntersectionObserver)visibility=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){visibility.unobserve(entry.target);enrich(entry.target)}},{rootMargin:'100px'});
 observer=new MutationObserver(records=>{if(records.every(r=>r.target.closest?.('.galaxy-home-hero,.galaxy-poster-details,.galaxy-home-row-controls')))return;schedule()});observer.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('scroll',schedulePosterEdges,true);window.addEventListener('resize',schedulePosterEdges);
 timer=setInterval(()=>{if(!document.hidden)schedule()},900);void refresh();
}
function metadataUpdated(){renderVersion++;heroKey='';schedule()}
window.addEventListener('galaxy-metadata-updated',metadataUpdated);
window.GalaxyLayout={refresh,props,score,getTransport:()=>transport,getLanguage:()=>window.GalaxyMetadata?.getLanguage()||language,destroy(){dead=true;window.removeEventListener('galaxy-metadata-updated',metadataUpdated);if(edgeFrame!==undefined)cancelAnimationFrame(edgeFrame);document.removeEventListener('scroll',schedulePosterEdges,true);window.removeEventListener('resize',schedulePosterEdges);all(document,'[data-galaxy-clipped-card]').forEach(n=>n.removeAttribute('data-galaxy-clipped-card'));clearInterval(timer);clearTimeout(job);observer?.disconnect();visibility?.disconnect();eventSource?.off?.('CoreEvent',coreEvent);coreEvents?.off?.('state',schedule);hero?.remove();all(document,'.galaxy-poster-details,.galaxy-home-row-controls').forEach(n=>n.remove());all(document,'[data-galaxy-poster]').forEach(n=>n.removeAttribute('data-galaxy-poster'));all(document,'[data-galaxy-home-rail]').forEach(n=>{n.style.removeProperty('--galaxy-home-card-width');n.removeAttribute('data-galaxy-home-rail')});document.getElementById('galaxy-layout-style')?.remove();window.removeEventListener('hashchange',schedule);document.removeEventListener('DOMContentLoaded',start);document.documentElement.removeAttribute('data-galaxy-home');document.documentElement.removeAttribute('data-galaxy-discover');document.documentElement.removeAttribute('data-galaxy-library');all(document,'[data-galaxy-discover-grid],[data-galaxy-library-grid]').forEach(n=>{n.removeAttribute('data-galaxy-discover-grid');n.removeAttribute('data-galaxy-library-grid')});delete window.GalaxyLayout}};
window.addEventListener('hashchange',schedule);if(document.documentElement)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
})(__GALAXY_LAYOUT_CSS__);
