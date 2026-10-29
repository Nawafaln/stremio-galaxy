/* Watch Party toolbar WebMod for Stremio Galaxy. GPL-3.0. */
(() => {
 'use strict';
 if (window.top !== window || !window.chrome?.webview || window.__galaxyPartyToolbar) return;
 if (!['https://stremio.zarg.me', 'https://web.stremio.com', 'https://zaarrg.github.io'].includes(location.origin)) return;
 window.__galaxyPartyToolbar = true;
 const id = 'galaxy-watchparty-toolbar-button';
 // Keep Watch Party in the lower button row, outside the seek row and floating menus.
 const toolbarSelector = '[class*="player-container-"] [class*="control-bar-buttons-container-"]';
 let queued = false, toolbarButton, observedPanel;
 let language = 'en', localeBusy = false;
 let lastLocaleFrame, lastSentLanguage;
 const normalizeLanguage = value => {
  const code=String(value || 'en').toLowerCase().split(/[-_]/)[0];
  return ({ara:'ar',eng:'en'})[code] || code;
 };
 function renderedLocale() {
  let transport=window.core?.transport || window.core, value;
  if(typeof transport?.getState==='function') return {transport};
  for(const node of [...document.querySelectorAll('#app *,#root *')].slice(0,220)) {
   const key=Object.keys(node).find(k=>k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
   for(let fiber=key && node[key],i=0;fiber && i<60;fiber=fiber.return,i++) {
    value ||= fiber.memoizedProps?.profile?.settings?.interfaceLanguage;
    for(let d=fiber.dependencies?.firstContext,j=0;d && j<20;d=d.next,j++) {
     transport=d.memoizedValue?.core?.transport;
     if(typeof transport?.getState==='function') return {transport,value};
    }
   }
  }
  return {value};
 }
 function applyLanguage() {
  const ar=language==='ar', label=ar?'مشاهدة جماعية':'Watch Party';
  if(toolbarButton) {
   toolbarButton.title=label; toolbarButton.setAttribute('aria-label',label);
  }
  const host=document.getElementById('galaxy-watch-party'), root=host?.shadowRoot;
  if(!root)return;
  host.style.direction=ar?'rtl':'ltr';
  const panel=root.getElementById('panel');
  if(panel) {panel.lang=ar?'ar':'en';panel.dir=ar?'rtl':'ltr';panel.setAttribute('aria-label',ar?'غرف المشاهدة الجماعية':'Watch Party rooms');}
  const texts=[['header span',label+' · MPV'],['header a',ar?'فتح منفصل':'Open separately'],['footer',ar?'شغّل Start-WatchParty.cmd إذا لم تظهر الغرف.':'Run Start-WatchParty.cmd if rooms do not load.']];
  for(const [selector,text] of texts){const node=root.querySelector?.(selector);if(node && node.textContent!==text)node.textContent=text;}
  const close=root.querySelector?.('header button');close?.setAttribute('aria-label',ar?'إغلاق لوحة الغرف':'Close room panel');
  const fallback=root.querySelector?.('button');if(fallback && fallback!==close && fallback.textContent!==label)fallback.textContent=label;
  const frame=root.querySelector?.('iframe');
  if(frame) {
   frame.title=ar?'غرف المشاهدة الجماعية':'Watch Party rooms';
   // Send only the interface locale to the native-owned local frame.
   try { const origin=new URL(frame.src).origin;
    if(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin) && (lastLocaleFrame!==frame || lastSentLanguage!==language)) {
     frame.contentWindow?.postMessage({type:'galaxy-watchparty-language',language},origin);
     lastLocaleFrame=frame;lastSentLanguage=language;
    }
   } catch {}
  }
 }
 async function refreshLanguage() {
  if(localeBusy)return;
  localeBusy=true;
  try {
   const {transport,value}=renderedLocale();
   let next=value || window.GalaxyAnimeUI?.getLanguage?.() || document.documentElement.lang || language;
   if(transport) {
    // Read only interfaceLanguage. Never send the profile to the companion.
    const ctx=await transport.getState('ctx');
    next=ctx?.profile?.settings?.interfaceLanguage || next;
   }
   language=normalizeLanguage(next);applyLanguage();
  } catch {applyLanguage();} finally {localeBusy=false;}
 }
 function nativePanel() { return document.getElementById('galaxy-watch-party')?.shadowRoot?.getElementById('panel'); }
 function reconcile() {
  queued = false;
  // The native integration enforces Enabled/AllowedOrigins and owns the secure iframe.
  const host = document.getElementById('galaxy-watch-party');
  const root = host?.shadowRoot, panel = nativePanel();
  if (!window.GalaxyWatchParty || !root || !panel) return;
  const toolbar = document.querySelector(toolbarSelector);
  let bridge = document.getElementById('galaxy-watchparty-button');
  if (!bridge) {
   if (!toolbar) return; // Retain native fallback until a toolbar is available.
   bridge = document.createElement('button'); bridge.id = 'galaxy-watchparty-button';
   bridge.type = 'button'; bridge.textContent = 'Watch Party'; bridge.hidden = true;
   document.body.append(bridge);
  }
  if (toolbar) {
   if (!toolbarButton) {
    toolbarButton = document.createElement('button'); toolbarButton.id = id;
    toolbarButton.type = 'button'; toolbarButton.title = 'Watch Party';
    toolbarButton.setAttribute('aria-label', 'Watch Party'); toolbarButton.setAttribute('aria-haspopup', 'dialog');
    toolbarButton.innerHTML = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="24" height="16" rx="3"/><path d="m14 7 6 4-6 4Z"/><circle cx="11" cy="23" r="2.5"/><circle cx="23" cy="23" r="2.5"/><path d="M5 30c.4-3 2.5-4.5 6-4.5s5.6 1.5 6 4.5m1.5-3.5c1.2-.7 2.7-1 4.5-1 3.5 0 5.6 1.5 6 4.5"/></svg>';
    toolbarButton.addEventListener('click', event => {
     event.stopPropagation();
     const currentBridge = document.getElementById('galaxy-watchparty-button');
     if (window.GalaxyWatchParty?.toggle) window.GalaxyWatchParty.toggle();
     else if (typeof currentBridge?.onclick === 'function') currentBridge.click();
     void refreshLanguage();
    });
    // Keep arrow events on their original path to Stremio's seek/volume handlers.
    // Cancel only browser/spatial focus movement; do not synthesize a second seek.
    toolbarButton.addEventListener('keydown', event => {
     const key=event.code || event.key;
     if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)) {
      event.preventDefault();
      return;
     }
     if (['Enter','NumpadEnter','Space',' '].includes(key)) event.stopPropagation();
    });
    toolbarButton.addEventListener('keyup', event => {
     if (['Enter','NumpadEnter','Space',' '].includes(event.code || event.key)) event.stopPropagation();
    });
    // A pointer click opens rooms without leaving playback keyboard focus on this button.
    // Tab/Enter activation still uses the native button behavior.
    toolbarButton.addEventListener('mousedown', event => {
     if (event.button === 0) event.preventDefault();
    });
   }
   // Insert only our button into the lower row. Do not inherit native layer classes.
   if (toolbarButton.parentElement !== toolbar) {
    const controls = [...toolbar.children].filter(node => node.id !== id);
    toolbarButton.className = 'galaxy-party-player-button';
    // Confine the hit area to the button; keep the seek row above untouched.
    for(const [key,value] of Object.entries({position:'relative',inset:'auto',width:'3.5rem',height:'3.5rem',margin:'0',padding:'0',transform:'none',flex:'0 0 3.5rem',overflow:'hidden'}))toolbarButton.style.setProperty(key,value,'important');
    toolbar.insertBefore(toolbarButton, controls.find(node => node.matches('[class*="control-bar-buttons-menu-container-"]')) || null);
   }
   document.querySelectorAll('#' + id).forEach(node => { if (node !== toolbarButton) node.remove(); });
   bridge.hidden = true; bridge.style.display = 'none';
   const oldPanel = document.getElementById('galaxy-watchparty-panel');
   if (oldPanel) { oldPanel.hidden = true; oldPanel.style.display = 'none'; }
  } else if (!panel.hidden) {
   window.GalaxyWatchParty.close(); // Close on navigation; retain the iframe and room connection.
  }
  if (!root.getElementById('galaxy-party-toolbar-theme')) {
   const style = document.createElement('style'); style.id = 'galaxy-party-toolbar-theme';
   style.textContent = '#panel{border-color:#ffffff24;border-radius:18px;background:#14121c;box-shadow:0 24px 80px #000b}header{background:#1e192b;padding:12px 16px;border-bottom:1px solid #ffffff14}header span{font-weight:650;letter-spacing:.2px}header a{color:#c8baff;text-decoration:none}header button{background:transparent;border:0;font-size:22px;padding:0 6px}iframe{height:calc(100% - 91px)}footer{color:#91879f;padding:8px 12px;font-size:10px}';
   root.append(style);
  }
  if (!document.getElementById('galaxy-party-toolbar-style')) {
   const style = document.createElement('style'); style.id = 'galaxy-party-toolbar-style';
   style.textContent = '#' + id + '{appearance:none;border:0;background:transparent;color:inherit;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;flex-shrink:0}#' + id + ' svg{width:2.25em;height:2.25em;pointer-events:none}#' + id + ':hover,#' + id + '[aria-expanded="true"]{color:#c8baff}#' + id + ':focus-visible{outline:2px solid #b59aff;outline-offset:-3px;border-radius:8px}';
   document.head.append(style);
  }
  if (observedPanel !== panel) {
   observedPanel = panel;
   let wasVisible = !panel.hidden;
   const update = () => {
    toolbarButton?.setAttribute('aria-expanded', String(!panel.hidden));
    if (wasVisible && panel.hidden && toolbarButton?.isConnected) toolbarButton.focus({preventScroll:true});
    wasVisible = !panel.hidden;
   };
   new MutationObserver(update).observe(panel, {attributes:true,attributeFilter:['hidden']});
   panel.setAttribute('role', 'dialog');
   update();
  }
  applyLanguage();
 }
 function schedule() { if (!queued) { queued = true; requestAnimationFrame(reconcile); } }
 function start() {
  new MutationObserver(schedule).observe(document.documentElement, {childList:true,subtree:true});
  window.addEventListener('hashchange', schedule); schedule();
  window.addEventListener('focus', () => {void refreshLanguage();});
  window.addEventListener('message', event => {
   const frame=document.getElementById('galaxy-watch-party')?.shadowRoot?.querySelector?.('iframe');
   if(!frame || event.source!==frame.contentWindow || event.data?.type!=='galaxy-watchparty-ready')return;
   try {if(event.origin!==new URL(frame.src).origin)return;} catch {return;}
   lastLocaleFrame=null;
   void refreshLanguage();
  });
  new MutationObserver(() => {void refreshLanguage();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
  setInterval(() => {void refreshLanguage();},1500);
  window.GalaxyWatchPartyLocale={refresh:refreshLanguage};
  void refreshLanguage();
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
