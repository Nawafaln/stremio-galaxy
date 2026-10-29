// Reproduces WebView2 AddScriptToExecuteOnDocumentCreated before <html> exists.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require(path.join(process.cwd(),'tests/hover-runtime/node_modules/jsdom'));
const wait=()=>new Promise(r=>setTimeout(r,140));
const watchdog=setTimeout(()=>{console.error('Document-created integration timed out');process.exit(1)},10000);
(async()=>{
 const d=new JSDOM('<main class="board-content-fixture"><section class="meta-row-container-fixture"><div class="meta-items-container-fixture"><a href="#/detail/movie/tt1" class="meta-item-container-fixture"><div class="poster-container-fixture"></div></a></div></section></main>',{url:'https://stremio.zarg.me/#/',runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
 const html=w.document.documentElement;w.document.removeChild(html);assert.equal(w.document.documentElement,null);
 w.__galaxyAppearance={};w.AbortSignal=AbortSignal;w.core={getState:async()=>({profile:{settings:{interfaceLanguage:'ara'}}})};
 const meta={id:'tt1',type:'movie',name:'Original',description:'Original overview',background:'https://example.org/backdrop.jpg'};html.querySelector('section').__reactFiber$test={memoizedProps:{catalog:{items:[meta]}}};
 w.fetch=async url=>({ok:true,json:async()=>url.includes('cinemeta')?{meta}:url.includes('/find/')?{movie_results:[{id:1}]}:url.includes('/genre/')?{genres:[]}:{id:1,title:'عنوان مترجم',overview:'قصة مترجمة',genres:[]}});
 const metadata=fs.readFileSync('assets/metadata-localization.js','utf8').replace('__GALAXY_METADATA_CONFIG__',JSON.stringify({apiKey:'0'.repeat(32)}));
 const layout=fs.readFileSync('assets/galaxy-layout.js','utf8').replace('__GALAXY_LAYOUT_CSS__',JSON.stringify(fs.readFileSync('assets/galaxy-layout.css','utf8')));
 assert.doesNotThrow(()=>w.eval(metadata+'\nwindow.__afterMetadata=true;\n'+layout),'an early metadata failure must not abort the remaining appearance script');
 assert.equal(w.__afterMetadata,true);assert(w.GalaxyMetadata&&w.GalaxyLayout,'both modules register before the document root exists');
 w.document.appendChild(html);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await wait();await wait();await wait();
 const hero=w.document.querySelector('.galaxy-home-hero');assert(hero,'large Home banner is restored after DOM initialization');assert(hero.querySelector('.galaxy-home-backdrop'),'banner artwork remains present');assert(hero.querySelector('.galaxy-home-summary').textContent.includes('قصة مترجمة'));assert(w.document.querySelector('.galaxy-poster-details'),'new card information strips initialize too');
 w.GalaxyLayout.destroy();w.GalaxyMetadata.destroy();d.window.close();clearTimeout(watchdog);console.log('PASS: document-created injection with no HTML root, remaining appearance modules initialize, large banner/artwork and localized overview survive, card info strips appear.');
})().catch(e=>{clearTimeout(watchdog);console.error(e);process.exitCode=1});
