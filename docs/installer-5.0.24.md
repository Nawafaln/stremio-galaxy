# Stremio Galaxy 5.0.24 installer

Includes the latest native UI, anime skip/next-episode features, ratings, appearance, navigation, cache controls, Galaxy Anime catalogs and filters, Watch Party toolbar, MPV synchronization, invite-only rooms and Arabic/English localization.

Setup offers Galaxy Anime instead of Anime Kitsu and selects Galaxy Anime by default. The user confirms addon installation in Galaxy; existing account addons are not silently removed. The service preserves Kitsu content IDs so existing playback providers remain compatible.

Local Watch Party services are bundled and start automatically. Remote Watch Party use remains pending an approved deployment. No Cloudflare or GitHub publication is performed.

Verification: native x64 Release build; feature regression suite; standalone packaged services; fresh installation; upgrade; foreign-directory protection; uninstall preservation; silent update installation with Unicode paths. Personal browser profiles, user cache paths and API keys are not packaged.

Approved UI snapshot (2026-10-28): Galaxy Nebula background and information surfaces, addon-provided work names with localized summaries, detail Home button, stable episode thumbnails during navigation, suppression of stale episode servers, and episode images filling their frames.

Torrentio is no longer offered by Setup or its optional-addon onboarding, including legacy pending selections. Galaxy Anime and OpenSubtitles remain available. Existing account addons and playback support are preserved.

Automatic Watch Party player sync: enabled when joining or restoring a room, waits for the video, resumes after temporary failures, and respects manual opt-out during reconnects. Host/viewer UI and real local MPV regression checks pass (24 tests). Two-device internet synchronization was not tested in this change.
