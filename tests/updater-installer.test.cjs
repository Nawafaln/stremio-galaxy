// Stremio Galaxy community changes. GPL-3.0.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {install}=require('../utils/stremio/galaxy-updater/updater.cjs');
(async()=>{
 const build=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../releases/last-build.json')));
 assert.equal(path.basename(build.artifact),'Galaxy-Packaging-Test.exe','Only isolated QA installers are allowed');
 const root=path.join(fs.mkdtempSync('D:/StremioGalaxyTools/tests/auto installer-'),'نسخة Galaxy');
 fs.mkdirSync(root,{recursive:true});
 const id=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../app-identity.json')));
 fs.writeFileSync(path.join(root,'.galaxy-product-id'),id.productId+'.PackagingTest');
 const preserved={'portable_config/stremio-settings.ini':'[GalaxyUpdates]\nEnabled=1\n; keep settings','galaxy_webview/account.txt':'keep account','portable_config/server/stremio-cache/test.bin':'keep cache','portable_config/extensions/galaxy-addon-setup/selection.js':'// keep addon choices'};
 for(const [name,value] of Object.entries(preserved)){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value)}
 assert.equal(await install(build.artifact,root),0);
 assert(fs.existsSync(path.join(root,id.executable)),'Installer must honor the full Unicode directory');
 for(const [name,value] of Object.entries(preserved))assert.equal(fs.readFileSync(path.join(root,name),'utf8'),value,name);
 console.log('PASS: real silent QA installer, spaces and Unicode path, settings/account/cache/addon choices preserved.');
 console.log(JSON.stringify({root}));
})().catch(e=>{console.error(e);process.exitCode=1});