# Chapter-safe next episode — Galaxy changes, GPL-3.0

## Behavior
- Uses explicit ending ranges from anime_skip.lua. If any chapter follows that ending, no next button or countdown appears until actual EOF. Unknown/generic/no chapters likewise require EOF. A final named ending can offer next during that ending.
- Preserves the existing five-second automatic countdown and Cancel; manual Next remains available after cancelling the countdown.
- Fixes the deployed UI route: nextVideo.deepLinks.metaDetailsStreams can use #/detail, not only old #/metadetails.
- Reads only player source/language state via verified core transport/React props; never serializes profiles or auth storage. Uses player.selected.streamRequest.base, stream.behaviorHints.bingeGroup when supplied, otherwise exact stream.name within the same addon. This is a provider/release identity, not proof of the same physical server or identical subtitle translation.
- Retains current resolution requirement. Ranks matching sources first; alternative sources advertising the selected subtitle language and more distinct declared subtitle languages follow. Ignores release-name flags as evidence of subtitle tracks.
- Tries at most six candidates. Each candidate is paused once its video loads; actual dimensions and MPV track-list languages are validated. Missing desired language gets twelve seconds for external track discovery, then the next candidate is tried. Candidate timeout is 25 seconds, source-list timeout 60 seconds. A matching language is selected by that file's new track ID before resuming.
- Supports language aliases (e.g. fre/fra/fr, jpn/ja, eng/en); no preference for Arabic. Keeps subtitles off if they were off. If no language was identifiable, requires at least one subtitle track and ranks advertised multilingual options, but cannot guarantee an unknown language/translation. Unknown current resolution or exhausted candidates leaves manual sources, without silently playing a different resolution/language.
- User navigation cancels pending work. Cancel during validation pauses and returns to sources. Playback errors are not treated as episode completion.

## Verified source references
- Actual served community UI bundle: D:/StremioGalaxyTools/sources/community-ui-main.js. Control props, source-list group shape (addon.transportUrl/content Ready), nextVideo route and lower-case player model were inspected there.
- Native src/mpv/player.cpp: mpv-event-ended reason `quit` is emitted for MPV_END_FILE_REASON_EOF (despite its legacy name). Errors are `error`.
- MPV official manual: https://mpv.io/manual/master/#property-list track-list/N/lang, id, type, selected; IDs are local to each media file.

## Files / toggle
utils/stremio/extensions/personal-anime-skip/{next.js,next-source.js,manifest.json,song-config.js}, utils/stremio/scripts/anime_skip.lua. Set GalaxySongConfig.nextEpisode=false in song-config.js to disable, nextCountdownSeconds to adjust. Restart Galaxy after changes.

## Tests
node tests/next-episode.test.cjs
node tests/song-markers.test.cjs
D:/StremioGalaxyTools/lua-test/node_modules/.bin/fengari.cmd tests/song-segments.test.lua
node build/package-installer.js

Automated tests cover actual UI property shapes, current/legacy route handling, source and quality ranking, French subtitle preservation across file-specific track IDs, missing-language fallback, EOF/error/cancel, explicit chapters and after-credits blocking. These are simulated UI/native events, not a claim of live end-to-end playback verification. External addons with missing language metadata can remain unverifiable; live testing on the user's episodes is still required. Source changes may briefly display initial frames before the native load event pauses validation. No content is skipped by probing beyond the requested completed episode.

Final upstream inspection found Player pt() calls Qt() immediately on ended. To prevent that race, Galaxy holds MPV keep-open=yes only while it owns a next-episode target and uses the real eof-reached property. Lua saves/restores the original keep-open value when the controller releases it. No interception of account or UI event handlers. Live source: deployed community bundle pt=l.useCallback and native MPV EOF mapping. Official reference: https://mpv.io/manual/master/#options-keep-open .

Additional native verification: tests/next-native.test.py passed against the actual bundled libmpv-2.dll and local song-markers-test.mkv: Lua blocks next during the ending with a following scene, keep-open retains the file at actual EOF, and the original keep-open option restores. No network, GUI, audio or existing user session was used. Source/subtitle switching still needs live episode verification.

The deployed UI NextVideo component uses the verified partial class next-video-popup-container-. While Galaxy owns the transition, its premature built-in popup is hidden to avoid a competing early Next prompt; styling and keep-open control are released when this feature leaves the player/destroys.
