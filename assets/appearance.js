// Stremio Galaxy modification, GPL-3.0. Injected by native WebView2, no extension.
((config) => {
  'use strict';
  if (window.top !== window) return;
  if (!['https://stremio.zarg.me','https://zaarrg.github.io','https://web.stremio.com'].includes(location.origin)) {
    // A custom --webui-url is supported too, but only when it hosts the UI root.
    // The native host provides the configured origin in allowedOrigins.
    if (!config.allowedOrigins.includes(location.origin)) return;
  }
  if (window.__galaxyAppearance) {
    window.__galaxyAppearance.setEnabled(config.enabled,config.css);
    return;
  }
  let enabled = Boolean(config.enabled);
  const styleId = 'galaxy-black-theme';
  const brandId = 'galaxy-brand-style';
  let rootObserver, titleObserver, pointerFrame;
  let pointerX=0,pointerY=0;
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const applyPointer=()=>{
    pointerFrame=undefined;
    const layer=document.getElementById('galaxy-universe');if(!layer)return;
    layer.style.setProperty('--galaxy-pointer-x',pointerX+'px');
    layer.style.setProperty('--galaxy-pointer-y',pointerY+'px');
    layer.style.setProperty('--galaxy-far-x',(pointerX*.45)+'px');
    layer.style.setProperty('--galaxy-far-y',(pointerY*.45)+'px');
  };
  const resetPointer=()=>{cancelAnimationFrame(pointerFrame);pointerX=0;pointerY=0;applyPointer();};
  const pointerMove=event=>{
    if(!enabled || document.hidden || reducedMotion?.matches || /^#\/player(?:\/|$)/.test(location.hash))return;
    // Cursor right/down -> stars left/up. Bounded offset avoids distracting travel.
    pointerX=-Math.max(-1,Math.min(1,event.clientX/Math.max(1,innerWidth)*2-1))*28;
    pointerY=-Math.max(-1,Math.min(1,event.clientY/Math.max(1,innerHeight)*2-1))*22;
    if(pointerFrame===undefined)pointerFrame=requestAnimationFrame(applyPointer);
  };
  const pointerLeave=event=>{if(!event.relatedTarget)resetPointer();};
  const brandCss = '[data-galaxy-wordmark]>*:not([data-galaxy-name]){display:none!important}' +
    '[data-galaxy-name]{color:var(--primary-foreground-color,#fff);font:600 17px "Segoe UI",sans-serif;white-space:normal}';
  // Stremio Galaxy - 3D Stars
  let starCanvas, starCtx, starFrame = null;
  let stars = [];
  let lastStarTime = 0;

  function createStarfield(universe) {
    if (starCanvas) return;

    starCanvas = document.createElement('canvas');
    starCanvas.id = 'galaxy-3d-stars';
    starCanvas.style.cssText = `
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      z-index:2;
      pointer-events:none;
      opacity:.75;
    `;

    universe.appendChild(starCanvas);
    starCtx = starCanvas.getContext('2d');

    if (!starCtx) return;

    stars = Array.from({ length: 170 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: .15 + Math.random() * .85,
      speed: .7 + Math.random() * .6
    }));
  }

  function drawStarfield(time) {
    starFrame = null;

    if (!starCtx || !enabled || document.hidden ||
        reducedMotion?.matches ||
        /^#\/player(?:\/|$)/.test(location.hash)) {
      lastStarTime = 0;
      return;
    }

    const dt = lastStarTime
      ? Math.min((time - lastStarTime) / 1000, .05)
      : 0;

    lastStarTime = time;

    const w = innerWidth;
    const h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);

    if (starCanvas.width !== Math.round(w * dpr) ||
        starCanvas.height !== Math.round(h * dpr)) {
      starCanvas.width = Math.round(w * dpr);
      starCanvas.height = Math.round(h * dpr);
    }

    starCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    starCtx.clearRect(0, 0, w, h);

    for (const star of stars) {
      star.z -= dt * .09 * star.speed;

      if (star.z <= .06) {
        star.x = Math.random() * 2 - 1;
        star.y = Math.random() * 2 - 1;
        star.z = 1;
      }

      const perspective = 1 / star.z;
      const x = w / 2 + star.x * w * .37 * perspective;
      const y = h / 2 + star.y * h * .37 * perspective;

      if (x < -10 || x > w + 10 ||
          y < -10 || y > h + 10) {
        star.z = 1;
        continue;
      }

      const size = Math.min(5.5, .35 * perspective);
      const alpha = Math.min(.85, .12 + (1 - star.z) * .7);

      starCtx.beginPath();
      starCtx.arc(x, y, size, 0, Math.PI * 2);
      starCtx.fillStyle = `rgba(224,207,255,${alpha})`;
      starCtx.fill();
    }

    starFrame = requestAnimationFrame(drawStarfield);
  }

  function syncStarfield(universe) {
    if (!universe) return;

    createStarfield(universe);

    const active = enabled &&
      !document.hidden &&
      !reducedMotion?.matches &&
      !/^#\/player(?:\/|$)/.test(location.hash);

    if (active && starFrame === null && starCtx) {
      starFrame = requestAnimationFrame(drawStarfield);
    } else if (!active) {
      if (starFrame !== null) cancelAnimationFrame(starFrame);
      starFrame = null;
      lastStarTime = 0;
    }
  }
  const update = () => {
    const html = window.document?.documentElement;
    if (!html) return;
    let universe=document.getElementById('galaxy-universe');
    if (!universe) {
      universe=document.createElement('div');universe.id='galaxy-universe';
      universe.setAttribute('aria-hidden','true');html.appendChild(universe);
    }
    // Decorative nebula planes share the existing hidden/player lifecycle.
    if (!universe.querySelector('.galaxy-nebula')) {
      for (const variant of ['near','far']) {
        const cloud=document.createElement('div');
        cloud.className='galaxy-nebula galaxy-nebula-'+variant;
        universe.appendChild(cloud);
      }
    }
    // A single decorative meteor group shares the theme/player/visibility lifecycle.
    if (!universe.querySelector('.galaxy-meteors')) {
      const meteors=document.createElement('div');meteors.className='galaxy-meteors';
      const paths=[[92,4,20,0,145],[73,25,27,-8,110],[112,48,32,-17,170],[44,-8,24,-13,120],[103,73,37,-24,155]];
      for(const [left,top,duration,delay,length] of paths){
        const meteor=document.createElement('span');meteor.className='galaxy-meteor';
        meteor.style.cssText='left:'+left+'%;top:'+top+'%;--galaxy-meteor-duration:'+duration+'s;--galaxy-meteor-delay:'+delay+'s;--galaxy-meteor-length:'+length+'px';
        meteors.appendChild(meteor);
      }
      universe.appendChild(meteors);
    }
    const paused=document.hidden?'1':'0';
    if(html.getAttribute('data-galaxy-motion-paused')!==paused)html.setAttribute('data-galaxy-motion-paused',paused);
    const player = /^#\/player(?:\/|$)/.test(location.hash);
    if(!enabled || player || document.hidden || reducedMotion?.matches)resetPointer();
    const flag = enabled ? '1' : '0';
    if (html.getAttribute('data-galaxy-black') !== flag) html.setAttribute('data-galaxy-black', flag);
    if (html.getAttribute('data-galaxy-player') !== (player?'1':'0')) html.setAttribute('data-galaxy-player',player?'1':'0');
    syncStarfield(universe);
    let style = document.getElementById(styleId);
    if (!style) {style = document.createElement('style'); style.id = styleId; style.textContent = config.css; html.appendChild(style);}
    // Never put the hidden style below a removed head/body node.
    if (style.textContent !== config.css) style.textContent = config.css;
    if (document.title !== config.name) document.title = config.name;
    let branding = document.getElementById(brandId);
    if (!branding) {branding=document.createElement('style');branding.id=brandId;branding.textContent=brandCss;html.appendChild(branding);}
    for (const logo of document.querySelectorAll('[class*="logo-container-"]')) {
      if (!logo.hasAttribute('data-galaxy-wordmark')) {
        logo.setAttribute('data-galaxy-wordmark','1');
        logo.setAttribute('title',config.name);logo.setAttribute('aria-label',config.name);
        const label=document.createElement('span');label.setAttribute('data-galaxy-name','1');label.textContent=config.name;logo.appendChild(label);
      }
    }
    const title = document.querySelector('title');
    if (title && !titleObserver) {
      titleObserver=new MutationObserver(()=>{if(document.title!==config.name)document.title=config.name});
      titleObserver.observe(title,{childList:true,characterData:true,subtree:true});
    }
  };
  const initialize = () => {
    if (!document.documentElement) return;
    update();
    if (!rootObserver) {
      rootObserver=new MutationObserver(update);
      rootObserver.observe(document.documentElement,{childList:true,subtree:true});
    }
  };
  window.__galaxyAppearance={
    setEnabled(value,css){enabled=Boolean(value);if(typeof css==='string')config.css=css;update();},
    destroy(){
      if (starFrame !== null) cancelAnimationFrame(starFrame);
      starFrame = null;
      starCanvas?.remove();
      starCanvas = null;
      starCtx = null;
      rootObserver?.disconnect();titleObserver?.disconnect();resetPointer();
      window.removeEventListener('hashchange',update);
      document.removeEventListener('visibilitychange',update);
      document.removeEventListener('mousemove',pointerMove);
      document.removeEventListener('mouseout',pointerLeave);
      reducedMotion?.removeEventListener('change',update);
      document.removeEventListener('DOMContentLoaded',initialize);
    }
  };
  window.addEventListener('hashchange',update);
  document.addEventListener('visibilitychange',update);
  document.addEventListener('mousemove',pointerMove,{passive:true});
  document.addEventListener('mouseout',pointerLeave);
  reducedMotion?.addEventListener('change',update);
  document.addEventListener('DOMContentLoaded',initialize,{once:true});
  initialize();
})(__GALAXY_APPEARANCE_CONFIG__);

