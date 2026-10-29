// Stremio Galaxy community modification, GPL-3.0.
#pragma once
#include <string>
#include <nlohmann/json.hpp>
std::string BuildGalaxyNavigationScript(const nlohmann::json& allowedOrigins);
