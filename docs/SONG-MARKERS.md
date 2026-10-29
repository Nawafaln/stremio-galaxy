# Song markers and outro skip

Community modification, GPL-3.0. The chapter-only Lua detector now publishes validated opening and ending ranges through user-data/anime-segments, and the active kind through user-data/anime-skip-kind. The existing button sends skip-segment; Lua rechecks current playback position and seekability, then seeks to the next chapter boundary. Shift+Tab retains undo. An after-credits chapter is preserved. Unknown/generic chapters produce no markers or guessed seeks.

segments.js draws a yellow band with start/end ticks for each range over the real SeekBar Slider container. It uses verified partial class selectors, one childList observer and mpv property notifications. Its overlay has pointer-events:none and does not change the slider's position, dimensions or events. It cleans up on navigation, end-file and unavailable metadata. Song markers require the media file to supply named chapters and a finite duration.

The clickable button reuses the current interface-language resolver, with translated Skip Intro / Skip Outro labels. The outro button sits above the existing next-episode panel to avoid overlap. No new automatic next-episode behavior was added.

Files: utils/stremio/scripts/anime_skip.lua and extension files segments.js, button.js, locale.js, song-config.js, manifest.json. The installed new Galaxy package received matching copies. The old D:\StremioCommunity package was not changed. song-config.js controls markers and the clickable ending skip independently; Lua keyboard skipping remains available.

Checks: node tests/song-markers.test.cjs, node tests/skip-locale.test.cjs, and D:\StremioGalaxyTools\lua-test\node_modules\.bin\fengari.cmd tests/song-segments.test.lua. These verify range positions, noninteractive overlays, no duplicate layers, navigation cleanup, no invalid ranges, OP/ED seek targets, post-credits preservation, undo, nonseekable media and localization. A synthetic 60-second chaptered MKV was generated in D:\StremioGalaxyTools\tests and opened through the native application; media playback started. A full visual confirmation of markers on the user's current episode remains to be done.

To test in the app, open an episode with Opening/OP and Ending/ED chapters, show playback controls, check the yellow endpoints, click the skip button during each song, then use Shift+Tab to undo. Keep any post-credits scene. If the file does not have these chapters, no song ranges should appear.
