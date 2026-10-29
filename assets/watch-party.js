/* Stremio Galaxy Watch Party integration, GPL-3.0. */
((config) => {
 'use strict';
 if (window.top !== window || !config.enabled || !window.chrome?.webview) return;
 const origins = ['https://stremio.zarg.me', 'https://web.stremio.com', 'https://zaarrg.github.io'];
 if (!origins.includes(location.origin) || !(config.allowedOrigins || []).includes(location.origin)) return;
 if (window.GalaxyWatchParty) return;
 const port = Number.isInteger(config.port) && config.port >= 1024 && config.port <= 65535 ? config.port : 3210;
 const origin = 'http://127.0.0.1:' + port;
 let host, root, frame, panel, button, legacyButton, showPanel;
 function positionPanel(){
  if(!host||!panel)return;
  const controls=document.querySelector('[class*="player-container-"] [class*="control-bar-container-"]');
  const bottom=controls?Math.max(16,innerHeight-controls.getBoundingClientRect().top+12):25;
  host.style.bottom=bottom+'px';panel.style.bottom='0';
  panel.style.height='min(690px, '+Math.max(80,innerHeight-bottom-16)+'px)';
 }
 window.addEventListener('resize',positionPanel);
 function adoptExistingButton() {
  const existing = document.getElementById('galaxy-watchparty-button');
  if (!existing || !button || existing === legacyButton) return;
  legacyButton = existing;
  button.hidden = true; button.style.display = 'none';
  positionPanel();
  const oldPanel = document.getElementById('galaxy-watchparty-panel');
  if (oldPanel) { oldPanel.hidden = true; oldPanel.style.display = 'none'; }
  existing.setAttribute('aria-expanded', 'false');
  existing.onclick = () => showPanel(panel.hidden);
 }
 function mount() {
  if (!document.body || host?.isConnected) return;
  host = document.createElement('div');
  host.id = 'galaxy-watch-party';
  // Keep the panel above Stremio's full-screen player layer as well as on Board.
  Object.assign(host.style, {position:'fixed',right:'25px',bottom:'25px',zIndex:'2147483647',overflow:'visible',pointerEvents:'none',width:'0',height:'0'});
  root = host.attachShadow({mode: 'open'});
  const style = document.createElement('style');
  style.textContent = `
   :host{all:initial;pointer-events:none;position:fixed;right:25px;bottom:25px;z-index:2147483647;font:14px system-ui;color:#f7f7fb;direction:rtl}
   button,a{font:inherit;color:inherit;cursor:pointer}button{border:1px solid #665580;border-radius:10px;background:#221a35;padding:10px 14px}
   #panel{pointer-events:auto;position:absolute;right:0;bottom:56px;width:min(450px,calc(100vw - 36px));height:min(690px,calc(100vh - 160px));background:#101018;border:1px solid #55436c;border-radius:12px;box-shadow:0 12px 35px #0009;overflow:hidden}
   #panel[hidden]{display:none}header{display:flex;gap:12px;align-items:center;padding:8px 12px;background:#21182f}header span{flex:1}header button{padding:4px 8px}a{font-size:12px}iframe{width:100%;height:calc(100% - 76px);border:0;background:#101018}footer{font-size:11px;padding:4px 8px;color:#c5bbd9}
  `;
  button = document.createElement('button');
  button.type = 'button'; button.textContent = 'مشاهدة جماعية';
  // Only the dedicated toolbar opens rooms; never mount a floating launcher.
  button.hidden=true;button.style.display='none';
  button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'panel');
  panel = document.createElement('section'); panel.id = 'panel'; panel.hidden = true;
  panel.setAttribute('aria-label', 'غرف المشاهدة الجماعية');
  const header = document.createElement('header');
  const title = document.createElement('span'); title.textContent = 'Watch Party · MPV';
  const external = document.createElement('a'); external.href = origin; external.target = '_blank'; external.rel = 'noreferrer noopener'; external.textContent = 'فتح منفصل';
  const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'إغلاق لوحة الغرف');
  header.append(title, external, close); panel.append(header); root.append(style, button, panel); document.body.append(host);
  showPanel = visible => {
   positionPanel();panel.hidden = !visible; button.setAttribute('aria-expanded', String(visible));
   legacyButton?.setAttribute('aria-expanded', String(visible));
   if (visible && !frame) {
    frame = document.createElement('iframe'); frame.title = 'غرف Watch Party';
    frame.referrerPolicy = 'origin'; frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
    frame.src = origin + '/party'; panel.append(frame);
    const hint = document.createElement('footer'); hint.textContent = 'شغّل Start-WatchParty.cmd إذا لم تظهر الغرف.'; panel.append(hint);
   }
   if (!visible) document.getElementById('galaxy-watchparty-toolbar-button')?.focus({preventScroll:true});
  };
  button.addEventListener('click', () => showPanel(panel.hidden)); close.addEventListener('click', () => showPanel(false));
  root.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); showPanel(false); } });
  adoptExistingButton();
 }
 window.GalaxyWatchParty = { mount, toggle(){if(panel)showPanel(panel.hidden)}, close(){if(panel&&!panel.hidden)showPanel(false)} };
 let observer;
 function start() {
  if (!document.documentElement) return;
  if (!observer) { observer = new MutationObserver(adoptExistingButton); observer.observe(document.documentElement, {childList: true, subtree: true}); }
  mount();
 }
 document.addEventListener('DOMContentLoaded', start, {once: true});
 // Attach only our own root; do not move, replace, or restyle React-owned UI.
 window.addEventListener('hashchange', mount); start();
})(__GALAXY_WATCH_PARTY_CONFIG__);
