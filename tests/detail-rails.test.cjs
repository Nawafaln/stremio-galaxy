// Stremio Galaxy community modification, GPL-3.0.
// Integration fixtures reflect locally inspected MetaDetails/VideosList/StreamsList contracts.
const {JSDOM}=require('./hover-runtime/node_modules/jsdom');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const script=readFileSync('assets/detail-rails.js','utf8'),css=readFileSync('assets/detail-rails.css','utf8');
const wait=()=>new Promise(resolve=>setTimeout(resolve,0));
const episode=(n,season=1)=>({id:`tt123:${season}:${n}`,title:`Episode ${n}`,episode:n,season,thumbnail:'https://example.invalid/episode.jpg',deepLinks:{metaDetailsStreams:`#/detail/series/tt123/tt123%3A${season}%3A${n}`}});
const makeStream=(name,extra={})=>({name,description:'1080p\n💾 1.35 GB\n👥 40',deepLinks:{player:'#/player/'+encodeURIComponent(name)},...extra});
const group=(streams,name='Provider A',type='Ready')=>({addon:{transportUrl:'https://'+name,manifest:{name}},content:{type,content:streams}});
const fixture=()=>new JSDOM('<!doctype html><html lang="ar"><body><div class="metadetails-container-fixture"><div class="metadetails-content-fixture"><div class="meta-preview-fixture">Summary</div><div class="videos-list-container-fixture"></div><div class="streams-list-container-fixture"><a class="stream-container-fixture" href="#/player/unknown">Original</a></div></div></div></body></html>',{url:'https://web.stremio.com/#/detail/series/tt123',runScripts:'outside-only'});
(async()=>{
 const dom=fixture(),w=dom.window;w.__galaxyAppearance={};
 let model={metaItem:{content:{type:'Ready',content:{id:'tt123',type:'series',name:'Show title',videos:[episode(1),episode(2),episode(1,2)]}}},selected:{metaPath:{id:'tt123'},streamPath:{id:'tt123:1:1'}},streams:[group([
  makeStream('zero',{subtitles:[]}),makeStream('one',{subtitles:[{lang:'ara'}]}),
  makeStream('multi',{audioLanguages:['jpn'],subtitles:[{lang:'ara'},{lang:'eng'}],seeders:50}),
  makeStream('unknown'),makeStream('other',{quality:'4K',audioLanguages:['eng'],subtitleLanguages:['ara','fra'],seeders:100})]),group([], 'Loading','Loading')]};
 w.core={getState:async name=>name==='meta_details'?model:{profile:{settings:{interfaceLanguage:'ara'}}}};
 const original=w.document.querySelector('.stream-container-fixture');original.__reactFiber$fixture={memoizedProps:makeStream('unknown')};let played=0;original.addEventListener('click',e=>{e.preventDefault();played++});
 w.eval(script.replace('__GALAXY_DETAIL_RAILS_CSS__',JSON.stringify(css)));await wait();
 const api=w.GalaxyDetailRails,d=api.describe;
 const torrent={name:'Torrentio\n1080p',description:'Aoashi.S01.1080p.Blu-Ray.10-Bit.Dual-Audio.TrueHD.x265-iAHD\nAoashi.S01E01.1080p.Blu-Ray.10-Bit.Dual-Audio.TrueHD.x265-iAHD.mkv\n👤 39 💾 1.82 GB ⚙️ NyaaSi\nDubbed / Dual Audio',infoHash:'6c90b31b54d11997ae8c965fef90a5768683f667',fileIdx:0,sources:['tracker:udp://tracker.example:80/announce','dht:abc'],behaviorHints:{filename:'episode.mkv'}};
 // Match the real Torrentio description inspected in the application, without inferring languages.
 // Provider flags remain literal expected codes; filename tokens are never guessed as subtitle tracks.
 assert.deepEqual(Array.from(api.expectedSubtitleCodes({description:'🇬🇧 / 🇷🇺 / 🇵🇹 / 🇪🇸 / 🇲🇽 / 🇨🇳 / 🇹🇼 / 🇫🇷 / 🇵🇱'})),['GB','RU','PT','ES','MX','CN','TW','FR','PL']);
 assert.deepEqual(Array.from(api.expectedSubtitleCodes({description:'GB / RU / PT / ES / MX / CN / TW / FR / PL'})),['GB','RU','PT','ES','MX','CN','TW','FR','PL']);
 assert.deepEqual(Array.from(api.expectedSubtitleCodes({description:'1080p CR WEB-DL AAC2.0 H.264-VARYG\nDual Audio\nBD / HD'})),[]);
 assert.equal(d({description:'🇬🇧 / 🇷🇺'}).subtitleCount,null);assert.equal(d({description:'🇬🇧 / 🇷🇺'}).subtitles,null);
 const td=api.torrentDetails(torrent);assert.equal(td.filename,'episode.mkv');assert.equal(td.indexer,'NyaaSi');assert.equal(td.audioClaim,'Dual Audio');assert.equal(td.audioCodec,'TrueHD');assert.equal(td.videoCodec,'x265');assert.equal(td.videoSource,'Blu-Ray');assert.equal(td.bitDepth,'10-Bit');assert.equal(td.fileIndex,0);assert.equal(td.infoHash,torrent.infoHash);assert.deepEqual(Array.from(td.trackers),['udp://tracker.example:80/announce']);assert.equal(d(torrent).audio,null);assert.equal(d(torrent).subtitleCount,null,'release labels never become confirmed subtitle counts');
 assert.equal(api.torrentDetails({description:'Multi Subs'}).subtitleClaim,'Multi Subs');assert.equal(d({description:'Multi Subs'}).subtitleCount,null);assert.equal(api.torrentDetails({infoHash:'bad'}).infoHash,null);assert.equal(api.torrentDetails({}).filename,null);
 assert.equal(w.document.querySelectorAll('.galaxy-server-details').length,3);
 w.document.querySelectorAll('.galaxy-server-details')[1].click();assert(w.document.querySelector('dialog[open]'));assert.equal(played,0,'details button never starts playback');assert(w.document.querySelector('dialog').textContent.includes('لم يحددها المصدر'));w.document.querySelector('.galaxy-torrent-close').click();assert(!w.document.querySelector('dialog'));
 assert.equal(d({}).subtitleCount,null);assert.equal(d({description:'Arabic English 🇯🇵'}).audio,null,'unlabelled languages never inferred');
 assert.equal(d({subtitles:[]}).subtitleCount,0);assert.equal(d({subtitleLanguages:[]}).subtitleCount,0);
 assert.equal(d({subtitles:[{id:1},{id:2}]}).subtitleCount,2);assert.deepEqual(Array.from(d({subtitles:[{id:1}]}).subtitles),[]);
 assert.equal(d({description:'Subtitles: none'}).subtitleCount,0);
 assert.equal(d({description:'Audio: jpn\nSubtitles: ara, eng'}).subtitleCount,2);
 assert.equal(d({description:'👥 1.2k\n1.35 GB\n4K'}).seeders,1200);assert.equal(d({quality:'4K'}).quality,'2160p');
 assert.equal(d({}).seeders,null);assert.equal(d({seeders:0}).seeders,0);
 assert(w.document.querySelector('[data-galaxy-rails]'));
 assert.equal(api.sourceType({infoHash:'abc'}),'torrent');assert.equal(api.sourceType({url:'https://media.example/video.mp4'}),'direct');assert.equal(api.sourceType({name:'[RD+] Provider',infoHash:'abc'}),'debrid');assert.equal(api.sourceType({name:'Provider'}),null,'unknown transport never guessed');
 assert.equal(w.document.querySelector('.galaxy-server-filters').hidden,true,'reference hides advanced filters initially');
 w.document.querySelector('.galaxy-filter-toggle').click();assert.equal(w.document.querySelector('.galaxy-server-filters').hidden,false);assert.equal(w.document.querySelector('.galaxy-filter-toggle').getAttribute('aria-expanded'),'true');
 w.document.querySelector('.galaxy-detail-rails').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(w.document.querySelector('.galaxy-server-filters').hidden,true);
 assert.equal(w.document.querySelectorAll('[role="tab"]').length,4);w.document.querySelector('[data-source-type="torrent"]').click();assert.equal(w.document.querySelectorAll('.galaxy-server-card').length,0,'unknown transport stays only in All');w.document.querySelector('[data-source-type=""]').click();assert.equal(w.document.querySelectorAll('.galaxy-server-card').length,3);
 assert(w.document.querySelector('[aria-current] .galaxy-episode-active svg'),'selected episode play overlay');assert(w.document.querySelector('.galaxy-server-play svg'),'round server play icon');assert(!w.document.querySelector('.galaxy-server-card h3'),'compact provider-based reference card');
 assert.equal(w.document.querySelectorAll('.galaxy-episode-card').length,2);
 // A failed/pending thumbnail never exposes the browser icon or duplicate episode text.
 const thumbnail=w.document.querySelector('img.galaxy-episode-image'),originalThumbnail=episode(1).thumbnail;
 assert.equal(thumbnail.getAttribute('src'),originalThumbnail);assert.equal(thumbnail.alt,'');assert.equal(thumbnail.style.opacity,'0');assert.equal(thumbnail.loading,'lazy');
 Object.defineProperty(thumbnail,'naturalWidth',{value:640,configurable:true});thumbnail.dispatchEvent(new w.Event('load'));
 assert.equal(thumbnail.style.opacity,'1','successful original image becomes visible');
 thumbnail.dispatchEvent(new w.Event('error'));assert.equal(thumbnail.style.opacity,'0');assert(thumbnail.isConnected,'error does not replace image or change its request');assert.equal(thumbnail.getAttribute('src'),originalThumbnail);
 Object.defineProperty(thumbnail,'naturalWidth',{value:0,configurable:true});thumbnail.dispatchEvent(new w.Event('load'));assert.equal(thumbnail.style.opacity,'0','empty image stays invisible');
 Object.defineProperty(thumbnail,'naturalWidth',{value:640,configurable:true});thumbnail.dispatchEvent(new w.Event('load'));assert.equal(thumbnail.style.opacity,'1','a later successful load remains supported');
 assert(w.document.querySelector('.galaxy-episode-copy strong').textContent.includes('Episode 1'),'episode label stays available outside the decorative image');
 model.streams.push(group([], 'Another loading provider','Loading'));await api.refresh();assert.equal(w.document.querySelector('img.galaxy-episode-image'),thumbnail,'stream updates retain decoded image nodes');assert.equal(thumbnail.style.opacity,'1','retained image never returns to hidden loading state');
 assert.equal(w.document.querySelectorAll('.galaxy-server-card').length,3,'hide only known zero and one; retain unknown');
 assert.equal(w.document.querySelectorAll('.galaxy-server-audio').length,3);assert.equal(w.document.querySelectorAll('.galaxy-server-subtitles').length,3);
 assert(w.document.querySelector('[data-best]').textContent.includes('Provider A'));
 assert(w.document.querySelector('[data-best]').textContent.includes('2160p'),'seeders select best');
 assert(w.document.querySelector('.galaxy-server-card').textContent.includes('Show title'));
 assert(w.document.querySelector('.galaxy-server-card').textContent.includes('S1E1'));
 assert(w.document.querySelector('.galaxy-server-card[href="#/player/unknown"]').textContent.includes('غير معروف'));
 w.document.querySelector('.galaxy-server-card[href="#/player/unknown"]').click();assert.equal(played,1,'play delegates to original React-owned link');
 const change=(input,value)=>{input.value=value;input.dispatchEvent(new w.Event('change'))};
 change(w.document.querySelector('.galaxy-server-filters select'),'2160p');assert.equal(w.document.querySelectorAll('.galaxy-server-card').length,1);
 change(w.document.querySelector('.galaxy-server-filters select'),'');
 let checkbox=w.document.querySelector('input[type="checkbox"]');checkbox.checked=false;checkbox.dispatchEvent(new w.Event('change'));assert.equal(w.document.querySelectorAll('.galaxy-server-card').length,5);
 let filters=w.document.querySelectorAll('.galaxy-server-filters select');change(filters[2],'jpn');assert.equal(w.document.querySelectorAll('.galaxy-server-card').length,1);
 filters=w.document.querySelectorAll('.galaxy-server-filters select');change(filters[2],'');change(w.document.querySelectorAll('.galaxy-server-filters select')[3],'fra');assert.equal(w.document.querySelectorAll('.galaxy-server-card').length,1);
 change(w.document.querySelectorAll('.galaxy-server-filters select')[3],'');
 change(w.document.querySelector('.galaxy-season select'),'2');assert.equal(w.document.querySelectorAll('.galaxy-episode-card').length,1);assert(w.document.querySelector('.galaxy-episode-card').href.includes('tt123%3A2%3A1'));
 const input=w.document.querySelector('input[type="search"]');input.value='missing';input.dispatchEvent(new w.Event('input'));assert.equal(w.document.querySelectorAll('.galaxy-episode-card').length,0);
 await api.refresh();assert.equal(w.document.querySelectorAll('.galaxy-detail-rails').length,1,'poll is idempotent');
 // A route change must immediately remove old stream links, even while core still reports the prior episode.
 w.location.hash='#/detail/series/tt123/tt123%3A1%3A2';w.dispatchEvent(new w.HashChangeEvent('hashchange'));
 assert.equal(w.document.querySelectorAll('.galaxy-server-card').length,0,'old servers removed synchronously on episode switch');
 assert(w.document.querySelector('[data-servers]').textContent.includes('تحميل'),'loading shown for new episode');
 await api.refresh();assert.equal(w.document.querySelectorAll('.galaxy-server-card').length,0,'stale core results remain suppressed');
 // Same-title route transitions keep episodes alongside newly selected servers.
 w.location.hash='#/detail/series/tt123/tt123%3A1%3A2';model.selected.streamPath.id='tt123:1:2';await api.refresh();
 assert(w.document.querySelector('.galaxy-server-card').textContent.includes('S1E2'));
 // Untrusted provider text remains literal and never creates markup.
 model.streams=[group([makeStream('<img src=x onerror=alert(1)>')])];await api.refresh();assert(!w.document.querySelector('.galaxy-server-card img'));
 model.streams=[group([makeStream('torrent-info',torrent)])];await api.refresh();
 assert(w.document.querySelector('.galaxy-server-release').textContent.includes('x265'));assert(w.document.querySelector('.galaxy-server-audio').textContent.includes('Dual Audio'));assert(w.document.querySelector('.galaxy-server-indexer').textContent.includes('NyaaSi'));
 const playbackBefore=played;w.document.querySelector('.galaxy-server-details').click();assert.equal(played,playbackBefore);assert(w.document.querySelector('dialog').textContent.includes(torrent.infoHash));assert(w.document.querySelector('dialog').textContent.includes('TrueHD'));
 w.document.querySelector('dialog').dispatchEvent(new w.Event('cancel',{cancelable:true}));assert(!w.document.querySelector('dialog'),'Escape/cancel closes details');
 // A source cannot turn its description into HTML inside the information dialog.
 model.streams=[group([makeStream('<img src=x onerror=alert(1)>')])];await api.refresh();w.document.querySelector('.galaxy-server-details').click();assert(!w.document.querySelector('dialog img'));w.document.querySelector('.galaxy-torrent-close').click();
 w.location.hash='#/player/test';await api.refresh();assert.equal(w.document.querySelectorAll('.galaxy-detail-rails').length,0);assert(!original.closest('[data-galaxy-native-hidden]'));
 api.destroy();assert(!w.document.querySelector('#galaxy-detail-rails-style'));dom.window.close();
 // Stale async model cannot install a panel on another route.
 const stale=fixture();stale.window.__galaxyAppearance={};let resolveModel;stale.window.core={getState:name=>name==='meta_details'?new Promise(r=>resolveModel=r):Promise.resolve({})};stale.window.eval(script.replace('__GALAXY_DETAIL_RAILS_CSS__',JSON.stringify(css)));stale.window.location.hash='#/discover';resolveModel(model);await wait();assert(!stale.window.document.querySelector('.galaxy-detail-rails'));stale.window.GalaxyDetailRails.destroy();stale.window.close();
 // No data bridge: native panels stay usable instead of silently disappearing.
 const fallback=fixture();fallback.window.__galaxyAppearance={};fallback.window.eval(script.replace('__GALAXY_DETAIL_RAILS_CSS__',JSON.stringify(css)));await wait();assert(fallback.window.document.querySelector('[data-galaxy-loading]'),'native sidebar stays hidden during bridge discovery');const fallbackNow=fallback.window.Date.now();fallback.window.Date.now=()=>fallbackNow+9000;await fallback.window.GalaxyDetailRails.refresh();assert(!fallback.window.document.querySelector('[data-galaxy-native-hidden]'));assert(!fallback.window.document.documentElement.hasAttribute('data-galaxy-detail-route'));fallback.window.GalaxyDetailRails.destroy();fallback.window.close();
 // Discover the same core transport through React service context on direct episode links.
 const context=fixture(),cw=context.window;cw.__galaxyAppearance={};
 model.selected={metaPath:{id:'tt123'},streamPath:{id:'tt123:1:1'}};
 cw.document.querySelector('.metadetails-content-fixture').__reactFiber$context={dependencies:{firstContext:{memoizedValue:{core:{transport:{getState:async name=>name==='meta_details'?model:{profile:{settings:{interfaceLanguage:'ara'}}}}}}}}};
 cw.eval(script.replace('__GALAXY_DETAIL_RAILS_CSS__',JSON.stringify(css)));await wait();assert(cw.document.querySelector('.galaxy-detail-rails'),'React service context transport works');cw.GalaxyDetailRails.destroy();cw.close();
 // VideosList props still support the episode rail when no transport is exposed.
 const props=fixture(),pw=props.window;pw.__galaxyAppearance={};
 pw.document.querySelector('.videos-list-container-fixture').__reactFiber$props={memoizedProps:{metaItem:model.metaItem,season:2,seasonOnSelect(){}}};
 pw.eval(script.replace('__GALAXY_DETAIL_RAILS_CSS__',JSON.stringify(css)));await wait();assert.equal(pw.document.querySelectorAll('.galaxy-episode-card').length,1);pw.GalaxyDetailRails.destroy();pw.close();
 // A delayed core response cannot expose the native sidebar or guess Season 1 before saved Season 2 arrives.
 const delayed=fixture(),dw=delayed.window;dw.__galaxyAppearance={};let finishModel;
 const savedModel={metaItem:model.metaItem,libraryItem:{state:{video_id:'tt123:2:1'}},selected:{metaPath:{id:'tt123'},streamPath:null},streams:[]};
 dw.core={getState:name=>name==='meta_details'?new Promise(resolve=>finishModel=resolve):Promise.resolve({})};
 dw.eval(script.replace('__GALAXY_DETAIL_RAILS_CSS__',JSON.stringify(css)));
 assert(dw.document.documentElement.hasAttribute('data-galaxy-detail-route'),'route marked synchronously before first core response');assert(dw.document.querySelector('[data-galaxy-loading]'));assert(dw.document.querySelector('[data-galaxy-native-hidden]'));assert(dw.document.querySelector('.galaxy-detail-rails[data-loading]'));assert(!dw.document.querySelector('.galaxy-season select'),'loading never invents a season');
 finishModel(savedModel);await wait();assert.equal(dw.document.querySelector('.galaxy-season select').value,'2','saved video season is used on the first ready render');assert(!dw.document.querySelector('[data-galaxy-loading]'));assert(!dw.document.querySelector('.galaxy-detail-hero-loading'));assert.equal(dw.document.querySelectorAll('.galaxy-detail-rails').length,1);
 dw.GalaxyDetailRails.destroy();dw.close();
 // React mounting the detail DOM after the route is set still receives the shell before data resolves.
 const late=fixture(),lw=late.window;lw.__galaxyAppearance={};const mount=lw.document.querySelector('.metadetails-container-fixture');mount.remove();lw.core={getState:async name=>name==='meta_details'?savedModel:{}};
 lw.eval(script.replace('__GALAXY_DETAIL_RAILS_CSS__',JSON.stringify(css)));assert(lw.document.documentElement.hasAttribute('data-galaxy-detail-route'));lw.document.body.append(mount);await wait();await wait();assert(lw.document.querySelector('[data-galaxy-rails]'));assert.equal(lw.document.querySelector('.galaxy-season select').value,'2');lw.GalaxyDetailRails.destroy();lw.close();
 // Suspense can mount a nav-only detail root before any MetaDetails content exists.
 const suspense=fixture(),sw=suspense.window;sw.__galaxyAppearance={};const realContent=sw.document.querySelector('.metadetails-content-fixture');realContent.remove();sw.core={getState:async name=>name==='meta_details'?savedModel:{}};
 sw.eval(script.replace('__GALAXY_DETAIL_RAILS_CSS__',JSON.stringify(css)));assert(sw.document.querySelector('.galaxy-detail-pending-content .galaxy-detail-rails[data-loading]'),'nav-only fallback immediately gets the same dock shell');
 sw.document.querySelector('.metadetails-container-fixture').append(realContent);await wait();await wait();assert(!sw.document.querySelector('.galaxy-detail-pending-content'));assert.equal(sw.document.querySelectorAll('.galaxy-detail-rails').length,1);assert.equal(sw.document.querySelector('.galaxy-season select').value,'2');sw.GalaxyDetailRails.destroy();sw.close();
 // Same display and filter behavior applies to films, series and anime (including Kitsu routes).
 for(const [type,id,tail] of [['movie','tt123','/tt123'],['series','tt123',''],['series','kitsu:1',''],['anime','kitsu:1','']]){
  const item=fixture(),iw=item.window;iw.__galaxyAppearance={};iw.history.replaceState(null,'',`#/detail/${type}/${encodeURIComponent(id)}${tail}`);
  const content={id,type,name:'Work',videos:type==='movie'?[]:[episode(1)]};
  const state={metaItem:{content:{type:'Ready',content}},selected:{metaPath:{id},streamPath:null},streams:[group([
   makeStream('expected',{description:'1080p\n🇬🇧 / 🇷🇺 / 🇫🇷'}),makeStream('confirmed',{description:'🇬🇧 / 🇷🇺',subtitleLanguages:['eng','fra']}),makeStream('none',{description:'🇬🇧 / 🇷🇺',subtitles:[]})])]};
  iw.core={getState:async name=>name==='meta_details'?state:{profile:{settings:{interfaceLanguage:'ara'}}}};
  iw.eval(script.replace('__GALAXY_DETAIL_RAILS_CSS__',JSON.stringify(css)));await wait();
  assert.equal(iw.document.querySelectorAll('.galaxy-server-card').length,2);
  assert.deepEqual(Array.from(iw.document.querySelectorAll('.galaxy-server-card[href="#/player/expected"] .galaxy-language-expected'),n=>n.textContent),['GB','RU','FR'],type+' expected codes in subtitle row');
  assert(!iw.document.querySelector('.galaxy-server-card[href="#/player/confirmed"] [data-expected]'),'confirmed languages take precedence');
  let sub=iw.document.querySelectorAll('.galaxy-server-filters select')[3];assert(Array.from(sub.options).some(o=>o.value==='GB'&&o.textContent.includes('متوقعة')));sub.value='GB';sub.dispatchEvent(new iw.Event('change'));
  assert.equal(iw.document.querySelectorAll('.galaxy-server-card').length,1,type+' expected subtitle filter works');assert(iw.document.querySelector('.galaxy-server-card[href="#/player/expected"]'));
  sub=iw.document.querySelectorAll('.galaxy-server-filters select')[3];sub.value='';sub.dispatchEvent(new iw.Event('change'));
  const check=iw.document.querySelector('input[type="checkbox"]');check.checked=false;check.dispatchEvent(new iw.Event('change'));assert(!iw.document.querySelector('.galaxy-server-card[href="#/player/none"] [data-expected]'),'explicit no-subtitles overrides provider flags');
  iw.GalaxyDetailRails.destroy();iw.close();
 }
 console.log('PASS: metadata parsing, unknown languages, multi-subtitle filtering, quality/audio/subtitle filters, best result, original playback, episode search/seasons, route updates, XSS, async race, cleanup and fallback.');
})().catch(error=>{console.error(error);process.exit(1)});
