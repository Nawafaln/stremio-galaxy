// Galaxy GPL-3.0. Year control next to genres, locale, routing and cleanup.
const {JSDOM}=require('./hover-runtime/node_modules/jsdom'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
(async()=>{
 const script=fs.readFileSync(path.resolve(__dirname,'../utils/stremio/extensions/galaxy-anime-ui/year-filter.js'),'utf8');
 const prefix='#/discover/http%3A%2F%2F127.0.0.1%3A11471%2Fmanifest.json/anime/';
 const d=new JSDOM('<div class="selectable-inputs-container-fixture"><div data-galaxy-genres>Genres</div></div>',{url:'https://stremio.zarg.me/'+prefix+'galaxy-popular?genre=Isekai&skip=20',runScripts:'outside-only'}),w=d.window;let lang='ar';w.GalaxyAnimeUI={getLanguage:()=>lang};w.fetch=async()=>({ok:true,json:async()=>({years:['2026','2025','2024']})});w.eval(script);await new Promise(setImmediate);await new Promise(setImmediate);
 const select=w.document.querySelector('[data-galaxy-year] select');assert(select);assert.equal(select.getAttribute('aria-label'),'سنة الإنتاج');assert.equal(w.document.querySelector('[data-galaxy-genres]').nextElementSibling,w.document.querySelector('[data-galaxy-year]'));
 select.value='2024';select.dispatchEvent(new w.Event('change'));let params=new URLSearchParams(w.location.hash.split('?')[1]);assert.equal(params.get('year'),'2024');assert.equal(params.get('genre'),'Isekai');assert(!params.has('skip'));
 lang='en';await w.GalaxyAnimeYearFilter.refresh();assert.equal(select.getAttribute('aria-label'),'Release year');assert.equal(select.value,'2024');select.value='';select.dispatchEvent(new w.Event('change'));params=new URLSearchParams(w.location.hash.split('?')[1]);assert(!params.has('year'));assert.equal(params.get('genre'),'Isekai');
 for(const id of ['galaxy-airing','galaxy-trending','galaxy-search']){w.location.hash=prefix+id+'?search=Title&year=2025';await w.GalaxyAnimeYearFilter.refresh();assert.equal(select.value,'2025')}
 w.location.hash='#/settings';await w.GalaxyAnimeYearFilter.refresh();assert(!w.document.querySelector('[data-galaxy-year]'));w.GalaxyAnimeYearFilter.destroy();w.GalaxyAnimeFiltersConfig={yearEnabled:false};w.eval(script);assert(!w.GalaxyAnimeYearFilter);d.window.close();console.log('PASS: year control placement, AR/EN, all sections, preserve genres/search, reset paging, all-years cleanup and disable');
})().catch(e=>{console.error(e);process.exitCode=1});
