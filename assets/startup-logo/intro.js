/* Stremio Galaxy startup, GPL-3.0. One animation clock; no audio or demo UI. */
(() => {
 'use strict';
 const CONFIG=Object.freeze({logoAt:250,logoIn:1000,zoomAt:2700,zoomDuration:900,starDensity:0.00032,minStars:240,maxStars:850,meteors:6,maxDpr:1.5});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const starsCanvas=document.getElementById('stars'),ctx=starsCanvas.getContext('2d'),logo=document.getElementById('logo'),modelCanvas=document.getElementById('model'),name=document.getElementById('name');
 const send=s=>window.chrome?.webview?.postMessage(s);
 const clamp=x=>Math.max(0,Math.min(1,x));
 // CSS cubic-bezier(.22,.61,.36,1), solved in x so timing matches the native transition.
 function ease(x){x=clamp(x);let t=x;for(let i=0;i<8;i++){const q=1-t,b=3*q*q*t*.22+3*q*t*t*.36+t*t*t,d=3*q*q*.22+6*q*t*(.36-.22)+3*t*t*(1-.36);if(d<.00001)break;t=clamp(t-(b-x)/d);}return 3*(1-t)*(1-t)*t*.61+3*(1-t)*t*t+t*t*t;}
 let width=1,height=1,dpr=1,stars=[],meteors=[],start=0,raf=0,ended=false,ready=false,skip=false,transition=false,transitionAt=0,last=0,frames=0,frameTotal=0,frameMax=0,three=null;
 const pointer={x:0,y:0};
 function resize(){
  width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,CONFIG.maxDpr);
  starsCanvas.width=Math.round(width*dpr);starsCanvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const count=Math.round(Math.max(CONFIG.minStars,Math.min(CONFIG.maxStars,width*height*CONFIG.starDensity/Math.sqrt(dpr))));
  stars=Array.from({length:count},(_,i)=>({x:Math.random()*width,y:Math.random()*height,layer:i%3,phase:Math.random()*6.28,r:.45+Math.random()*.65,glow:0}));
  meteors=Array.from({length:CONFIG.meteors},(_,i)=>({at:300+i*430+Math.random()*150,x:width*(.1+Math.random()*.8),y:height*Math.random()*.7,angle:(Math.random()<.5?.2:2.4)+Math.random()*.55,life:430+Math.random()*180}));
  if(three){three.renderer.setPixelRatio(dpr);three.renderer.setSize(width,height,false);three.camera.aspect=width/height;three.camera.updateProjectionMatrix();three.distance=(height/(.46*Math.min(width,height)))/(2*Math.tan(17.5*Math.PI/180));}
 }
 function drawStars(t,dt){
  ctx.clearRect(0,0,width,height);const active=[];
  if(!reduced)for(const m of meteors){const p=(t-m.at)/m.life;if(p<0||p>1)continue;const dx=Math.cos(m.angle),dy=Math.sin(m.angle),travel=Math.min(width,height)*.65;
   const x=m.x+dx*travel*p,y=m.y+dy*travel*p,len=110+70*p,alpha=Math.sin(p*Math.PI);active.push({x,y});
   const g=ctx.createLinearGradient(x-dx*len,y-dy*len,x,y);g.addColorStop(0,'rgba(107,73,220,0)');g.addColorStop(.65,`rgba(128,110,255,${alpha*.5})`);g.addColorStop(1,`rgba(206,232,255,${alpha})`);ctx.strokeStyle=g;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x-dx*len,y-dy*len);ctx.lineTo(x,y);ctx.stroke();
  }
  for(const s of stars){const depth=s.layer+1,x=(s.x+pointer.x*depth*5+(!reduced?t*.002*depth:0))%width,y=(s.y+pointer.y*depth*4)%height;
   s.glow=Math.max(0,s.glow-dt*.002);for(const m of active)if((x-m.x)**2+(y-m.y)**2<3600)s.glow=1;
   const alpha=(.28+depth*.14+(reduced?0:Math.sin(t*.001*(.6+depth*.3)+s.phase)*.15)+s.glow*.35)*ease(t/500);
   ctx.fillStyle=`rgba(${s.layer===1?'167,157,255':'186,215,255'},${clamp(alpha)})`;ctx.beginPath();ctx.arc(x,y,s.r*(.65+depth*.3)+s.glow,0,Math.PI*2);ctx.fill();
  }
 }
 function finish(){if(ended)return;ended=true;cancelAnimationFrame(raf);send('galaxy-intro-finished');if(three)three.renderer.dispose();removeEventListener('resize',resize);}
 function frame(now){
  if(ended)return;const t=now-start,dt=last?now-last:16;last=now;
  if(frames>3){frameTotal+=dt;frameMax=Math.max(frameMax,dt);}frames++;
  drawStars(t,dt);
  const enter=reduced?1:ease((t-CONFIG.logoAt)/CONFIG.logoIn),canExit=ready&&(reduced||skip||t>=CONFIG.zoomAt);
  if(canExit&&!transition){transition=true;transitionAt=now;send('galaxy-intro-metrics:'+JSON.stringify({stars:stars.length,meteors:CONFIG.meteors,frames,meanMs:frameTotal/Math.max(1,frames-4),maxMs:frameMax,dpr,webgl:!!three}));send('galaxy-intro-transition');}
  const zoom=transition&&!reduced&&!skip?ease((now-transitionAt)/CONFIG.zoomDuration):0;
  const opacity=enter*(1-zoom*.85);name.style.opacity=String(enter*(1-clamp((t-2300)/400)));logo.style.opacity=three?'0':String(opacity);logo.style.transform=`translate(-50%,-50%) scale(${.88+.12*enter+zoom*5})`;
  if(three){const {renderer,scene,camera,pivot,distance}=three;pivot.scale.setScalar(.88+.12*enter);pivot.rotation.y=reduced?0:-.22*(1-enter);pivot.rotation.x=reduced?0:.07*(1-enter);camera.position.set(0,0,distance*(1-.88*zoom));camera.lookAt(0,0,0);modelCanvas.style.opacity=String(opacity);renderer.render(scene,camera);}
  if(transition&&(now-transitionAt>=(skip||reduced?100:CONFIG.zoomDuration))){send('galaxy-intro-metrics:'+JSON.stringify({stars:stars.length,meteors:CONFIG.meteors,frames,meanMs:frameTotal/Math.max(1,frames-4),maxMs:frameMax,dpr}));finish();return;}
  raf=requestAnimationFrame(frame);
 }
 window.__startGalaxyIntro=()=>{if(start||ended)return;resize();start=performance.now();send('galaxy-intro-started');raf=requestAnimationFrame(frame);};
 window.__galaxyAppReady=()=>{ready=true;};
 addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();skip=true;send('galaxy-intro-skip-request');}});
 addEventListener('pointermove',e=>{if(!reduced){pointer.x=e.clientX/width-.5;pointer.y=e.clientY/height-.5;}},{passive:true});
 addEventListener('resize',resize);
 function loaded(){send(three?'galaxy-intro-model-ready':'galaxy-intro-model-fallback');}
 try{
  if(!window.THREE)throw Error('WebGL unavailable');
  const renderer=new THREE.WebGLRenderer({canvas:modelCanvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setClearColor(0,0);renderer.outputEncoding=THREE.sRGBEncoding;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.02,50);scene.add(new THREE.HemisphereLight(0xbfc8ff,0x2a1850,1.1));
  const key=new THREE.DirectionalLight(0xffffff,1.3);key.position.set(1.5,2,3);scene.add(key);const rim=new THREE.DirectionalLight(0x7aa8ff,.9);rim.position.set(-2,-1,-1);scene.add(rim);
  // The imported mesh has intersecting faces. Rebuild clean depth from the
  // supplied alpha artwork, preserving real perspective without those surfaces.
  new THREE.TextureLoader().load('logo.webp',texture=>{
   if(ended){texture.dispose();renderer.dispose();return;}
   texture.encoding=THREE.sRGBEncoding;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   const pivot=new THREE.Group(),geometry=new THREE.PlaneGeometry(1,1);
   for(let i=0;i<18;i++){
    const shade=.45+.55*i/17;
    const material=new THREE.MeshBasicMaterial({map:texture,color:new THREE.Color(shade,shade,shade),alphaTest:.06,side:THREE.DoubleSide});
    const layer=new THREE.Mesh(geometry,material);layer.position.z=(i-17)*.004;pivot.add(layer);
   }
   scene.add(pivot);three={renderer,scene,camera,pivot,distance:3.5};resize();loaded();
  },undefined,()=>{renderer.dispose();loaded();});
 }catch{loaded();}
 // Native navigation completion starts immediately; assets can finish during the star reveal.
})();
