// Stremio Galaxy community modification, GPL-3.0.
#pragma once
#include <string>
#include <nlohmann/json.hpp>
void RunAutoUpdaterOnce();
void StopGalaxyUpdater();
void PrepareGalaxyUpdateOnExit();
void RunInstallerAndExit();
bool HandleGalaxyUpdateMessage(const std::string& message,const std::wstring& source);
std::string BuildGalaxyUpdateSettingsScript(const nlohmann::json& origins);
