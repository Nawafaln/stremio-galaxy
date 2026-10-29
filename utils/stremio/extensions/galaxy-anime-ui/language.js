// Stremio Galaxy community modification, GPL-3.0.
// Locale only: never dispatches account installation or reads authentication fields.
(()=>{
 'use strict';if(window.top!==window||window.GalaxyAnimeUI)return;
 const base='http://127.0.0.1:11471',cache=new Map(), originals=new Map();
 const aliases={eng:'en',ara:'ar',fra:'fr',fre:'fr',deu:'de',ger:'de',spa:'es',ita:'it',por:'pt',tur:'tr',jpn:'ja',kor:'ko',chi:'zh',zho:'zh',rus:'ru',heb:'he',fas:'fa',per:'fa',hin:'hi',nld:'nl',dut:'nl',ukr:'uk',pol:'pl',ind:'id',vie:'vi',tha:'th',swe:'sv',dan:'da',nor:'no',fin:'fi',ell:'el',gre:'el',ron:'ro',rum:'ro',ces:'cs',cze:'cs',hun:'hu',bul:'bg'};
 let lang='en',sent='',busy=false,request,key='',generation=0,dead=false,nextRetry=0;
 const resolve=value=>{const code=String(value||'en').toLowerCase().split(/[-_]/)[0];return aliases[code]||(/^[a-z]{2}$/.test(code)?code:'en')};
 function transport(){if(window.core)return window.core.transport||window.core;for(const node of Array.from(document.querySelectorAll('#app *,#root *,[class*="metadetails-container-"] *,[class*="settings-container-"] *')).slice(0,220)){const k=Object.keys(node).find(k=>k.startsWith('__reactFiber$'));for(let f=k&&node[k],n=0;f&&n<45;n++,f=f.return)for(let d=f.dependencies?.firstContext,j=0;d&&j<20;j++,d=d.next)if(d.memoizedValue?.core?.transport)return d.memoizedValue.core.transport}return null}
 async function json(url,options={}){const response=await fetch(url,{...options,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('unavailable');return response.json()}
 function restore(){for(const [node,texts] of originals){node.querySelector('[data-galaxy-anime-synopsis]')?.remove();for(const [text,value] of texts)if(text.isConnected&&text.nodeValue==='')text.nodeValue=value}originals.clear()}
 function display(text,status){for(const node of document.querySelectorAll('[class*="metadetails-container-"] [class*="description-container-"]')){
  if(!Array.from(node.children).some(e=>e.className?.includes('label-container-')))continue;
  if(!originals.has(node)){const texts=Array.from(node.childNodes).filter(n=>n.nodeType===3);originals.set(node,texts.map(n=>[n,n.nodeValue]))}
  for(const [text] of originals.get(node))if(text.isConnected)text.nodeValue='';
  let span=node.querySelector('[data-galaxy-anime-synopsis]');if(!span){span=document.createElement('span');span.dataset.galaxyAnimeSynopsis='';node.appendChild(span)}span.lang=lang;span.dir=['ar','he','fa'].includes(lang)?'rtl':'auto';span.style.display='block';if(span.textContent!==text)span.textContent=text;span.title=status==='localized'?'AIO Metadata · TVDB / TMDB':'';
 }}
 function settings(){if(!/^#\/settings/.test(location.hash))return;const sections=document.querySelector('[class*="settings-container-"] [class*="sections-container-"]');if(!sections)return;let box=sections.querySelector('[data-galaxy-anime-settings]');if(!box){box=document.createElement('section');box.dataset.galaxyAnimeSettings='';box.style.cssText='padding:20px;border:1px solid #705196;border-radius:12px;background:#160e25;margin:16px 0;color:white';box.innerHTML='<h2>Galaxy Anime</h2><p></p><button type="button"></button>';box.querySelector('button').onclick=()=>{location.hash='#/addons?addon='+encodeURIComponent(base+'/manifest.json')};sections.prepend(box)}box.dir=lang==='ar'?'rtl':'ltr';box.querySelector('p').textContent=lang==='ar'?'فهرس أنمي خاص بجالكسي. النبذة تتبع لغة الواجهة. بيانات محلية اللغة من TMDB وKitsu حسب توفرها. ثبّت الإضافة من الزر ثم أكّد تثبيت داخل ستريميو.':'Galaxy anime catalog. Synopsis follows interface language. Localized metadata from TMDB and Kitsu when available. Open the addon and confirm Install in Stremio.';box.querySelector('button').textContent=lang==='ar'?'إضافة Galaxy Anime':'Add Galaxy Anime'}
 async function update(){if(busy||dead)return;busy=true;try{
  let locale=document.documentElement.lang;const core=transport();if(core?.getState){const ctx=await core.getState('ctx');locale=ctx?.profile?.settings?.interfaceLanguage||locale}if(dead)return;
  const next=resolve(locale);if(next!==lang){lang=next;generation++;request?.abort();key='';restore()}
  settings();
  if(sent!==lang&&Date.now()>nextRetry){try{const result=await json(base+'/language',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:lang})});if(result.language===lang)sent=lang}catch{nextRetry=Date.now()+10000}}
  if(window.GalaxyMetadata){request?.abort();if(originals.size)restore();window.GalaxyMetadata.setLanguage(locale);window.GalaxyMetadata.refreshDom();return}
  const m=location.hash.match(/^#\/detail\/(anime|series|movie)\/(kitsu(?::|%3A)[1-9]\d*)(?:\/|$)/i),current=m?lang+'/'+m[1]+'/'+decodeURIComponent(m[2]):'';
  if(current!==key){key=current;generation++;request?.abort();restore()}
  if(!m)return;
  const hit=cache.get(key);if(hit){display(hit.text,hit.status);return}
  if(Date.now()<nextRetry)return;
  const token=generation,localKey=key;const ctrl=new AbortController();request=ctrl;const timeout=setTimeout(()=>ctrl.abort(),60000);
  display(lang==='ar'?'جارٍ تحميل النبذة العربية…':'Loading synopsis…','loading');
  try{const result=await json(base+'/meta/'+m[1]+'/'+encodeURIComponent(decodeURIComponent(m[2]))+'.json?lang='+lang,{signal:ctrl.signal});if(dead||token!==generation||localKey!==key)return;const text=result.meta?.description;if(typeof text==='string'){const data={text,status:result.galaxy?.status};if(data.status!=='unavailable')cache.set(key,data);else nextRetry=Date.now()+60000;display(data.text,data.status)}}catch{if(token===generation){nextRetry=Date.now()+10000;display(lang==='ar'?'تعذر تحميل النبذة بلغتك الآن.':'Could not load the synopsis in your language.','unavailable')}}finally{clearTimeout(timeout)}
 }catch{}finally{busy=false}}
 const timer=setInterval(update,1500);const navigate=()=>{generation++;request?.abort();busy=false;void update()};window.addEventListener('hashchange',navigate);window.addEventListener('focus',update);void update();
 window.GalaxyAnimeUI={resolve,getLanguage:()=>lang,refresh:update,destroy(){dead=true;generation++;request?.abort();clearInterval(timer);restore();document.querySelectorAll('[data-galaxy-anime-settings]').forEach(n=>n.remove());window.removeEventListener('hashchange',navigate);window.removeEventListener('focus',update);delete window.GalaxyAnimeUI}};
})();
