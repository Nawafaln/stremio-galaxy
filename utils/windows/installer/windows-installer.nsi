; Stremio Galaxy community installer, GPL-3.0. Original notices retained.
Unicode True
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "nsDialogs.nsh"
!include "FileFunc.nsh"
!include "${IDENTITY_INCLUDE}"
!include "${REMOVAL_INCLUDE}"
!ifndef GALAXY_TEST_MODE
 !define PRODUCT_KEY "${APP_ID}"
!else
 !define PRODUCT_KEY "${APP_ID}.PackagingTest"
!endif
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_KEY}"
Name "${APP_NAME}"
Caption "${APP_NAME} Setup"
BrandingText "${APP_NAME} - Community fork"
OutFile "${SETUP_OUT}"
InstallDir "D:\Apps\${APP_FOLDER}"
InstallDirRegKey HKCU "${UNINSTALL_KEY}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
VIProductVersion "${PRODUCT_VERSION}.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "FileDescription" "${APP_NAME} Setup"
VIAddVersionKey "ProductVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "CompanyName" "${COMPANY_NAME}"
VIAddVersionKey "LegalCopyright" "${APP_ATTRIBUTION}"
!define MUI_ICON "${PAYLOAD_DIR}\galaxy-icon.ico"
!define MUI_UNICON "${PAYLOAD_DIR}\galaxy-icon.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_LAUNCHER}"
!define MUI_FINISHPAGE_RUN_NOTCHECKED
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${PAYLOAD_DIR}\LICENSE.md"
!insertmacro MUI_PAGE_DIRECTORY
Page custom AddonOptionsCreate AddonOptionsLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Var GalaxyAutoUpdate
Var AddonGalaxyAnime
Var AddonSubtitles
Var GalaxyAnimeSelected
Var SubtitlesSelected
Var AddonDialog
Function AddonOptionsCreate
 nsDialogs::Create 1018
 Pop $AddonDialog
 ${NSD_CreateLabel} 0 0 100% 18u "Optional addons / إضافات اختيارية"
 Pop $0
 ${NSD_CreateLabel} 0 22u 100% 50u "New user with no addons? Enable the options you need. Existing configured account? Prefer leaving them OFF to avoid duplicates.$\r$\nجديد وما عندك إضافات؟ فعّل المناسب. عندك حساب مجهّز؟ الأفضل تترك الخيارات مطفّية."
 Pop $0
 SetCtlColors $0 FF3333 transparent
 ${NSD_CreateCheckbox} 0 78u 100% 18u "Galaxy Anime - anime catalog / كاتلوج أنمي جالكسي"
 Pop $AddonGalaxyAnime
 ${NSD_SetState} $AddonGalaxyAnime $GalaxyAnimeSelected
 ${NSD_CreateCheckbox} 0 102u 100% 18u "OpenSubtitles v3 - multilingual subtitles / ترجمة بلغات متعددة"
 Pop $AddonSubtitles
 ${NSD_SetState} $AddonSubtitles $SubtitlesSelected
 ${NSD_CreateLabel} 0 128u 100% 45u "After launch, sign in and confirm Install for each selected addon. Availability and languages vary by title; not all anime IDs are supported.$\r$\nبعد التشغيل سجّل دخولك وأكّد تثبيت كل إضافة. الترجمة واللغات تختلف حسب العنوان."
 Pop $0
 nsDialogs::Show
FunctionEnd
Function AddonOptionsLeave
 ${NSD_GetState} $AddonGalaxyAnime $GalaxyAnimeSelected
 ${NSD_GetState} $AddonSubtitles $SubtitlesSelected
FunctionEnd

Function .onInit
 StrCpy $GalaxyAutoUpdate 0
 ${GetParameters} $0
 ${GetOptions} $0 "/GALAXYAUTO=" $1
 StrCmp $1 "1" 0 +2
 StrCpy $GalaxyAutoUpdate 1
 StrCpy $GalaxyAnimeSelected 1
 StrCpy $SubtitlesSelected 0
 ${IfNot} ${RunningX64}
  MessageBox MB_OK|MB_ICONSTOP "This package requires 64-bit Windows."
  SetErrorLevel 1
  Abort
 ${EndIf}
 StrCmp $INSTDIR "D:\Apps\${APP_FOLDER}" 0 directoryReady
 IfFileExists "D:\*.*" directoryReady 0
 StrCpy $INSTDIR "$LOCALAPPDATA\Programs\${APP_FOLDER}"
 directoryReady:
 !ifndef GALAXY_TEST_MODE
  FindWindow $0 "${APP_WINDOW_CLASS}"
  StrCmp $0 0 notRunning
  IfSilent runningSilent
  MessageBox MB_OK|MB_ICONEXCLAMATION "Close Stremio Galaxy, including its tray icon, then run Setup again."
  runningSilent:
  SetErrorLevel 2
  Abort
  notRunning:
 !endif
FunctionEnd

Function DetectWebView2
 StrCpy $9 0
 SetRegView 32
 ReadRegStr $0 HKLM "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
 Call CheckRuntimeVersion
 ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
 Call CheckRuntimeVersion
 SetRegView 64
 ReadRegStr $0 HKLM "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
 Call CheckRuntimeVersion
 ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
 Call CheckRuntimeVersion
FunctionEnd
Function CheckRuntimeVersion
 StrCmp $0 "" finished
 StrCmp $0 "0.0.0.0" finished
 StrCpy $9 1
 finished:
FunctionEnd

Section "${APP_NAME}"
 ; Only an empty directory or this product's marked installation may be used.
 IfFileExists "$INSTDIR\.galaxy-product-id" checkIdentity
 IfFileExists "$INSTDIR\*.*" inspectDirectory install
 inspectDirectory:
 FindFirst $0 $1 "$INSTDIR\*"
 directoryLoop:
 StrCmp $1 "" emptyDirectory
 StrCmp $1 "." nextEntry
 StrCmp $1 ".." nextEntry
 FindClose $0
 Goto conflict
 nextEntry:
 FindNext $0 $1
 Goto directoryLoop
 emptyDirectory:
 FindClose $0
 Goto install
 checkIdentity:
 FileOpen $0 "$INSTDIR\.galaxy-product-id" r
 FileRead $0 $1
 FileClose $0
 StrCmp $1 "${PRODUCT_KEY}" install conflict
 conflict:
 IfSilent conflictSilent
 MessageBox MB_OK|MB_ICONSTOP "Choose an empty folder or an existing Stremio Galaxy installation. No other Stremio installation will be overwritten."
 conflictSilent:
 SetErrorLevel 4
 Abort
 install:
 Call DetectWebView2
 StrCmp $9 1 runtimeReady
 DetailPrint "Installing Microsoft Edge WebView2 Runtime (internet required)..."
 InitPluginsDir
 SetOutPath "$PLUGINSDIR"
 File /oname=MicrosoftEdgeWebview2Setup.exe "${WEBVIEW_BOOTSTRAPPER}"
 ExecWait '"$PLUGINSDIR\MicrosoftEdgeWebview2Setup.exe" /silent /install' $0
 Call DetectWebView2
 StrCmp $9 1 runtimeReady
 IfSilent runtimeFailedSilent
 MessageBox MB_OK|MB_ICONSTOP "WebView2 Runtime could not be installed. Check your internet connection, install Microsoft WebView2 Runtime, and run Setup again."
 runtimeFailedSilent:
 SetErrorLevel 3
 Abort
 runtimeReady:
 SetOutPath "$INSTDIR"
 ; Defaults copy once. Package-owned scripts and extensions update every time.
 SetOverwrite off
 File /r "${PAYLOAD_DIR}\defaults\*"
 SetOverwrite on
 File /r /x selection.js "${PAYLOAD_DIR}\owned\*"
 File /r /x defaults /x owned "${PAYLOAD_DIR}\*"
 StrCmp $GalaxyAutoUpdate 1 keepAddonSelection
 ; Installer-selected setup only. No remote account changes during installation.
 ; A new selection revision allows explicitly re-selected setup on a later install.
 System::Call 'kernel32::GetTickCount() i.r1'
 FileOpen $0 "$INSTDIR\portable_config\extensions\galaxy-addon-setup\selection.js" w
 FileWrite $0 'window.GalaxyAddonSelection={revision:"${PRODUCT_VERSION}-$1",torrentio:false,galaxyAnime:$GalaxyAnimeSelected===1,subtitles:$SubtitlesSelected===1};'
 FileClose $0
 keepAddonSelection:
 FileOpen $0 "$INSTDIR\.galaxy-product-id" w
 FileWrite $0 "${PRODUCT_KEY}"
 FileClose $0
 WriteUninstaller "$INSTDIR\Uninstall.exe"
 !ifndef GALAXY_TEST_MODE
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_LAUNCHER}" "" "$INSTDIR\${APP_LAUNCHER}" 0
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_LAUNCHER}" "" "$INSTDIR\${APP_LAUNCHER}" 0
  WriteRegStr HKCU "Software\Classes\${APP_PROTOCOL}" "" "URL:${APP_NAME} Protocol"
  WriteRegStr HKCU "Software\Classes\${APP_PROTOCOL}" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\${APP_PROTOCOL}\DefaultIcon" "" "$INSTDIR\${APP_LAUNCHER},0"
  WriteRegStr HKCU "Software\Classes\${APP_PROTOCOL}\shell\open\command" "" '$\"$INSTDIR\${APP_LAUNCHER}$\" $\"%1$\"'
 !endif
 WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "${APP_NAME}"
 WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "${COMPANY_NAME}"
 WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
 WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
 WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\${APP_LAUNCHER},0"
 WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
 WriteRegStr HKCU "${UNINSTALL_KEY}" "QuietUninstallString" '$\"$INSTDIR\Uninstall.exe$\" /S'
 WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
 WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
 SetRegView 64
 IfFileExists "$INSTDIR\.galaxy-product-id" 0 badIdentity
 FileOpen $0 "$INSTDIR\.galaxy-product-id" r
 FileRead $0 $1
 FileClose $0
 StrCmp $1 "${PRODUCT_KEY}" uninstall badIdentity
 badIdentity:
 IfSilent badSilent
 MessageBox MB_OK|MB_ICONSTOP "Product identity mismatch. No files were removed."
 badSilent:
 SetErrorLevel 4
 Abort
 uninstall:
 !ifndef GALAXY_TEST_MODE
  FindWindow $0 "${APP_WINDOW_CLASS}"
  StrCmp $0 0 uninstallReady
  IfSilent uninstallSilent
  MessageBox MB_OK|MB_ICONEXCLAMATION "Close Stremio Galaxy and run Uninstall again."
  uninstallSilent:
  SetErrorLevel 2
  Abort
  uninstallReady:
 !endif
 !insertmacro GalaxyRemoveFiles
 Delete "$INSTDIR\Uninstall.exe"
 Delete "$INSTDIR\.galaxy-product-id"
 DeleteRegKey HKCU "${UNINSTALL_KEY}"
 !ifndef GALAXY_TEST_MODE
  Delete "$DESKTOP\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"
  ReadRegStr $0 HKCU "Software\Classes\${APP_PROTOCOL}\shell\open\command" ""
  StrCmp $0 '$\"$INSTDIR\${APP_LAUNCHER}$\" $\"%1$\"' 0 keepProtocol
  DeleteRegKey HKCU "Software\Classes\${APP_PROTOCOL}"
  keepProtocol:
 !endif
 ; No recursive removal: accounts, settings, browser profile and caches survive.
 RMDir "$INSTDIR"
SectionEnd
