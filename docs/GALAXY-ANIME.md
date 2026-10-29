# Galaxy Anime — community addon (GPL-3.0)

Galaxy Anime keeps Anime Kitsu catalogs, artwork and episode IDs. It provides metadata, not playback sources. The existing local manifest remains http://127.0.0.1:11471/manifest.json; no reinstallation is needed after this update if already installed.

## Synopsis and interface language
The interface module reads ctx.profile.settings.interfaceLanguage and updates the local addon. English retains the original Kitsu synopsis. Other languages request ready-made localized metadata from AIO Metadata (https://aiometadata.elfhosted.com), configured to use TVDB for anime/series and TMDB for movies. Provider attribution is retained. No machine translation, MyMemory requests, character budget, translation keys or old translation-cache reads remain.

On first use of a language, the addon creates an anonymous language-specific configuration through the verified POST /api/config/save endpoint. Only provider preferences, language and a generated configuration password are sent; no Galaxy account credentials or playback URLs. Private configuration UUIDs/passwords are stored in portable_config/galaxy-anime/aio-configs.json, never shipped in Setup. Ready-made synopsis responses are cached in memory for five minutes. Existing translations/budget files are unused and are not deleted.

AIO can return English when localization is missing. Arabic must contain Arabic synopsis text; other non-English responses are compared with the English metadata and rejected when identical. These checks are conservative, not proof of linguistic correctness. Missing localization or service failure displays an unavailable notice. Metadata coverage and public hosting availability are not guaranteed. English remains available independently of AIO. UI updates preserve React-owned text nodes, summary labels and playback episode IDs.

## Setup / disable
Settings > Galaxy Anime > Add Galaxy Anime opens Stremio's addon preview; the user confirms Install. Nothing is silently installed into the account. Set [GalaxyAnime] Enabled=0 in portable_config/stremio-settings.ini and restart to disable the service; disable the galaxy-anime-ui extension to remove the interface integration. Server binds only to 127.0.0.1:11471 and validates Host/Origin. Synced local addon URLs work only while this computer runs the service.

## Files and verification
Source: utils/stremio/galaxy-anime/{server.cjs,aio-metadata.cjs}, utils/stremio/extensions/galaxy-anime-ui/{language.js,manifest.json}. Tests: node tests/galaxy-anime.test.cjs and node tests/galaxy-anime-ui.test.cjs. Also run protocol tests with dist/win-x64/stremio-runtime.exe (Node 18).

Copy these modules to matching paths under dist/win-x64 (extension under portable_config/extensions), restart Galaxy, then test Arabic and English on a Kitsu detail page. Native rebuild is unnecessary for this metadata-only change. Build the installer with node build/package-installer.js; its curated source packaging excludes private configuration/state files. Keep the original GPL-3.0 license and project attribution.

Verified 2026-10-22: bundled Node 18 protocol tests and UI locale/RTL tests passed. Live AIO Arabic Fullmetal Alchemist: Brotherhood returned existing TVDB Arabic synopsis, English returned original Kitsu synopsis, and all 64 Kitsu episode entries were retained. Fresh language configuration creation was tested. No private AIO configurations are included in the installer payload.

Multi-genre catalog filtering: see GALAXY-ANIME-GENRES.md.
