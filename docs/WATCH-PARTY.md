# Watch Party — Stremio Galaxy 5.0.24

The installer includes the Watch Party toolbar WebMod, the MPV companion, the current room Worker, and the matching local runtimes. Galaxy starts the companion automatically using a hidden child process in its Windows shutdown job. Node and Wrangler do not need to be installed separately.

This is a local preview. All listeners bind to 127.0.0.1. A shared online service still requires a separately approved deployment. No deployment is performed by the installer or launcher.

Each participant opens the same film or episode in Galaxy. Use the toolbar button to create a room or join with its ID and invite code, then enable player sync. Only the room host may publish playback state. Stream URLs are not sent to rooms.

The toolbar, panel labels, player messages, connection state, errors and participant counts follow Galaxy's Arabic or English interface setting. Other locales fall back to English. Language changes preserve the room connection, user-entered room names and sync selection.

[GalaxyWatchParty] Enabled=0 in portable_config/stremio-settings.ini disables automatic startup. MPV continues to use a local same-user named pipe, and the companion still enforces its token and origin checks.

Tests cover fresh install, upgrade and uninstall preservation; installation through paths with spaces and Arabic text; the packaged standalone services; room permissions; and real libmpv playback, pause and seek synchronization. Local tests do not establish interoperability between remote machines.
