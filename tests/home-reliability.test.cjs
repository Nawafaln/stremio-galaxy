const {JSDOM}=require('./hover-runtime/node_modules/jsdom');
const fs=require('node:fs'),assert=require('node:assert/strict');
const js=fs.readFileSync('assets/galaxy-layout.js','utf8'),css=fs.readFileSync('assets/galaxy-layout.css','utf8');
const wait=()=>new Promise(r=>setTimeout(r,90));
async function fixture(meta){
 const dom=new JSDOM('<main class="board-content-test"><section class="meta-row-container-test continue-watching-row-test"><div class="meta-items-container-test"><a class="meta-item-container-test"><div class="poster-container-test"></div></a></div></section></main>',{url:'https://stremio.zarg.me/#/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.__galaxyAppearance={};w.document.querySelector('section').__reactFiber$test={memoizedProps:{catalog:{items:[meta]}}};
 w.core={getState:async()=>({profile:{settings:{interfaceLanguage:'ara'}}})};
 w.eval(js.replace('__GALAXY_LAYOUT_CSS__',JSON.stringify(css)));await wait();
 return {w,close(){w.GalaxyLayout.destroy();dom.window.close()}};
}
(async()=>{
 const meta={id:'kitsu:1',type:'series',name:'A very long original addon title '.repeat(10),background:'https://example.org/background.jpg',poster:'https://example.org/poster.jpg',genres:['حركة']};
 const page=await fixture(meta);try{
  const {w}=page,hero=w.document.querySelector('.galaxy-home-hero'),image=hero.querySelector('.galaxy-home-backdrop');
  assert.equal(hero.querySelector('h1').title,meta.name,'full unmodified addon name remains accessible');
  assert.equal(hero.dataset.artState,'loading');
  image.dispatchEvent(new w.Event('error'));assert.equal(image.src,meta.poster,'failed backdrop uses this work poster');
  assert(image.hasAttribute('data-poster-fallback'));
  Object.defineProperty(image,'naturalWidth',{value:600});image.dispatchEvent(new w.Event('load'));
  assert.equal(image.style.opacity,'1');assert.equal(hero.dataset.artState,'ready');
  w.dispatchEvent(new w.CustomEvent('galaxy-metadata-updated'));await wait();
  assert.equal(hero.querySelector('.galaxy-home-backdrop'),image,'loaded fallback survives unrelated updates');
  image.dispatchEvent(new w.Event('error'));assert.equal(hero.dataset.artState,'unavailable');assert(!hero.querySelector('.galaxy-home-backdrop'));
  assert.equal(hero.querySelector('.galaxy-home-art-status').hidden,false);
 }finally{page.close()}
 const featured=await fixture({id:'kitsu:63431',type:'series',name:'Tsuihou Sareta Cheat Fuyo Majutsushi wa Kimama na Second Life wo Ouka Suru.: Ore wa Buki dake ja Naku',poster:'https://example.org/portrait.jpg'});try{
  const hero=featured.w.document.querySelector('.galaxy-home-hero'),img=hero.querySelector('.galaxy-home-backdrop');
  assert.equal(img.src,'https://imgsrv.crunchyroll.com/catalog/crunchyroll/1f72e4937240317e52af0568fb47cb88.png');
  assert(img.hasAttribute('data-verified-backdrop'));assert(!img.hasAttribute('data-poster-fallback'));
  img.dispatchEvent(new featured.w.Event('error'));assert.equal(img.src,'https://example.org/portrait.jpg');assert(!img.hasAttribute('data-verified-backdrop'));
 }finally{featured.close()}
 const other=await fixture({id:'kitsu:8',type:'series',name:'Different anime',background:'https://example.org/other-wide.jpg'});try{
  assert.equal(other.w.document.querySelector('.galaxy-home-backdrop').src,'https://example.org/other-wide.jpg','other titles keep their own artwork');
 }finally{other.close()}
 const empty=await fixture({id:'kitsu:2',type:'series',name:'Original title'});try{
  assert.equal(empty.w.document.querySelector('.galaxy-home-hero').dataset.artState,'unavailable');
  assert(empty.w.document.querySelector('.galaxy-home-art-status').textContent.includes('غير متاحة'));
 }finally{empty.close()}
 console.log('PASS: original long title retained, loading state, failed backdrop fallback, loaded artwork identity, complete failure and absent-artwork states.');
})().catch(e=>{console.error(e);process.exitCode=1});
