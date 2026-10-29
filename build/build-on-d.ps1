# Stremio Galaxy community modification. GPL-3.0.
# Run after Microsoft C++ Build Tools is installed. Does not replace existing apps.
$ErrorActionPreference='Stop'
. "$PSScriptRoot\environment-d.ps1"
$vswhere='C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe'
$vsPath=(& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath).Trim()
if(!$vsPath){throw 'Microsoft C++ Build Tools is not ready. Complete installation first.'}
$devCmd=Join-Path $vsPath 'Common7\Tools\VsDevCmd.bat'
$cmdText='"'+$devCmd+'" -no_logo -arch=x64 -host_arch=x64 && set'
$devEnvironment=& $env:ComSpec /d /s /c $cmdText
if($LASTEXITCODE -ne 0){throw 'Developer environment initialization failed'}
foreach($line in $devEnvironment){if($line -match '^([^=]+)=(.*)$'){[Environment]::SetEnvironmentVariable($matches[1],$matches[2],'Process')}}
. "$PSScriptRoot\environment-d.ps1"
& "$env:VCPKG_ROOT\vcpkg.exe" install openssl:x64-windows-static curl:x64-windows-static nlohmann-json:x64-windows-static webview2:x64-windows-static --disable-metrics
if($LASTEXITCODE -ne 0){throw 'Dependency build failed'}
$repo=Split-Path $PSScriptRoot -Parent
Push-Location $repo
try{
 node build/check_windows.js
 if($LASTEXITCODE -ne 0){throw 'Required package files are missing'}
 node build/deploy_windows.js
 if($LASTEXITCODE -ne 0){throw 'Galaxy native build failed'}
}finally{Pop-Location}
