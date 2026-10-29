// Stremio Galaxy modification, GPL-3.0.
#pragma once
#include <string>
#include <nlohmann/json.hpp>
std::string BuildPosterHoverScript(const nlohmann::json& allowedOrigins);
