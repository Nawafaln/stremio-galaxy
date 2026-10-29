/* Stremio Galaxy modification, GPL-3.0. Standalone, dependency-free.
 * Native host calls GalaxyPosterHover.install(config). Chrome testing uses the same API.
 * Actual DOM verified on web.stremio.com: a.meta-item-link-* > .poster-container-*.
 */
(() => {
  'use strict';
  if (window.top !== window || window.GalaxyPosterHover) return;
  const knownOrigins = ['https://web.stremio.com', 'https://stremio.zarg.me', 'https://zaarrg.github.io'];
  // Both inspected UI builds: official link class and community card class.
  const selector = 'a[class*="meta-item-link-"][href],a[class*="meta-item-container-"][href]';
  const cache = new Map(), ageCache = new Map(), malCache=new Map();
  let mappings, mappingRetry=0, malRetry=0, lastMalStart=0;
  let config = {enabled: false, animeRatings:true, omdbApiKey: ''}, active, timer, controller, epoch = 0;
  let host, panel, surface, originalPosition, ageUnavailable = false;
  const listeners = [];
  let exitTimer, finishExit, showFrame;
  function parseHref(href) {
    try {
      const parts=new URL(href,location.href).hash.split('/');
      if(parts[0]!=='#'||parts[1]!=='detail'||!['movie','series','anime'].includes(parts[2]))return null;
      const id=decodeURIComponent(parts[3]||'');
      if(!/^(?:tt\d+|(?:kitsu|mal|myanimelist|anilist):[1-9]\d*)$/.test(id))return null;
      const type=parts[2];if(type==='anime'&&id.startsWith('tt'))return null;
      return {type,id,key:`${type}/${id}`};
    } catch { return null; }
  }
  function stop(immediate=false) {
    ++epoch;clearTimeout(timer);clearTimeout(exitTimer);
    cancelAnimationFrame(showFrame);
    controller?.abort();controller=undefined;active=undefined;
    if(finishExit){const finish=finishExit;finishExit=undefined;finish();}
    const outgoing=surface, previousPosition=originalPosition;
    surface=undefined;originalPosition=undefined;
    if(host)host.dataset.open='0';
    const finish=()=>{
      if(host)host.style.display='none';
      if(outgoing && previousPosition!==undefined)outgoing.style.position=previousPosition;
      finishExit=undefined;
    };
    if(immediate===true || !host || host.style.display==='none' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)finish();
    else {finishExit=finish;exitTimer=setTimeout(finish,440);}
  }
  function position() {
    // Keep the outgoing card positioned until its exit finishes.
    if(active && !active.isConnected)stop(true);
  }
  function ensurePanel() {
    const poster = active.querySelector('[class*="poster-container-"]');
    if (surface !== poster) {
      surface = poster;
      if (getComputedStyle(poster).position === 'static' || !getComputedStyle(poster).position) {
        originalPosition = poster.style.position;
        poster.style.position = 'relative';
      }
    }
    if (!host) {
      host=document.createElement('div');host.id='galaxy-poster-hover';
      // Shadow DOM isolates the card. Absolute placement keeps it INSIDE the image.
      const shadow=host.attachShadow({mode:'open'}), style=document.createElement('style');
      style.textContent=`:host{all:initial;position:absolute;display:none;left:0;right:0;bottom:0;box-sizing:border-box;width:100%;max-height:100%;padding:5px;overflow:hidden;border-radius:inherit;z-index:3;pointer-events:none!important;opacity:0;transform:translateY(24px);visibility:hidden;transition:transform 420ms cubic-bezier(.22,1,.36,1),opacity 320ms ease,visibility 0s 420ms}
        :host([data-open="1"]){opacity:1;transform:translateY(0);visibility:visible;transition:transform 420ms cubic-bezier(.22,1,.36,1),opacity 320ms ease,visibility 0s}
        .card{box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 4px;align-items:center;width:100%;overflow:hidden;padding:7px;
          background-color:rgba(8,6,21,.52);backdrop-filter:blur(7px);background-image:var(--galaxy-information-background,linear-gradient(145deg,rgba(16,9,31,.92),rgba(4,7,19,.9)));
          background-size:cover;background-position:center 62%;background-repeat:no-repeat;
          color:#f5f3fa;border:1px solid rgba(174,135,229,.45);border-radius:7px;box-shadow:inset 0 1px 0 #ffffff0b;font:10px/1.45 "Segoe UI",sans-serif;text-align:start;overflow-wrap:anywhere;pointer-events:none}
        .row{display:flex;align-items:center;gap:3px;min-width:0}.label{color:#c4b5d9;font-size:8px;flex-shrink:0}.value{unicode-bidi:plaintext;min-width:0}
        .year{grid-column:1;grid-row:1;direction:ltr;justify-self:start}.year .label,.genres .label{display:none}.year .value{white-space:nowrap;font-size:10px;font-weight:600;font-variant-numeric:tabular-nums;color:#e9e2f4}
        .ratings{grid-column:1/-1;grid-row:2;display:flex;justify-content:flex-end;gap:5px;flex-wrap:wrap}.rating{justify-self:end;direction:ltr;gap:3px;padding:2px 4px;background:rgba(251,207,108,.1);border:1px solid rgba(251,207,108,.18);border-radius:4px;color:#ffda85;white-space:nowrap}.rating .label{color:#eacb88;font-size:7px;letter-spacing:.1px}.mal-rating .label{font-size:9px;font-weight:600}.rating .value{font-size:10px;font-weight:700;font-variant-numeric:tabular-nums}
        .genres{grid-row:3;grid-column:1/-1;justify-content:center;padding-top:5px;border-top:1px solid rgba(196,172,234,.18);color:#e4ddeb;font-size:9px;line-height:1.45;text-align:center}.genres .value{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;text-wrap:pretty}
        .age{grid-row:4;grid-column:1/-1;justify-content:space-between;padding-top:4px;border-top:1px solid rgba(196,172,234,.12);font-size:9px}
        @media(prefers-reduced-motion:reduce){:host{transition:none!important;transform:none!important}}`;
      panel=document.createElement('div');panel.className='card';panel.setAttribute('role','tooltip');
      shadow.append(style,panel);
    }
    if (host.parentElement !== poster) poster.appendChild(host);
  }
  function render(meta, age) {
    if (!active?.isConnected) return;
    ensurePanel();panel.replaceChildren();
    panel.dir=getComputedStyle(active).direction;
    const ar=(document.documentElement.lang || navigator.language || '').toLowerCase().startsWith('ar') || panel.dir==='rtl';
    const labels=ar?['السنة','التصنيفات','IMDb','التصنيف العمري']:['Year','Genres','IMDb','Age rating'];
    const year=typeof meta.releaseInfo==='string'?meta.releaseInfo.match(/\d{4}(?:\s*[–—-]\s*(?:\d{4})?)?/)?.[0]:null;
    const genres=Array.isArray(meta.genres)?meta.genres.filter(g=>typeof g==='string').slice(0,8).map(g=>g.slice(0,60)).join(ar?'، ':', '):'';
    const rating=scoreValid(meta.imdbRating)?String(meta.imdbRating):null;
    [year,genres,rating,age].forEach((value,i)=>{
      if (!value) return;
      const row=document.createElement('div'),label=document.createElement('span'),text=document.createElement('span');
      row.className='row '+['year','genres','rating','age'][i];label.className='label';text.className='value';
      label.textContent=labels[i];text.textContent=value;row.append(label,text);
      if(i===2){const ratings=document.createElement('div');ratings.className='ratings';ratings.appendChild(row);panel.appendChild(ratings)}else panel.appendChild(row);
    });
    if(scoreValid(meta.malRating)){
      let ratings=panel.querySelector('.ratings');if(!ratings){ratings=document.createElement('div');ratings.className='ratings';panel.appendChild(ratings)}
      const row=document.createElement('div'),label=document.createElement('span'),value=document.createElement('span');row.className='row rating mal-rating';label.className='label';value.className='value';label.textContent='MAL';value.textContent=String(meta.malRating);row.append(label,value);ratings.appendChild(row);
    }
    if(!panel.childElementCount){stop(true);return;}
    if(host.style.display!=='block' || host.dataset.open!=='1'){
      host.dataset.open='0';host.style.display='block';
      // Resolve the starting state before scheduling the entering transition.
      void host.offsetHeight;
      cancelAnimationFrame(showFrame);
      const shownHost=host, shownPoster=active;
      showFrame=requestAnimationFrame(()=>{if(active===shownPoster && shownHost.isConnected)shownHost.dataset.open='1';});
    }
    position();
  }
  async function getJson(url, signal) {
    const response=await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if (!response.ok) {
      const error=new Error('Metadata unavailable');error.status=response.status;throw error;
    }
    return response.json();
  }
  const scoreValid=n=>n!=null&&String(n).trim()&&Number.isFinite(Number(n))&&Number(n)>0&&Number(n)<=10;
  async function malId(item,signal){
    const direct=item.id.match(/^(?:mal|myanimelist):([1-9]\d*)$/);if(direct){const id=Number(direct[1]);return Number.isSafeInteger(id)?id:null;}
    if(!mappings){
      if(Date.now()<mappingRetry)return null;
      try{
        const rows=await getJson('https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json',signal);
        if(signal.aborted||!Array.isArray(rows))return null;
        const index=new Map();
        for(const row of rows){if(!Number.isSafeInteger(row?.mal_id)||row.mal_id<=0)continue;
          const keys=[];
          for(const [field,prefix] of [['kitsu_id','kitsu'],['anilist_id','anilist']])if(Number.isSafeInteger(row[field])&&row[field]>0)keys.push(prefix+':'+row[field]);
          if(Array.isArray(row.imdb_id))keys.push(...row.imdb_id.filter(id=>typeof id==='string'&&/^tt\d+$/.test(id)));
          for(const key of keys){if(!index.has(key))index.set(key,new Set());index.get(key).add(row.mal_id)}
        }
        mappings=index;
      }catch{if(!signal.aborted)mappingRetry=Date.now()+60000;return null}
    }
    const matches=mappings.get(item.id);return matches?.size===1?[...matches][0]:null;
  }
  function delay(ms,signal){return new Promise((resolve,reject)=>{
    if(signal.aborted){reject(new Error('aborted'));return}
    const abort=()=>{clearTimeout(timer);reject(new Error('aborted'))};
    const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve()},ms);signal.addEventListener('abort',abort,{once:true});
  })}
  async function animeMetadata(item,signal){
    if(!config.animeRatings||Date.now()<malRetry)return null;
    const id=await malId(item,signal);if(!id||signal.aborted)return null;
    const stored=malCache.get(id);if(stored&&Date.now()<stored.expires)return stored.meta;
    try{
      await delay(Math.max(0,1100-(Date.now()-lastMalStart)),signal);lastMalStart=Date.now();
      const result=await getJson(`https://jikan.lucashdo.com/v1/anime/${id}`,signal),data=result.data;
      if(signal.aborted||data?.malId!==id)return null;
      if(item.type==='movie'&&data.type!=='Movie')return null;
      if(item.type==='series'&&data.type==='Movie')return null;
      const meta={releaseInfo:String(data.year||data.aired?.from?.match(/^\d{4}/)?.[0]||''),genres:Array.isArray(data.genres)?data.genres.map(g=>g.name).filter(g=>typeof g==='string'):[],ratingSource:'MAL',malRating:scoreValid(data.score)?String(data.score):null};
      malCache.set(id,{expires:Date.now()+86400000,meta});return meta;
    }catch(error){if(!signal.aborted){malRetry=Date.now()+(error.status===429?60000:30000)}return null}
  }
  async function metadata(item,signal) {
    if(!item.id.startsWith('tt'))return animeMetadata(item,signal);
    let meta=cache.get(item.key);
    if(!cache.has(item.key))try {
      const result=await getJson(`https://v3-cinemeta.strem.io/meta/${item.type}/${item.id}.json`,signal);
      meta=result.meta && typeof result.meta==='object' && result.meta.id===item.id?result.meta:null;
      if(signal.aborted)return null;cache.set(item.key,meta);
    }catch(error){if(!signal.aborted)cache.set(item.key,null);else return null}
    // Show IMDb immediately, then add a separately labelled MAL badge when mapped.
    if(meta&&!signal.aborted)render(meta,null);
    const anime=await animeMetadata(item,signal);
    return anime?{...meta,...anime,releaseInfo:meta?.releaseInfo||anime.releaseInfo,genres:meta?.genres?.length?meta.genres:anime.genres}:meta;
  }
  async function ageRating(item,signal) {
    if (!item.id.startsWith('tt') || !config.omdbApiKey || ageUnavailable) return null;
    if (ageCache.has(item.id)) return ageCache.get(item.id);
    try {
      const url=new URL('https://www.omdbapi.com/');url.searchParams.set('apikey',config.omdbApiKey);url.searchParams.set('i',item.id);
      const result=await getJson(url.href,signal);
      if (signal.aborted) return null;
      if (result.Response==='False' && /api key|limit|quota/i.test(result.Error || '')) ageUnavailable=true;
      const age=result.Response==='True' && result.imdbID===item.id && typeof result.Rated==='string' && result.Rated!=='N/A'?result.Rated.slice(0,40):null;
      ageCache.set(item.id,age);return age;
    } catch (error) {
      if (!signal.aborted) {
        if (error.status===401 || error.status===403 || error.status===429) ageUnavailable=true;
        ageCache.set(item.id,null);
      }
      return null;
    }
  }
  async function load(item,poster,token) {
    const request=new AbortController();controller=request;
    const timeout=setTimeout(()=>request.abort(),15000);
    const current=()=>token===epoch && active===poster && poster.isConnected && !request.signal.aborted;
    try {
      const meta=await metadata(item,request.signal);
      if (!current() || !meta) return;
      render(meta,null);
      const age=await ageRating(item,request.signal);
      if(current() && age) render(meta,age);
    } finally {clearTimeout(timeout);if(controller===request)controller=undefined;}
  }
  function over(event) {
    if (!config.enabled || !(event.target instanceof Element)) return;
    const poster=event.target.closest(selector);
    if (poster===active) return;
    stop(true);
    if (!poster?.querySelector('[class*="poster-container-"]')) return;
    // Enhanced cards already show metadata below the artwork; never cover it twice.
    if (poster.hasAttribute('data-galaxy-poster') || poster.querySelector('.galaxy-poster-details')) return;
    const item=parseHref(poster.getAttribute('href'));if(!item)return;
    active=poster;const token=epoch;
    timer=setTimeout(()=>{if(active===poster && poster.isConnected)void load(item,poster,token);},300);
  }
  function out(event) {if(active && !active.contains(event.relatedTarget))stop();}
  function move(event) {if(!active)over(event);else position();}
  function listen(target,event,fn,options) {target.addEventListener(event,fn,options);listeners.push(()=>target.removeEventListener(event,fn,options));}
  function install(options={}) {
    stop(true);listeners.splice(0).forEach(remove=>remove());
    const allowed=[...knownOrigins,...(Array.isArray(options.allowedOrigins)?options.allowedOrigins:[])];
    const key=typeof options.omdbApiKey==='string'?options.omdbApiKey.trim():'';
    if(key!==config.omdbApiKey){ageCache.clear();ageUnavailable=false;}
    config={enabled:options.enabled!==false && allowed.includes(location.origin),animeRatings:options.animeRatings!==false,omdbApiKey:key};
    if(!config.enabled)return;
    // Capture before React/interaction hooks can stop bubbling.
    listen(document,'mouseover',over,true);
    listen(document,'mouseout',out,true);
    listen(document,'mousemove',move,{passive:true,capture:true});
    const hideNow=()=>stop(true);
    // The overlay is inside the poster and scrolls with it. A hover-induced
    // row scroll must not cancel its pending metadata request.
    listen(document,'scroll',position,true);
    listen(document,'visibilitychange',hideNow);
    listen(document,'click',hideNow,true);
    listen(window,'hashchange',hideNow);listen(window,'popstate',hideNow);listen(window,'blur',hideNow);listen(window,'resize',hideNow);
  }
  window.GalaxyPosterHover=Object.freeze({install,disable:()=>install({enabled:false})});
})();
