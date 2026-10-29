// Stremio Galaxy community modification, GPL-3.0.
// Themes contain validated colors/booleans only. No CSS, script or remote URL execution.
#include "theme_settings.h"
#include "../utils/helpers.h"
#include "../ui/mainwindow.h"
#include "../resource.h"
#include <filesystem>
#include <fstream>
#include <set>
namespace {
std::filesystem::path File(){return std::filesystem::path(GetExeDirectory())/L"portable_config"/L"themes.json";}
bool Enabled(){auto ini=std::filesystem::path(GetExeDirectory())/L"portable_config"/L"stremio-settings.ini";return GetPrivateProfileIntW(L"GalaxyThemes",L"Enabled",1,ini.c_str())!=0;}
bool Color(const json& v){if(!v.is_string())return false;auto s=v.get<std::string>();return s.size()==7&&s[0]=='#'&&s.find_first_not_of("0123456789abcdefABCDEF",1)==std::string::npos;}
bool Valid(const json& v){
 if(!v.is_object()||v.size()!=3||v.value("schema",json())!=1||!v.contains("selected")||!v["selected"].is_string()||!v.contains("themes")||!v["themes"].is_array()||v["themes"].size()>20)return false;
 std::set<std::string> ids={"galaxy","black","ocean"};
 for(const auto& t:v["themes"]){
  if(!t.is_object()||t.size()!=6||t.value("schema",json())!=1||!t.contains("id")||!t["id"].is_string()||!t.contains("name")||!t["name"].is_string()||!t.contains("colors")||!t["colors"].is_object()||t["colors"].size()!=4||!t.contains("stars")||!t["stars"].is_boolean()||!t.contains("motion")||!t["motion"].is_boolean())return false;
  auto id=t["id"].get<std::string>(),name=t["name"].get<std::string>();
  if(id.empty()||id.size()>64||id.find_first_not_of("abcdefghijklmnopqrstuvwxyz0123456789-_")!=std::string::npos||name.empty()||name.size()>240||!ids.insert(id).second)return false;
  for(auto key:{"background","surface","accent","text"})if(!t["colors"].contains(key)||!Color(t["colors"][key]))return false;
 }
 return ids.count(v["selected"].get<std::string>())!=0;
}
json Default(){return {{"schema",1},{"selected","galaxy"},{"themes",json::array()}};}
json Read(){try{auto f=File();if(std::filesystem::file_size(f)>65536)return Default();std::ifstream in(f);auto v=json::parse(in);return Valid(v)?v:Default();}catch(...){return Default();}}
std::wstring Origin(const std::wstring& s){auto p=s.find(L"://");return p==std::wstring::npos?L"":s.substr(0,s.find_first_of(L"/#?",p+3));}
bool Trusted(const std::wstring& s){auto o=Origin(s);if(o.empty())return false;for(auto& x:g_webuiUrls)if(Origin(x)==o)return true;return false;}
void Reply(const std::string& error=""){SendToJS("galaxy-theme-state",{{"state",Read()},{"error",error}});}
std::string Resource(int id){auto r=FindResourceW(g_hInst,MAKEINTRESOURCEW(id),MAKEINTRESOURCEW(10));if(!r)return {};auto h=LoadResource(g_hInst,r);auto p=static_cast<const char*>(LockResource(h));return p?std::string(p,SizeofResource(g_hInst,r)):std::string{};}
}
bool HandleGalaxyThemeMessage(const std::string& message,const std::wstring& source){
 auto v=json::parse(message,nullptr,false);if(!v.is_object()||!v.contains("args")||!v["args"].is_array()||v["args"].empty()||!v["args"][0].is_string())return false;
 auto event=v["args"][0].get<std::string>();if(event!="galaxy-theme-read"&&event!="galaxy-theme-save")return false;
 if(!Enabled()||!Trusted(source))return true;
 if(event=="galaxy-theme-read"){Reply();return true;}
 wil::unique_cotaskmem_string current;
 if(message.size()>65536||source.find(L"#/settings")==std::wstring::npos||!g_webview||FAILED(g_webview->get_Source(&current))||!current||!Trusted(current.get())||std::wstring(current.get()).find(L"#/settings")==std::wstring::npos)return true;
 if(v["args"].size()!=2||!v["args"][1].is_array()||v["args"][1].size()!=1||!Valid(v["args"][1][0])){Reply("invalid");return true;}
 try{auto f=File();std::filesystem::create_directories(f.parent_path());auto temp=f;temp+=L".tmp";{std::ofstream out(temp,std::ios::binary|std::ios::trunc);out<<v["args"][1][0].dump(2);out.flush();if(!out)throw std::runtime_error("write");}if(!MoveFileExW(temp.c_str(),f.c_str(),MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH))throw std::runtime_error("replace");Reply();}catch(...){Reply("write");}
 return true;
}
std::string BuildGalaxyThemeScript(const json& origins){if(!Enabled())return {};auto js=Resource(IDR_GALAXY_THEMES_JS);std::string token="__GALAXY_THEME_CONFIG__";auto p=js.find(token);if(p==std::string::npos)return {};json config={{"origins",origins},{"state",Read()},{"css",Resource(IDR_GALAXY_THEMES_CSS)}};js.replace(p,token.size(),config.dump());return "\n"+js;}
