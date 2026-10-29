const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=path.join(root,'work/language-menu-regression');fs.mkdirSync(base,{recursive:true});
const css=fs.readFileSync(root+'/work/final-ui/upstream.css','utf8')+fs.readFileSync(root+'/assets/galaxy-layout.css','utf8')+fs.readFileSync(root+'/assets/account-menu.css','utf8');
const fixture='<!doctype html><html data-galaxy-topnav="1"><meta charset="utf-8"><style>'+css+'html,body{margin:0}.test-anchor{position:absolute;top:32px;inset-inline-end:24px;width:56px;height:56px}.nav-menu-container-Pl25j{height:400px}</style><div class="nav-menu-popup-label-XmUBo label-container-XOyzm test-anchor"><button>Account</button><div class="menu-container-B6cqK menu-direction-bottom-left-Dvtqk"><div class="nav-menu-container-Pl25j"><div class="user-info-container-uigVE"><div class="avatar-container-f6ino"></div><div class="user-info-details-XJ5OH">user@example.org</div></div><div class="nav-menu-section-j87xd"><a class="nav-menu-option-container-Qj9Xh"><span class="nav-menu-option-label-d7fgK">Terms and privacy / الأحكام وسياسة الخصوصية</span></a></div></div></div></div></html>';
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
   const bounds=await evaluate(`(()=>{document.documentElement.dir='${dir}';document.documentElement.dataset.galaxyDirection='${dir}';const n=document.querySelector('.nav-menu-container-Pl25j'),r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,visible:getComputedStyle(n.parentElement).visibility}})()`);
   assert(bounds.left>=0&&bounds.right<=width,JSON.stringify({width,dir,...bounds}));assert(bounds.width>200);assert.equal(bounds.visible,'visible');
  }
  console.log('PASS: account menu inside viewport in RTL/LTR at 390, 760, 1280 and 1920px using production CSS.');await send('Browser.close').catch(()=>{});
 }finally{socket?.close();child.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
