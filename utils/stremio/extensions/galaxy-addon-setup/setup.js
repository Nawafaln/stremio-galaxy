// Stremio Galaxy community modification, GPL-3.0.
// Addon registration uses the verified UI route; no authentication or account writes.
(()=>{
 'use strict';
 if(window.top!==window||window.GalaxyAddonSetup)return;
 const config=window.GalaxyAddonSelection;
 if(!config)return;
 const addons=[['galaxyAnime','Galaxy Anime','http://127.0.0.1:11471/manifest.json'],['subtitles','OpenSubtitles v3','https://opensubtitles-v3.strem.io/manifest.json']].filter(([key])=>config[key]===true || key==='galaxyAnime' && config.kitsu===true);
 if(!addons.length)return;
 const storageKey='galaxy-addon-setup:'+config.revision;
 const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{return {}}};
 let done=read();if(done.dismissed)return;
 let host,root,ar=false,disposed=false;
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(done))}catch{}};
 const labels=()=>ar?['إعداد الإضافات الاختيارية','جديد وما عندك إضافات؟ أكمل تثبيت الخيارات المختارة. إذا حسابك مجهّز مسبقًا، الأفضل تتخطاها لتجنب التكرار.','سجّل دخولك أولًا إذا تبي ربط الإضافات بحسابك. زر الفتح يعرض صفحة الإضافة؛ أكّد «تثبيت» داخل ستريميو. توفر المصادر والترجمة واللغات يختلف حسب العنوان.','فتح صفحة التثبيت','فتح مجددًا','إنهاء وإخفاء','إخفاء مؤقتًا','استخدم مصادر المحتوى التي تملك حق الوصول إليها.']:['Optional addon setup','New and have no addons? Complete the selected options. Already have a configured account? Prefer skipping these to avoid duplicates.','Sign in first to link addons to your account. Open the addon page, then confirm Install in Stremio. Sources, subtitles and languages vary by title.','Open install page','Open again','Finish and dismiss','Hide for now','Use content sources you have the right to access.'];
 function render(){
  if(disposed||!document.body)return;
  if(!host){host=document.createElement('div');host.id='galaxy-addon-setup';root=host.attachShadow({mode:'open'});document.body.appendChild(host)}
  const w=labels();root.innerHTML='<style>:host{position:fixed;inset:auto 24px 24px auto;z-index:2147483000;max-width:calc(100vw - 48px);font:14px system-ui;color:#fff}section{width:390px;max-width:calc(100vw - 84px);max-height:75vh;overflow:auto;padding:18px;border:1px solid #8b66bd;border-radius:16px;background:linear-gradient(130deg,rgba(38,18,69,.98),rgba(5,12,28,.98));box-shadow:0 12px 48px #0009}h2{font-size:18px;margin:0 0 12px}.warning{color:#ff7676;font-weight:700}p{line-height:1.6}button{font:inherit;color:#fff;background:#59358e;border:1px solid #9671c5;border-radius:8px;padding:8px;cursor:pointer}button:focus-visible{outline:2px solid white}li{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0}ul{list-style:none;padding:0}.actions{display:flex;gap:8px;flex-wrap:wrap}</style><section role="region" aria-label="Addon setup"><h2></h2><p class="warning" role="note"></p><p class="help"></p><ul></ul><p class="rights"></p><div class="actions"><button class="finish"></button><button class="hide"></button></div></section>';
  const section=root.querySelector('section');section.dir=ar?'rtl':'ltr';section.lang=ar?'ar':'en';section.setAttribute('aria-label',w[0]);
  root.querySelector('h2').textContent=w[0];root.querySelector('.warning').textContent=w[1];root.querySelector('.help').textContent=w[2];root.querySelector('.rights').textContent=w[7];
  for(const [key,name,url] of addons){const li=document.createElement('li'),label=document.createElement('span'),button=document.createElement('button');label.textContent=name;button.textContent=done[key]?w[4]:w[3];button.onclick=()=>{done[key]=true;save();location.hash='#/addons?addon='+encodeURIComponent(url);render()};li.append(label,button);root.querySelector('ul').appendChild(li)}
  root.querySelector('.finish').textContent=w[5];root.querySelector('.hide').textContent=w[6];
  root.querySelector('.finish').onclick=()=>{done.dismissed=true;save();destroy()};root.querySelector('.hide').onclick=()=>{host.hidden=true};
 }
 async function locale(){
  let language=document.documentElement.lang;
  try{
   let core=window.core;
   if(!core)for(const node of Array.from(document.querySelectorAll('#app *,#root *,[class*="main-nav"], [class*="settings-container-"]')).slice(0,150)){
    const key=Object.keys(node).find(k=>k.startsWith('__reactFiber$'));
    for(let f=key&&node[key],n=0;f&&n<45;n++,f=f.return){for(let d=f.dependencies?.firstContext,m=0;d&&m<15;m++,d=d.next){if(d.memoizedValue?.core?.transport){core=d.memoizedValue.core.transport;break}}if(core)break}if(core)break;
   }
   if(core?.getState){const ctx=await core.getState('ctx');language=ctx?.profile?.settings?.interfaceLanguage||language}
  }catch{}
  const next=/^(ar|ara)(-|_|$)/i.test(language||'');if(next!==ar){ar=next;render()}
 }
 function destroy(){disposed=true;host?.remove();clearInterval(timer);window.removeEventListener('hashchange',navigate)}
 function navigate(){if(host)host.hidden=false;void locale()}
 const timer=setInterval(()=>{if(!disposed)void locale()},3000);
 window.GalaxyAddonSetup={destroy};window.addEventListener('hashchange',navigate);
 render();void locale();
})();
