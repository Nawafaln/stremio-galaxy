// Stremio Galaxy community modification, GPL-3.0.
#include "taskbar_identity.h"
#include <shobjidl.h>
#include <propkey.h>
#include <propvarutil.h>
#include <wrl/client.h>
#include "../core/globals.h"
#include "../utils/helpers.h"
#include "../utils/crashlog.h"
void ApplyGalaxyTaskbarIdentity(HWND window) {
    const HRESULT apartment=CoInitializeEx(nullptr,COINIT_APARTMENTTHREADED);
    {
        Microsoft::WRL::ComPtr<IPropertyStore> store;
        HRESULT result=SHGetPropertyStoreForWindow(window,IID_PPV_ARGS(&store));
        if(SUCCEEDED(result)) {
            wchar_t path[32768]{};
            GetModuleFileNameW(nullptr,path,32768);
            const std::wstring exe=path;
            const auto set=[&](REFPROPERTYKEY key,const std::wstring& text){
                PROPVARIANT value{};
                HRESULT hr=InitPropVariantFromString(text.c_str(),&value);
                if(SUCCEEDED(hr)){hr=store->SetValue(key,value);PropVariantClear(&value);}
                if(FAILED(hr))AppendToCrashLog("[GALAXY]: Taskbar property failed: "+std::to_string(hr));
            };
            set(PKEY_AppUserModel_RelaunchCommand,L"\""+exe+L"\"");
            set(PKEY_AppUserModel_RelaunchDisplayNameResource,L"@"+exe+L",-201");
            set(PKEY_AppUserModel_RelaunchIconResource,exe+L",-101");
            // Set the explicit window ID last, once its relaunch metadata is ready.
            set(PKEY_AppUserModel_ID,Utf8ToWstring(APP_MODEL_ID_UTF8));
            AppendToCrashLog("[GALAXY]: Taskbar identity and embedded icon configured.");
        }else AppendToCrashLog("[GALAXY]: Taskbar property store failed: "+std::to_string(result));
    }
    if(SUCCEEDED(apartment))CoUninitialize();
}
