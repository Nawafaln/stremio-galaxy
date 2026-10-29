// Stremio Galaxy community modification, GPL-3.0.
// Verified SeekBar > Slider DOM. Decorative overlays never consume pointer input.
(() => {
 'use strict';
 if(window.top!==window||window.GalaxySongMarkers||window.GalaxySongConfig?.markers===false)return;
 const property='user-data/anime-segments';
 let data={duration:0,ranges:[]},bridge,serial=790000;
 const sanitize=value=>{
  const duration=value?.duration;
  if(!Number.isFinite(duration)||duration<=0)return {duration:0,ranges:[]};
  const ranges=(Array.isArray(value.ranges)?value.ranges:[]).filter(r=>
   ['opening','ending'].includes(r?.kind)&&Number.isFinite(r.start)&&Number.isFinite(r.finish)&&r.start>=0&&r.finish>r.start&&r.finish<=duration);
  return {duration,ranges};
 };
 function render(){
  const inPlayer=/^#\/player(?:\/|$)/.test(location.hash);
  const sliders=inPlayer?Array.from(document.querySelectorAll('[class*="player-container-"] [class*="seek-bar-container-"] [class*="slider-container-"]')):[];
  for(const old of document.querySelectorAll('[data-galaxy-song-markers]'))if(!sliders.includes(old.parentElement))old.remove();
  for(const slider of sliders){
   let layer=slider.querySelector('[data-galaxy-song-markers]');
   if(!data.ranges.length){layer?.remove();continue;}
   if(!layer){layer=document.createElement('div');layer.dataset.galaxySongMarkers='';layer.setAttribute('aria-hidden','true');Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'4'});slider.appendChild(layer);}
   const signature=JSON.stringify(data);
   if(layer.dataset.signature===signature)continue;
   layer.dataset.signature=signature;layer.replaceChildren();
   for(const range of data.ranges){
    const band=document.createElement('span');band.dataset.kind=range.kind;
    Object.assign(band.style,{position:'absolute',left:(100*range.start/data.duration)+'%',width:(100*(range.finish-range.start)/data.duration)+'%',top:'50%',height:'var(--track-size, 4px)',transform:'translateY(-50%)',background:'rgba(255,210,45,.65)',pointerEvents:'none'});
    layer.appendChild(band);
    for(const time of [range.start,range.finish]){
     const mark=document.createElement('span');mark.dataset.boundary=String(time);
     Object.assign(mark.style,{position:'absolute',left:(100*time/data.duration)+'%',top:'50%',width:'3px',height:'12px',transform:'translate(-50%,-50%)',borderRadius:'2px',background:'#ffda35',boxShadow:'0 0 5px #0009',pointerEvents:'none'});
     layer.appendChild(mark);
    }
   }
  }
 }
 const receive=event=>{
  let message=event.data;try{if(typeof message==='string')message=JSON.parse(message)}catch{return}
  if(message?.object!=='transport'||!Array.isArray(message.args))return;
  const [type,payload]=message.args;
  if(type==='mpv-prop-change'&&payload?.name===property){data=sanitize(payload.data);render();}
  else if(type==='mpv-event-ended'){data={duration:0,ranges:[]};render();}
 };
 function connect(){
  const candidate=window.chrome?.webview;
  if(!candidate?.postMessage||!candidate?.addEventListener)return;
  if(bridge!==candidate){bridge?.removeEventListener('message',receive);bridge=candidate;bridge.addEventListener('message',receive);}
  bridge.postMessage(JSON.stringify({type:6,object:'transport',method:'handleInboundJSON',id:++serial,args:['mpv-observe-prop',[property]]}));
 }
 const observer=new MutationObserver(render);observer.observe(document.documentElement,{childList:true,subtree:true});
 const navigation=()=>{data={duration:0,ranges:[]};render();connect()};
 window.addEventListener('hashchange',navigation);document.addEventListener('fullscreenchange',render);
 const timer=setInterval(connect,4000);
 window.GalaxySongMarkers={sanitize,destroy(){observer.disconnect();clearInterval(timer);bridge?.removeEventListener('message',receive);window.removeEventListener('hashchange',navigation);document.removeEventListener('fullscreenchange',render);document.querySelectorAll('[data-galaxy-song-markers]').forEach(e=>e.remove());delete window.GalaxySongMarkers;}};
 connect();render();
})();
