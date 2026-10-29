#!/usr/bin/env node

/****************************************************************************
 * deploy_windows.js
 *
 * Builds windows distributable folder dist/win.
 * Pass --installer to also build the windows installer
 * Make sure to have set up utils/windows and the environment correctly by following windows.md
 *
 ****************************************************************************/

const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

// ---------------------------------------------------------------------
// Project/Layout Configuration
// ---------------------------------------------------------------------
const ARCH = process.argv.includes('--x86') ? 'x86' : 'x64';
const SOURCE_DIR = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(SOURCE_DIR, `cmake-build-release-${ARCH}`);
const DIST_DIR = path.join(SOURCE_DIR, 'dist', `win-${ARCH}`);
const CONFIG_DIR = path.join(SOURCE_DIR, 'dist', `win-${ARCH}`, 'portable_config');
const { info: identity, generate } = require('./generate_identity');
const PROJECT_NAME = identity.executable.replace(/\.exe$/i, '');

// Paths to Additional Dependencies
const MPV_DLL = ARCH === 'x86'
    ? path.join(SOURCE_DIR, 'deps', 'libmpv', 'i686', 'libmpv-2.dll')
    : path.join(SOURCE_DIR, 'deps', 'libmpv', 'x86_64', 'libmpv-2.dll');
const SERVER_JS = path.join(SOURCE_DIR, 'utils', 'windows', 'server.js');
const STREMIO_RUNTIME_EXE = path.join(SOURCE_DIR, 'utils', 'windows', 'stremio-runtime.exe');
const FFMPEG_FOLDER = path.join(SOURCE_DIR, 'utils', 'windows', 'ffmpeg');
const MPV_FOLDER = path.join(SOURCE_DIR, 'utils', 'mpv', 'anime4k');
const DEFAULT_SETTINGS_FOLDER = path.join(SOURCE_DIR, 'utils', 'stremio');

// Default Paths
const DEFAULT_NSIS = process.env.NSIS_EXE || 'C:\\Program Files (x86)\\NSIS\\makensis.exe';
//VCPKG
const VCPKG_TRIPLET = ARCH === 'x86' ? 'x86-windows-static' : 'x64-windows-static';
const VCPKG_CMAKE = process.env.VCPKG_ROOT ? path.join(process.env.VCPKG_ROOT, 'scripts', 'buildsystems', 'vcpkg.cmake') : '';
if (!VCPKG_CMAKE || !fs.existsSync(VCPKG_CMAKE)) throw new Error('Set VCPKG_ROOT to your vcpkg checkout.');

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------
(async function main() {
    try {
        generate(path.join(SOURCE_DIR, 'generated'));
        console.log(`\n=== Building ${identity.displayName} for ${ARCH.toUpperCase()} ===`);
        const args = process.argv.slice(2);
        const buildInstaller = args.includes('--installer');
        const buildPortable = args.includes('--portable');
        const debugBuild = args.includes('--debug');

        // 3) Run CMake + Ninja in ../cmake-build-release (64-bit)
        if (!fs.existsSync(BUILD_DIR)) {
            fs.mkdirSync(BUILD_DIR, { recursive: true });
        }

        console.log(`\n=== Running CMake in cmake-build-${debugBuild ? "Debug" : "Release"} ===`);
        process.chdir(BUILD_DIR);
        execFileSync('cmake', ['-G', 'Ninja', `-DCMAKE_BUILD_TYPE=${debugBuild ? 'Debug' : 'Release'}`,
            `-DDEBUG_LOG=${debugBuild ? 'ON' : 'OFF'}`, `-DCMAKE_TOOLCHAIN_FILE=${VCPKG_CMAKE}`,
            `-DVCPKG_TARGET_TRIPLET=${VCPKG_TRIPLET}`, SOURCE_DIR], {stdio:'inherit'});
        console.log('=== Running Ninja in cmake-build-release ===');
        execSync('ninja', { stdio: 'inherit' });

        // Return to script directory
        process.chdir(__dirname);

        // 4) Prepare dist\win
        console.log(`\n=== Cleaning and creating ${DIST_DIR} ===`);
        safeRemove(DIST_DIR);
        fs.mkdirSync(DIST_DIR, { recursive: true });

        // 5) Copy main .exe
        const builtExe = path.join(BUILD_DIR, `${PROJECT_NAME}.exe`);
        const distExe = path.join(DIST_DIR, `${PROJECT_NAME}.exe`);
        copyFile(builtExe, distExe);

        // 6) Copy mpv DLL, server.js, node.exe
        copyFile(MPV_DLL, path.join(DIST_DIR, path.basename(MPV_DLL)));
        copyFile(SERVER_JS, path.join(DIST_DIR, path.basename(SERVER_JS)));




        // 8) Flatten stremio-runtime, ffmpeg
        console.log('Flattening DS folder, stremio-runtime, ffmpeg...');
        copyFile(STREMIO_RUNTIME_EXE, path.join(DIST_DIR, 'stremio-runtime.exe'));
        copyFolderContents(FFMPEG_FOLDER, DIST_DIR);
        copyFolderContentsPreservingStructure(MPV_FOLDER, DIST_DIR);
        copyFolderContentsPreservingStructure(DEFAULT_SETTINGS_FOLDER, CONFIG_DIR);
        for (const filename of ['LICENSE.md','NOTICE.md','app-identity.json']) copyFile(path.join(SOURCE_DIR,filename),path.join(DIST_DIR,filename));
        // Preserve third-party redistribution notices for the linked libraries.
        const notices=path.join(DIST_DIR,'third-party-notices');
        fs.mkdirSync(notices,{recursive:true});
        for(const port of ['curl','nlohmann-json','openssl','webview2','wil','zlib']) {
            const notice=path.join(process.env.VCPKG_ROOT,'installed',VCPKG_TRIPLET,'share',port,'copyright');
            copyFile(notice,path.join(notices,port+'.txt'));
        }
        copyFile(path.join(SOURCE_DIR,'deps','discord-rpc','LICENSE'),path.join(notices,'discord-rpc.txt'));
        generateRemovalManifest();

        console.log('\n=== dist\\win preparation complete. ===');

        // 10) If --installer, parse version and build NSIS
        if (buildInstaller) {
            console.log('\n--installer detected: building NSIS installer...');
            // Extract the version first so we can set process.env before calling NSIS
            const version = getPackageVersionFromCMake();
            process.env.package_version = version;
            console.log(`Set package_version to: ${version}`);
            buildNsisInstaller();
        } else if (buildPortable) {
            console.log('\n--portable detected: building Portable...');
            buildPortableZip();
        }


        console.log('\nAll done!');
    } catch (err) {
        console.error('Error in deploy_windows.js:', err);
        process.exit(1);
    }
})();

/****************************************************************************
 * Helper Functions
 ****************************************************************************/

function safeRemove(dirPath) {
    const resolved=path.resolve(dirPath);
    if(resolved !== path.resolve(DIST_DIR) || !resolved.startsWith(path.resolve(SOURCE_DIR,'dist')+path.sep)) throw new Error('Refusing to clean a path outside this build output.');
    if(fs.existsSync(path.join(resolved,'galaxy_webview'))) throw new Error('This output contains a used browser profile. Move the running package to a separate folder before rebuilding.');
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
}

function copyFile(src, dest) {
    if (!fs.existsSync(src)) {
        throw new Error(`Required package file missing: ${src}`);
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${src} -> ${dest}`);
}

/**
 * Recursively copies only the contents of "src" into "dest" (flattened).
 * If src has files/folders, they go directly into dest, rather than
 * creating a subfolder named src.
 */
function copyFolderContents(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn(`Warning: missing folder: ${src}`);
        return;
    }
    const stats = fs.statSync(src);
    if (!stats.isDirectory()) {
        console.warn(`Warning: not a directory: ${src}`);
        return;
    }
    for (const item of fs.readdirSync(src)) {
        const srcItem = path.join(src, item);
        // Galaxy replaces the upstream silence/speed Tab script with chapter-only skipping.
        if (path.resolve(srcItem) === path.resolve(MPV_FOLDER, 'portable_config', 'scripts', 'skip-intro.lua')) continue;
        const itemStats = fs.statSync(srcItem);
        const destItem = path.join(dest, item);
        if (itemStats.isDirectory()) {
            copyFolderContents(srcItem, dest);
        } else {
            copyFile(srcItem, destItem);
        }
    }
}

/**
 * Copies the contents of `src` into `dest` without flattening.
 * Subdirectories in `src` will be recreated in `dest`.
 */
function copyFolderContentsPreservingStructure(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn(`Warning: missing folder: ${src}`);
        return;
    }

    const stats = fs.statSync(src);
    if (!stats.isDirectory()) {
        console.warn(`Warning: not a directory: ${src}`);
        return;
    }

    // Ensure destination directory exists
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const items = fs.readdirSync(src);

    for (const item of items) {
        const srcItem = path.join(src, item);
        // Galaxy replaces the upstream silence/speed Tab script with chapter-only skipping.
        if (path.resolve(srcItem) === path.resolve(MPV_FOLDER, 'portable_config', 'scripts', 'skip-intro.lua')) continue;
        const destItem = path.join(dest, item);
        const itemStats = fs.statSync(srcItem);

        if (itemStats.isDirectory()) {
            // Recursively copy subdirectories
            copyFolderContentsPreservingStructure(srcItem, destItem);
        } else {
            if (!srcItem.endsWith('zip') && !srcItem.endsWith('7z')) {
                // Copy files
                copyFile(srcItem, destItem);
            }
        }
    }
}

/**
 * Retrieves version from CMakeLists.txt (handles quotes):
 *  project(stremio VERSION "5.0.2")
 */
function getPackageVersionFromCMake() { return identity.version; }

// Galaxy: uninstall only files packaged by this build; never recursively remove user data.
function generateRemovalManifest() {
    const lines=['; Generated package-owned file removal list.','!macro GalaxyRemoveFiles'];
    const dirs=[];
    const walk=(dir,relative='')=>{
        for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
            const rel=path.join(relative,entry.name);
            if(relative==='' && entry.name==='portable_config')continue;
            if(entry.isDirectory()){dirs.push(rel);walk(path.join(dir,entry.name),rel);}
            else if(entry.isFile())lines.push('  Delete "$INSTDIR\\'+rel.replaceAll('/','\\')+'"');
        }
    };
    walk(DIST_DIR);
    for(const dir of dirs.reverse())lines.push('  RMDir "$INSTDIR\\'+dir.replaceAll('/','\\')+'"');
    lines.push('!macroend','');
    fs.writeFileSync(path.join(SOURCE_DIR,'generated','galaxy-install-files.nsh'),lines.join('\n'));
}

function buildNsisInstaller() {
    if (ARCH !== 'x64') throw new Error('The clean Galaxy installer currently targets x64.');
    execFileSync(process.execPath,[path.join(SOURCE_DIR,'build','package-installer.js')],{stdio:'inherit'});
}

function buildPortableZip() {
    const version = getPackageVersionFromCMake();
    const portableOutput = path.join(SOURCE_DIR, 'utils', `${identity.displayName} ${version}-${ARCH}.7z`);
    const fixedEdgeWebView = path.join(SOURCE_DIR, 'utils', 'windows', 'WebviewRuntime', ARCH);
    const portable_config = path.join(DIST_DIR, 'portable_config');
    const distContents = DIST_DIR; // Path to dist directory contents

    console.log(`\nCreating Portable ZIP: ${portableOutput}`);

    // Common 7-Zip paths
    const common7zPaths = [
        'C:\\Program Files\\7-Zip\\7z.exe',
        'C:\\Program Files (x86)\\7-Zip\\7z.exe'
    ];

    // Find 7-Zip executable
    const sevenZipPath = common7zPaths.find(fs.existsSync);
    if (!sevenZipPath) {
        console.error('Error: 7-Zip executable not found in common paths.');
        console.error('Please install 7-Zip and ensure it is in one of the following paths:');
        console.error(common7zPaths.join('\n'));
        process.exit(1);
    }

    console.log(`Using 7-Zip at: ${sevenZipPath}`);

    // Ensure the DIST_DIR exists
    if (!fs.existsSync(DIST_DIR)) {
        console.error(`Error: DIST_DIR does not exist: ${DIST_DIR}`);
        process.exit(1);
    }

    copyFolderContentsPreservingStructure(fixedEdgeWebView, portable_config);

    // Command to create the 7z archive
    const zipCommand = `"${sevenZipPath}" a -t7z -mx=9 "${portableOutput}" "${distContents}\\*"`;

    try {
        // Run the 7-Zip command
        console.log(`Running: ${zipCommand}`);
        execSync(zipCommand, { stdio: 'inherit' });
        console.log(`\nPortable ZIP created: ${portableOutput}`);
        //Clean UP
        const portableConfigWebView = path.join(DIST_DIR, 'portable_config', 'EdgeWebView');
        if (fs.existsSync(portableConfigWebView)) {
            console.log(`\nCleaning up: ${portableConfigWebView}`);
            fs.rmSync(portableConfigWebView, { recursive: true, force: true });
            console.log(`Removed: ${portableConfigWebView}`);
        } else {
            console.log(`\nNo cleanup needed: ${portableConfigWebView} does not exist.`);
        }
    } catch (error) {
        console.error('Error creating the Portable ZIP:', error);
        process.exit(1);
    }
}