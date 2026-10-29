// Stremio Galaxy services share the bundled runtime and Windows shutdown job.
'use strict';
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
let settings='';try{const bytes=fs.readFileSync(path.join(__dirname,'portable_config/stremio-settings.ini'));settings=bytes[0]===255&&bytes[1]===254?bytes.subarray(2).toString('utf16le'):bytes.toString('utf8');}catch{}
function enabled(section){const block=settings.match(new RegExp('\\['+section+'\\]([^]*?)(?=\\n\\[|$)','i'));return !block || !/^\s*Enabled\s*=\s*0\s*(?:;.*)?$/mi.test(block[1]);}
if(enabled('GalaxyAnime'))try{require('./galaxy-anime/server.cjs').start()}catch{console.error('[Galaxy Anime] unavailable; streaming server continues')}
if(enabled('GalaxyWatchParty'))try{
 const binary=path.join(__dirname,'watch-party/node.exe'),script=path.join(__dirname,'watch-party/start.cjs');
 if(fs.existsSync(binary)&&fs.existsSync(script)){
  const child=spawn(binary,[script],{windowsHide:true,stdio:['ignore','inherit','inherit']});
  child.on('error',()=>console.error('[Galaxy Watch Party] unavailable; streaming server continues'));
 }
}catch{console.error('[Galaxy Watch Party] unavailable; streaming server continues')}
require('./server.js');
