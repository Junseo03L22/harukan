# Project handoff
Read README.md and docs/HANDOFF.md before changes. The active application is mobile/; archive/ is historical reference, not the app to modify. Follow mobile/AGENTS.md when editing Expo code.
Preserve Korean product copy. Current direction is photo calendar decoration with optional manual cutout editor and basic stickers; read docs/CALENDAR-0.5.md. Avatar and communication work is on hold; preserve LegacyApp.tsx and old profile data.
Never commit .env secrets, Expo authentication, server/data, node_modules, or device credentials. Do not assume the previous developer machine IP or authentication exists. Read docs/SETUP.md for fresh-machine setup.
Run npm test and npm run typecheck from mobile for meaningful code changes. Exporting bundles is not an App Store binary build. Update docs/HANDOFF.md with material changes and verified limitations.

