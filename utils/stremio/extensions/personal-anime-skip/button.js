(() => {
  'use strict';
  if (window.top !== window || window.__personalAnimeSkipButton) return;
  window.__personalAnimeSkipButton = true;
  const PROPERTY = 'user-data/anime-skip-available';
  let available = false, kind = 'opening';
  const KIND = 'user-data/anime-skip-kind';
  let bridge = null;
  let requestId = 740000;
  const button = document.createElement('button');
  button.id = 'personal-anime-skip-button';
  button.type = 'button';
  button.lang = 'en';
  button.dir = 'ltr';
  button.textContent = 'Skip Intro  ⏭';
  button.setAttribute('aria-label', 'Skip Intro');
  button.title = 'Skip Intro — Tab';
  Object.assign(button.style, {
    position: 'fixed', left: 'max(3vw, 24px)', bottom: 'max(13vh, 100px)',
    zIndex: '2147483647', display: 'none', border: '1px solid rgba(255,255,255,.85)',
    borderRadius: '5px', padding: '13px 24px', background: 'rgba(20,20,20,.92)',
    color: '#fff', font: '600 clamp(16px, 1.5vw, 22px) "Segoe UI", sans-serif',
    cursor: 'pointer', boxShadow: '0 3px 16px rgba(0,0,0,.35)',
    pointerEvents: 'auto', userSelect: 'none', transition: 'background .15s,color .15s'
  });
  const render = () => {
    button.dataset.skipKind=kind;
    button.style.bottom=kind==='ending'?'max(22vh, 180px)':'max(13vh, 100px)';
    window.GalaxySkipLocale?.refresh();
    // Stremio's player is a hash route. Never show over library/account pages.
    const inPlayer = /^#\/player(?:\/|$|\?)/.test(window.location.hash);
    button.style.display = available && inPlayer && !(kind==='ending' && window.GalaxySongConfig?.endingSkip===false) ? 'block' : 'none';
    const parent = document.fullscreenElement || document.body;
    if (parent && button.parentNode !== parent) parent.appendChild(button);
  };
  const send = (event, args) => {
    if (!bridge) return false;
    bridge.postMessage(JSON.stringify({
      type: 6, object: 'transport', method: 'handleInboundJSON',
      id: ++requestId, args: [event, args]
    }));
    return true;
  };
  const command = args => send('mpv-command', args);
  button.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation();
    if (!available) return;
    // Lua rechecks current chapter on every click. The page never chooses a time.
    command(['script-message-to', 'anime_skip', 'skip-segment']);
    available = false; render();
  });
  button.addEventListener('pointerdown', event => event.stopPropagation());
  button.addEventListener('mouseenter', () => {
    button.style.background = '#fff'; button.style.color = '#111';
  });
  button.addEventListener('mouseleave', () => {
    button.style.background = 'rgba(20,20,20,.92)'; button.style.color = '#fff';
  });
  const receive = event => {
    let message = event.data;
    try { if (typeof message === 'string') message = JSON.parse(message); } catch { return; }
    if (message?.object !== 'transport' || !Array.isArray(message.args)) return;
    const [type, payload] = message.args;
    if(type==='mpv-prop-change' && payload?.name===KIND){kind=payload.data==='ending'?'ending':'opening';render();}
    if (type === 'mpv-prop-change' && payload?.name === PROPERTY) {
      available = payload.data === true;
      render();
    } else if (type === 'mpv-event-ended') {
      available = false; render();
    }
  };
  const connect = () => {
    const candidate = window.chrome?.webview;
    if (!candidate?.postMessage || !candidate?.addEventListener) return;
    if (candidate !== bridge) {
      if (bridge) bridge.removeEventListener('message', receive);
      bridge = candidate;
      bridge.addEventListener('message', receive);
    }
    send('mpv-observe-prop', [PROPERTY]);
    send('mpv-observe-prop', [KIND]);
    // Retry readiness in case the player initializes after the web interface.
    command(['script-message-to', 'anime_skip', 'button-ui-ready']);
  };
  window.addEventListener('hashchange', () => { available = false; render(); connect(); });
  document.addEventListener('fullscreenchange', render);
  render(); connect();
  setInterval(connect, 4000);
})();
