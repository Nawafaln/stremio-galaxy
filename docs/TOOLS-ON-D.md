# Tools and downloads on D

All project-managed downloads: D:\StremioGalaxyTools\downloads
CMake 4.4.4 portable: D:\StremioGalaxyTools\tools\cmake-4.4.4-windows-x86_64
Ninja 1.13.2 portable: D:\StremioGalaxyTools\tools\ninja
vcpkg source and installed libraries: D:\StremioGalaxyTools\vcpkg
vcpkg download cache: D:\StremioGalaxyTools\downloads\vcpkg
vcpkg binary cache: D:\StremioGalaxyTools\cache\vcpkg
Build Tools requested installation: D:\StremioGalaxyTools\VS2022
Visual Studio requested package cache: D:\StremioGalaxyTools\cache\VS
Project-controlled temporary files: D:\StremioGalaxyTools\temp

Source build/environment-d.ps1 before command-line builds. It only adjusts the current process environment, not global PATH/TEMP settings. build/build-on-d.ps1 initializes MSVC, builds vcpkg dependencies, audits prerequisites and runs native deployment into this project's dist directory.

The pre-existing Microsoft installer and system-required shared components can remain on C. Microsoft elevation/service processes may use their own system log and staging locations. The D paths above control project downloads and requested installation/cache paths; they do not move Windows system components.

Download sources: Microsoft official https://aka.ms/vs/17/release/vs_buildtools.exe (Authenticode valid Microsoft signer); Kitware/CMake official GitHub release (SHA-256 matched published manifest); ninja-build/ninja official release; microsoft/vcpkg official repository; upstream-defined Zaarrg/libmpv submodule; discord/discord-rpc official release. Project runtime server.js copied from the already installed D:\StremioCommunity rather than downloaded from an unverified release path.
