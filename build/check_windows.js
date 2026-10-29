// Stremio Galaxy community modification, GPL-3.0.
// Read-only build prerequisites audit. Never installs or modifies system tools.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const exists=p=>fs.existsSync(p);
const checks=[];
function add(name,ok,hint){checks.push({name,ok:!!ok,hint})}
function command(name){try{return cp.execFileSync('where.exe',[name],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split(/\r?\n/)[0]}catch{return ''}}
for(const name of ['node','cmake','ninja'])add(name,command(name),'Install or put '+name+' on PATH.');
const vswhere=path.join(process.env['ProgramFiles(x86)']||'C:/Program Files (x86)','Microsoft Visual Studio/Installer/vswhere.exe');
let vs='';if(exists(vswhere)){try{vs=cp.execFileSync(vswhere,['-latest','-products','*','-requires','Microsoft.VisualStudio.Component.VC.Tools.x86.x64','-property','installationPath'],{encoding:'utf8'}).trim()}catch{}}
add('MSVC C++ compiler',vs,'Microsoft C++ Build Tools with Desktop development with C++ and a Windows SDK.');
add('vcpkg toolchain',process.env.VCPKG_ROOT&&exists(path.join(process.env.VCPKG_ROOT,'scripts/buildsystems/vcpkg.cmake')),'Set VCPKG_ROOT; install openssl, curl, nlohmann-json, webview2 for x64-windows-static.');
for(const file of ['deps/libmpv/x86_64/include/mpv/client.h','deps/libmpv/x86_64/mpv.lib','deps/libmpv/x86_64/libmpv-2.dll','deps/discord-rpc/win64-static/lib/discord-rpc.lib','deps/discord-rpc/win64-static/include/discord_rpc.h','utils/windows/server.js','utils/windows/stremio-runtime.exe','utils/windows/ffmpeg/ffmpeg.exe'])add(file,exists(path.join(root,file)),'Required build/package dependency. See docs/WINDOWS.md.');
for(const check of checks)console.log((check.ok?'OK      ':'MISSING ')+check.name);
const missing=checks.filter(c=>!c.ok);console.log('\n'+missing.length+' missing prerequisites.');
if(process.argv.includes('--json'))console.log(JSON.stringify({checks,ready:missing.length===0},null,2));
process.exitCode=missing.length?1:0;
