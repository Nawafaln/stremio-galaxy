# Galaxy: upstream package feed disabled to avoid installing/uninstalling original Stremio.
throw 'Galaxy has no published Chocolatey package. Use the Galaxy installer.'
$packageName = 'stremio-desktop-v5'
$uninstallPath = "$env:LOCALAPPDATA\Programs\LNV\Stremio-5\Uninstall.exe"

If (Test-Path $uninstallPath) {
    Start-Process -FilePath $uninstallPath -ArgumentList '/S' -Wait
}
