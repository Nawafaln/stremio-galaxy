# Stremio Galaxy: poster hover card

Community fork modification, GPL-3.0. This feature does not change the installed app until the native shell is rebuilt and deployed.

## Verified behavior and sources

Verified on 2026-10-19 in Chrome at https://web.stremio.com/:

- Home, Discover, Library, Search all use `a[class*="meta-item-link-"]` with a descendant `[class*="poster-container-"]`.
- Links include both `#/detail/movie/tt0133093/tt0133093` and shorter `#/detail/series/tt13196080`. Only movie/series IMDb IDs are accepted. Full hashed class names are never used.
- Actual HTTPS GETs to `https://v3-cinemeta.strem.io/meta/movie/tt0133093.json` and `https://v3-cinemeta.strem.io/meta/series/tt0944947.json` returned `{meta: ...}` with `id`, `type`, `releaseInfo`, `genres`, `imdbRating`, `runtime`. `releaseInfo` was `1999` for the movie and `2011–2019` for the series. The response permits cross-origin reads (`Access-Control-Allow-Origin: *`). Ratings can change.
- OMDb's own documentation https://www.omdbapi.com/ documents `apikey`, IMDb `i`, and HTTPS. No real OMDb key was supplied, so live authenticated OMDb age data was **not** tested. The `Rated` field handling is covered by a fixture, not claimed as a live successful request.

## Settings

In the built app's `portable_config/stremio-settings.ini`:

```ini
[PosterHover]
Enabled=1
OmdbApiKey=
```

Set `Enabled=0` to disable, then fully restart the shell. Blank/whitespace key means **zero** OMDb requests and no age row. An optional user-provided key is sent only to HTTPS OMDb by this module; it is not logged or saved in browser storage. It is injected into the UI's JS context, so this is not a secret vault. Do not commit a real key. `BlackTheme` and `UseDarkTheme` remain independent.

## Implementation

- `assets/poster-hover.js`: independent dependency-free module, scoped Shadow DOM, compact bottom overlay inside the poster image, RTL and Arabic/English labels. Missing fields are omitted. Fetched strings are rendered with `textContent`, not HTML.
- One delegated `mouseover` listener covers lazy rows. `mouseout` aborts, `mousemove` checks whether the poster is still attached, scroll/navigation/blur/click hide and abort. No extra MutationObserver or per-poster handlers.
- 300ms hover debounce; one active AbortController with 8s timeout. Stale responses cannot overwrite a new poster's card. `pointer-events:none` preserves poster clicks.
- Completed Cinemeta results (including unavailable metadata) are cached per type/ID in memory for the document lifetime. OMDb results are cached separately. Aborted requests can be retried on a later hover; cancellation means a title cannot be guaranteed literally one network attempt. Successful completed results are reused without fetching again. Authentication/quota errors disable further OMDb attempts for that key in the session.
- `src/webview/poster_hover.{cpp,h}`: reads the feature's own INI section and builds the native document-created script. `appearance.cpp` includes that script in its existing WebView2 registration before first navigation. No extension is needed.

## Test first in Chrome

1. Open https://web.stremio.com/ in Chrome. Open DevTools > Sources > Snippets, make a temporary snippet and paste the complete contents of `assets/poster-hover.js`.
2. Append `window.GalaxyPosterHover.install({enabled:true});` and run the snippet. No API key is needed. This is a temporary page test, not an extension install. Reloading removes it.
3. In Network, filter `cinemeta` / `omdbapi`. Hover a movie for more than 300ms: year, genres, IMDb appear. There should be no OMDb requests. Revisit the same poster: no duplicate metadata request. Moving away before 300ms should produce no request; moving away while pending should cancel it.
4. Repeat on Home, Discover, Library and Search, including newly loaded rows. Move near each screen edge, zoom in, and scroll. The card should stay inside the poster image and disappear on scrolling/navigation. Clicking a poster must still open it. RTL should follow the poster's computed direction; test the UI's Arabic language too.
5. Hover a non-IMDb title such as `kitsu:`: no card/request/error. Test blocked/offline metadata: no error card or unhandled rejection. If all fields are missing, show no card.
6. Optional, only with your own key: run `window.GalaxyPosterHover.install({enabled:true,omdbApiKey:'YOUR_KEY'});`. Verify the age row only when OMDb supplies `Rated`. Never share screenshots/logs containing that URL/key.
7. Disable via `window.GalaxyPosterHover.disable()`; hover should no longer fetch or show. Reinstall once to verify no duplicate listeners.

## Automated tests

From the source folder, with Node.js supporting jsdom 29:

```powershell
npm install --prefix tests/hover-runtime --no-package-lock --no-audit --no-fund jsdom@29.1.1
node --check assets/poster-hover.js
node tests/poster-hover.test.cjs
git diff --check
```

The DOM tests passed: debounce, caching, no-key OMDb suppression, disabling, non-IMDb IDs, cancellation, age/RTL fixtures, safe text, inside-poster placement, SPA hide, lazy cards, and repeated installation. They do not prove rendering in Chromium/WebView2.

## Build, then test in the app

Follow the dependency setup in `docs/WINDOWS.md` (MSVC C++ tools, CMake, Node, vcpkg OpenSSL/curl/nlohmann-json/WebView2, and the MPV/Discord dependencies). From an x64 Native Tools terminal in the source root, substitute your actual vcpkg path:

```powershell
cmake -S . -B out/galaxy -A x64 -DCMAKE_TOOLCHAIN_FILE=D:/tools/vcpkg/scripts/buildsystems/vcpkg.cmake -DVCPKG_TARGET_TRIPLET=x64-windows-static
cmake --build out/galaxy --config Release
```

Use the generated `stremio-galaxy.exe` in an independent Galaxy runtime folder with the runtime assets described in the existing build guide. Do not overwrite the user's current `D:/StremioCommunity` merely to test. Resources are embedded in the executable; copying only the JS beside an old executable will not activate it.

Set `[PosterHover]` in that runtime folder, close the app completely and launch the Galaxy build. Repeat the Chrome checks in the actual UI. Toggle `Enabled=0`, restart, and confirm it disappears. Repeat with `BlackTheme=0` to verify feature independence. If a UI build changes the partial poster classes, re-inspect its DOM before changing selectors.

Native build and live Galaxy/WebView2 rendering have **not** been run here: `cmake`/`cl` are not available in this shell, and native dependencies are not prepared. Chrome's actual DOM and live Cinemeta responses were verified, but the new hover UI itself has only the automated DOM tests so far.

## Files changed for Task 2

New: `assets/poster-hover.js`, `src/webview/poster_hover.cpp`, `src/webview/poster_hover.h`, `tests/poster-hover.test.cjs`, `docs/POSTER-HOVER.md`, `.gitignore` (test runtime/generated output excludes).

Updated: `src/webview/appearance.cpp`, `src/resource.h`, `stremio.rc`, `CMakeLists.txt`, `utils/stremio/stremio-settings.ini`.

## Chrome execution follow-up (2026-10-19)

Executed the actual source through DevTools Sources > Snippets, named `Galaxy Poster Hover`. Rendering was verified in the live Chrome page using a synthetic `mouseover` on the real Tokyo Revengers poster, not a DOM fixture. Cinemeta returned `tt13196080`; the card displayed `2021–`, `Animation, Action, Drama`, and IMDb `7.7`. The uninstrumented source was then tested the same way. Clicking outside hid the card. Native pointer drag attempts triggered the click-to-hide handler, so they were not treated as successful physical-hover tests. Temporary diagnostic logging and the synthetic trigger were removed from the saved snippet after the check; the normal hover module was left enabled. No OMDb key was used. Galaxy native/WebView2 execution is still untested.


## Inside-poster layout

The user requested the card inside the artwork. The Shadow DOM host is now an absolute bottom overlay within the verified poster-container element. Year and IMDb share a compact first row, genres appear below (up to two lines), and optional age rating follows. No cursor-following positioning remains. The host retains pointer-events:none. A static poster is positioned relatively only while active; its previous inline position is restored when hidden.


Card styling refinement: 10px year/score, 7px IMDb label and 9px genres; explicit grid positions keep year and score aligned, genres centered below a fine divider. The card now uses dark purple/blue nebula gradients and procedural stars without remote images or requests.


Motion refinement: card enters upward by 24px with a 420ms eased transform and 320ms fade; mouse leave animates downward before the 440ms cleanup. Requests still abort immediately. Navigation, disabling and removed posters hide immediately. Rapid re-entry cancels stale exit cleanup. Background gradient opacity is reduced and a small backdrop blur keeps text readable. Reduced-motion preference removes the transition.
