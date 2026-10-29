// Stremio Galaxy community modification, GPL-3.0.
// Chapter-safe next episode, source preference and observed subtitle validation.
(()=>{
 'use strict';
 if(window.top!==window||window.GalaxyNextEpisode||window.GalaxySongConfig?.nextEpisode===false)return;
 const logic=window.__personalAnimeNextLogic,source=window.GalaxyNextSource;if(!logic||!source)return;
 let bridge,serial=760000,eligible=false,eof=false,paused=false,tracks=[],sid=null,video=null,sequence=0;
 let saved=null,job=null,countdown=null,cancelled=false,lastHash=location.hash,coreBusy=false,coreState=null;
 let timer,noticeTimer,holding=false;
 const guardStyle=document.createElement('style');guardStyle.textContent='html[data-galaxy-next-owner] [class*="next-video-popup-container-"]{display:none!important}';document.documentElement.appendChild(guardStyle);
 const hold=value=>{if(value===holding)return;holding=value;document.documentElement.toggleAttribute('data-galaxy-next-owner',value);send('mpv-command',['script-message',value?'next-episode-ui-ready':'next-episode-ui-release'])};
 const panel=document.createElement('div');panel.id='galaxy-next-episode';
 Object.assign(panel.style,{position:'fixed',left:'max(3vw,24px)',bottom:'max(13vh,100px)',zIndex:'2147483646',display:'none',gap:'8px',alignItems:'center'});
 const next=document.createElement('button'),cancel=document.createElement('button'),status=document.createElement('span');
 for(const b of [next,cancel]){b.type='button';Object.assign(b.style,{border:'1px solid #cab3ff',borderRadius:'7px',padding:'12px 19px',background:'rgba(29,16,49,.9)',color:'#fff',font:'600 17px Segoe UI,sans-serif',cursor:'pointer'});b.addEventListener('pointerdown',e=>e.stopPropagation());panel.appendChild(b)}
 panel.appendChild(status);Object.assign(status.style,{color:'white',background:'#160e25',padding:'8px',maxWidth:'360px',font:'14px Segoe UI'});status.setAttribute('role','status');
 let lang='en';const ar=()=>lang==='ar';
 const say=(en,arabic)=>{status.textContent=ar()?arabic:en;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{if(!job)status.textContent=''},10000)};
 const send=(event,args)=>bridge?.postMessage(JSON.stringify({type:6,object:'transport',method:'handleInboundJSON',id:++serial,args:[event,args]}));
 function propsAt(selector,test){for(const node of document.querySelectorAll(selector)){const k=Object.keys(node).find(k=>k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$'));for(let f=k&&node[k],n=0;f&&n<40;n++,f=f.return)if(f.memoizedProps&&test(f.memoizedProps))return f.memoizedProps}return null}
 const controls=()=>propsAt('[class*="control-bar-container"]',p=>'nextVideo' in p&&'stream' in p);
 const sources=()=>propsAt('[class*="streams-list-container"]',p=>Array.isArray(p.streams)&&p.video);
 function transport(){if(window.core)return window.core.transport||window.core;for(const node of Array.from(document.querySelectorAll('[class*="player-container"] *,[class*="streams-list-container"]')).slice(0,200)){const k=Object.keys(node).find(k=>k.startsWith('__reactFiber$'));for(let f=k&&node[k],n=0;f&&n<40;n++,f=f.return){for(let d=f.dependencies?.firstContext,j=0;d&&j<15;j++,d=d.next)if(d.memoizedValue?.core?.transport)return d.memoizedValue.core.transport}}return null}
 async function snapshot(){if(coreBusy)return;coreBusy=true;try{const t=transport();if(t?.getState){const [player,ctx]=await Promise.all([t.getState('player'),t.getState('ctx')]);coreState=player;lang=/^(ar|ara)(-|_|$)/i.test(ctx?.profile?.settings?.interfaceLanguage||document.documentElement.lang)?'ar':'en'}}catch{}finally{coreBusy=false}}
 function capture(){const p=controls();if(!p?.nextVideo||job||eof||!logic.dimensions(video))return;const s=p.stream?.stream||p.stream;const selected=tracks.find(t=>t.type==='sub'&&(t.selected===true||String(t.id)===String(sid)));
  const target=logic.localHash(p.nextVideo.deepLinks?.metaDetailsStreams,location,'detail')||logic.localHash(p.nextVideo.deepLinks?.metaDetailsStreams,location,'metadetails');
  if(target)hold(true);
  saved={target,source:source.identity(s,coreState?.selected?.streamRequest?.base),quality:logic.dimensions(video)||logic.quality([s?.name,s?.description].join(' ')),language:sid==='no'||sid===false?null:source.language(selected?.lang),subtitlesOff:sid==='no'||sid===false,hash:location.hash};
 }
 function render(){const parent=document.fullscreenElement||document.body;if(parent&&panel.parentNode!==parent)parent.appendChild(panel);
  const canNext=/^#\/player(?:\/|$)/.test(location.hash)&&(eligible||eof)&&!!saved?.target;
  const visible=!!job||canNext||!!status.textContent;
  panel.style.display=visible?'flex':'none';if(!visible){countdown=null;return}
  panel.dir=ar()?'rtl':'ltr';next.lang=cancel.lang=lang;
  if(canNext&&!job&&!cancelled&&countdown===null)countdown=Date.now()+Math.max(1,window.GalaxySongConfig?.nextCountdownSeconds||5)*1000;
  const remaining=countdown===null?null:Math.max(0,Math.ceil((countdown-Date.now())/1000));
  next.textContent=job?(ar()?'جارٍ التحقق…':'Checking…'):remaining===null?(ar()?'الحلقة التالية ⏭':'Next episode ⏭'):(ar()?`الحلقة التالية خلال ${remaining} ثوانٍ`:`Next episode in ${remaining}s`);
  next.style.display=job||canNext?'block':'none';next.disabled=!!job;cancel.textContent=ar()?'إلغاء':'Cancel';cancel.style.display=job||countdown!==null?'block':'none';
 }
 function fail(en,arabic){const target=job?.context.target;job=null;cancelled=true;countdown=null;say(en,arabic);if(target&&location.hash!==target){lastHash=target;location.hash=target}render()}
 function begin(){capture();if(!saved?.target)return;countdown=null;cancelled=true;job={context:{...saved},phase:'list',expires:Date.now()+60000,queue:[],tried:0,hash:saved.target};eligible=false;eof=false;lastHash=saved.target;location.hash=saved.target;say('Looking for the same source and quality…','جارٍ البحث عن نفس المصدر والجودة…');render()}
 function loadCandidate(){if(!job)return;const candidate=job.queue.shift();if(!candidate){fail('No verified matching source. Choose a source manually.','لم يتوفر مصدر تم التحقق منه؛ اختر المصدر يدويًا.');return}job.candidate=candidate;job.tried++;job.phase='validate';job.hash=candidate.hash;job.afterSequence=sequence;job.expires=Date.now()+25000;job.loadedAt=0;job.actual=null;tracks=[];video=null;lastHash=candidate.hash;location.hash=candidate.hash;say(`Checking source ${job.tried}…`,`جارٍ فحص المصدر ${job.tried}…`)}
 function validate(){if(!job||job.phase!=='validate'||!job.loadedAt)return;
  const actual=logic.dimensions(video);if(job.context.quality&&actual&&actual!==job.context.quality){loadCandidate();return}
  if(!actual)return;
  const subs=tracks.filter(t=>t.type==='sub'),wanted=job.context.language,matching=wanted&&subs.find(t=>source.language(t.lang)===wanted);
  // Give stream/external subtitle discovery time to settle before rejecting a source.
  if(wanted&&!matching&&Date.now()-job.loadedAt<12000)return;
  if(!wanted&&!subs.length&&Date.now()-job.loadedAt<12000&&!job.context.subtitlesOff)return;
  if(wanted&&!matching){loadCandidate();return}
  if(!wanted&&!job.context.subtitlesOff&&!subs.length){loadCandidate();return}
  if(matching)send('mpv-set-prop',['sid',String(matching.id)]);
  else if(job.context.subtitlesOff)send('mpv-set-prop',['sid','no']);
  send('mpv-set-prop',['pause','false']);job=null;eligible=false;eof=false;saved=null;say('Next episode ready.','الحلقة التالية جاهزة.');render();
 }
 function receive(event){let m=event.data;try{if(typeof m==='string')m=JSON.parse(m)}catch{return}if(m?.object!=='transport'||!Array.isArray(m.args))return;const [type,p]=m.args;
  if(type==='mpv-prop-change'){
   if(p?.name==='user-data/anime-next-available'){eligible=p.data===true;if(!eligible&&!eof)countdown=null}
   if(p?.name==='pause')paused=p.data===true;
   if(p?.name==='eof-reached'){eof=p.data===true&&!!saved;if(!eof)countdown=null;}
   if(p?.name==='track-list'){tracks=Array.isArray(p.data)?p.data:[];validate()}
   if(p?.name==='sid')sid=p.data;
   if(p?.name==='user-data/anime-loaded-video'){video=p.data;if(Number.isInteger(p.data?.sequence))sequence=p.data.sequence;if(job?.phase==='validate'&&sequence>job.afterSequence){if(!job.loadedAt)job.loadedAt=Date.now();send('mpv-set-prop',['pause','true']);validate()}}
   capture();render();
  }else if(type==='mpv-event-ended'){
   if(job){if(p?.reason==='error'&&job.phase==='validate')loadCandidate();return}
   if(p?.reason==='quit'){eof=true;eligible=true;render()}
  }
 }
 function connect(){const b=window.chrome?.webview;if(!b?.postMessage||!b?.addEventListener)return;if(b!==bridge){bridge?.removeEventListener('message',receive);bridge=b;bridge.addEventListener('message',receive)}for(const n of ['user-data/anime-next-available','user-data/anime-loaded-video','pause','track-list','sid','eof-reached'])send('mpv-observe-prop',[n])}
 function tick(){const hash=location.hash;if(hash!==lastHash){lastHash=hash;if(job&&hash!==job.hash){job=null;status.textContent=''}eligible=false;eof=false;countdown=null;cancelled=false;saved=null;tracks=[];video=null;coreState=null;void snapshot();connect()}
  capture();
  if(!job&&(!/^#\/player(?:\/|$)/.test(hash)||(controls()&&controls().nextVideo===null)))hold(false);
  if(job){if(Date.now()>job.expires){if(job.phase==='validate')loadCandidate();else fail('Sources did not become available. Choose manually.','لم تتوفر المصادر؛ اختر يدويًا.')}
   else if(job.phase==='list'){const list=sources();if(list){job.queue=source.rank(list.streams,job.context,logic,location);if(list.streams.length&&list.streams.every(g=>g.content?.type!=='Loading')){if(!job.context.quality)fail('Current quality is unknown. Choose a source manually.','دقة الحلقة الحالية غير معروفة؛ اختر المصدر يدويًا.');else loadCandidate()}}}
   else validate();
  }
  render();if(countdown!==null){if(paused&&!eof)countdown+=250;else if(Date.now()>=countdown)begin()}
 }
 next.onclick=e=>{e.stopPropagation();begin()};cancel.onclick=e=>{e.stopPropagation();if(job){send('mpv-set-prop',['pause','true']);fail('Automatic transition cancelled. Choose a source manually.','أُلغي الانتقال التلقائي؛ اختر المصدر يدويًا.')}cancelled=true;countdown=null;render()};
 let binds=0;timer=setInterval(()=>{tick();if(++binds%8===0){void snapshot();connect()}},250);
 window.addEventListener('hashchange',tick);document.addEventListener('fullscreenchange',render);connect();void snapshot();
 window.GalaxyNextEpisode={destroy(){hold(false);guardStyle.remove();clearInterval(timer);clearTimeout(noticeTimer);bridge?.removeEventListener('message',receive);window.removeEventListener('hashchange',tick);document.removeEventListener('fullscreenchange',render);panel.remove();delete window.GalaxyNextEpisode}};
})();
