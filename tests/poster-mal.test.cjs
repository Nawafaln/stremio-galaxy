// Galaxy GPL-3.0. Verified Fribb/Jikan data shapes; no live network.
const {JSDOM}=require('./hover-runtime/node_modules/jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const js=fs.readFileSync(path.join(__dirname,'../assets/poster-hover.js'),'utf8');
const mapping=[{mal_id:1,kitsu_id:1,anilist_id:1,imdb_id:['tt0213338']},{mal_id:2,kitsu_id:99,imdb_id:['tt999']},{mal_id:3,kitsu_id:99,imdb_id:['tt999']}];
const data={malId:1,type:'TV',year:1998,genres:[{name:'Action'},{name:'Sci-Fi'}],score:8.75};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function setup(id,opts={},custom){const dom=new JSDOM(`<a class="meta-item-container-fixture" href="#/detail/series/${id}/${id}"><div class="poster-container-fixture"></div></a>`,{url:'https://web.stremio.com/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,calls=[];w.fetch=async(url,options)=>{calls.push({url,options});if(custom)return custom(url,options);return {ok:true,json:async()=>url.includes('Fribb')?mapping:url.includes('jikan')?{data}:{meta:{id,genres:['Animation'],releaseInfo:'1998',imdbRating:'8.9'}}}};w.eval(js);w.GalaxyPosterHover.install(opts);const poster=w.document.querySelector('a');return {w,calls,poster,hover:()=>poster.dispatchEvent(new w.MouseEvent('mouseover',{bubbles:true})),out:()=>poster.dispatchEvent(new w.MouseEvent('mouseout',{bubbles:true,relatedTarget:w.document.body})),card:()=>w.document.getElementById('galaxy-poster-hover')?.shadowRoot.querySelector('.card'),close:()=>dom.window.close()}}
(async()=>{
 let s=setup('kitsu%3A1',{omdbApiKey:'fixture'});s.hover();await wait(370);assert.match(s.card().textContent,/MAL8.75/);assert.match(s.card().textContent,/1998/);assert.equal(s.calls.length,2);assert(!s.calls.some(c=>c.url.includes('omdb')));s.out();s.hover();await wait(330);assert.equal(s.calls.length,2,'mapping and score cached');s.close();
 s=setup('mal:1');s.hover();await wait(350);assert.equal(s.calls.length,1);assert.match(s.card().textContent,/MAL/);s.close();
 s=setup('anilist:1');s.hover();await wait(350);assert.match(s.card().textContent,/8.75/);s.close();
 s=setup('kitsu:99');s.hover();await wait(350);assert.equal(s.calls.length,1);assert(!s.card(),'ambiguous mapping is hidden');s.close();
 s=setup('tt0213338');s.hover();await wait(350);assert.match(s.card().textContent,/MAL8.75/);assert.match(s.card().textContent,/IMDb8.9/);assert.equal(s.card().querySelectorAll('.ratings .rating').length,2,'both scores share the same row');assert.equal(s.calls.length,3);s.close();
 s=setup('kitsu:1',{animeRatings:false});s.hover();await wait(350);assert.equal(s.calls.length,0);s.close();
 s=setup('mal:1',{},async()=>({ok:true,json:async()=>({data:{...data,malId:2}})}));s.hover();await wait(350);assert(!s.card(),'wrong returned MAL ID rejected');s.close();
 s=setup('mal:1',{},async()=>({ok:true,json:async()=>({data:{...data,score:null}})}));s.hover();await wait(350);assert(!s.card().querySelector('.rating'),'no invented score for unrated anime');s.close();
 s=setup('mal:1',{},async()=>({ok:false,status:429}));s.hover();await wait(350);s.out();s.hover();await wait(350);assert.equal(s.calls.length,1,'rate limit cooldown prevents repeated requests');s.close();
 s=setup('mal:1',{},(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')))));s.hover();await wait(350);s.out();assert(s.calls[0].options.signal.aborted);s.close();
 console.log('PASS: Kitsu/MAL/AniList IDs, percent encoding, missing IMDb fallback, explicit MAL label, memory cache, ambiguity guard, no OMDb for anime IDs, null/wrong scores, disable, 429 cooldown and abort');
})().catch(e=>{console.error(e);process.exitCode=1});
