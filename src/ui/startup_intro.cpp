// Stremio Galaxy community startup integration, GPL-3.0.
// Local 3D startup overlay; the main UI loads concurrently.
#include "startup_intro.h"
#include "../core/globals.h"
#include "../utils/helpers.h"
#include "../utils/crashlog.h"
#include "../resource.h"
#include <Shlwapi.h>
#include <wrl.h>
namespace {
constexpr UINT_PTR timerId=0x4749;
constexpr ULONGLONG transitionDuration=900, fadeDuration=650;
constexpr wchar_t introUrl[]=L"https://galaxy-startup.invalid/index.html";
HWND parentWindow=nullptr,layerWindow=nullptr;
wil::com_ptr<ICoreWebView2Environment> environment;
wil::com_ptr<ICoreWebView2Controller> controller;
wil::com_ptr<ICoreWebView2> view;
bool requested=false,closed=true,mainReady=false,documentReady=false,shown=false,finished=false,transitioning=false;
ULONGLONG readyAt=0,startedAt=0,finishedAt=0,transitionAt=0;
const BYTE* Resource(int id,DWORD& length){auto r=FindResourceW(g_hInst,MAKEINTRESOURCEW(id),MAKEINTRESOURCEW(10));if(!r){length=0;return nullptr;}auto h=LoadResource(g_hInst,r);length=SizeofResource(g_hInst,r);return static_cast<const BYTE*>(LockResource(h));}
void Log(const std::string& line){AppendToCrashLog("[GALAXY INTRO]: "+line);}
void Finish(bool skipped=false){
 if(closed||finished)return;finished=true;finishedAt=GetTickCount64();
 if(controller)controller->put_IsVisible(FALSE);
 if(layerWindow)ShowWindow(layerWindow,SW_HIDE);

 Log(skipped?"Skipped; showing application.":"Completed; showing application.");
 // Close on the next timer tick, outside the WebView message callback.
}
void Fail(){Log("Unavailable; using normal startup.");CloseGalaxyStartupIntro();}
void TryStart(){
 if(closed||!documentReady||requested||!view)return;
 requested=true;ResizeGalaxyStartupIntro();
 view->ExecuteScript(L"window.__startGalaxyIntro&&window.__startGalaxyIntro();",nullptr);
}
}
void StartGalaxyStartupIntro(HWND parent){
 if(!closed)return;
 DWORD bytes=0;if(!Resource(IDR_GALAXY_STARTUP_HTML,bytes)||!bytes)return;
 parentWindow=parent;closed=false;mainReady=false;requested=false;documentReady=false;shown=false;finished=false;readyAt=startedAt=finishedAt=transitionAt=0;transitioning=false;
 WNDCLASSW wc{};wc.lpfnWndProc=DefWindowProcW;wc.hInstance=g_hInst;wc.hbrBackground=CreateSolidBrush(RGB(5,4,15));wc.lpszClassName=L"GalaxyStartupCover";
 if(!RegisterClassW(&wc))DeleteObject(wc.hbrBackground);
 layerWindow=CreateWindowExW(WS_EX_LAYERED,L"GalaxyStartupCover",L"Stremio Galaxy startup",WS_CHILD|WS_VISIBLE|WS_CLIPSIBLINGS,0,0,0,0,parent,nullptr,g_hInst,nullptr);
 g_hSplash=layerWindow;SetLayeredWindowAttributes(layerWindow,0,255,LWA_ALPHA);ResizeGalaxyStartupIntro();
 if(!layerWindow){Fail();return;}
 SetTimer(parent,timerId,16,nullptr);
 auto options=Microsoft::WRL::Make<CoreWebView2EnvironmentOptions>();
 // Separate local-only startup environment; no audio permissions needed.

 auto folder=std::filesystem::path(GetExeDirectory())/L"portable_config"/L"startup_webview";
 auto runtime=std::filesystem::path(GetExeDirectory())/L"portable_config"/L"EdgeWebView";
 const wchar_t* browser=std::filesystem::is_directory(runtime)?runtime.c_str():nullptr;
 HRESULT hr=CreateCoreWebView2EnvironmentWithOptions(browser,folder.c_str(),options.Get(),
  Microsoft::WRL::Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
  [](HRESULT result,ICoreWebView2Environment* env)->HRESULT{
   if(closed)return S_OK;if(FAILED(result)||!env){Fail();return S_OK;}environment=env;
   HRESULT createResult=env->CreateCoreWebView2Controller(layerWindow,Microsoft::WRL::Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
    [](HRESULT result,ICoreWebView2Controller* raw)->HRESULT{
     if(closed){if(raw)raw->Close();return S_OK;}if(FAILED(result)||!raw){Fail();return S_OK;}
     controller=raw;if(FAILED(controller->get_CoreWebView2(view.put()))||!view){Fail();return S_OK;}
     controller->put_IsVisible(FALSE);ResizeGalaxyStartupIntro();
     wil::com_ptr<ICoreWebView2Settings> settings;if(SUCCEEDED(view->get_Settings(settings.put()))){settings->put_IsStatusBarEnabled(FALSE);settings->put_AreDefaultContextMenusEnabled(FALSE);}
     // No remote requests: all startup assets are embedded local resources.
     view->AddWebResourceRequestedFilter(L"https://*",COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);
     view->AddWebResourceRequestedFilter(L"http://*",COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);
     EventRegistrationToken token{};
     view->add_WebResourceRequested(Microsoft::WRL::Callback<ICoreWebView2WebResourceRequestedEventHandler>(
      [](ICoreWebView2*,ICoreWebView2WebResourceRequestedEventArgs* args)->HRESULT{
       if(closed||!environment)return S_OK;
       wil::com_ptr<ICoreWebView2WebResourceRequest> request;args->get_Request(request.put());wil::unique_cotaskmem_string uri;if(request)request->get_Uri(&uri);
       const std::wstring url=uri?uri.get():L"";int id=0;bool html=false;
       if(url==introUrl){id=IDR_GALAXY_STARTUP_HTML;html=true;}
       else if(url==L"https://galaxy-startup.invalid/three.min.js")id=IDR_GALAXY_STARTUP_THREE;
       else if(url==L"https://galaxy-startup.invalid/intro.js")id=IDR_GALAXY_STARTUP_HOST;
       else if(url==L"https://galaxy-startup.invalid/logo.webp")id=IDR_GALAXY_STARTUP_LOGO;
       DWORD size=0;const BYTE* data=id?Resource(id,size):nullptr;
       wil::com_ptr<IStream> stream;if(data&&size)stream.attach(SHCreateMemStream(data,size));
       wil::com_ptr<ICoreWebView2WebResourceResponse> response;
       const wchar_t* headers=id==IDR_GALAXY_STARTUP_LOGO?L"Content-Type: image/webp\r\nCache-Control: no-store":html?L"Content-Type: text/html; charset=utf-8\r\nCache-Control: no-store":L"Content-Type: application/javascript; charset=utf-8\r\nCache-Control: no-store";
       if(SUCCEEDED(environment->CreateWebResourceResponse(stream.get(),stream?200:403,stream?L"OK":L"Forbidden",headers,response.put())))args->put_Response(response.get());
       return S_OK;
      }).Get(),&token);
     view->add_NavigationStarting(Microsoft::WRL::Callback<ICoreWebView2NavigationStartingEventHandler>(
      [](ICoreWebView2*,ICoreWebView2NavigationStartingEventArgs* args)->HRESULT{wil::unique_cotaskmem_string uri;args->get_Uri(&uri);if(!uri||std::wstring(uri.get())!=introUrl)args->put_Cancel(TRUE);return S_OK;}).Get(),&token);
     view->add_NewWindowRequested(Microsoft::WRL::Callback<ICoreWebView2NewWindowRequestedEventHandler>(
      [](ICoreWebView2*,ICoreWebView2NewWindowRequestedEventArgs* args)->HRESULT{args->put_Handled(TRUE);return S_OK;}).Get(),&token);
     view->add_WebMessageReceived(Microsoft::WRL::Callback<ICoreWebView2WebMessageReceivedEventHandler>(
      [](ICoreWebView2*,ICoreWebView2WebMessageReceivedEventArgs* args)->HRESULT{
       if(closed)return S_OK;wil::unique_cotaskmem_string source,message;args->get_Source(&source);if(!source||std::wstring(source.get())!=introUrl||FAILED(args->TryGetWebMessageAsString(&message))||!message)return S_OK;
       const std::wstring event=message.get();
       if(event==L"galaxy-intro-started"&&!shown){shown=true;startedAt=GetTickCount64();controller->put_IsVisible(TRUE);SetWindowPos(layerWindow,HWND_TOP,0,0,0,0,SWP_NOMOVE|SWP_NOSIZE|SWP_SHOWWINDOW);controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);Log("Playing 3D logo intro; main UI loading concurrently.");if(mainReady)view->ExecuteScript(L"window.__galaxyAppReady&&window.__galaxyAppReady();",nullptr);}
       else if(event==L"galaxy-intro-transition"&&mainReady&&!transitioning){
        transitioning=true;transitionAt=GetTickCount64();
        if(g_webview)g_webview->ExecuteScript(L"(()=>{const el=document.documentElement;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;el.animate([{transform:'scale(1.025)',transformOrigin:'50% 50%'},{transform:'scale(1)',transformOrigin:'50% 50%'}],{duration:900,easing:'cubic-bezier(.22,.61,.36,1)'});})()",nullptr);
       }
       else if(event==L"galaxy-intro-finished"&&mainReady)Finish();
       else if(event.rfind(L"galaxy-intro-metrics:",0)==0||event==L"galaxy-intro-model-ready"||event==L"galaxy-intro-model-fallback")Log(WStringToUtf8(event));
       return S_OK;
      }).Get(),&token);
     view->add_NavigationCompleted(Microsoft::WRL::Callback<ICoreWebView2NavigationCompletedEventHandler>(
      [](ICoreWebView2*,ICoreWebView2NavigationCompletedEventArgs* args)->HRESULT{BOOL success=FALSE;args->get_IsSuccess(&success);if(!success){Fail();return S_OK;}documentReady=true;TryStart();return S_OK;}).Get(),&token);
     if(FAILED(view->Navigate(introUrl)))Fail();return S_OK;
    }).Get());
   if(FAILED(createResult))Fail();return S_OK;
  }).Get());
 if(FAILED(hr))Fail();
}
void GalaxyStartupAppReady(){mainReady=true;if(closed)return;if(!readyAt)readyAt=GetTickCount64();if(view)view->ExecuteScript(L"window.__galaxyAppReady&&window.__galaxyAppReady();",nullptr);TryStart();}
void ResizeGalaxyStartupIntro(){if(!layerWindow||!parentWindow)return;RECT rc{};GetClientRect(parentWindow,&rc);MoveWindow(layerWindow,0,0,rc.right,rc.bottom,TRUE);if(controller){GetClientRect(layerWindow,&rc);controller->put_Bounds(rc);}}
bool HandleGalaxyStartupTimer(UINT_PTR timer){
 if(timer!=timerId)return false;if(closed)return true;if(finished){CloseGalaxyStartupIntro();return true;}auto now=GetTickCount64();
 if(layerWindow&&!finished)SetWindowPos(layerWindow,HWND_TOP,0,0,0,0,SWP_NOMOVE|SWP_NOSIZE|SWP_NOACTIVATE);
 if(mainReady&&!shown&&readyAt&&now-readyAt>15000){Fail();return true;}
 if(transitioning&&layerWindow){
  const double x=(std::min)(1.0,static_cast<double>(now-transitionAt)/transitionDuration);
  const double fade=(std::min)(1.0,(std::max)(0.0,(static_cast<double>(now-transitionAt)-(transitionDuration-fadeDuration))/fadeDuration));
  const double smooth=fade*fade*(3-2*fade);SetLayeredWindowAttributes(layerWindow,0,static_cast<BYTE>(255*(1-smooth)),LWA_ALPHA);
  if(x>=1)Finish();
 }
 if(mainReady&&shown&&!finished&&now-startedAt>20000)Finish();return true;
}
void CloseGalaxyStartupIntro(){
 closed=true;if(parentWindow)KillTimer(parentWindow,timerId);if(controller)controller->Close();view.reset();controller.reset();environment.reset();if(layerWindow){if(g_hSplash==layerWindow)g_hSplash=nullptr;DestroyWindow(layerWindow);layerWindow=nullptr;}parentWindow=nullptr;
}
