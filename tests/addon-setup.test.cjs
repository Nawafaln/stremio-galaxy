// Galaxy GPL-3.0. No requests or account writes.
const {JSDOM}=require('./hover-runtime/node_modules/jsdom');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../utils/stremio/extensions/galaxy-addon-setup/setup.js'),'utf8');
function run(config,lang='en'){
 const dom=new JSDOM(`<html lang="${lang}"><body></body></html>`,{url:'https://stremio.zarg.me/#/',runScripts:'outside-only'});
 dom.window.GalaxyAddonSelection=config;dom.window.eval(script);return dom;
}
(async()=>{
 const torrentOnly=run({revision:'legacy-torrent-only',torrentio:true});assert.equal(torrentOnly.window.document.querySelector('#galaxy-addon-setup'),null);torrentOnly.window.close();
 let d=run({revision:'off',torrentio:false,galaxyAnime:false,subtitles:false});assert.equal(d.window.document.querySelector('#galaxy-addon-setup'),null);d.window.close();
 d=run({revision:'test',torrentio:true,galaxyAnime:true,subtitles:true},'ar');await Promise.resolve();
 let w=d.window,host=w.document.querySelector('#galaxy-addon-setup'),root=host.shadowRoot;
 assert.equal(root.querySelector('section').dir,'rtl');assert.equal(root.querySelectorAll('li').length,2);assert(!root.textContent.includes('Torrentio'),'legacy Torrentio selection is ignored');assert.match(root.querySelector('style').textContent,/color:#ff7676/);
 root.querySelector('li button').click();assert.equal(w.location.hash,'#/addons?addon='+encodeURIComponent('http://127.0.0.1:11471/manifest.json'));
 assert.equal(JSON.parse(w.localStorage.getItem('galaxy-addon-setup:test')).torrentio,undefined);assert.equal(JSON.parse(w.localStorage.getItem('galaxy-addon-setup:test')).galaxyAnime,true);
 assert.equal(JSON.parse(w.localStorage.getItem('galaxy-addon-setup:test')).dismissed,undefined,'opening is not reported as installation');
 root.querySelectorAll('li button')[1].click();assert.equal(w.location.hash,'#/addons?addon='+encodeURIComponent('https://opensubtitles-v3.strem.io/manifest.json'));assert.ok(!root.textContent.includes('Anime Kitsu'));
 root.querySelector('.hide').click();assert.equal(host.hidden,true);
 w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.equal(host.hidden,false);
 root.querySelector('.finish').click();assert.equal(w.document.querySelector('#galaxy-addon-setup'),null);w.eval(script);assert.equal(w.document.querySelector('#galaxy-addon-setup'),null);d.window.close();
 d=run({revision:'one',subtitles:true});root=d.window.document.querySelector('#galaxy-addon-setup').shadowRoot;assert.equal(root.querySelectorAll('li').length,1);root.querySelector('li button').click();assert.match(d.window.location.hash,/opensubtitles-v3/);d.window.close();
 console.log('PASS: unchecked silence, selected addons only, Arabic/RTL, red warning, verified encoded route, hide/reopen/dismiss, no account writes');
})().catch(e=>{console.error(e);process.exitCode=1});
