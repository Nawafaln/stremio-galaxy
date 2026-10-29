const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../utils/stremio/webmods/watch-party/watchparty.js'), 'utf8');

// Exercise the WebMod against a disposable DOM with the observed Galaxy toolbar layout.
function fixture(enabled = true) {
 const observers = [], tasks = [];
 class Element {
  constructor(tag) { this.tagName=tag; this.children=[]; this.style={}; this.attrs={}; this.hidden=false; this.className=''; }
  get classList() { return this.className.split(' ').filter(Boolean); }
  get isConnected() { return this === body || this === head || !!this.parentElement?.isConnected; }
  append(node) { this.insertBefore(node, null); }
  insertBefore(node, before) { node.remove(); const i=this.children.indexOf(before); this.children.splice(i<0?this.children.length:i,0,node); node.parentElement=this; }
  remove() { if(this.parentElement) { const a=this.parentElement.children; a.splice(a.indexOf(this),1); this.parentElement=null; } }
  setAttribute(k,v) { this.attrs[k]=v; }
  getElementById(id) { return this.children.find(n=>n.id===id) || this.children.map(n=>n.getElementById(id)).find(Boolean); }
  addEventListener(type,fn) { this['on'+type]=fn; }
  click() { this.onclick?.({stopPropagation(){}}); }
  focus() {}
 }
 const body=new Element('body'), head=new Element('head');
 const host=new Element('div'); host.id='galaxy-watch-party'; host.shadowRoot=new Element('shadow'); body.append(host);
 const panel=new Element('section'); panel.id='panel'; panel.hidden=true; host.shadowRoot.append(panel);
 let toolbar;
 function replaceToolbar() {
  toolbar?.remove(); toolbar=new Element('div'); body.append(toolbar);
  for(let i=0;i<5;i++){const node=new Element('div');node.className='control-bar-button-FQUsj disabled button-container-zVLH6';node.originalIndex=i;toolbar.append(node);}
  return toolbar;
 }
 replaceToolbar();
 const document={body,head,readyState:'complete',documentElement:body,
  createElement:tag=>new Element(tag), getElementById:id=>body.getElementById(id)||head.getElementById(id),
  querySelector:()=>toolbar?.isConnected?toolbar:null,
  querySelectorAll:selector=>{const id=selector.slice(1), result=[]; const walk=n=>{if(n.id===id)result.push(n);n.children.forEach(walk);};walk(body);return result;}
 };
 const window={chrome:{webview:{}},GalaxyWatchParty:enabled?{}:null,addEventListener(){}};window.top=window;
 const context=vm.createContext({window,document,URL,setInterval(){},location:{origin:'https://stremio.zarg.me'},requestAnimationFrame:fn=>tasks.push(fn),MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}}});
 vm.runInContext(script,context);
 const flush=()=>{while(tasks.length)tasks.shift()(); const bridge=document.getElementById('galaxy-watchparty-button');if(bridge&&!bridge.onclick)bridge.onclick=()=>{panel.hidden=!panel.hidden;};};
 const reconcile=()=>{observers[0].fn();flush();};flush();
 return {document,window,panel,body,replaceToolbar,reconcile,rerun:()=>vm.runInContext(script,context),get toolbar(){return toolbar;}};
}
test('toolbar icon sits between cast and subtitles, opens native panel, and hides floating bridge',()=>{
 const f=fixture(), button=f.document.getElementById('galaxy-watchparty-toolbar-button');
 assert.equal(f.toolbar.children[2],button);
 assert.equal(f.toolbar.children[1].originalIndex,1);assert.equal(f.toolbar.children[3].originalIndex,2);
 assert.ok(!button.classList.includes('disabled'));assert.equal(button.attrs['aria-label'],'Watch Party');
 button.click();assert.equal(f.panel.hidden,false);
 assert.equal(f.document.getElementById('galaxy-watchparty-button').style.display,'none');
});
test('React toolbar replacement and repeated injection retain exactly one working icon',()=>{
 const f=fixture(), original=f.document.getElementById('galaxy-watchparty-toolbar-button');
 for(let i=0;i<4;i++){f.replaceToolbar();f.reconcile();f.rerun();f.reconcile();assert.equal(f.document.querySelectorAll('#galaxy-watchparty-toolbar-button').length,1);assert.equal(f.toolbar.children[2],original);assert.equal(f.toolbar.children.filter(n=>n.originalIndex!==undefined).length,5);}
 original.click();assert.equal(f.panel.hidden,false);
 f.toolbar.remove();f.reconcile();assert.equal(f.panel.hidden,true);
 f.replaceToolbar();f.reconcile();assert.equal(f.toolbar.children[2],original);
});
test('disabled native integration never creates an icon or bypasses native permissions',()=>{
 const f=fixture(false);assert.equal(f.document.getElementById('galaxy-watchparty-toolbar-button'),undefined);assert.equal(f.toolbar.children.length,5);
});

test('toolbar reads Galaxy interfaceLanguage ahead of document language and keeps the same icon',async()=>{
 const f=fixture(),button=f.document.getElementById('galaxy-watchparty-toolbar-button');
 let locale='ara';
 f.document.documentElement.lang='en';
 f.window.core={transport:{getState:async name=>{assert.equal(name,'ctx');return {profile:{settings:{interfaceLanguage:locale}}};}}};
 await f.window.GalaxyWatchPartyLocale.refresh();
 assert.equal(button.attrs['aria-label'],'مشاهدة جماعية');
 assert.equal(f.panel.dir,'rtl');
 locale='eng';await f.window.GalaxyWatchPartyLocale.refresh();
 assert.equal(button.attrs['aria-label'],'Watch Party');assert.equal(f.panel.dir,'ltr');
 assert.equal(f.document.querySelectorAll('#galaxy-watchparty-toolbar-button').length,1);
});
