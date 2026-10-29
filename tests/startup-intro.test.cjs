// Stremio Galaxy startup lifecycle regression tests, GPL-3.0.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('./hover-runtime/node_modules/jsdom');
const script=fs.readFileSync(path.join(__dirname,'../assets/startup-logo/intro.js'),'utf8');
function fixture(reduced=false){
 const dom=new JSDOM('<canvas id="stars"></canvas><img id="logo"><canvas id="model"></canvas><div id="name"></div>',{runScripts:'outside-only'}),w=dom.window,messages=[];
 let clock=1,pending=null;w.performance.now=()=>clock;w.matchMedia=()=>({matches:reduced});w.chrome={webview:{postMessage:m=>messages.push(m)}};
 w.requestAnimationFrame=fn=>{pending=fn;return 1;};w.cancelAnimationFrame=()=>{pending=null;};
 w.HTMLCanvasElement.prototype.getContext=()=>({setTransform(){},clearRect(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){},createLinearGradient(){return{addColorStop(){}};}});
 w.eval(script);return{w,messages,tick(ms){clock=ms;const fn=pending;pending=null;if(fn)fn(ms);},close(){dom.window.close();}};
}
{
 const f=fixture();f.w.__startGalaxyIntro();f.w.__startGalaxyIntro();assert.equal(f.messages.filter(x=>x==='galaxy-intro-started').length,1);
 f.w.__galaxyAppReady();f.tick(2702);assert(f.messages.includes('galaxy-intro-transition'));f.tick(3603);assert(f.messages.includes('galaxy-intro-finished'));f.close();
}
{
 const f=fixture();f.w.__startGalaxyIntro();f.tick(5000);assert(!f.messages.includes('galaxy-intro-transition'),'Never reveal UI before ready');
 f.w.__galaxyAppReady();f.tick(5016);f.tick(5917);assert(f.messages.includes('galaxy-intro-finished'));f.close();
}
{
 const f=fixture();f.w.__startGalaxyIntro();f.w.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape'}));f.tick(50);assert(!f.messages.includes('galaxy-intro-finished'));
 f.w.__galaxyAppReady();f.tick(100);f.tick(201);assert(f.messages.includes('galaxy-intro-finished'));f.close();
}
{
 const f=fixture(true);f.w.__startGalaxyIntro();f.w.__galaxyAppReady();f.tick(100);f.tick(201);assert(f.messages.includes('galaxy-intro-finished'),'Reduced motion bypasses intro');f.close();
}
assert.equal((script.match(/requestAnimationFrame\(/g)||[]).length,2,'One RAF chain: initial request plus reschedule');
const html=fs.readFileSync(path.join(__dirname,'../assets/startup-logo/intro.html'),'utf8');
assert(!/base64|<button|AudioContext|<template/i.test(html));
console.log('PASS: lifecycle, concurrent loading, slow UI, Escape, reduced motion, local assets.');
