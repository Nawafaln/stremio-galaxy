// Bundle the shared-service MPV companion. This never deploys a Worker.
'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
async function packWatchParty({project,party,payload,node=process.execPath}){
 const target=path.join(payload,'owned','watch-party');fs.mkdirSync(target,{recursive:true});
 for(const rel of ['companion/server.cjs','companion/mpv.cjs','companion/config.cjs','src/index.html','watchparty.config.json']){
  const dest=path.join(target,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(party,rel),dest);
 }
 fs.copyFileSync(path.join(project,'utils/stremio/watch-party/start.cjs'),path.join(target,'start.cjs'));
 fs.copyFileSync(node,path.join(target,'node.exe'));
 const nodeVersion=execFileSync(node,['--version'],{encoding:'utf8',windowsHide:true}).trim();
 const nodeLicense=path.join(project,'build/licenses/node-'+nodeVersion+'.txt');
 if(!fs.existsSync(nodeLicense))throw Error('The bundled Node runtime license is missing');
 const notices=path.join(payload,'third-party-notices');fs.mkdirSync(notices,{recursive:true});
 fs.copyFileSync(nodeLicense,path.join(notices,'watch-party-node.txt'));
 return target;
}
module.exports={packWatchParty};
