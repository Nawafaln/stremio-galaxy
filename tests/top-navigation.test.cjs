// Stremio Galaxy modification, GPL-3.0. Fixtures use inspected DOM fragments.
const {JSDOM}=require('./hover-runtime/node_modules/jsdom');
const {readFileSync}=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const js=readFileSync(path.join(__dirname,'../assets/top-navigation.js'),'utf8');
const css=readFileSync(path.join(__dirname,'../assets/top-navigation.css'),'utf8');
const keys=['home','discover','library','calendar','addons','settings'];
const markup=()=>`<div class="main-nav-bars-container-fixture"><nav class="horizontal-nav-bar-container-fixture"><div class="logo-container-fixture"></div><div class="search-bar-container-fixture"></div><div class="buttons-container-fixture"></div></nav><nav class="vertical-nav-bar-container-fixture">${keys.map(k=>`<a title="${k}" href="#/${k==='home'?'':k}" tabindex="-1"><svg viewBox="0 0 10 10"><path d="M0 0"></path></svg></a>`).join('')}</nav><div class="nav-content-container-fixture"></div></div>`;
(async()=>{
 const dom=new JSDOM('<!doctype html><html><body>'+markup()+'</body></html>',{url:'https://web.stremio.com/',runScripts:'outside-only'});
 const w=dom.window,config={enabled:true,css,allowedOrigins:[]};
 const originals=Array.from(w.document.querySelectorAll('[class*="vertical-nav-bar-"] a'));
 const run=()=>w.eval(js.replace('__GALAXY_TOP_NAVIGATION_CONFIG__',JSON.stringify(config)));
 run();const first=w.document.querySelector('[data-galaxy-nav-ready]');assert(first);
 const group=side=>first.querySelector(`[data-galaxy-nav-group="${side}"]`);
 assert.deepEqual(Array.from(group('left').querySelectorAll('a')).map(a=>a.dataset.galaxyDestination),[]);
 assert.deepEqual(Array.from(group('right').querySelectorAll('a')).map(a=>a.dataset.galaxyDestination),keys);
 assert(originals.every(a=>a.parentElement.className.includes('vertical-nav-bar-')),'React-owned links never moved');
 assert.equal(group('right').querySelector('[data-galaxy-destination="home"]').getAttribute('aria-current'),'page');
 assert.equal(first.querySelectorAll('.galaxy-nav-link').length,6);
 let routed=0;originals[0].addEventListener('click',event=>{event.preventDefault();routed++;});
 group('right').querySelector('[data-galaxy-destination="home"]').click();assert.equal(routed,1,'forward through original upstream route handler');
 assert.equal(first.querySelector('.galaxy-nav-link').getAttribute('tabindex'),null,'new links are keyboard accessible');
 run();assert.equal(first.querySelectorAll('.galaxy-nav-link').length,6,'repeat configure does not duplicate');
 w.history.replaceState(null,'','#/discover/catalog/series');w.dispatchEvent(new w.HashChangeEvent('hashchange'));
 assert.equal(first.querySelector('[data-galaxy-destination="discover"]').getAttribute('aria-current'),'page');
 assert(!first.querySelector('[data-galaxy-destination="home"]').hasAttribute('aria-current'));
 assert.equal(w.document.documentElement.dataset.galaxyTopnav,'1','persistent navigation stays enabled on sections');assert.equal(w.document.documentElement.dataset.galaxyHeader,'section','home header/search hidden on sections');
 for(const hash of ['#/settings','#/library','#/search?search=Aoashi','#/addons']){w.history.replaceState(null,'',hash);w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.equal(w.document.documentElement.dataset.galaxyHeader,hash.startsWith('#/settings')?'settings':'section',hash)}
 w.history.replaceState(null,'','#/');w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.equal(w.document.documentElement.dataset.galaxyTopnav,'1');assert.equal(w.document.documentElement.dataset.galaxyHeader,'home');
 assert.equal(w.document.getElementById('galaxy-detail-home'),null,'no extra Home link on Board');
 for(const hash of ['#/detail/movie/tt123','#/detail/series/tt123/tt123%3A1%3A1','#/detail/anime/kitsu%3A123','#/metadetails/series/tt123']){
  w.history.replaceState(null,'',hash);w.dispatchEvent(new w.HashChangeEvent('hashchange'));
  const link=w.document.getElementById('galaxy-detail-home');assert(link,hash);assert.equal(link.getAttribute('href'),'#/');
  assert.equal(link.getAttribute('aria-label'),'Home');assert.equal(w.document.querySelectorAll('#galaxy-detail-home').length,1);
 }
 w.document.documentElement.dataset.galaxyDirection='rtl';await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(w.document.getElementById('galaxy-detail-home').textContent,'الرئيسية');assert.equal(w.document.getElementById('galaxy-detail-home').dir,'rtl');
 const beforeHome=routed;w.document.getElementById('galaxy-detail-home').click();assert.equal(routed,beforeHome+1,'detail Home uses native routing');
 w.document.documentElement.dataset.galaxyDirection='ltr';await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(w.document.getElementById('galaxy-detail-home').textContent,'Home');
 for(const hash of ['#/player/movie/tt123','#/settings','#/']){w.history.replaceState(null,'',hash);w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.equal(w.document.getElementById('galaxy-detail-home'),null,'detail button removed outside details');}
 const lazy=w.document.createElement('section');lazy.innerHTML=markup();w.document.body.append(lazy);
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(w.document.querySelectorAll('[data-galaxy-nav-ready]').length,2,'SPA rows enhanced');
 w.GalaxyTopNavigation.disable();assert.equal(w.document.documentElement.dataset.galaxyTopnav,'0');
 w.GalaxyTopNavigation.destroy();assert.equal(w.document.querySelectorAll('[data-galaxy-nav-group]').length,0);
 assert.equal(originals.length,6);dom.window.close();
 const incomplete=new JSDOM('<!doctype html><html><body>'+markup().replace('href="#/settings"','href="#/missing"')+'</body></html>',{url:'https://web.stremio.com/',runScripts:'outside-only'});
 incomplete.window.eval(js.replace('__GALAXY_TOP_NAVIGATION_CONFIG__',JSON.stringify(config)));
 assert.equal(incomplete.window.document.querySelectorAll('[data-galaxy-nav-ready]').length,0,'keep sidebar if any destination missing');
 incomplete.window.GalaxyTopNavigation.destroy();incomplete.window.close();
 console.log('PASS: all six on the right, original links retained, keyboard access, active destination, no duplicates, lazy SPA enhancement, disable/cleanup, incomplete-nav fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
