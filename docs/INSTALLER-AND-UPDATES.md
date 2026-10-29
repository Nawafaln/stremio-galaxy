# Galaxy Windows installer and updates

Stremio Galaxy is an independent community fork, licensed under GPL-3.0. Original project and dependency notices remain in the installer payload.

## User installation

Run `Stremio-Galaxy-5.0.23-windows-x64-setup.exe`, choose a separate folder, and finish Setup. Default: `D:\Apps\StremioGalaxy` when D exists; otherwise the current user's LocalAppData Programs folder. No original/old Stremio installation is required. Setup runs per user, with no administrator requirement for the app itself.

Setup detects Microsoft WebView2 Runtime in its documented per-user/per-machine registry locations. If missing, it invokes the genuine signed Microsoft bootstrapper (`/silent /install`); that branch needs internet. Runtime detection/install guidance: https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution . The bootstrapper's Authenticode status was verified Valid, Microsoft Corporation. Runtime installation on a machine without WebView2 has not been exercised on this existing device.

## Application updates

Version 5.0.23 adds signed automatic Galaxy updates, installed after the app fully exits, with a localized opt-out in Settings. The release repository is currently unconfigured, so public update delivery is pending. See [AUTO-UPDATES.md](AUTO-UPDATES.md) for behavior, signing, publishing and test instructions. Older builds need one manual Setup upgrade. Manual upgrades remain supported by closing Galaxy and rerunning the newer Setup in the same folder.

## Clean packaging

`node build/package-installer.js` reads an explicit binary allowlist and curated source defaults/modules into a fresh `release-staging` directory. It never packages `galaxy_webview`, cache/server settings, error logs, personal INI values or OMDb keys. It embeds licenses/notices and includes a SHA-256 file beside Setup.

NSIS 3.13 was obtained from the official project download route: https://nsis.sourceforge.io/Download . Set `GALAXY_NSIS` to another valid makensis path if needed. Local default: `D:\StremioGalaxyTools\tools\nsis\nsis-3.13\makensis.exe`.

The compiled setup is currently unsigned (no publisher signing certificate was supplied). It is built locally and has not been published to GitHub. Publish the corresponding GPL source/build instructions and dependency notices alongside a public release.

## Validation

`node build/package-installer.js --test-mode` generates a QA installer in the staging directory, using an isolated registry product key and skipping real user shortcuts/protocol registration. `tests/installer.test.ps1` refuses a production installer and exercises fresh installation, same-product upgrade, settings/profile/user-script preservation, owned-script replacement, foreign-folder rejection and uninstall data preservation.

The test version does not start the bundled app and does not modify the daily Galaxy installation. Existing WebView2 is used. Test data stays under `D:\StremioGalaxyTools\tests`.

## Files

* `build/package-installer.js`: clean payload, removal manifest, NSIS invocation, hashes.
* `utils/windows/installer/windows-installer.nsi`: setup/upgrade/uninstall behavior.
* `build/deploy_windows.js`: routes installer builds through the clean packager.
* `tests/installer.test.ps1`: isolated integration checks.
* `.gitignore`: keeps profiles, builds, release staging and binaries out of source commits.

## Local build result

Production artifact: releases/Stremio-Galaxy-5.0.23-windows-x64-setup.exe. Check its adjacent .sha256 file for the exact hash of each locally generated build.
