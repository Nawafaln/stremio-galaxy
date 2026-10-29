# Stremio Galaxy community modification. GPL-3.0.
# Process-local environment: downloaded tools, build intermediates and caches on D.
$ErrorActionPreference='Stop'
$toolRoot='D:\StremioGalaxyTools'
$env:VCPKG_ROOT="$toolRoot\vcpkg"
$env:VCPKG_DOWNLOADS="$toolRoot\downloads\vcpkg"
$env:VCPKG_DEFAULT_BINARY_CACHE="$toolRoot\cache\vcpkg"
$env:TEMP="$toolRoot\temp"
$env:TMP=$env:TEMP
$env:PATH="$toolRoot\tools\cmake-4.4.4-windows-x86_64\bin;$toolRoot\tools\ninja;$env:PATH"
$env:VCPKG_DISABLE_METRICS='1'
New-Item -ItemType Directory -Path $env:TEMP,$env:VCPKG_DOWNLOADS,$env:VCPKG_DEFAULT_BINARY_CACHE -Force | Out-Null
