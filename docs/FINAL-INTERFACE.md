# Final Galaxy interface — 2026-10-25

Implemented in the actual native WebView2 application, not a separate UI. The original React-owned cards and routing/playback handlers remain in place.

## Files
- `assets/galaxy-layout.js`, `assets/galaxy-layout.css`: responsive cinematic home banner, real provider artwork and IMDb metadata, progress retained from original cards, bounded/lazy metadata queue, separate native header lifecycle, and shared direction service.
- `assets/top-navigation.js`: home-only header and search. Settings, Discover, Library, Calendar, Addons and Search restore the original sidebar; native detail back controls are retained. This fixes the reported overlapping header on Settings.
- `assets/detail-rails.js`: reacts immediately to the shared language event and uses the selected interface language for labels. Existing episode/server rows, reliable subtitle count filter, expected subtitle code filter, best-match ranking, and playback forwarding retained.
- `src/resource.h`, `stremio.rc`, `src/webview/appearance.cpp`, `CMakeLists.txt`: embed/register the production layout resources in the compiled executable.
- `tests/galaxy-layout.test.cjs`, `tests/top-navigation.test.cjs`: language events, metadata honesty, handler delegation, route lifecycle and native navigation regressions.

## Data and direction
Artwork comes from the app catalog and Cinemeta metadata for supported IMDb IDs. Missing scores, years and stream quality remain absent. Country flags remain explicitly expected subtitle codes and never establish a confirmed subtitle language count. No random images, invented ratings or HD/4K labels are added.

The core SettingsUpdated event applies direction immediately; a state refresh recovers missed events. Header grid, hero text/actions, card order, settings and catalog layouts, episodes, server cards and filters follow RTL/LTR. Artwork, logos, video and play icons are not transformed. The native sidebar changes sides with language. Only the home page has the cinematic header and search.

## Validation
- Node integration suites: galaxy-layout, top-navigation, detail-rails, appearance, appearance-motion, poster-hover.
- Isolated installed Edge rendering of the production resources against the deployed upstream DOM/CSS and actual public metadata. Exact viewport sizes: 1672×941, 1280×720, 760×900, 390×844, each in Arabic and English. Screenshots reviewed; poster order, hero bounds, no document overflow, real rating output and header initialization asserted. Diagnostic files stay under `work/final-ui/` on D; they are test fixtures, not the product.
- Native Windows application: home, Settings, language switch without restart and detail entry inspected using screenshots. Installed executable verified against build SHA-256.

Reference artwork and the content list depend on the user's actual catalog/library and available provider metadata; no data from the mockup is fabricated. The reference's Arabic image is visually left-to-right, whereas the explicitly requested Arabic production interface follows complete RTL geometry.

Backups: `backups/final-ui-20261025-161524/`. Build, test browser profiles, diagnostics and caches are on D. No dependency installation was needed.
