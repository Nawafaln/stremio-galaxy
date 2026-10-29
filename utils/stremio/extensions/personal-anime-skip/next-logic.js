((root) => {
  'use strict';
  const quality = text => {
    const found = new Set();
    const s = String(text || '').toLowerCase();
    for (const q of [360,480,576,720,1080,1440,2160,4320]) {
      if (new RegExp('(?:^|[^0-9])' + q + '[pi](?:[^a-z0-9]|$)', 'i').test(s)) found.add(q);
    }
    if (/(?:^|\W)(4k|uhd)(?:\W|$)/i.test(s)) found.add(2160);
    if (/(?:^|\W)8k(?:\W|$)/i.test(s)) found.add(4320);
    return found.size === 1 ? [...found][0] : null;
  };
  const dimensions = p => {
    if (!p || !Number.isFinite(p.w) || !Number.isFinite(p.h)) return null;
    const w=p.w, h=p.h;
    if (w>=7600 || h>=4200) return 4320;
    if (w>=3700 || h>=2100) return 2160;
    if (w>=2500 || h>=1400) return 1440;
    if (w>=1800 || h>=1000) return 1080;
    if (w>=1200 || h>=700) return 720;
    if (h>=560) return 576;
    if (h>=450) return 480;
    if (h>=330) return 360;
    return null;
  };
  const localHash = (link, location, route) => {
    try {
      const url = new URL(link, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname) return null;
      return new RegExp('^#/' + route + '(?:/|$)').test(url.hash) ? url.hash : null;
    } catch { return null; }
  };
  const pick = (groups, wanted, location) => {
    if (!wanted || !Array.isArray(groups)) return null;
    for (const group of groups) {
      if (group?.content?.type !== 'Ready' || !Array.isArray(group.content.content)) continue;
      for (const stream of group.content.content.slice(0,2000)) {
        if (quality([stream.name,stream.description].filter(Boolean).join(' ')) !== wanted) continue;
        const hash=localHash(stream.deepLinks?.player, location, 'player');
        if (hash) return {hash};
      }
    }
    return null;
  };
  const api = {quality, dimensions, localHash, pick};
  if (typeof module === 'object' && module.exports) module.exports=api;
  else root.__personalAnimeNextLogic=api;
})(typeof window === 'object' ? window : globalThis);
