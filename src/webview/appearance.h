// Stremio Galaxy modification. GPL-3.0; see LICENSE.md.
#pragma once
#include <functional>
void RegisterGalaxyAppearance(std::function<void()> ready = {}, bool updateCurrent = false);
