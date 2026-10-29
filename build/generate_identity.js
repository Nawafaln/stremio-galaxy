// Stremio Galaxy modification: one identity file for C++, RC and NSIS.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const info=JSON.parse(fs.readFileSync(path.join(root,'app-identity.json'),'utf8'));
function generate(out){
  fs.mkdirSync(out,{recursive:true});
  const define=(key,value)=>`#define ${key} ${JSON.stringify(value)}`;
  fs.writeFileSync(path.join(out,'app_identity.h'),[
    '// Generated from app-identity.json. Do not edit.','#pragma once',
    define('APP_NAME',info.displayName),define('APP_TITLE',info.displayName),
    define('APP_VERSION',info.version),define('APP_EXE',info.executable),
    define('APP_CLASS_UTF8',info.windowClass),define('APP_MUTEX_UTF8',info.mutex),
    define('APP_MODEL_ID_UTF8',info.appUserModelId),define('APP_PRODUCT_ID',info.productId),
    define('APP_PROTOCOL',info.protocol),define('APP_ATTRIBUTION',info.attribution),
    define('APP_INSTALL_FOLDER',info.installFolder),''].join('\n'));
  const esc=s=>s.replace(/\$/g,'$$').replace(/"/g,'$\\"');
  fs.writeFileSync(path.join(out,'app_identity.nsh'),[
    '; Generated from app-identity.json. Do not edit.',
    ...Object.entries({APP_NAME:info.displayName,PRODUCT_VERSION:info.version,
      APP_LAUNCHER:info.executable,APP_ID:info.productId,APP_MODEL_ID:info.appUserModelId,
      APP_FOLDER:info.installFolder,APP_PROTOCOL:info.protocol,COMPANY_NAME:info.publisher,
      APP_ATTRIBUTION:info.attribution}).map(([k,v])=>`!define ${k} "${esc(v)}"`),''].join('\n'));
}
if(require.main===module)generate(path.resolve(process.argv[2]||path.join(root,'generated')));
module.exports={info,generate};
