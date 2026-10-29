# Optional addon setup (Galaxy community modification)

Setup offers unchecked Torrentio, Anime Kitsu and OpenSubtitles v3 options. The new/existing user warning is red in Setup and in the Galaxy onboarding panel. Existing accounts should usually skip options to avoid duplicates. Addons are services, not downloaded media or bundled provider binaries.

Selected options produce a small Galaxy extension selection.js. On first launch the panel opens the verified #/addons?addon=<encoded manifest URL> page for each selection. The user signs in and confirms Install in the existing Stremio UI. No account tokens are read, no installation is falsely reported as completed, and no existing addon is removed/reconfigured. Finish dismisses the panel for this installation revision; Hide lasts until navigation/restart. All options off means no panel. Silent installation defaults to all off.

Verified live manifests 2026-10-20:
- https://torrentio.strem.fun/manifest.json — com.stremio.torrentio.addon, stream types movie/series/anime, tt/kitsu IDs. Optional provider configuration is on its /configure page.
- https://anime-kitsu.strem.fun/manifest.json — community.anime.kitsu, anime catalogs/meta/subtitles; not a replacement video source.
- https://opensubtitles-v3.strem.io/manifest.json — org.stremio.opensubtitlesv3, subtitles, movie/series, tt IDs only. Does not guarantee subtitles for Kitsu-only anime or every language/title.

Route and Install confirmation verified in the deployed community UI bundle stored under D:/StremioGalaxyTools/sources/community-ui-main.js. No guessed account API or InstallAddon payload is used.

Build: node build/package-installer.js (NSIS on D). Test node tests/addon-setup.test.cjs, then build --test-mode and run tests/installer.test.ps1. Interactive native checkbox appearance and real account Install confirmation require a user test; automated tests do not modify any account.

Files: utils/windows/installer/windows-installer.nsi, build/package-installer.js, utils/stremio/extensions/galaxy-addon-setup/{manifest.json,selection.js,setup.js}, tests/addon-setup.test.cjs, tests/installer.test.ps1.
