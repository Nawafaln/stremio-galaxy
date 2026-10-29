# Full Galaxy appearance — community fork modification (GPL-3.0)

Implemented in D:/ai/StremioGalaxy. The current D:/StremioCommunity installation has not been overwritten.

## Appearance

- One decorative `#galaxy-universe` layer behind the full SPA, purple/blue nebula gradients and two gently drifting star planes. Stars use CSS transform animations (90/140 seconds), not a JS animation timer or external images.
- Home, Discover, Library, Search, Settings and Addons retain transparent page surfaces over the shared background. Search/filters, navigation, stream rows, dialogs and menus receive matching dark Galaxy surfaces through verified variables and partial class selectors.
- Posters and text are above the star layer; decorative layers do not receive clicks. Existing genre/rating poster overlays remain independent.
- Player route: star layer hidden and animations paused; document/player canvas stays transparent for embedded MPV. Subtitle/audio panels keep readable Galaxy surfaces, without placing stars over subtitles or video.
- Motion pauses when the document is hidden. OS reduced-motion preference disables star animations.
- Shared native palette covers tray menu, Windows 11 caption/text, splash background and small splash stars using the existing splash timer. Original UseDarkTheme behavior is preserved. Older Windows may ignore unsupported caption color attributes and retain its normal title bar. DWM attributes were checked against https://learn.microsoft.com/en-us/windows/win32/api/dwmapi/ne-dwmapi-dwmwindowattribute . System-owned message boxes remain Windows-controlled.

## Settings

Existing `portable_config/stremio-settings.ini` switch:

```ini
[General]
BlackTheme=1
UseDarkTheme=1
```

BlackTheme controls the Galaxy web appearance. The tray label is now `Galaxy Theme`. UseDarkTheme controls native dark/light behavior; Galaxy native colors apply when both switches are enabled. No additional undocumented settings keys were introduced. Changes to source CSS are embedded on rebuilding; changing the CSS beside an old executable is insufficient.

## Verification

- Actual Chrome CSSOM/DOM verified root variables: primary/secondary/modal backgrounds, primary/quaternary accents, overlay, placeholder color; existing foregrounds and semantic success/error colors are preserved.
- Actual Chrome home and Settings pages showed the Galaxy background. Readback confirmed exactly one layer, `galaxy-stars-near`, duration `90s`, animation state `running`; transform changed from matrix translation (2.66937,-3.39738) to (15.552,-19.7935), proving motion rather than a static preview.
- Passed `node --check assets/appearance.js`, `node tests/appearance.test.cjs`, and `git diff --check`. The poster hover regression suite also passed after the initial integration.
- Lifecycle test covers one-layer injection, branding, repeat registration, toggle, CSS refresh, SPA player route, hidden-page pause, reduced-motion rule, and no remote textures. A closing-document observer error found in the test was fixed and the theme test rerun successfully.
- No live video was started merely to test the theme; native MPV transparency and native palette are source/lifecycle-checked, not claimed as a live native build test.
- Native build is still unavailable in this environment: `cmake` and MSVC `cl` are not on PATH and required native dependencies are not prepared. Follow docs/WINDOWS.md and docs/POSTER-HOVER.md for the existing build prerequisite steps; validate a rebuilt independent Galaxy folder before deploying to the user's active installation.

## Files for this change

assets/black-theme.css; assets/appearance.js; src/ui/galaxy_palette.h (new); src/ui/mainwindow.cpp; src/ui/splash.cpp; src/tray/tray.cpp; CMakeLists.txt; tests/appearance.test.cjs (new); docs/GALAXY-THEME.md (new).


Pointer parallax: a passive mousemove listener coalesces writes through requestAnimationFrame. Near stars move opposite the cursor with bounded offsets of 28px horizontally and 22px vertically, far stars use 45% of that offset, smoothed with a 900ms translate transition independent of the slow drift. Pointer leave resets toward center. Disabled theme, video route, hidden page and reduced-motion preference suppress pointer motion. Run node tests/appearance-motion.test.cjs for directional/reset checks.

Chrome motion check passed with synthetic mouse events on the real poster: entering opacity 0 -> 0.584598 -> 1 and vertical offset 24px -> 5.35991px -> 0; exiting intermediate opacity 0.415298/offset 18.6417px then display:none. Pointer at right produced -28px star offset; pointer at left produced +28px. Source tests for enter/exit/fast re-entry and theme direction/reset also passed. These are Chrome preview results; the native executable still requires rebuilding.

## Detail artwork (community modification)

assets/detail-backdrop.js uses verified Cinemeta meta.background, falling back to meta.poster after image failure. It only handles IMDb movie/series detail routes, caches results and aborts stale metadata requests during navigation. The existing BlackTheme switch controls the visual layer. Non-IMDb details keep their existing artwork. Styling is scoped to metadetails-container, background-image-layer, meta-preview-container and streams-list-container class fragments verified in live Chrome. No player styling changes.

The JS is embedded as IDR_GALAXY_DETAIL_BACKDROP_JS in stremio.rc, registered through appearance.cpp and included in CMake resource dependencies. Build using the existing Windows docs and restart the built app. No native build performed here.

Validation: node --check assets/detail-backdrop.js; live Chrome movie tt22084616 successfully loaded the Cinemeta background image, with translucent Galaxy panels and readable metadata. Still requires testing inside the built Windows app and with series / artwork failures. Reloading Chrome removes the temporary preview.
