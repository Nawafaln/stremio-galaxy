# Stremio Galaxy startup

Community changes, GPL-3.0. The clean logo artwork is retained from the user's
`Stremio_Galaxy___مقدمة_الشعار.html`. Its transparent WebP is a separate
resources; the old HTML, audio, controls, fake home screen and GDI splash were removed.
Three.js r128 remains local with its MIT notice. The imported GLB had self-intersecting surfaces and visible cracks; it and GLTFLoader were removed. The startup now builds 18 alpha-tested depth layers from the clean artwork, retaining perspective and camera movement.

`src/ui/startup_intro.cpp` creates a dark child cover immediately on launch, then a
local WebView2. All HTML/JS/model/image requests are served from executable RCDATA;
other HTTP(S) requests are denied. The main web UI starts concurrently in its normal
WebView2/profile. The intro no longer waits for app-ready to start. Navigation/reloads
inside the main SPA do not replay it.

`assets/startup-logo/intro.js`: CONFIG at the beginning controls the phases (total = zoomAt + zoomDuration),
logoAt 250ms, logoIn 1000ms, zoomAt 2700ms, zoomDuration 900ms, six meteors and
starDensity/minStars/maxStars (240–850). Three star layers share one RAF with the
3D model; DPR is capped at 1.5. Meteor proximity briefly brightens stars.
`src/ui/startup_intro.cpp`: transitionDuration=900 and fadeDuration=650 govern
the native layered child fade; keep transitionDuration aligned with zoomDuration.
The real app scales from 1.025 to 1 with cubic-bezier(.22,.61,.36,1).

If app-ready is delayed by network, keep the logo/stars visible rather than show a
blank interface. Thus 3.6 seconds describes normal ready-in-time startup, not an
offline/network deadline. Escape requests an early reveal as soon as the app is
ready. Reduced motion bypasses the zoom/meteors/parallax and reveals when ready.
No sound, visible controls or background GPU loop survives the transition.

Artwork: the supplied raster is 306x306 with alpha, not upscaled. Window/tray icon
ICO contains 16/24/32/48/64/128/256px variants. The primary intro uses the clean layered geometry at adaptive screen resolution; WebP is also the no-WebGL fallback.

Build with the project's D-drive toolchain:

    . ./build/environment-d.ps1
    # Import VsDevCmd x64 environment as documented for the project.
    cmake --build cmake-build-release-x64 --parallel 1
    node tests/startup-intro.test.cjs

Copy the executable to dist/win-x64 only after the app has fully quit. Launch it,
check no white flash, Escape, resized/maximized startup, and reduced-motion OS
setting. The native log records start, completion and JS frame metrics where
available; synthetic tests do not establish 60fps on every GPU. Rebuild installer
with `node build/package-installer.js` after updating dist.
