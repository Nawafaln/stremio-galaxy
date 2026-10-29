const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=path.join(root,'work/library-layout-regression');fs.mkdirSync(base,{recursive:true});
const css=fs.readFileSync(root+'/work/final-ui/upstream.css','utf8')+fs.readFileSync(root+'/assets/galaxy-layout.css','utf8');
const card=()=>'<a class="meta-item-container-Tj0Ib poster-shape-poster-MEhNx" data-galaxy-poster><div class="poster-container-qkw48"></div><div class="title-bar-container-1Ba0x"><span class="title-label-test">Old title</span><button class="menu-label-container-test">Menu</button></div><div class="galaxy-poster-details"><strong class="galaxy-poster-title">Buddy</strong><div class="galaxy-poster-facts"><span class="galaxy-poster-rating">★ 7.1</span><span class="galaxy-poster-year">2026</span></div><div class="galaxy-poster-genres"><span>Horror</span></div></div></a>';
const fixture='<!doctype html><html data-galaxy-home data-galaxy-library><meta charset="utf-8"><style>'+css+'html,body{margin:0;overflow:hidden}.reference{position:absolute;left:-1000px;width:240px}.library-container-zM_bj{height:900px;width:100vw}.library-content-PgX4O{height:100%}.meta-items-container-IKrND{min-height:0}.catalog-container-VNK_T{min-width:0}</style><div class="reference" data-galaxy-home-rail style="--galaxy-home-card-width:240px">'+card()+'</div><main class="library-container-zM_bj"><div class="library-content-PgX4O"><div class="catalog-container-VNK_T"><div class="selectable-inputs-container-hR3or">Filters</div><div class="meta-items-container-IKrND" data-galaxy-library-grid>'+Array.from({length:12},card).join('')+'</div></div><aside class="meta-preview-container-CoWs5">Native preview</aside></div></main></html>';
const file=path.join(base,'fixture.html');fs.writeFileSync(file,fixture);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const profile=path.join(base,'edge-'+Date.now());
 const child=cp.spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});let socket;
 try{
  const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<60&&!fs.existsSync(portFile);i++)await sleep(200);
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0],targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});let id=0;const pending=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}))});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
  await send('Page.enable');await send('Network.enable');await send('Network.setBlockedURLs',{urls:['http://*','https://*']});await send('Page.navigate',{url:'file:///'+file.replaceAll('\\','/')});await sleep(250);
  for(const width of [390,760,1280,1920])for(const dir of ['rtl','ltr']){
   await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   const result=await evaluate(`(()=>{document.documentElement.dir='${dir}';document.documentElement.dataset.galaxyDirection='${dir}';const grid=document.querySelector('[data-galaxy-library-grid]'),home=document.querySelector('.reference .galaxy-poster-details'),r=grid.getBoundingClientRect();return {left:r.left,right:r.right,cards:[...grid.children].map(n=>{const p=n.querySelector('[class*="poster-container-"]').getBoundingClientRect(),d=n.querySelector('.galaxy-poster-details'),b=d.getBoundingClientRect(),c=n.getBoundingClientRect();return {left:c.left,right:c.right,ratio:p.height/p.width,gap:b.top-p.bottom,bottom:c.bottom-b.bottom,titleHidden:getComputedStyle(n.querySelector('[class*="title-label-"]')).display==='none',sameGradient:getComputedStyle(d).backgroundImage===getComputedStyle(home).backgroundImage}})}})()`);
   assert(result.left>=-1&&result.right<=width+1,JSON.stringify({width,dir,result}));
   for(const c of result.cards){assert(c.left>=result.left-1&&c.right<=result.right+1);assert(Math.abs(c.ratio-1.5)<.01);assert(Math.abs(c.gap)<1);assert(Math.abs(c.bottom)<2);assert(c.titleHidden);assert(c.sameGradient)}
  }
  console.log('PASS: Library cards match Home gradients and poster ratio, metadata stays below artwork, old title hidden, grid within viewport in RTL/LTR at 390/760/1280/1920px.');await send('Browser.close').catch(()=>{});
 }finally{socket?.close();child.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
