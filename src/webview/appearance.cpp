#include "../updater/updater.h"
// Stremio Galaxy modification. GPL-3.0; see LICENSE.md.
#include "appearance.h"
#include "poster_hover.h"
#include "top_navigation.h"
#include "cache_settings.h"
#include "../core/globals.h"
#include "../resource.h"
#include "../utils/helpers.h"
#include "../utils/crashlog.h"
#include <wrl.h>

namespace {
std::wstring registration;
std::string ResourceText(int id) {
    HRSRC resource = FindResourceW(g_hInst, MAKEINTRESOURCEW(id), MAKEINTRESOURCEW(10));
    if (!resource) return {};
    HGLOBAL data = LoadResource(g_hInst, resource);
    auto ptr = static_cast<const char*>(LockResource(data));
    return ptr ? std::string(ptr, SizeofResource(g_hInst, resource)) : std::string{};
}
}
void RegisterGalaxyAppearance(std::function<void()> ready, bool updateCurrent) {
    if (!g_webview) { if (ready) ready(); return; }
    auto js = ResourceText(IDR_GALAXY_APPEARANCE_JS);
    auto css = ResourceText(IDR_GALAXY_BLACK_CSS);
    const std::string token = "__GALAXY_APPEARANCE_CONFIG__";
    auto pos = js.find(token);
    if (pos == std::string::npos || css.empty()) {
        AppendToCrashLog("[GALAXY]: Appearance resource missing; continuing without theme.");
        if (ready) ready();
        return;
    }
    json origins = json::array();
    for (const auto& url : g_webuiUrls) {
        const auto utf8 = WStringToUtf8(url);
        auto scheme = utf8.find("://");
        if (scheme != std::string::npos) origins.push_back(utf8.substr(0, utf8.find('/', scheme + 3)));
    }
    json config = {{"name", APP_NAME}, {"enabled", g_blackTheme}, {"css", css}, {"allowedOrigins", origins}};
    js.replace(pos, token.size(), config.dump());
    // Account-menu cleanup is independent of the theme and UI language.
    js += "\n((origins,css)=>{if(window.top!==window||!origins.includes(location.origin))return;"
          "const install=()=>{if(!document.documentElement)return;let s=document.getElementById('galaxy-account-menu-style');"
          "if(!s){s=document.createElement('style');s.id='galaxy-account-menu-style';document.documentElement.appendChild(s);}s.textContent=css;};"
          "install();document.addEventListener('DOMContentLoaded',install,{once:true});})(" + origins.dump() + "," + json(ResourceText(IDR_GALAXY_ACCOUNT_MENU_CSS)).dump() + ");";
    js += BuildPosterHoverScript(origins);
    js += BuildGalaxyNavigationScript(origins);
    js += BuildGalaxyCacheSettingsScript(origins);
    js += BuildGalaxyUpdateSettingsScript(origins);
    auto party = ResourceText(IDR_GALAXY_WATCH_PARTY_JS);
    const std::string partyToken = "__GALAXY_WATCH_PARTY_CONFIG__";
    const auto partyPos = party.find(partyToken);
    if (partyPos != std::string::npos) {
        const auto ini = GetExeDirectory() + L"\\portable_config\\stremio-settings.ini";
        const auto rawPort = GetPrivateProfileIntW(L"GalaxyWatchParty", L"Port", 3210, ini.c_str());
        const auto port = rawPort >= 1024 && rawPort <= 65535 ? rawPort : 3210;
        json partyConfig = {{"enabled", GetPrivateProfileIntW(L"GalaxyWatchParty", L"Enabled", 1, ini.c_str()) == 1},
                            {"port", port}, {"allowedOrigins", origins}};
        party.replace(partyPos, partyToken.size(), partyConfig.dump());
        js += "\n" + party;
    }
    auto metadata = ResourceText(IDR_GALAXY_METADATA_JS);
    const std::string metadataToken = "__GALAXY_METADATA_CONFIG__";
    const auto metadataPos = metadata.find(metadataToken);
    if (metadataPos != std::string::npos) {
        metadata.replace(metadataPos, metadataToken.size(), ResourceText(IDR_GALAXY_METADATA_CONFIG));
        js += "\ntry {\n" + metadata + "\n} catch (error) { console.warn('[Galaxy metadata initialization]', error); }\n";
    }
    js += ResourceText(IDR_GALAXY_DETAIL_BACKDROP_JS);
    auto rails = ResourceText(IDR_GALAXY_DETAIL_RAILS_JS);
    const std::string railsToken = "__GALAXY_DETAIL_RAILS_CSS__";
    const auto railsPos = rails.find(railsToken);
    if (railsPos != std::string::npos) {
        rails.replace(railsPos, railsToken.size(), json(ResourceText(IDR_GALAXY_DETAIL_RAILS_CSS)).dump());
        js += "\n" + rails;
    }
    auto layout = ResourceText(IDR_GALAXY_LAYOUT_JS);
    const std::string layoutToken = "__GALAXY_LAYOUT_CSS__";
    const auto layoutPos = layout.find(layoutToken);
    if (layoutPos != std::string::npos) {
        layout.replace(layoutPos, layoutToken.size(), json(ResourceText(IDR_GALAXY_LAYOUT_CSS)).dump());
        js += "\n" + layout;
    }
    auto settingsDashboard=ResourceText(IDR_GALAXY_SETTINGS_DASHBOARD_JS);
    const std::string settingsToken="__GALAXY_SETTINGS_DASHBOARD_CSS__";
    const auto settingsPos=settingsDashboard.find(settingsToken);
    if(settingsPos!=std::string::npos){settingsDashboard.replace(settingsPos,settingsToken.size(),json(ResourceText(IDR_GALAXY_SETTINGS_DASHBOARD_CSS)).dump());js+="\n"+settingsDashboard;}
    const auto script = Utf8ToWstring(js);
    if (!registration.empty()) {
        g_webview->RemoveScriptToExecuteOnDocumentCreated(registration.c_str());
        registration.clear();
    }
    auto completed = Microsoft::WRL::Callback<ICoreWebView2AddScriptToExecuteOnDocumentCreatedCompletedHandler>(
        [ready, updateCurrent, script](HRESULT result, LPCWSTR id)->HRESULT {
            if (SUCCEEDED(result) && id) {
                registration = id;
                if (updateCurrent && g_webview) g_webview->ExecuteScript(script.c_str(), nullptr);
            } else AppendToCrashLog("[GALAXY]: Document-created appearance registration failed.");
            if (ready) ready();
            return S_OK;
        });
    HRESULT hr = g_webview->AddScriptToExecuteOnDocumentCreated(script.c_str(), completed.Get());
    if (FAILED(hr)) {
        AppendToCrashLog("[GALAXY]: Could not register appearance script.");
        if (ready) ready();
    }
}
