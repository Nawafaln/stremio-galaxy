// Stremio Galaxy community modification, GPL-3.0.
// Detail artwork: verified Cinemeta meta.background / meta.poster fields.
(()=>{
 'use strict';
 if(window.top!==window||!window.__galaxyAppearance||window.GalaxyDetailBackdrop)return;
 const cache=new Map();let controller,route='',generation=0;
 const safe=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}};
 const clear=()=>document.querySelectorAll('[data-galaxy-detail-art]').forEach(e=>{e.removeAttribute('data-galaxy-detail-art');e.style.removeProperty('--galaxy-detail-image')});
 async function update(){
  const match=location.hash.match(/^#\/detail\/(movie|series)\/(tt\d+)(?:\/|$)/);
  const key=match?match[1]+'/'+match[2]:'';
  if(key!==route){route=key;generation++;controller?.abort();controller=null;clear()}
  if(!key)return;
  const layer=document.querySelector('[class*="metadetails-container-"] > [class*="background-image-layer-"]');
  if(!layer||layer.dataset.galaxyDetailArt===key)return;
  const current=generation;
  if(!cache.has(key)){
   if(controller)return;
   controller=new AbortController();const active=controller;
   try{
    const response=await fetch('https://v3-cinemeta.strem.io/meta/'+key+'.json',{signal:active.signal});
    if(!response.ok)throw new Error('metadata unavailable');
    const {meta}=await response.json();let loaded=null;
    for(const url of [safe(meta?.background),safe(meta?.poster)].filter(Boolean)){
     if(active.signal.aborted)return;
     loaded=await new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(url);img.onerror=()=>resolve(null);img.src=url});
     if(loaded)break;
    }
    if(!active.signal.aborted)cache.set(key,loaded);
   }catch(error){if(error.name!=='AbortError')cache.set(key,null)}
   finally{if(controller===active)controller=null}
  }
  if(current!==generation||key!==route)return;
  const url=cache.get(key);if(!url)return;
  layer.style.setProperty('--galaxy-detail-image','url('+JSON.stringify(url)+')');
  layer.dataset.galaxyDetailArt=key;
 }
 const observer=new MutationObserver(()=>{void update()});
 function start(){observer.observe(document.documentElement,{childList:true,subtree:true});void update()}
 window.GalaxyDetailBackdrop={destroy(){generation++;controller?.abort();observer.disconnect();window.removeEventListener('hashchange',update);document.removeEventListener('DOMContentLoaded',start);clear();delete window.GalaxyDetailBackdrop}};
 window.addEventListener('hashchange',update);
 if(document.documentElement)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
})();
