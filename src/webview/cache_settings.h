// Stremio Galaxy community modification, GPL-3.0.
#pragma once
#include <string>
#include <nlohmann/json.hpp>
std::string BuildGalaxyCacheSettingsScript(const nlohmann::json& origins);
bool HandleGalaxyCacheMessage(const std::string& message, const std::wstring& source);
bool ApplyGalaxyCacheRoot();

// Posted to the main STA message loop after WebView2's callback returns.
inline constexpr unsigned int WM_GALAXY_CACHE_PICK=0x8000+63;
void ShowGalaxyCachePicker();
inline constexpr unsigned int WM_GALAXY_CACHE_CLEAR=0x8000+64;
void ShowGalaxyCacheClear();
