// Stremio Galaxy community modification, GPL-3.0.
#include "top_navigation.h"
#include "../core/globals.h"
#include "../resource.h"
#include "../utils/helpers.h"

namespace {
std::string ReadNavigationResource(int id) {
    const auto resource=FindResourceW(g_hInst,MAKEINTRESOURCEW(id),MAKEINTRESOURCEW(10));
    if(!resource)return {};
    const auto data=LoadResource(g_hInst,resource);
    const auto ptr=static_cast<const char*>(LockResource(data));
    return ptr?std::string(ptr,SizeofResource(g_hInst,resource)):std::string{};
}
}
std::string BuildGalaxyNavigationScript(const nlohmann::json& allowedOrigins) {
    auto script=ReadNavigationResource(IDR_GALAXY_TOP_NAV_JS);
    const auto css=ReadNavigationResource(IDR_GALAXY_TOP_NAV_CSS);
    const std::string token="__GALAXY_TOP_NAVIGATION_CONFIG__";
    const auto pos=script.find(token);
    if(pos==std::string::npos || css.empty())return {};
    const auto ini=GetExeDirectory()+L"\\portable_config\\stremio-settings.ini";
    const bool enabled=GetPrivateProfileIntW(L"GalaxyNavigation",L"Enabled",1,ini.c_str())==1;
    const nlohmann::json config={{"enabled",enabled},{"css",css},{"allowedOrigins",allowedOrigins}};
    script.replace(pos,token.size(),config.dump());return "\n"+script;
}
