# Detail episode and server rails

Stremio Galaxy community modification, GPL-3.0.

The details page retains its original artwork, summary, buttons and purple palette. Episodes and servers are separate left-to-right horizontal rails below the summary, with keyboard-accessible links and scroll buttons. Episodes use metadata thumbnails, season selection, search and the selected episode. Missing images have an explicit placeholder.

The server cards show the work and episode, source, reported resolution, size and Seeders. Audio (headphones) and subtitle (chat bubble) languages have separate rows. Filters cover quality, provider, audio language and subtitle language. The checked-by-default subtitle filter hides only sources explicitly reporting zero or one subtitle language/track; unknown information remains visible. Uncheck it to show all. No probing, downloading or language guessing is performed. Missing fields display Unknown. Only explicitly labelled Audio/Subtitles description lines supplement structured provider metadata; unlabelled flags or language names are never treated as language declarations. Upstream core may discard extra provider fields, so many sources legitimately remain unknown.

The best playable result among the filtered results is selected by reported Seeders and then reported resolution. This is a heuristic, not a playback or subtitle availability guarantee. Provider order stays unchanged.

Data comes from the existing VideosList/StreamsList React props and the existing core transport `meta_details` model, with the `ctx` interface language. Current route and model identity are checked before applying async results. No new HTTP requests or dependencies are added. Original React lists remain mounted; the matching original stream link handles clicks whenever available, preserving player preferences and upstream analytics. The integration restores the original lists when data cannot be read or the route changes. If upstream changes these contracts, recheck against its source.

## Files

* `assets/detail-rails.js`: rendering, metadata parsing, filtering, original-link forwarding and lifecycle.
* `assets/detail-rails.css`: vertical detail layout, horizontal rails, purple cards and narrow-screen rules.
* `src/resource.h`, `stremio.rc`, `src/webview/appearance.cpp`, `CMakeLists.txt`: embedded resource registration and rebuild dependencies.
* `tests/detail-rails.test.cjs`: JSDOM integration/regression tests using existing local dependencies.
* `tests/detail-rails-preview.cjs`: local browser preview using clearly synthetic fixtures and locally generated SVG thumbnails; no remote assets. Run from the repository and open `http://127.0.0.1:9345/#/detail/series/tt123`.

## Build and runtime delivery

Use the existing D-drive build environment and `cmake --build cmake-build-release-x64 --parallel 2`. No package installation or download is needed. Temp and compile caches stay on D.

The native build embeds the JavaScript and stylesheet as application resources. The verified build was copied to `dist/win-x64/stremio-galaxy.exe` and the actual installed application was restarted. No extra portable webmod copies are necessary. The old executable and modified integration files are saved under `backups/detail-rails-20261025-131425`, with an `installation.json` containing the before/after SHA256 hashes. Existing settings and portable user profile were retained.

Verification: run `node tests/detail-rails.test.cjs`, `node tests/top-navigation.test.cjs`, `node tests/appearance.test.cjs`, `node tests/watchparty-toolbar.test.cjs`, `node tests/next-episode.test.cjs`.

The initial browser preview is a fixture. The reference-theme update was also inspected in the actual installed Windows application, using its existing title metadata and server results. Provider metadata completeness and playback availability remain provider-dependent.

## User reference theme — 2026-10-25

The supplied `Stremio Galaxy_ Mousetrap Detail Page.png` defines the new detail presentation: a full artwork hero and one translucent purple dock, image-only episode artwork with text underneath, selected-episode play overlay, divider, inline server-type pills, circular navigation arrows, and compact 108px server cards (118px on large screens). Best Match uses a glowing border and a crown ribbon. Card rows contain provider, quality/Seeders/size, and separate audio/subtitle badges with inline SVG icons. The complete source/work/episode text stays in accessible text and the card tooltip; no provider counts, images or languages are copied from the reference.

The four server tabs classify explicit provider source type, known debrid labels, torrent infoHash/magnet, or a direct HTTP media URL. Unknown transport remains under All only. Filters and episode search are available through the sliders button, and Escape dismisses the filter popup. Existing default subtitle filtering remains in place. Language badges abbreviate only declared languages; missing languages stay Unknown.

The actual executable was rebuilt and deployed on D. The pre-change executable, assets and tests are preserved under `backups/reference-theme-20261025-132510`.
## Torrent information — 2026-10-25

The compact card now displays the torrent indexer when reported and a release summary (video source, video/audio codec, bit depth). A separate information button beside each source opens a keyboard-accessible modal with the work, provider, release title, filename, quality, size, Seeders, declared language information, valid info hash, zero-based file index and reported trackers when available. It never invokes the playback link.

Release annotations such as Dual Audio, Multi Audio or Multi Subs are displayed explicitly as provider claims when language names are missing. They do not populate language filters, establish subtitle counts or imply English/Japanese/Arabic tracks. The details view explains why the languages remain unspecified and distinguishes release labels from verified media tracks. It does not fetch torrents, probe video files or contact trackers. The actual first Torrentio release observed in the native application is covered by the regression fixture.

## Stable first entry — 2026-10-25

The detail route is now marked synchronously at navigation time, before awaiting any core data. CSS suppresses the native right sidebar on that route from the first paint. A MutationObserver prepares the existing detail root as soon as React mounts it, inserts a neutral hero/episode/server loading shell, and triggers a model refresh; the existing timer remains a fallback rather than the first opportunity to apply the layout. The server row reserves its final height even before episode selection or provider results. Loading placeholders contain no fabricated metadata or season numbers.

Initial season follows an explicit season query, selected episode, upstream season, or the saved library video, before falling back to the first regular season. Manual season changes also call the original upstream season callback. Delayed model responses and late React mounts are covered by regression tests. Unavailable integration recovers the native error/fallback UI after a bounded discovery period; normal provider loading retains the new layout.

The nav-only React loading fallback is also covered: a temporary, Galaxy-owned content container hosts the same loading dock until React mounts its real details content. It is removed during handoff, preventing a blank background-only screen and avoiding duplicate rails. A regression test verifies this exact nav-only-to-content transition.

## Expected subtitle codes and filter — 2026-10-25

Provider flag emoji and standalone lists of region/language codes now appear directly in the subtitle row when confirmed subtitle language metadata is unavailable. The displayed codes preserve the source (for example GB, RU, PT, ES, MX, CN, TW, FR, PL); no country-to-language inference is performed. Dashed badges and a tilde identify expected values, with an explanatory tooltip. Overflowing code lists can be scrolled inside the subtitle row. The information dialog shows the same expected codes.

Expected values are also selectable in the subtitle filter, labelled Expected, as explicitly requested. Confirmed subtitle metadata takes precedence; an explicit no-subtitle result never gains expected badges or expected filter values. Expected codes do not establish a confirmed subtitle count. The shared implementation covers films, series and anime; regression tests exercise movie, series, Kitsu-series and anime routes.
