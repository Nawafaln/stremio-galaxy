# Stremio Galaxy modifications; upstream notices and GPL-3.0 retained.
cmake_minimum_required(VERSION 3.20)
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/app-identity.json" GALAXY_IDENTITY)
string(JSON GALAXY_VERSION GET "${GALAXY_IDENTITY}" version)
string(JSON GALAXY_DISPLAY_NAME GET "${GALAXY_IDENTITY}" displayName)
string(JSON GALAXY_EXECUTABLE GET "${GALAXY_IDENTITY}" executable)
project(StremioGalaxy VERSION "${GALAXY_VERSION}")
find_program(NODE_EXECUTABLE NAMES node REQUIRED)
set(GALAXY_GENERATED "${CMAKE_CURRENT_BINARY_DIR}/generated")
execute_process(COMMAND "${NODE_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/build/generate_identity.js" "${GALAXY_GENERATED}"
                COMMAND_ERROR_IS_FATAL ANY)
set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS app-identity.json build/generate_identity.js)
include_directories("${GALAXY_GENERATED}" "${CMAKE_CURRENT_SOURCE_DIR}")

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

option(DEBUG_LOG "Allow debug logs" ON)

# Locate MPV
if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    # 64-bit architecture
    set(MPV_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/deps/libmpv/x86_64/include")
    set(MPV_LIBRARY "${CMAKE_CURRENT_SOURCE_DIR}/deps/libmpv/x86_64/mpv.lib")
    set(MPV_DLL "${CMAKE_CURRENT_SOURCE_DIR}/deps/libmpv/x86_64/libmpv-2.dll")

    set(DISCORD_LIB "${CMAKE_CURRENT_SOURCE_DIR}/deps/discord-rpc/win64-static/lib/discord-rpc.lib")
    set(DISCORD_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/deps/discord-rpc/win64-static/include")
else()
    # 32-bit architecture
    set(MPV_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/deps/libmpv/i686/include")
    set(MPV_LIBRARY "${CMAKE_CURRENT_SOURCE_DIR}/deps/libmpv/i686/mpv.lib")
    set(MPV_DLL "${CMAKE_CURRENT_SOURCE_DIR}/deps/libmpv/i686/libmpv-2.dll")

    set(DISCORD_LIB "${CMAKE_CURRENT_SOURCE_DIR}/deps/discord-rpc/win32-static/lib/discord-rpc.lib")
    set(DISCORD_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/deps/discord-rpc/win32-static/include")
endif()

include_directories(${DISCORD_INCLUDE_DIR})
include_directories(${MPV_INCLUDE_DIR})

find_package(OpenSSL REQUIRED)
find_package(CURL REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(unofficial-webview2 CONFIG REQUIRED)

set(SOURCES
        src/main.cpp
        stremio.rc
        src/core/globals.h
        src/core/globals.cpp
        src/utils/helpers.h
        src/utils/helpers.cpp
        src/utils/config.h
        src/utils/config.cpp
        src/utils/crashlog.h
        src/utils/crashlog.cpp
        src/mpv/player.h
        src/mpv/player.cpp
        src/node/server.cpp
        src/node/server.h
        src/tray/tray.h
        src/tray/tray.cpp
          src/ui/startup_intro.cpp
          src/ui/startup_intro.h
        src/updater/updater.cpp
        src/updater/updater.h
        src/webview/webview.h
        src/webview/webview.cpp
        src/ui/mainwindow.h
        src/ui/galaxy_palette.h
        src/ui/mainwindow.cpp
        src/ui/taskbar_identity.cpp
        src/ui/taskbar_identity.h
        src/resource.h
        src/webview/appearance.cpp
        src/webview/appearance.h
        src/webview/poster_hover.cpp
        src/webview/poster_hover.h
        src/webview/cache_settings.cpp
        src/webview/cache_settings.h
        src/webview/top_navigation.cpp
        src/webview/top_navigation.h
        src/utils/extensions.cpp
        src/utils/extensions.h
        src/utils/discord.cpp
        src/utils/discord.h
)

add_executable(${PROJECT_NAME} WIN32 ${SOURCES})
# Galaxy: upstream used extended RPC fields; official Discord RPC omits them.
include(CheckCXXSourceCompiles)
set(CMAKE_REQUIRED_INCLUDES "${DISCORD_INCLUDE_DIR}")
check_cxx_source_compiles("#include <discord_rpc.h>\nint main(){DiscordRichPresence p{}; p.type=DISCORD_ACTIVITY_TYPE_WATCHING; p.button1Label=nullptr; p.button1Url=nullptr; p.button2Label=nullptr; p.button2Url=nullptr; return 0;}" GALAXY_DISCORD_HAS_EXTENDED_FIELDS)
unset(CMAKE_REQUIRED_INCLUDES)
if(GALAXY_DISCORD_HAS_EXTENDED_FIELDS)
    target_compile_definitions(${PROJECT_NAME} PRIVATE GALAXY_DISCORD_EXTENDED)
endif()

get_filename_component(GALAXY_BINARY_NAME "${GALAXY_EXECUTABLE}" NAME_WE)
set_target_properties(${PROJECT_NAME} PROPERTIES OUTPUT_NAME "${GALAXY_BINARY_NAME}" PROJECT_LABEL "${GALAXY_DISPLAY_NAME}")
set_property(SOURCE stremio.rc APPEND PROPERTY OBJECT_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/images/galaxy-icon.ico"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/black-theme.css"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/appearance.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/poster-hover.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/top-navigation.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/top-navigation.css"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/detail-backdrop.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/detail-rails.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/detail-rails.css"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/galaxy-layout.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/metadata-localization.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/metadata-config.json"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/galaxy-layout.css"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/settings-dashboard.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/settings-dashboard.css"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/cache-settings.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/cache-settings.css"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/startup-logo/intro.html"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/startup-logo/intro.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/startup-logo/logo.webp"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/startup-logo/three.min.js"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/watch-party.js"
    "${GALAXY_GENERATED}/app_identity.h")


target_link_libraries(${PROJECT_NAME} PRIVATE
        gdiplus.lib
        dwmapi.lib
        Shcore.lib
        Msimg32.lib
        winhttp.lib
        shlwapi.lib
        propsys.lib
        nlohmann_json::nlohmann_json
        unofficial::webview2::webview2
        OpenSSL::SSL
        OpenSSL::Crypto
        CURL::libcurl
        ${MPV_LIBRARY}
        ${DISCORD_LIB}
)

if(DEBUG_LOG)
    target_compile_definitions(${PROJECT_NAME} PRIVATE DEBUG_LOG)
endif()

# Copy MPV DLL
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${MPV_DLL}"
        $<TARGET_FILE_DIR:${PROJECT_NAME}>
)
# Galaxy: merge modern Windows compatibility into the default asInvoker manifest.
if(MSVC)
    target_sources(${PROJECT_NAME} PRIVATE assets/galaxy.manifest)
endif()
