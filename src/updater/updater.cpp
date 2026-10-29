// Stremio Galaxy community modification, GPL-3.0. Per-user updater process and settings bridge.
#include "updater.h"
#include "../core/globals.h"
#include "../utils/helpers.h"
#include "../utils/crashlog.h"
#include "../ui/mainwindow.h"
#include "../resource.h"
#include <fstream>
#include <filesystem>
namespace {
HANDLE worker=nullptr;bool manualRequested=false;
std::filesystem::path Root(){return GetExeDirectory();}
std::filesystem::path Updates(){return Root()/L"portable_config"/L"updates";}
std::wstring Ini(){return (Root()/L"portable_config"/L"stremio-settings.ini").wstring();}
bool Enabled(){return GetPrivateProfileIntW(L"GalaxyUpdates",L"Enabled",1,Ini().c_str())!=0;}
bool Spawn(const std::filesystem::path& runtime,const std::filesystem::path& script,const wchar_t* mode,HANDLE* process){
    std::wstring command=L"\""+runtime.wstring()+L"\" \""+script.wstring()+L"\" "+mode+L" \""+Root().wstring()+L"\" "+std::to_wstring(GetCurrentProcessId());
    STARTUPINFOW si{};si.cb=sizeof(si);PROCESS_INFORMATION pi{};
    if(!CreateProcessW(runtime.c_str(),command.data(),nullptr,nullptr,FALSE,CREATE_NO_WINDOW,nullptr,Root().c_str(),&si,&pi))return false;
    CloseHandle(pi.hThread);if(process)*process=pi.hProcess;else CloseHandle(pi.hProcess);return true;
}
std::wstring Origin(const std::wstring& u){auto p=u.find(L"://");return p==std::wstring::npos?L"":u.substr(0,u.find_first_of(L"/#?",p+3));}
bool Trusted(const std::wstring& u){auto o=Origin(u);if(o.empty())return false;for(auto& x:g_webuiUrls)if(Origin(x)==o)return true;return false;}
void Reply(){json state={{"enabled",Enabled()},{"currentVersion",APP_VERSION},{"state","unconfigured"}};try{std::ifstream f(Updates()/L"status.json");if(f){auto v=json::parse(f);for(auto k:{"state","version","lastChecked"})if(v.contains(k)&&v[k].is_string())state[k]=v[k];}}catch(...){}if(!Enabled()&&!manualRequested)state["state"]="disabled";SendToJS("galaxy-update-state",state);}
}
void RunAutoUpdaterOnce(){if(worker||!Enabled())return;try{const auto script=Root()/L"galaxy-updater"/L"updater.cjs";if(!std::filesystem::exists(script))return;std::filesystem::create_directories(Updates());if(!Spawn(Root()/L"stremio-runtime.exe",script,L"watch",&worker))AppendToCrashLog("[GALAXY UPDATE]: Could not start background checker.");}catch(...){AppendToCrashLog("[GALAXY UPDATE]: Background checker unavailable.");}}
void StopGalaxyUpdater(){if(worker){if(WaitForSingleObject(worker,0)==WAIT_TIMEOUT){TerminateProcess(worker,0);WaitForSingleObject(worker,5000);}CloseHandle(worker);worker=nullptr;}}
void PrepareGalaxyUpdateOnExit(){StopGalaxyUpdater();if(!Enabled())return;try{if(!std::filesystem::exists(Updates()/L"pending.json")||!std::filesystem::exists(Root()/L".galaxy-product-id"))return;const auto runtime=Updates()/L"runner.exe",script=Updates()/L"worker.cjs";std::filesystem::copy_file(Root()/L"stremio-runtime.exe",runtime,std::filesystem::copy_options::overwrite_existing);std::filesystem::copy_file(Root()/L"galaxy-updater"/L"updater.cjs",script,std::filesystem::copy_options::overwrite_existing);if(!Spawn(runtime,script,L"apply",nullptr))AppendToCrashLog("[GALAXY UPDATE]: Could not schedule update after exit.");}catch(...){AppendToCrashLog("[GALAXY UPDATE]: Pending update deferred.");}}
void RunInstallerAndExit(){/* Legacy remote-UI update requests never install code. Galaxy applies only on actual exit. */}
bool HandleGalaxyUpdateMessage(const std::string& text,const std::wstring& source){auto v=json::parse(text,nullptr,false);if(!v.is_object()||!v.contains("args")||!v["args"].is_array()||v["args"].empty()||!v["args"][0].is_string())return false;auto event=v["args"][0].get<std::string>();if(event!="galaxy-update-read"&&event!="galaxy-update-enable"&&event!="galaxy-update-check")return false;if(!Trusted(source))return true;
 if(event=="galaxy-update-check"){
   wil::unique_cotaskmem_string current;if(source.find(L"#/settings")==std::wstring::npos||!g_webview||FAILED(g_webview->get_Source(&current))||!current||!Trusted(current.get())||std::wstring(current.get()).find(L"#/settings")==std::wstring::npos)return true;
   manualRequested=true;StopGalaxyUpdater();const auto script=Root()/L"galaxy-updater"/L"updater.cjs";if(std::filesystem::exists(script)&&Spawn(Root()/L"stremio-runtime.exe",script,L"watch-force",&worker)){SendToJS("galaxy-update-state",{{"enabled",Enabled()},{"state","checking"},{"currentVersion",APP_VERSION}});}else Reply();return true;
 }
 if(event=="galaxy-update-enable"){
    if(source.find(L"#/settings")==std::wstring::npos||v["args"].size()!=2||!v["args"][1].is_array()||v["args"][1].size()!=1||!v["args"][1][0].is_boolean())return true;
    wil::unique_cotaskmem_string current;if(!g_webview||FAILED(g_webview->get_Source(&current))||!current||!Trusted(current.get())||std::wstring(current.get()).find(L"#/settings")==std::wstring::npos)return true;
    manualRequested=false;auto enabled=v["args"][1][0].get<bool>();if(WritePrivateProfileStringW(L"GalaxyUpdates",L"Enabled",enabled?L"1":L"0",Ini().c_str())){StopGalaxyUpdater();if(enabled)RunAutoUpdaterOnce();}
 }Reply();return true;}
std::string BuildGalaxyUpdateSettingsScript(const json& origins){auto r=FindResourceW(g_hInst,MAKEINTRESOURCEW(IDR_GALAXY_UPDATE_JS),MAKEINTRESOURCEW(10));if(!r)return {};auto h=LoadResource(g_hInst,r);auto ptr=static_cast<const char*>(LockResource(h));if(!ptr)return {};std::string js(ptr,SizeofResource(g_hInst,r));auto pos=js.find("__GALAXY_UPDATE_ORIGINS__");if(pos==std::string::npos)return {};js.replace(pos,std::string("__GALAXY_UPDATE_ORIGINS__").size(),origins.dump());return "\n"+js;}
