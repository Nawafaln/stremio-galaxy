// Stremio Galaxy community modification, GPL-3.0.
// Only the native folder picker supplies filesystem paths; the page cannot send one.
#include "cache_settings.h"
#include "cache_files.h"
#include "../core/globals.h"
#include "../utils/helpers.h"
#include "../utils/crashlog.h"
#include "../ui/mainwindow.h"
#include "../resource.h"
#include <shobjidl.h>
#include <fstream>
#include <filesystem>
#include <wrl.h>

namespace {
std::string activeRoot;
bool choosing=false, pickerQueued=false,clearQueued=false;
bool clearArabic=false;
std::wstring pickerTitle;
std::filesystem::path SettingsFile(){return std::filesystem::path(GetExeDirectory())/L"portable_config"/L"server"/L"server-settings.json";}
std::wstring IniFile(){return GetExeDirectory()+L"\\portable_config\\stremio-settings.ini";}
bool Enabled(){return GetPrivateProfileIntW(L"GalaxyCache",L"Enabled",1,IniFile().c_str())!=0;}
json ReadSettings(){
    const auto path=SettingsFile();
    if(!std::filesystem::exists(path))return json::object();
    std::ifstream input(path);if(!input)throw std::runtime_error("settings unreadable");
    auto value=json::parse(input);if(!value.is_object())throw std::runtime_error("invalid settings");
    return value;
}
std::string ServerRoot(const json& settings){return settings.contains("cacheRoot")&&settings["cacheRoot"].is_string()?settings["cacheRoot"].get<std::string>():WStringToUtf8(SettingsFile().parent_path().wstring());}
std::string ConfiguredRoot(){
    wchar_t buffer[32768]={};
    GetPrivateProfileStringW(L"GalaxyCache",L"Root",L"",buffer,32768,IniFile().c_str());
    return buffer[0]?WStringToUtf8(buffer):ServerRoot(ReadSettings());
}
std::wstring Origin(const std::wstring& url){const auto scheme=url.find(L"://");return scheme==std::wstring::npos?L"":url.substr(0,url.find_first_of(L"/#?",scheme+3));}
bool Trusted(const std::wstring& source){
    const auto origin=Origin(source);if(origin.empty())return false;
    for(const auto& allowed:g_webuiUrls)if(origin==Origin(allowed))return true;
    return false;
}
void Reply(const std::string& error=""){
    try{const auto root=ConfiguredRoot();std::uintmax_t bytes=0;const auto known=GalaxyCacheFiles::Size(std::filesystem::path(Utf8ToWstring(root))/L"stremio-cache",bytes);SendToJS("galaxy-cache-state",{{"root",root},{"path",root+"\\stremio-cache"},{"sizeBytes",known?json(bytes):json(nullptr)},{"pending",!activeRoot.empty()&&root!=activeRoot},{"error",error}});}
    catch(...){SendToJS("galaxy-cache-state",{{"error","settings"}});}
}
std::string Resource(int id){auto resource=FindResourceW(g_hInst,MAKEINTRESOURCEW(id),MAKEINTRESOURCEW(10));if(!resource)return {};auto data=LoadResource(g_hInst,resource);auto ptr=static_cast<const char*>(LockResource(data));return ptr?std::string(ptr,SizeofResource(g_hInst,resource)):std::string{};}
void ChooseFolder(const std::wstring& title){
    if(choosing)return;choosing=true;
    Microsoft::WRL::ComPtr<IFileOpenDialog> dialog;
    HRESULT result=CoCreateInstance(CLSID_FileOpenDialog,nullptr,CLSCTX_INPROC_SERVER,IID_PPV_ARGS(&dialog));
    if(FAILED(result)){choosing=false;Reply("picker");return;}
    DWORD options=0;dialog->GetOptions(&options);
    dialog->SetOptions(options|FOS_PICKFOLDERS|FOS_FORCEFILESYSTEM|FOS_PATHMUSTEXIST|FOS_NOCHANGEDIR);
    dialog->SetTitle(title.c_str());
    try{
        Microsoft::WRL::ComPtr<IShellItem> initial;
        auto root=Utf8ToWstring(ConfiguredRoot());
        if(SUCCEEDED(SHCreateItemFromParsingName(root.c_str(),nullptr,IID_PPV_ARGS(&initial))))dialog->SetFolder(initial.Get());
    }catch(...){choosing=false;Reply("settings");return;}
    result=dialog->Show(g_hWnd);
    if(result==HRESULT_FROM_WIN32(ERROR_CANCELLED)){choosing=false;Reply();return;}
    if(FAILED(result)){choosing=false;Reply("picker");return;}
    Microsoft::WRL::ComPtr<IShellItem> folder;
    PWSTR selected=nullptr;
    if(FAILED(dialog->GetResult(&folder))||FAILED(folder->GetDisplayName(SIGDN_FILESYSPATH,&selected))){choosing=false;Reply("picker");return;}
    const std::filesystem::path root(selected);CoTaskMemFree(selected);
    try{
        // Validate the server config before changing the saved selection.
        ReadSettings();
        const auto cache=root/L"stremio-cache";
        std::filesystem::create_directories(cache);
        // CREATE_NEW + DELETE_ON_CLOSE cannot truncate or remove an existing user file.
        const auto probe=cache/(L".galaxy-write-test-"+std::to_wstring(GetCurrentProcessId()));
        HANDLE handle=CreateFileW(probe.c_str(),GENERIC_WRITE,0,nullptr,CREATE_NEW,FILE_ATTRIBUTE_TEMPORARY|FILE_FLAG_DELETE_ON_CLOSE,nullptr);
        if(handle==INVALID_HANDLE_VALUE)throw std::runtime_error("not writable");
        CloseHandle(handle);
        if(!WritePrivateProfileStringW(L"GalaxyCache",L"Root",root.c_str(),IniFile().c_str()))throw std::runtime_error("ini write failed");
        choosing=false;Reply();
    }catch(...){choosing=false;Reply("write");}
}
}

bool ApplyGalaxyCacheRoot(){
    try{
        auto settings=ReadSettings();const auto root=ConfiguredRoot();
        if(ServerRoot(settings)!=root){
            std::filesystem::create_directories(std::filesystem::path(Utf8ToWstring(root))/L"stremio-cache");
            settings["cacheRoot"]=root;
            const auto path=SettingsFile();std::filesystem::create_directories(path.parent_path());
            auto temporary=path;temporary+=L".galaxy-"+std::to_wstring(GetCurrentProcessId())+L".tmp";
            {std::ofstream output(temporary,std::ios::binary|std::ios::trunc);output<<settings.dump(4);output.flush();if(!output)throw std::runtime_error("settings write failed");}
            if(!MoveFileExW(temporary.c_str(),path.c_str(),MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH))throw std::runtime_error("settings replace failed");
        }
        activeRoot=root;return true;
    }catch(...){AppendToCrashLog("[GALAXY]: Could not apply video cache location; server startup cancelled.");return false;}
}

bool HandleGalaxyCacheMessage(const std::string& message,const std::wstring& source){
    json value=json::parse(message,nullptr,false);
    if(value.is_discarded()||!value.is_object()||!value.contains("args")||!value["args"].is_array()||value["args"].empty()||!value["args"][0].is_string())return false;
    const auto event=value["args"][0].get<std::string>();
    if(event!="galaxy-cache-read"&&event!="galaxy-cache-choose"&&event!="galaxy-cache-clear")return false;
    if(!Enabled()||!Trusted(source))return true;
    if(event=="galaxy-cache-read"){Reply();return true;}
    wil::unique_cotaskmem_string current;g_webview->get_Source(&current);
    if(!current||std::wstring(current.get()).find(L"#/settings")==std::wstring::npos)return true;
    if(event=="galaxy-cache-clear"){
        if(!clearQueued&&!choosing&&!pickerQueued){clearArabic=value["args"].size()>1&&value["args"][1].is_array()&&!value["args"][1].empty()&&value["args"][1][0]=="ar";clearQueued=true;if(!PostMessageW(g_hWnd,WM_GALAXY_CACHE_CLEAR,0,0)){clearQueued=false;Reply("clear");}}
        return true;
    }
    std::wstring title=L"Choose video cache location";
    if(value["args"].size()>1&&value["args"][1].is_array()&&!value["args"][1].empty()&&value["args"][1][0].is_string()){
        const auto label=value["args"][1][0].get<std::string>();if(label.size()<512)title=Utf8ToWstring(label);
    }
    if(!choosing&&!pickerQueued){
        pickerTitle=title;pickerQueued=true;
        if(!PostMessageW(g_hWnd,WM_GALAXY_CACHE_PICK,0,0)){pickerQueued=false;Reply("picker");}
    }
    return true;
}

std::string BuildGalaxyCacheSettingsScript(const json& origins){
    auto script=Resource(IDR_GALAXY_CACHE_JS);const auto css=Resource(IDR_GALAXY_CACHE_CSS);
    const std::string token="__GALAXY_CACHE_CONFIG__";const auto pos=script.find(token);
    if(pos==std::string::npos||css.empty())return {};
    script.replace(pos,token.size(),json({{"enabled",Enabled()},{"origins",origins},{"css",css}}).dump());return "\n"+script;
}

void ShowGalaxyCachePicker(){
    if(!pickerQueued)return;
    pickerQueued=false;
    wil::unique_cotaskmem_string source;
    if(!g_webview||FAILED(g_webview->get_Source(&source))||!source||!Trusted(source.get())||std::wstring(source.get()).find(L"#/settings")==std::wstring::npos){Reply();return;}
    ChooseFolder(pickerTitle);
}

void ShowGalaxyCacheClear(){
 if(!clearQueued)return;clearQueued=false;wil::unique_cotaskmem_string source;
 if(!g_webview||FAILED(g_webview->get_Source(&source))||!source||!Trusted(source.get())||std::wstring(source.get()).find(L"#/settings")==std::wstring::npos){Reply();return;}
 try{const auto path=std::filesystem::path(Utf8ToWstring(ConfiguredRoot()))/L"stremio-cache";std::filesystem::path resolved;if(!GalaxyCacheFiles::Resolve(path,resolved)){Reply("path");return;}
 const auto question=std::wstring(clearArabic?L"هل تريد حذف ملفات الكاش؟ لا يمكن التراجع عن هذا الإجراء.\n\n":L"Delete cached video files? This cannot be undone.\n\n")+resolved.wstring();
 if(MessageBoxW(g_hWnd,question.c_str(),clearArabic?L"مسح الكاش":L"Clear cache",MB_YESNO|MB_ICONWARNING|MB_DEFBUTTON2)!=IDYES){Reply();return;}
 Reply(GalaxyCacheFiles::Clear(resolved)?"":"clear");}catch(...){Reply("clear");}
}
