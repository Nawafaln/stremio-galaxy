// Stremio Galaxy modification, GPL-3.0. Independent poster-hover module.
#include "poster_hover.h"
#include "../core/globals.h"
#include "../resource.h"
#include "../utils/helpers.h"

std::string BuildPosterHoverScript(const nlohmann::json& allowedOrigins) {
    const auto ini = GetExeDirectory() + L"\\portable_config\\stremio-settings.ini";
    wchar_t key[512] = {};
    GetPrivateProfileStringW(L"PosterHover", L"OmdbApiKey", L"", key, 512, ini.c_str());
    const bool enabled = GetPrivateProfileIntW(L"PosterHover", L"Enabled", 1, ini.c_str()) == 1;
    HRSRC resource = FindResourceW(g_hInst, MAKEINTRESOURCEW(IDR_GALAXY_POSTER_HOVER_JS), MAKEINTRESOURCEW(10));
    if (!resource) return {};
    HGLOBAL data = LoadResource(g_hInst, resource);
    const auto ptr = static_cast<const char*>(LockResource(data));
    if (!ptr) return {};
    std::string script(ptr, SizeofResource(g_hInst, resource));
    // Do not log this config: the optional API key belongs only to OMDb requests.
    nlohmann::json config = {{"enabled", enabled}, {"omdbApiKey", WStringToUtf8(key)},
                            {"animeRatings", GetPrivateProfileIntW(L"PosterHover", L"AnimeRatings", 1, ini.c_str()) != 0},
                            {"allowedOrigins", allowedOrigins}};
    return "\n" + script + "\nwindow.GalaxyPosterHover.install(" + config.dump() + ");\n";
}
