// Stremio Galaxy native startup host. Local canvas/WebGL intro with concurrent UI loading.
#pragma once
#include <windows.h>
void StartGalaxyStartupIntro(HWND parent);
void GalaxyStartupAppReady();
void ResizeGalaxyStartupIntro();
void CloseGalaxyStartupIntro();
bool HandleGalaxyStartupTimer(UINT_PTR timer);
