# SIGNAL SHIFT — Public release candidate

Play: https://signal-shift.signal-shift.workers.dev

Build: 1.0.0-rc.2. Cloudflare deployment version: 014fbf7f-e5e9-4420-893c-de3fdc57ac52. Published and verified October 27, 2026 (America/New_York).

Verification: 35 unit tests, 25 local integration tests and 21 published-version integration tests passed. The published suite completed missions for every crew size 2–8 and verified HTTPS/WSS, privacy/isolation, secure sessions, recovery, replay, scoring and the actual server deadline. See TEST-REPORT.md for methods, limits and evidence.

Final Override update: role-specific relay instructions, three shared quick-callouts, current-step ownership and persistent success feedback. Timer, puzzle difficulty and private-clue rules are preserved. The updated finale passed 2-, 4- and 8-player public tests with reconnect and privacy checks.

Full cover: https://signal-shift.signal-shift.workers.dev/signal-shift-cover.png — 1600×900 PNG.

Thumbnail: https://signal-shift.signal-shift.workers.dev/signal-shift-thumbnail.png — 640×360 PNG.

Players need no accounts or installations. Use a voice call or sit together. Create/join with the six-character code, then follow the briefing/context help. PLAYER-GUIDE.md explains the rules. CROSS-DEVICE-TEST.md gives the precise real-device procedure.

Source delivery: release/signal-shift-1.0.0-rc.2-source.zip. Per-file hashes are in release/source-manifest.json and the ZIP/cover/thumbnail hashes are in release/delivery-manifest.json. Generated test traces, SQLite databases, dependencies, OAuth files and credentials are excluded. A source repository exists locally but has no commits or configured remote; there is no GitHub URL.

Remaining human checks: actual phones, Safari/Firefox and two separate Internet connections. They are NOT verified by browser contexts on one workstation. A dedicated 24-hour cleanup soak and platform-controlled hibernation eviction test also remain outstanding.

Target October 29 for public release is met by this verified candidate ahead of schedule. October 30 remains the planned physical-device/final submission buffer. This record does not schedule background runs or claim that a competition form was submitted.


Portfolio preparation note: the historical rc.2 source archive is preserved locally and excluded from GitHub publication. The audited rc.3 candidate, creator credits and planned GitHub release have their own status in PUBLICATION.md and PORTFOLIO-TEST-REPORT.md. This historical release record is not evidence that the candidate or repository has been published.
