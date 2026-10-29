# Galaxy automatic updates (community fork, GPL-3.0)

Version 5.0.23 introduces the Galaxy updater. Users on older versions must run the new Setup once. The original author's release feed is never used.

## Behavior

Settings contains a localized Automatic updates checkbox, enabled by default. The worker checks the configured Galaxy GitHub repository at most every six hours and downloads verified releases in the background. Installation waits until Galaxy exits completely, including the tray process. The next launch uses the new version; it does not interrupt playback or force a restart.

The release manifest has an RSA/SHA-256 signature and binds product identity, version, Windows x64 architecture, installer size/hash, executable hash, and a release URL in the configured repository. Only newer stable versions qualify. Downloads, staging and backups live under the installation's portable_config/updates directory. Personal settings, browser account profile and cache are excluded from replacement. Existing optional-addon choices are preserved during automatic installation.

Before installation, package-owned files are backed up. A failed installer or executable verification triggers file restoration. This is file recovery, not an atomic operating-system transaction: newly introduced files or registry display-version changes may remain after a failed update. Keep the signing private key safe and do not publish it.

## Publication currently pending

The channel repository is deliberately empty. In this state the worker reports unconfigured and makes no release requests. Public automatic updates will work only after the owner creates the Galaxy repository, configures it, and publishes signed releases. Never use Zaarrg/stremio-community-v5 as this fork's update source.

1. Set repository to OWNER/REPOSITORY in utils/stremio/galaxy-update-channel.json.
2. Keep the existing signing key. build/create-update-key.js generates a key only when missing and validates the public/private pair. release-signing/private.pem stays local and is ignored by Git.
3. Set the new version in app-identity.json, regenerate resources/build the Windows executable and deploy it to dist/win-x64.
4. Run node build/package-installer.js to create the production Setup.
5. Run node build/create-update-release.js to sign releases/galaxy-update.json for that exact Setup and executable.
6. Publish the Setup and galaxy-update.json in the same stable GitHub release, together with the matching GPL source and notices. Do not replace a published version with different bytes.

The update channel and public key must be present in the initial installed build. A portable developer folder also needs the matching .galaxy-product-id marker and galaxy-owned-files.json; the supported way for end users to obtain these is Setup.

## Validation

- node tests/updater.test.cjs: signature/tamper/product/repository guards, newer-version selection, integrity checks, mocked apply/rollback, settings/profile/cache preservation, disabled/unconfigured behavior.
- node tests/update-settings.test.cjs: localized settings and native bridge messages.
- node build/package-installer.js --test-mode, then powershell -File tests/installer.test.ps1: isolated installer lifecycle.
- node tests/updater-installer.test.cjs: real QA installer through the actual worker spawn arguments, with a directory containing spaces and Arabic, preserving settings, account, cache and addon selections. Refuses production installers.

Native settings toggle and persistence were checked in the running app. A live public GitHub download/update has not been tested because the Galaxy release repository is not yet configured. The installer has no Authenticode publisher certificate; Windows security policies may still display prompts during initial installation. WebView2 and the remote web UI have independent update lifecycles.