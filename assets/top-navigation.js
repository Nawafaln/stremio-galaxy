/* Stremio Galaxy community modification, GPL-3.0.
 * Verified source: horizontal-nav-bar-container-*, vertical-nav-bar-container-*,
 * nav-content-container-*. Copy links/icons; never reparent React-owned elements.
 */
((config)=>{
 'use strict';
 if(window.top!==window)return;
 const origins=['https://web.stremio.com','https://stremio.zarg.me','https://zaarrg.github.io',...(config.allowedOrigins||[])];
 if(!origins.includes(location.origin))return;
 if(window.GalaxyTopNavigation){window.GalaxyTopNavigation.configure(config);return;}
 let enabled=config.enabled!==false, observer;
 const measuredBars=new WeakSet();
 const measure=bar=>{const height=Math.ceil(bar.getBoundingClientRect().height);if(height>0)bar.parentElement?.style.setProperty('--galaxy-header-height',height+'px')};
 const sizes=window.ResizeObserver?new ResizeObserver(entries=>entries.forEach(e=>measure(e.target))):null;
 const groups={left:[],right:['home','discover','library','calendar','addons','settings']};
 const keyFor=href=>{const m=(href||'').match(/^#\/(discover|library|calendar|addons|settings)(?:[/?]|$)/);return m?m[1]:(href==='#/'||href==='#'?'home':null)};
 function detailHome(html){
  const visible=enabled&&/^#\/(?:detail|metadetails)\//.test(location.hash);
  let link=document.getElementById('galaxy-detail-home');
  if(!visible){link?.remove();return;}
  if(!link){
   link=document.createElement('a');link.id='galaxy-detail-home';link.href='#/';
   link.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg><span></span>';
   link.addEventListener('click',event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const source=Array.from(document.querySelectorAll('[class*="vertical-nav-bar-container-"] a[href]')).find(a=>keyFor(a.getAttribute('href'))==='home');
    if(source){event.preventDefault();source.click();}
   });
   (document.body||html).appendChild(link);
  }
  const rtl=html.dataset.galaxyDirection==='rtl'||(!html.dataset.galaxyDirection&&(html.dir==='rtl'||/^ar(?:-|$)/i.test(html.lang)));
  const label=rtl?'الرئيسية':'Home';
  if(link.getAttribute('aria-label')!==label){link.setAttribute('aria-label',label);link.title=label;link.querySelector('span').textContent=label;}
  if(link.dir!==(rtl?'rtl':'ltr'))link.dir=rtl?'rtl':'ltr';
 }
 function update(){
  const html=window.document?.documentElement;if(!html)return;
  detailHome(html);
  const home=/^#?\/(?:board)?(?:[?]|$)/.test(location.hash||'#/');
  const settings=/^#\/settings(?:[/?]|$)/.test(location.hash);
  const flag=enabled?'1':'0';if(html.dataset.galaxyTopnav!==flag)html.dataset.galaxyTopnav=flag;
  const header=enabled?(home?'home':settings?'settings':'section'):'native';if(html.dataset.galaxyHeader!==header)html.dataset.galaxyHeader=header;
  let style=document.getElementById('galaxy-top-navigation-style');
  if(!style){style=document.createElement('style');style.id='galaxy-top-navigation-style';html.appendChild(style);}
  if(style.textContent!==config.css)style.textContent=config.css;
  const current=keyFor(location.hash.split('?')[0]||'#/');
  for(const wrapper of document.querySelectorAll('[class*="main-nav-bars-container-"]')){
   const bar=Array.from(wrapper.children).find(e=>e.matches('[class*="horizontal-nav-bar-container-"]'));
   const sidebar=Array.from(wrapper.children).find(e=>e.matches('[class*="vertical-nav-bar-container-"]'));
   if(!bar||!sidebar)continue;
   const originals=new Map(Array.from(sidebar.querySelectorAll('a[href]')).map(a=>[keyFor(a.getAttribute('href')),a]));
   // Do not suppress the sidebar until every one of its six destinations exists.
   if(!Object.values(groups).flat().every(key=>originals.has(key)))continue;
   for(const side of ['left','right']){
    let group=bar.querySelector(`[data-galaxy-nav-group="${side}"]`);
    if(!group){group=document.createElement('div');group.dataset.galaxyNavGroup=side;bar.appendChild(group);}
    for(const key of groups[side]){
     const original=originals.get(key);
     let link=group.querySelector(`[data-galaxy-destination="${key}"]`);
     if(!link){
      link=document.createElement('a');link.className='galaxy-nav-link';link.dataset.galaxyDestination=key;
      link.addEventListener('click',event=>{
       if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
       const sourceNav=Array.from(wrapper.children).find(e=>e.matches('[class*="vertical-nav-bar-container-"]'));
       const destination=sourceNav&&Array.from(sourceNav.querySelectorAll('a[href]')).find(a=>keyFor(a.getAttribute('href'))===key);
       // Use upstream routing handlers (including their view transition), not a second independent navigation.
       if(destination?.isConnected){event.preventDefault();destination.click();}
      });
      const svg=original.querySelector('svg');if(svg){const icon=svg.cloneNode(true);icon.setAttribute('aria-hidden','true');link.appendChild(icon);}
      const label=document.createElement('span');label.className='galaxy-nav-label';link.appendChild(label);group.appendChild(link);
     }
     const name=original.getAttribute('title')||original.getAttribute('aria-label')||key;
     if(link.getAttribute('href')!==original.getAttribute('href'))link.setAttribute('href',original.getAttribute('href'));
     if(link.getAttribute('aria-label')!==name){link.setAttribute('aria-label',name);link.title=name;link.querySelector('span').textContent=name;}
     if(current===key){if(link.getAttribute('aria-current')!=='page')link.setAttribute('aria-current','page');}
     else if(link.hasAttribute('aria-current'))link.removeAttribute('aria-current');
    }
   }
   if(!wrapper.hasAttribute('data-galaxy-nav-ready'))wrapper.setAttribute('data-galaxy-nav-ready','1');
   if(!measuredBars.has(bar)){measuredBars.add(bar);sizes?.observe(bar)}measure(bar);
  }
 }
 function init(){if(!document.documentElement)return;update();if(!observer){observer=new MutationObserver(update);observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['dir','lang','data-galaxy-direction']});}}
 window.GalaxyTopNavigation={configure(next){config=next;enabled=next.enabled!==false;update();},disable(){enabled=false;update();},destroy(){observer?.disconnect();sizes?.disconnect();window.removeEventListener('hashchange',update);document.removeEventListener('DOMContentLoaded',init);document.documentElement?.removeAttribute('data-galaxy-topnav');document.documentElement?.removeAttribute('data-galaxy-header');document.getElementById('galaxy-top-navigation-style')?.remove();document.getElementById('galaxy-detail-home')?.remove();document.querySelectorAll('[data-galaxy-nav-group]').forEach(e=>e.remove());document.querySelectorAll('[data-galaxy-nav-ready]').forEach(e=>e.removeAttribute('data-galaxy-nav-ready'));}};
 window.addEventListener('hashchange',update);document.addEventListener('DOMContentLoaded',init,{once:true});init();
})(__GALAXY_TOP_NAVIGATION_CONFIG__);
