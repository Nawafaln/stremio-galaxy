// Stremio Galaxy packaging, GPL-3.0. Never package a used portable profile.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),{info,generate}=require('./generate_identity');
async function main(){
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
const stage=path.join(root,'release-staging',info.version+'-'+timestamp),payload=path.join(stage,'payload');
const release=path.join(root,'releases');
const source=path.join(root,'dist','win-x64');
const nsis=process.env.GALAXY_NSIS||'D:/StremioGalaxyTools/tools/nsis/nsis-3.13/makensis.exe';
const bootstrap=path.join(root,'utils/windows/MicrosoftEdgeWebview2Setup.exe');
if(!fs.existsSync(nsis))throw new Error('Set GALAXY_NSIS to the official NSIS makensis.exe');
if(fs.statSync(bootstrap).size<100000)throw new Error('Missing genuine Microsoft WebView2 bootstrapper');
fs.mkdirSync(payload,{recursive:true});fs.mkdirSync(release,{recursive:true});
function copy(src,rel){const dst=path.join(payload,rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst)}
function tree(src,rel){for(const e of fs.readdirSync(src,{withFileTypes:true})){if(e.isDirectory())tree(path.join(src,e.name),path.join(rel,e.name));else if(e.isFile())copy(path.join(src,e.name),path.join(rel,e.name))}}
const files=[info.executable,'stremio-runtime.exe','server.js','libmpv-2.dll','ffmpeg.exe','ffprobe.exe','avcodec-58.dll','avdevice-58.dll','avfilter-7.dll','avformat-58.dll','avutil-56.dll','postproc-55.dll','swresample-3.dll','swscale-5.dll','galaxy-icon.ico','LICENSE.md','NOTICE.md','app-identity.json'];
for(const name of files)copy(name===info.executable && process.env.GALAXY_BINARY_SOURCE?path.resolve(process.env.GALAXY_BINARY_SOURCE):name==='app-identity.json'?path.join(root,name):path.join(source,name),name);
// The verified distribution is the release input; duplicate build binaries are optional.
const built=path.join(root,'cmake-build-release-x64',info.executable);
if(fs.existsSync(built)&&hash(built)!==hash(path.join(payload,info.executable)))throw new Error('Built executable and distribution differ');
copy(path.join(root,'assets/startup-logo/THREE-LICENSE.txt'),'third-party-notices/three-startup.txt');
const notices=['curl.txt','nlohmann-json.txt','openssl.txt','webview2.txt','wil.txt','zlib.txt','discord-rpc.txt'];
for(const name of notices)copy(path.join(source,'third-party-notices',name),path.join('third-party-notices',name));
let settings=fs.readFileSync(path.join(root,'utils/stremio/stremio-settings.ini'),'utf8');
if(/^Root=/mi.test(settings)||/^OmdbApiKey=[^\r\n]+/mi.test(settings))throw new Error('Defaults contain a personal path or key');
if(!settings.includes('[GalaxyCache]'))settings+='\n[GalaxyCache]\nEnabled=1\n';
const defaults=path.join(payload,'defaults','portable_config');fs.mkdirSync(defaults,{recursive:true});
if(!settings.includes('[GalaxyWatchParty]'))settings+='\n[GalaxyWatchParty]\nEnabled=1\nPort=3210\n';
fs.writeFileSync(path.join(defaults,'stremio-settings.ini'),settings);
fs.writeFileSync(path.join(defaults,'mpv.conf'),'# Stremio Galaxy defaults. User changes survive upgrades.\nosd-margin-y=50\n');
fs.writeFileSync(path.join(defaults,'input.conf'),'# Stremio Galaxy: Tab / Shift+Tab bindings are provided by anime_skip.lua.\n');
copy(path.join(root,'utils/stremio/scripts/anime_skip.lua'),'owned/portable_config/scripts/anime_skip.lua');
tree(path.join(root,'utils/stremio/extensions/personal-anime-skip'),'owned/portable_config/extensions/personal-anime-skip');
tree(path.join(root,'utils/stremio/extensions/galaxy-addon-setup'),'owned/portable_config/extensions/galaxy-addon-setup');
tree(path.join(root,'utils/stremio/galaxy-anime'),'owned/galaxy-anime');
tree(path.join(root,'utils/stremio/galaxy-updater'),'owned/galaxy-updater');
copy(path.join(root,'utils/stremio/galaxy-update-channel.json'),'galaxy-update-channel.json');
copy(path.join(root,'utils/stremio/galaxy-launcher.cjs'),'owned/galaxy-launcher.cjs');
tree(path.join(root,'utils/stremio/extensions/galaxy-anime-ui'),'owned/portable_config/extensions/galaxy-anime-ui');
tree(path.join(root,'utils/stremio/webmods'),'owned/portable_config/webmods');
await require('./pack-watchparty.cjs').packWatchParty({project:root,party:path.resolve(process.env.GALAXY_WATCHPARTY_SOURCE||path.join(root,'../stremio-watchparty')),payload});
fs.writeFileSync(path.join(payload,'INSTALL.txt'),`${info.displayName} ${info.version}\nCommunity fork; GPL-3.0. See LICENSE.md and NOTICE.md.\n\nUpdates: close Galaxy (including the tray icon), download the newer Galaxy Setup from our release page, and run it over this installation. Settings, account profile and video cache are preserved. Automatic Galaxy updates download signed releases from the configured Galaxy GitHub repository and install on full exit. Settings > Updates can turn them off. An unconfigured channel makes no update requests.\n\nA fresh install requires Windows x64 and Microsoft WebView2 Runtime. Setup checks it and runs the signed Microsoft bootstrapper if missing (internet required). No original Stremio installation is required.\n\nGalaxy Anime replaces Anime Kitsu in Setup. Its local catalog service starts with Galaxy; confirm Install on the Galaxy Anime addon page to add the catalogs to your account. Existing account addons are not silently removed.\n\nWatch Party: the toolbar integration, Arabic/English interface and internal MPV companion are bundled. The companion starts automatically with Galaxy and connects to the shared HTTPS room service; no separate Node, Wrangler or Start-WatchParty.cmd is needed. Rooms use six-digit invite codes. Each device needs internet access and the same video. Setup does not deploy or change the cloud service.\n\nVideo cache location: Settings > Cache > Change folder; restart to apply. Uninstall leaves user settings, accounts and cache in place.\n`);
generate(path.join(stage,'generated'));
const generated=path.join(stage,'generated','app_identity.nsh');
fs.appendFileSync(generated,`\n!define APP_WINDOW_CLASS "${info.windowClass}"\n`);
const owned=[];
function walk(dir,relative=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const rel=path.join(relative,e.name);if(e.isDirectory())walk(path.join(dir,e.name),rel);else owned.push(rel)}}
walk(payload);
const paths=owned.filter(x=>!x.startsWith('defaults'+path.sep)).map(x=>x.startsWith('owned'+path.sep)?x.slice(6):x);
const ownedManifest='galaxy-owned-files.json';
fs.writeFileSync(path.join(payload,ownedManifest),JSON.stringify([...paths,ownedManifest].map(p=>p.replaceAll('\\','/')),null,2));paths.push(ownedManifest);
const directories=new Set();for(const rel of paths){let dir=path.dirname(rel);while(dir!=='.'){directories.add(dir);dir=path.dirname(dir)}}
const removal=path.join(stage,'generated','galaxy-install-files.nsh');
fs.writeFileSync(removal,['!macro GalaxyRemoveFiles',...paths.map(rel=>` Delete "$INSTDIR\\${rel.replaceAll('/','\\')}"`),...[...directories].sort((a,b)=>b.length-a.length).map(dir=>` RMDir "$INSTDIR\\${dir.replaceAll('/','\\')}"`),'!macroend',''].join('\n'));
const output=path.join(release,`Stremio-Galaxy-${info.version}-windows-x64-setup.exe`);
const args=[`/DIDENTITY_INCLUDE=${generated}`,`/DREMOVAL_INCLUDE=${removal}`,`/DPAYLOAD_DIR=${payload}`,`/DWEBVIEW_BOOTSTRAPPER=${bootstrap}`,`/DSETUP_OUT=${output}`];
if(process.argv.includes('--test-mode')){args.push('/DGALAXY_TEST_MODE');args[args.findIndex(x=>x.startsWith('/DSETUP_OUT='))]=`/DSETUP_OUT=${path.join(stage,'Galaxy-Packaging-Test.exe')}`;}
const script=path.join(root,'utils/windows/installer/windows-installer.nsi');
execFileSync(nsis,[...args,script],{stdio:'inherit'});
const artifact=process.argv.includes('--test-mode')?path.join(stage,'Galaxy-Packaging-Test.exe'):output;
fs.writeFileSync(artifact+'.sha256',hash(artifact)+'  '+path.basename(artifact)+'\n');
fs.writeFileSync(path.join(stage,'payload-manifest.json'),JSON.stringify({version:info.version,files:owned.map(rel=>({path:rel,sha256:hash(path.join(payload,rel))}))},null,2));
fs.writeFileSync(path.join(release,'last-build.json'),JSON.stringify({stage,payload,artifact,sha256:hash(artifact)},null,2));
console.log(JSON.stringify({stage,artifact,bytes:fs.statSync(artifact).size,sha256:hash(artifact)},null,2));

}
main().catch(error=>{console.error(error);process.exitCode=1});

