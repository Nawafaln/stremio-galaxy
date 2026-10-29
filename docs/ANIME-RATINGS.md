# Current provider correction — 2026-10-22

Jikan public API was permanently discontinued October 1, 2026, confirmed by maintainer announcement https://github.com/jikan-me/jikan-rest/issues/613 . The earlier timeout diagnosis below was incomplete; that endpoint is no longer used.

Current provider is Jikan-Edge, one of the alternatives linked by that maintainer. Verified documentation https://jikan.lucashdo.com/docs and actual device GET https://jikan.lucashdo.com/v1/anime/1 succeeded: data.malId=1, title=Cowboy Bebop, score=8.75, year=1998, type=TV, genres[].name, aired.from ISO date, Access-Control-Allow-Origin *. Public read-only data, no API key/login. It supplies MyAnimeList scores, not AniList/Kitsu scores. Not affiliated with official MAL. Existing 1.1 s spacing and cooldown respect its documented 60/minute limit. Both IMDb/MAL badges remain side by side. Device live API request verified; full native hover remains a separate test.

Historical implementation notes follow; old api.jikan.moe URLs describe the superseded implementation only.

# MyAnimeList ratings in poster cards — Galaxy GPL-3.0 changes

## Behavior
Supports exact poster IDs kitsu:N, mal:N, myanimelist:N and anilist:N, including URL-encoded colons and movie/series/anime detail routes. IMDb appears immediately. A separate MAL badge appears next to IMDb in the same ratings row whenever the title has one unambiguous MAL match, even when IMDb already has a score. No fuzzy title searches, series-wide season assumptions, or made-up ratings.

Mapping: lazily fetch https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json once into an in-memory index. Every external ID must map to exactly one MAL ID. Conflicting mappings are skipped. Direct MAL IDs bypass mapping. Mapping source inspected live: Cowboy Bebop kitsu=1/anilist=1/MAL=1/IMDb tt0213338, 39,579 rows, Access-Control-Allow-Origin *. Mapping is community-maintained and can contain errors or missing entries; uniqueness cannot prove perfect catalog accuracy.

Scores: GET https://api.jikan.moe/v4/anime/{malId}, a public unofficial read-only MyAnimeList API, with no key or account login. Require response data.mal_id to match. Use score (0/null hidden), year or aired.prop.from.year, genres[].name. Reject movie/series format mismatches. Render label MAL, never IMDb. Existing year/genres are kept where available; no Jikan age-rating field is added. OMDb still requires a configured key and is never called for non-IMDb IDs.

Limits: 300 ms hover debounce, abort on leave/navigation, 15 s total lookup timeout, memory score cache 24 h, shared minimum 1.1 s between Jikan requests, 60 s cooldown on HTTP429, 30 s on service errors, mapping errors retry after 60 s. No persistent browsing history or account tokens. Jikan receives only the requested MAL ID; GitHub serves the public ID map. Toggle [PosterHover] AnimeRatings=0 in portable_config/stremio-settings.ini (default 1) and restart. Chrome install option animeRatings:false also works.

## Validation and current limitation
Official Jikan OpenAPI checked at https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json (/anime/{id}, score/year/genres, documented 3 requests/sec and 60/minute limits). Fribb README checked at https://github.com/Fribb/anime-lists .

During implementation on 2026-10-22, Jikan HTTPS requests timed out both via this device (including IPv4) and web tooling. Therefore live end-to-end rating retrieval could not be confirmed; tests use the documented API response schema. The feature hides unavailable scores and retries later. This is not a claim that live ratings currently work on this network. Do not substitute AniList/Kitsu scores under a MAL label.

Tests: node tests/poster-hover.test.cjs and node tests/poster-mal.test.cjs. Fixtures verify Kitsu/MAL/AniList mapping, direct IDs, encoded IDs, ambiguous mappings, IMDb fallback, MAL label, null and wrong-ID results, cache, disable, 429 cooldown, abort, original IMDb/OMDb/RTL/animation behavior.

Build: load build/environment-d.ps1 and VS2022 x64 environment; cmake --build cmake-build-release-x64. Restart Galaxy after replacing its executable. Package: node build/package-installer.js. Chrome: paste assets/poster-hover.js in a DevTools Snippet and append window.GalaxyPosterHover.install({enabled:true}); hover a Kitsu or MAL poster. In-app: restart and test the same title. If API is unavailable no fabricated score is shown.

Touched files: assets/poster-hover.js, src/webview/poster_hover.cpp, utils/stremio/stremio-settings.ini, tests/poster-hover.test.cjs, tests/poster-mal.test.cjs, docs/ANIME-RATINGS.md. All project changes/build outputs are on D.

Correction: MAL is additive, not a replacement rating. Both IMDb and MAL remain independently labelled in a shared flex row.

Live integration test also passed using real Cinemeta, Fribb and Jikan-Edge requests through the actual poster script in a DOM: Cowboy Bebop displayed two adjacent badges, IMDb 8.9 and MAL 8.75. Native build compiled and deployed; no claim of a native-screen visual check.
