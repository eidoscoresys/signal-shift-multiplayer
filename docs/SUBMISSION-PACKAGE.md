# Release package checklist

Release candidate: 1.0.0-rc.3. This document distinguishes prepared material from verified release outcomes. Public game: https://signal-shift.signal-shift.workers.dev. Build and deployment details are recorded in RELEASE.md. Verification passed: 35 unit, 27 local integration and 23 published integration tests.

Prepared materials:

- Title: SIGNAL SHIFT — Keep the Signal Alive.
- Full cover: assets/signal-shift-cover.png, 1600×900 PNG.
- Thumbnail: assets/signal-shift-thumbnail.png, 640×360 PNG. The large game title remains readable at submission-thumbnail size; full original SVG is included.
- Concise project description: COMPETITION.md.
- Player instructions: PLAYER-GUIDE.md and the in-game three-step briefing/contextual help.
- Two-device/two-network testing instructions: CROSS-DEVICE-TEST.md. Physical tests remain unverified until actual testers record outcomes.
- Deployment/configuration runbook: DEPLOYMENT.md.
- Source: src/, server/, shared/, tests/, scripts/, public/, assets/ plus pinned package/TypeScript/Vite/Wrangler configuration.

Public source repository: https://github.com/eidoscoresys/signal-shift-multiplayer. Quindel Logan approved public creation, source push and a verified tagged release. GitHub associates the commits with the confirmed creator account and noreply identity. Original private checkpoint refs remain local; no historical authors or dates were rewritten. The release source package excludes dependencies, runtime/session data, credentials and raw traces. Licensing remains unassigned.

Before final submission, attach the prepared source archive/manifest and review actual physical-device results or keep them labeled unverified. The literal public URL and successful published outcomes are already recorded. Do not submit a localhost address as a public game URL.

