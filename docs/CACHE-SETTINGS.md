# Cache settings — Stremio Galaxy community modification

GPL-3.0; upstream attribution retained. This feature changes the bundled video server cache, not the WebView2 browser profile.

## UI

Open Settings → Cache (Arabic: الاعدادات → كاش). The panel shows the full video cache path. Change folder opens a native Windows folder picker. A saved change takes effect after closing and reopening Galaxy; old cached files stay at their old path. No cache files are migrated or deleted.

The module contains translations for 30 interface languages, ISO language aliases and RTL layout. Modern UI language comes from `window.core.getState('ctx').profile.settings.interfaceLanguage`. The deployed community beta does not expose `window.core`; its React environment context supplies `core.transport.getState('ctx')`, verified in its served `main.js`. Only the interface language is used; profile/authentication data is never logged or persisted by this feature.

## Persistence / validation

`portable_config/stremio-settings.ini`:

```ini
[GalaxyCache]
Enabled=1
; Root is written by the folder picker, for example:
; Root=D:\VideoCache
```

`Root` is the parent of `stremio-cache`. Only a native folder selection supplies a path. The native code creates that child directory and tests write access using a unique CREATE_NEW / DELETE_ON_CLOSE probe. Cancelling keeps the existing selection. Before the bundled server starts, the selected Root is applied to its verified `server-settings.json` key `cacheRoot`, preserving other settings and replacing the JSON atomically. The INI override prevents a still-running server's settings save from losing a pending change.

The native bridge accepts cache commands only from configured UI origins, and opens the picker only on the settings route. Modal UI is posted to the Win32 message loop after WebView2's callback returns, following Microsoft's threading guidance: https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/threading-model .

## Build / tests

Use `build/environment-d.ps1` and the VS2022 x64 environment, then `cmake --build cmake-build-release-x64`. Copy the built executable into `dist/win-x64` while Galaxy is closed. CSS/JS resources are embedded and explicit RC dependencies ensure incremental builds include their changes.

`node tests/cache-settings.test.cjs` verifies section/menu insertion, existing menu preservation, native bridge messages, pending restart, localized errors, English/Arabic/RTL and language changes, legacy core transport, idempotency and cleanup. Appearance and navigation regression tests also pass.

Manual check: open Settings → Cache, select a writable folder, confirm the new path and restart notice, reopen Galaxy and verify the server cacheRoot and UI path. Cancel another selection and confirm the saved path is unchanged. Change the interface language and verify the label and panel update.

## Files

* `assets/cache-settings.js`, `assets/cache-settings.css`
* `src/webview/cache_settings.cpp`, `src/webview/cache_settings.h`
* `src/webview/appearance.cpp`, `src/webview/webview.cpp`
* `src/node/server.cpp`, `src/ui/mainwindow.cpp`
* `src/resource.h`, `stremio.rc`, `CMakeLists.txt`
* `tests/cache-settings.test.cjs`
* `dist/win-x64/portable_config/stremio-settings.ini` and rebuilt executable

Limitation: the legacy language fallback uses React's internal context linkage; a future remote UI update may require adapting that fallback. Unrecognized languages fall back to English.

## Live verification

The Arabic Cache section, RTL layout and native folder picker appeared in Galaxy. The user selected the temporary D test folder and confirmed the restart notice. The selected Root persisted in the INI; after restarting, server-settings.json cacheRoot changed to that folder while cacheSize remained 2147483648. The original D cache location was then restored. Existing cache data on C and D was not deleted or moved.
