# Galaxy top navigation

Community modification; GPL-3.0. This is a community fork, not official Stremio.

## Behavior and verified DOM

Desktop: Home, Discover and Library are on the right of search (Home farthest right); Calendar, Addons and Settings are on the left. The old sidebar is hidden only after all six destinations are found. Content expands into its former space. Below 760 CSS pixels the original sidebar layout remains available. Below 1100 pixels labels collapse to accessible icons.

Verified in live web.stremio.com: main-nav-bars-container contains direct horizontal-nav-bar-container, vertical-nav-bar-container and nav-content-container children. Content originally has left: var(--vertical-nav-bar-size); the module overrides that to zero. All selectors use partial class names. React-owned nodes remain in place; the new links forward ordinary clicks through the original routing handlers. Modified clicks retain their normal href behavior.

## Files and toggle

assets/top-navigation.js and assets/top-navigation.css are independent assets embedded through stremio.rc/resource.h. src/webview/top_navigation.cpp reads [GalaxyNavigation] Enabled=1 from stremio-settings.ini; set Enabled=0 and restart to restore the sidebar. appearance.cpp appends the module to the existing document-created injection. CMakeLists.txt includes its sources and resource dependencies.

## Build and tests

Use the Windows prerequisites and CMake build instructions in this repository's docs. Reconfigure CMake after adding the module, build the application and package its new resources. No native Windows build was performed in this environment: CMake/MSVC and required native dependencies were unavailable.

Run from the repository root:

    node --check assets/top-navigation.js
    node tests/top-navigation.test.cjs
    git diff --check

The test uses the existing tests/hover-runtime jsdom dependency. It covers group order, original links, routing forwarding, active destination, duplicates, lazy SPA pages, disable/destroy and incomplete navigation fallback.

Chrome preview: paste assets/top-navigation.js into a DevTools snippet, replacing __GALAXY_TOP_NAVIGATION_CONFIG__ with an object containing enabled:true, css: the complete contents of assets/top-navigation.css, and allowedOrigins:[]. Run it on https://web.stremio.com. This preview disappears on reload. Check Home, Discover and Library, the search box, narrow widths and keyboard focus. The live Chrome preview was checked for topbar positioning and Home/Library routing. Other remote UI builds may change their DOM and require revalidation.

In the built app: enable the setting, restart, check all six destinations and search, resize the window, disable the setting and restart to verify original layout restoration. The installed D:\StremioCommunity app was not modified by this task.
