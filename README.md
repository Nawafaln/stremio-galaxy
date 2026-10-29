<div align="center">

# 🌌 Stremio Galaxy

### A galaxy-inspired desktop experience for Windows x64

**Version 5.0.24 · Multilingual Stremio interface · Native MPV playback · Anime tools · Watch Party**

[⬇️ Downloads & Releases](https://github.com/Nawafaln/stremio-galaxy/releases) · [Report an Issue](https://github.com/Nawafaln/stremio-galaxy/issues)

</div>

## About the project and its original creator

**Stremio Galaxy** is an independent community fork based on **[stremio-community-v5](https://github.com/Zaarrg/stremio-community-v5)**, created and developed by **[Zaarrg](https://github.com/Zaarrg)**, using its `webview-windows` branch. These projects build on the work of the **Stremio team and contributors**.

Galaxy customization and release maintenance: **[Nawafaln](https://github.com/Nawafaln)**. This is a community project, not an official Stremio release, and it is not affiliated with the original team. Original copyright notices and third-party licenses are retained.

## Download and install

1. Open **[Releases](https://github.com/Nawafaln/stremio-galaxy/releases)** and select a published stable release.
2. Under **Assets**, download `Stremio-Galaxy-5.0.24-windows-x64-setup.exe` when available. Source archives are for developers, not installation.
3. Fully close Galaxy, including its system-tray process, before installing. For an upgrade, select the existing Galaxy installation folder.
4. Windows x64 and Microsoft WebView2 are required. Setup checks for WebView2 and can run Microsoft's installer if it is missing; that step requires internet access.
5. Sign in to restore your account library and addons. Suggested addons require your confirmation inside Stremio.

The installer currently has no Windows publisher certificate (Authenticode). Signed update manifests verify update integrity separately from Windows publisher signing. Download from this repository and compare the installer with its attached SHA-256 checksum.

## Language support

**Galaxy retains all interface languages available in Stremio**, including Arabic and English, with left-to-right and right-to-left layouts. Available translations follow the selected Stremio web interface. Some Galaxy-specific tools, including Watch Party, currently provide Arabic and English labels and use English as the fallback for other languages. Localized titles and descriptions depend on metadata availability and the user's configured TMDB key.

## How to add your API keys

API keys are optional for using the player. TMDB enables additional localized metadata; OMDb enables optional age-rating lookups. The public build does not contain a shared TMDB key.

### TMDB — localized titles, descriptions, and genres

1. Sign in to [TMDB](https://www.themoviedb.org), open your account's **Settings → API**, and request an API key if you do not already have one. Follow TMDB's registration requirements and terms. See the [official TMDB guide](https://developer.themoviedb.org/docs/faq).
2. Copy your **API Key (v3 auth)**. Galaxy's current input accepts the **32-character hexadecimal API key**, not the longer **API Read Access Token / Bearer token**.
3. In **Stremio Galaxy → Settings**, look at the bottom of the settings sidebar and expand **Advanced: metadata and TMDB**.
4. Paste the key into **Optional TMDB API key** and click **Save**. Only paste the key itself, without quotes or a `Bearer` prefix.
5. Select your preferred interface language and reopen a title's details. Translated information appears when the provider has a matching translation; otherwise the original information remains.

The custom key stays in this installation's local WebView profile; it is not synced through your Stremio account. The password field does not display a saved key again. **Use default** removes your custom key. Because this public build has no bundled key, that returns TMDB lookups to the unconfigured state, even if the existing interface wording mentions a built-in key.

### OMDb — optional age ratings

1. Request your own key from the [official OMDb API key page](https://www.omdbapi.com/apikey.aspx), and complete any email verification or activation requested by the provider.
2. Fully close Galaxy, including its tray icon.
3. Open **`portable_config/stremio-settings.ini` inside your Galaxy installation folder** with a text editor.
4. Find the existing `[PosterHover]` section and set its `OmdbApiKey` value. If the section is missing, add it once:

```ini
[PosterHover]
Enabled=1
OmdbApiKey=YOUR_OMDB_API_KEY
```

5. Replace `YOUR_OMDB_API_KEY` with your own key, save the file, and restart Galaxy. Do not create duplicate `[PosterHover]` sections or remove other settings in that section.

OMDb only supplies age-rating information when it has suitable data for the title. Leave `OmdbApiKey=` empty to disable these optional requests. TMDB and OMDb keys are different and cannot be used interchangeably. Anime ratings from the configured public provider do not require a personal MyAnimeList API key in this version.

**Keep your keys private. Do not post them in GitHub issues, commits, screenshots, or shared configuration files. These local settings are not an encrypted credential vault. Never edit or replace Galaxy's update-signing public key when configuring metadata services.**

## Galaxy features — in order

### 1. Galaxy identity and interface

- Independent application name, icon, window identity, installation folder, profile, and application protocol.
- Galaxy Nebula appearance with a purple-and-blue space background, animated stars, and coordinated dark surfaces.
- Custom startup screen and logo; motion respects reduced-motion preferences and pauses behind video or when the interface is hidden.
- Cinematic home layout, enhanced content cards, and a home-page search and navigation header, while preserving navigation on internal pages.
- Multilingual interface with RTL/LTR support and responsive language changes in integrated Galaxy components.
- Improved settings dashboard for appearance, updates, cache, metadata, and addon controls.

### 2. Metadata, artwork, and ratings

- Content cards show available year, genres, ratings, artwork, and details from their providers.
- IMDb and MyAnimeList ratings can appear side by side when valid data and an unambiguous content match are available. Missing values are not fabricated.
- Localized titles, descriptions, and genres through TMDB and Kitsu mappings. **Each user supplies their own TMDB key in Settings**; the public build includes no shared private key.
- Optional age-rating lookup through OMDb requires a user-provided OMDb key and is not available for every title.

### 3. Galaxy Anime

- Anime catalogs based on Anime Kitsu, retaining content and episode identifiers for playback-provider compatibility.
- Popular, trending, currently airing, and search catalogs, subject to upstream availability.
- Genre and category filters, including Isekai, plus a release-start-year filter that can be combined with genre selections.
- A local anime metadata service starts with Galaxy. Galaxy Anime supplies catalogs and metadata; video sources come from the user's addons.
- Setup offers Galaxy Anime in place of Anime Kitsu, with account installation confirmed by the user and no silent removal of existing account addons.

### 4. Episodes, sources, and subtitles

- Improved episode and source rows, stable episode thumbnails during navigation, and clearer available torrent/source information.
- Source filtering and ranking using declared subtitle metadata. Expected language codes are not proof of actual subtitle availability.
- Intro and outro skipping based on named chapters inside the media file, with timeline markers and localized controls.
- `Tab` skips a recognized segment; `Shift+Tab` undoes the skip. Files without suitable chapters do not receive guessed skip ranges.
- Improved next-episode handling with a countdown and Cancel, preserving post-ending scenes when chapter information identifies them.
- Attempts to retain quality and subtitle language across episodes, verifying tracks in the new file and leaving manual source selection available when matching fails.

### 5. Watch Party

- Integrated controls to create a room or join with an invite code, showing connection state and participant counts.
- A local MPV companion synchronizes playback, pause, and seeking; only the host publishes the room's playback state.
- Automatic companion startup without installing Node separately, reconnection handling, and respect for manual synchronization opt-out.
- Arabic and English controls, following the interface language, with English fallback for other languages.
- Participants need the same film or episode, internet access, and an available room service. Rooms do not distribute video files or transmit stream URLs.
- Local synchronization tests do not establish that every two-device internet scenario has been tested; results depend on connectivity, the service, and playback sources.

### 6. Cache, installation, and updates

- View and change the video-cache folder through a native Windows folder picker. Changes take effect after restarting; existing cache files are not migrated automatically.
- Independent installer with required local services and runtime files, preserving user settings, account profiles, and cache during supported upgrades.
- RSA/SHA-256-signed Galaxy updates from this repository, checking product identity, version, installer integrity, and the installed executable.
- When enabled, update checks run every six hours, downloads happen in the background, and installation waits until Galaxy has fully exited.
- An automatic-update toggle and backups of package-owned files for recovery after a failed installation.
- Older builds with an empty update channel need one manual installation of the configured build. A release does not automatically reinstall itself.

## Features inherited from Zaarrg's version

Availability depends on MPV settings, Windows, hardware, the selected web interface, and installed components. Optional integrations listed here are not necessarily bundled in the Galaxy installer.

1. **Native MPV playback:** hardware decoding and 4K playback when supported by the file and device.
2. **Advanced video configuration:** MPV graphics options such as Direct3D, OpenGL, and Vulkan, depending on the build and settings.
3. **HDR and advanced audio:** including audio-passthrough options suitable for Dolby Atmos with compatible equipment and configuration.
4. **Upscaling options:** support for configuring Anime4K, AnimeJaNai, and other MPV processing options; additional downloads and setup may be required.
5. **Picture-in-picture**, window controls, and Windows dark-mode integration.
6. **Discord Rich Presence** for viewing activity, subject to Discord and application settings.
7. **ThumbFast support** for seek previews when installed and configured; this is not a promise that ThumbFast is bundled.
8. **Local media playback:** drag and drop or open supported MPV/FFmpeg files with the application.
9. **Local subtitles:** drag subtitle files into playback and customize their appearance through MPV configuration.
10. **Audio and subtitle preferences:** default languages, track selection, and subtitle-keyword priorities.
11. **Torrent and magnet support:** through the Stremio server and user-selected sources.
12. **Chromecast support:** inherited interface integration, dependent on the source, receiver, and network.
13. **Stremio addons** and compatible unpacked browser extensions.
14. **Window behavior settings:** tray behavior, pause on minimize or focus loss, and zoom options.
15. **MPV configuration and scripting** for player settings, shortcuts, and extensions.

The upstream project also offers portable distributions, Scoop/Chocolatey integration, and its own updater. This does not imply that equivalent Galaxy packages have been published. Galaxy uses its independent signed update channel.

## Source and license

The application is distributed under **GPL-3.0**, preserving upstream notices. Third-party components retain their respective licenses. The matching Galaxy source archive, build instructions, and dependency notices accompany the release. The separately attached source archive contains the application sources; GitHub's automatic source archives contain only the repository contents at the selected tag.

Content, metadata, and subtitles depend on the user's services and addons and are not owned by this project. Use sources you are authorized to access.

## Credits and thanks

Thank you to everyone whose code, addon, data, or tools helped make Galaxy possible:

- [Zaarrg](https://github.com/Zaarrg) and the contributors to [stremio-community-v5](https://github.com/Zaarrg/stremio-community-v5), its web interfaces, and compatibility fixes: Galaxy is built on your work.
- The [Stremio team and contributors](https://github.com/Stremio), Cinemeta, and the Stremio addon ecosystem.
- The Anime Kitsu developers, the [Kitsu community](https://kitsu.io), the OpenSubtitles v3 developers, and [OpenSubtitles](https://www.opensubtitles.com).
- [TMDB](https://www.themoviedb.org), [OMDb](https://www.omdbapi.com), and the original rating providers IMDb and MyAnimeList. This product uses the TMDB API but is not endorsed or certified by TMDB.
- [Fribb / anime-lists](https://github.com/Fribb/anime-lists) contributors for anime identifier mappings, the [Jikan-Edge](https://jikan.lucashdo.com/docs) developers, and the earlier Jikan project.
- [mpv](https://mpv.io), [FFmpeg](https://ffmpeg.org), [Lua](https://www.lua.org), and their contributors.
- [Microsoft WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2), [Node.js](https://nodejs.org), and [Three.js](https://threejs.org).
- [Discord RPC](https://github.com/discord/discord-rpc), [OpenSSL](https://www.openssl.org), [curl](https://curl.se), [nlohmann/json](https://github.com/nlohmann/json), [WIL](https://github.com/microsoft/wil), and [zlib](https://zlib.net).
- [Cloudflare Workers](https://workers.cloudflare.com) and the room-service tooling, [NSIS](https://nsis.sourceforge.io), and the build and packaging tools.
- The optional upstream integration authors: [bloc97 / Anime4K](https://github.com/bloc97/Anime4K), [the-database / AnimeJaNai](https://github.com/the-database/mpv-upscale-2x_animejanai), and [po5 / ThumbFast](https://github.com/po5/thumbfast).
- The Torrentio and AIO Metadata developers for earlier integrations. Torrentio is no longer offered by the current installer; the current metadata path is described above.

**Thank you to all contributors, addon and library developers, communities, testers, and users whose feedback helped improve Stremio Galaxy. All credit and rights remain with their respective owners.**
