# Stremio Galaxy installer integration test. No changes to real shortcuts/protocol.
$ErrorActionPreference='Stop'
$galaxyRoot='D:\ai\StremioGalaxy'
$galaxyBuild=Get-Content "$galaxyRoot\releases\last-build.json" -Raw | ConvertFrom-Json
$galaxySetup=$galaxyBuild.artifact
if(-not $galaxySetup.EndsWith('Galaxy-Packaging-Test.exe')){throw 'Refusing non-test installer'}
$galaxyTestRoot='D:\StremioGalaxyTools\tests\installer-'+(Get-Date -Format 'yyyyMMdd-HHmmss')
New-Item -ItemType Directory -Path $galaxyTestRoot -Force | Out-Null
$galaxyInstall=Join-Path $galaxyTestRoot 'installed'
function Run-GalaxySetup($target){
 $galaxyRun=Start-Process -FilePath $galaxySetup -ArgumentList @('/S',"/D=$target") -Wait -PassThru -WindowStyle Hidden
 return $galaxyRun.ExitCode
}
function Assert-Galaxy($condition,$message){if(-not $condition){throw $message}}
$galaxyFirst=Run-GalaxySetup $galaxyInstall
Assert-Galaxy ($galaxyFirst -eq 0) "Fresh install failed: $galaxyFirst"
Assert-Galaxy (Test-Path "$galaxyInstall\stremio-galaxy.exe") 'Main executable missing'
foreach($required in @('watch-party\node.exe','watch-party\start.cjs','watch-party\companion\server.cjs','portable_config\webmods\watch-party\watchparty.js','galaxy-anime\server.cjs')){Assert-Galaxy (Test-Path (Join-Path $galaxyInstall $required)) "Missing packaged feature: $required"}
Assert-Galaxy (-not (Test-Path "$galaxyInstall\galaxy_webview")) 'Used browser profile was packaged'
Assert-Galaxy (-not (Test-Path "$galaxyInstall\portable_config\server\server-settings.json")) 'Personal server settings were packaged'
$galaxyDefaults=Get-Content "$galaxyInstall\portable_config\stremio-settings.ini" -Raw
Assert-Galaxy ($galaxyDefaults -notmatch '(?m)^Root=') 'Personal cache root was packaged'
Assert-Galaxy ($galaxyDefaults -notmatch '(?m)^OmdbApiKey=[^\r\n]+') 'API key was packaged'
$galaxySelection=Get-Content "$galaxyInstall\portable_config\extensions\galaxy-addon-setup\selection.js" -Raw
Assert-Galaxy ($galaxySelection.Contains('torrentio:false,galaxyAnime:1===1,subtitles:0===1')) 'Galaxy Anime default selection was not written'
Assert-Galaxy (Test-Path "$galaxyInstall\portable_config\extensions\galaxy-addon-setup\setup.js") 'Optional setup module missing'
Assert-Galaxy (-not ((Get-Content "$galaxyInstall\portable_config\extensions\galaxy-addon-setup\setup.js" -Raw).Contains('torrentio.strem.fun'))) 'Removed Torrentio addon is still offered'
Add-Content -LiteralPath "$galaxyInstall\portable_config\stremio-settings.ini" -Value '; user-settings-sentinel'
Set-Content -LiteralPath "$galaxyInstall\portable_config\scripts\user-script.lua" -Value '-- user script sentinel'
Add-Content -LiteralPath "$galaxyInstall\portable_config\scripts\anime_skip.lua" -Value '-- obsolete-owned-file-sentinel'
New-Item -ItemType Directory -Path "$galaxyInstall\galaxy_webview" | Out-Null
Set-Content -LiteralPath "$galaxyInstall\galaxy_webview\qa-profile.txt" -Value 'profile-sentinel'
$galaxyUpgrade=Run-GalaxySetup $galaxyInstall
Assert-Galaxy ($galaxyUpgrade -eq 0) "Upgrade failed: $galaxyUpgrade"
Assert-Galaxy ((Get-Content "$galaxyInstall\portable_config\stremio-settings.ini" -Raw).Contains('user-settings-sentinel')) 'Upgrade replaced user settings'
Assert-Galaxy (Test-Path "$galaxyInstall\portable_config\scripts\user-script.lua") 'Upgrade removed user script'
Assert-Galaxy (Test-Path "$galaxyInstall\galaxy_webview\qa-profile.txt") 'Upgrade replaced profile'
Assert-Galaxy (-not ((Get-Content "$galaxyInstall\portable_config\scripts\anime_skip.lua" -Raw).Contains('obsolete-owned-file-sentinel'))) 'Upgrade did not update owned scripts'
Assert-Galaxy ((Get-FileHash "$galaxyInstall\stremio-galaxy.exe").Hash -eq (Get-FileHash "$($galaxyBuild.payload)\stremio-galaxy.exe").Hash) 'Installed binary mismatch'
$galaxyForeign=Join-Path $galaxyTestRoot 'foreign'
New-Item -ItemType Directory -Path $galaxyForeign | Out-Null
Set-Content -LiteralPath "$galaxyForeign\stremio.exe" -Value 'foreign-app-sentinel'
$galaxyConflict=Run-GalaxySetup $galaxyForeign
Assert-Galaxy ($galaxyConflict -eq 4) "Foreign directory was not blocked: $galaxyConflict"
Assert-Galaxy ((Get-Content "$galaxyForeign\stremio.exe" -Raw).Contains('foreign-app-sentinel')) 'Foreign app was changed'
$galaxyUninstall=Start-Process -FilePath "$galaxyInstall\Uninstall.exe" -ArgumentList @('/S',"_?=$galaxyInstall") -Wait -PassThru -WindowStyle Hidden
Assert-Galaxy ($galaxyUninstall.ExitCode -eq 0) 'Uninstall failed'
Assert-Galaxy (-not (Test-Path "$galaxyInstall\stremio-galaxy.exe")) 'Uninstall left main binary'
Assert-Galaxy (Test-Path "$galaxyInstall\portable_config\stremio-settings.ini") 'Uninstall removed settings'
Assert-Galaxy (Test-Path "$galaxyInstall\portable_config\scripts\user-script.lua") 'Uninstall removed user scripts'
Assert-Galaxy (Test-Path "$galaxyInstall\galaxy_webview\qa-profile.txt") 'Uninstall removed user profile'
'PASS: clean fresh installation, upgrade preserves settings/profile/user scripts, owned modules update, foreign install blocked, uninstall preserves data.'
"QA files: $galaxyTestRoot"
