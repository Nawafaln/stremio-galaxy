# Windows build status

Stremio Galaxy x64 Release was built and launched successfully on 2026-10-20 (Asia/Riyadh).

Executable: D:\ai\StremioGalaxy\dist\win-x64\stremio-galaxy.exe
Tools/downloads: D:\StremioGalaxyTools (see TOOLS-ON-D.md).
Microsoft Build Tools installer completed with exit code 0; compiler MSVC 14.44; portable CMake 4.4.4 and Ninja 1.13.2. All native prerequisites passed the build/check_windows.js audit.

Native verification:
- Default https://stremio.zarg.me interface loads, splash completes.
- Alternate https://web.stremio.com loads with compatibility handling.
- Bundled stremio-runtime.exe starts from the Galaxy package directory.
- Galaxy backdrop, top navigation, transparent header, expanded posters and detail artwork visibly work in the native window.
- A fresh, separate WebView profile is used; signing in is optional for browsing and needed to restore account library/addons/history.

Build fixes:
- Explicit wide resource type IDs for FindResourceW.
- Required shobjidl declaration for taskbar identity.
- Official Discord RPC 3.4.0 rebuilt with static CRT. Extended activity/button fields are compiled only when supported by the headers. Source commit e6390c8c4190b59f1cc98bcec688e0037b84974d in D:\StremioGalaxyTools\sources\discord-rpc. Configure with BUILD_EXAMPLES=OFF BUILD_SHARED_LIBS=OFF USE_STATIC_CRT=ON CMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded CMAKE_POLICY_VERSION_MINIMUM=3.5, then copy src/discord-rpc.lib into deps/discord-rpc/win64-static/lib.
- Shell protocol now supplies type=3 for INIT and accepts modern [event,...args] messages alongside legacy Qt method envelopes, as verified against Stremio Web source.
- Package excludes old silence/speed skip-intro.lua to avoid conflicting Tab behavior. Includes the chapter-only anime_skip.lua and localized button extension.
- Deployment refuses to clean output directories containing a used galaxy_webview profile. Build the binary with cmake --build and update its executable after closing the app, or use a fresh output directory; do not delete user profiles to rebuild.

Remaining verification: actual video playback, embedded/external subtitles, chapter skip UI and language changes in the built app, next-episode behavior, installer packaging/uninstall. No installer executable was produced. The running package is a folder distribution using the installed WebView2 runtime. No original Stremio executable or account data was overwritten.
