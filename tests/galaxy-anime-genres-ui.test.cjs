// Galaxy GPL-3.0. Verified discovery DOM, route and accessible multi-select interactions.
const {JSDOM}=require('./hover-runtime/node_modules/jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const script=fs.readFileSync(path.resolve(__dirname,'../utils/stremio/extensions/galaxy-anime-ui/genre-filter.js'),'utf8');
 const prefix='https://web.stremio.com/#/discover/http%3A%2F%2F127.0.0.1%3A11471%2Fmanifest.json/anime/';
 const d=new JSDOM('<div class="selectable-inputs-container-test"><div class="selectable-inputs-test"><div class="select-input-test">Anime</div><div class="select-input-test">Galaxy Anime</div><div class="select-input-test">Genre</div><div class="filter-container-test"></div></div></div>',{url:prefix+'galaxy-airing?skip=20',runScripts:'outside-only'}),w=d.window;
 let lang='ar';w.GalaxyAnimeUI={getLanguage:()=>lang};w.fetch=async()=>({ok:true,json:async()=>({genres:[{id:'Action',ar:'أكشن'},{id:'Adventure',ar:'مغامرة'},{id:'Drama',ar:'دراما'}]})});
 w.eval(script);await new Promise(setImmediate);await new Promise(setImmediate);
 let box=w.document.querySelector('[data-galaxy-genres]');assert(box);assert.equal(box.dir,'rtl');const trigger=box.querySelector('button');trigger.click();assert.equal(trigger.getAttribute('aria-expanded'),'true');
 for(const value of ['Action','Adventure'])w.document.querySelector('input[value="'+value+'"]').click();assert.equal(trigger.getAttribute('aria-expanded'),'true','multiple choices stay open');w.document.querySelector('.galaxy-genre-apply').click();assert.equal(new URLSearchParams(w.location.hash.split('?')[1]).get('genre'),'Action,Adventure');assert(!w.location.hash.includes('skip='));await w.GalaxyAnimeFilters.refresh();
 assert(trigger.textContent.includes('(2)'));trigger.click();w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(trigger.getAttribute('aria-expanded'),'false');
 lang='en';await w.GalaxyAnimeFilters.refresh();assert.equal(box.dir,'ltr');assert(trigger.textContent.includes('Genres'));
 for(const id of ['galaxy-popular','galaxy-trending','galaxy-search']){w.location.hash=prefix.split('#')[1]+id+'?search=space&genre=Action';await w.GalaxyAnimeFilters.refresh();assert(w.document.querySelector('[data-galaxy-genres]'))}
 w.document.querySelector('.galaxy-genre-clear').click();assert(!w.location.hash.includes('genre='));assert(w.location.hash.includes('search=space'));
 w.location.hash='#/discover/other/anime/kitsu';w.dispatchEvent(new w.HashChangeEvent('hashchange'));await w.GalaxyAnimeFilters.refresh();assert(!w.document.querySelector('[data-galaxy-genres]'));assert.equal(w.document.querySelectorAll('[data-galaxy-genre-original]').length,0);
 w.GalaxyAnimeFilters.destroy();w.GalaxyAnimeFiltersConfig={enabled:false};w.eval(script);assert(!w.GalaxyAnimeFilters);d.window.close();console.log('PASS: multi-select/apply/clear, AR/EN, Escape, scope to all Galaxy catalogs, reset skip, retain search, cleanup and disable');
})().catch(e=>{console.error(e);process.exitCode=1});
