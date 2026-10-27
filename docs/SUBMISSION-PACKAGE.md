# Release package checklist

Release candidate: 1.0.0-rc.2. This document distinguishes prepared material from verified release outcomes. Public game: https://signal-shift.signal-shift.workers.dev. Build and deployment details are recorded in RELEASE.md. Verification passed: 35 unit, 25 local integration and 21 published integration tests.

Prepared materials:

- Title: SIGNAL SHIFT — Keep the Signal Alive.
- Full cover: assets/signal-shift-cover.png, 1600×900 PNG.
- Thumbnail: assets/signal-shift-thumbnail.png, 640×360 PNG. The large game title remains readable at submission-thumbnail size; full original SVG is included.
- Concise project description: COMPETITION.md.
- Player instructions: PLAYER-GUIDE.md and the in-game three-step briefing/contextual help.
- Two-device/two-network testing instructions: CROSS-DEVICE-TEST.md. Physical tests remain unverified until actual testers record outcomes.
- Deployment/configuration runbook: DEPLOYMENT.md.
- Source: src/, server/, shared/, tests/, scripts/, public/, assets/ plus pinned package/TypeScript/Vite/Wrangler configuration.

Source repository status at review: local Git repository exists, but it has no commits and no remote configured. There is no GitHub repository URL to report. The release source archive and SHA-256 manifests preserve the exact release files without including node_modules, .wrangler, cookies, traces, OAuth configuration or credential material. Publishing a source repository is separate from publishing the playable Worker.

Before final submission, attach the prepared source archive/manifest and review actual physical-device results or keep them labeled unverified. The literal public URL and successful published outcomes are already recorded. Do not submit a localhost address as a public game URL.

