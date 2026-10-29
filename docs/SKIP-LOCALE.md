# Skip button interface language

Community modification. The installed D:\StremioCommunity\portable_config\extensions\personal-anime-skip extension now loads locale.js before button.js. A matching copy is stored under utils/stremio/extensions/personal-anime-skip. Restart the app completely to reload content scripts.

Verified upstream sources: Stremio/stremio-web development src/core/CoreProvider.tsx exposes window.core; createTransport.ts exposes getState(model); common/useProfile.js reads ctx.profile.settings; App/App.js uses profile.settings.interfaceLanguage to change UI language. HTML lang is empty in the deployed UI, so navigator.language is deliberately not used as the app language.

locale.js reads only ctx.profile.settings.interfaceLanguage using getState('ctx'), applies translated text, title, aria-label, lang and direction. It refreshes every two seconds and on navigation/focus; no settings writes or network requests. Thirty languages have local labels and ISO 639 aliases. Unsupported languages fall back to English. This updates the clickable WebView button; the Lua diagnostic/fallback overlay is unchanged.

Validation: node --check on locale.js/button.js; node tests/skip-locale.test.cjs covers English, Arabic, French, switching, RTL, tooltips, unknown language and core initialization failure. Still requires the installed app restart and playback check. Set the interface language in Stremio, start an opening chapter, and verify the button label changes within two seconds. Tab behavior is unchanged.
