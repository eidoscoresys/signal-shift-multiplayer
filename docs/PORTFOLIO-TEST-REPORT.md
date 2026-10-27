# SIGNAL SHIFT — Creator credits release verification

Date: October 27, 2026. Release: **1.0.0-rc.3**.

- Game: https://signal-shift.signal-shift.workers.dev/
- Credits: https://signal-shift.signal-shift.workers.dev/about
- Source: https://github.com/eidoscoresys/signal-shift-multiplayer
- Release: https://github.com/eidoscoresys/signal-shift-multiplayer/releases/tag/v1.0.0-rc.3
- Cloudflare Worker version: 759a616d-9912-43cd-a655-1380d07c2c7f.

## Implemented and verified

Created and Directed by Quindel Logan. His game concept, product design, creative direction and AI-assisted development oversight are credited in the README, contribution record, technical case study, citation metadata and accessible About / Credits page. OpenAI Codex's implementation/testing/documentation assistance is disclosed.

Credits open separately and do not mount the room client. Real public-browser tests confirm that opening them preserves the original console, identity, progress and deadline and that the crew can continue interacting. The real GitHub and playable links are present. The established game rules, five-minute clock, private clues, room architecture and Cloudflare migration remain unchanged.

## Actual results

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Unit suite | 35 passed |
| Complete local browser suite | 27 passed in 19.9 minutes; zero failures/skips/flaky outcomes |
| Final credits/link recheck | 2 passed, including automated accessibility and mission non-interference |
| Focused eight-player finale/recovery and complete-session rechecks | Both passed |
| Complete matching public HTTPS/WSS suite | 23 passed in 16.5 minutes; zero failures/skips/flaky outcomes |
| Production build | Passed, 35 modules; JavaScript 253.95 kB / 79.73 kB gzip; CSS 26.39 kB / 6.86 kB gzip |
| Worker dry run and deployment | Passed with the existing bindings and migration |
| Published asset integrity | All 6 static files byte-matched the tested local build |
| Public GitHub attribution/images | Creator/AI disclosure retrieved anonymously; cover and 4 gameplay images byte-matched reviewed files |
| Published initial commit attribution | GitHub associates 4cd85ff2bde9cc5b67f1f75b808d11e844f1d7bf with eidoscoresys; author/committer Quindel Logan use the confirmed noreply identity |

The public suite exercised every crew size 2–8, all three crises, scoring, replay, simultaneous/duplicate/invalid inputs, privacy, isolation, secure cookies, reconnection/refresh, host reassignment, burst handling, terminal states and the actual five-minute alarm. The local suite also covers process restart, mocked failure UX and local rate limits. Automated WCAG scans reported zero tagged violations on audited screens, including credits; this is not a full accessibility certification.

## Test-harness correction

One initial rc.3 public attempt hit a five-second assertion while waiting for the reconnect indicator during an eight-player simulated network loss. The test bounds now match the existing recovery policy: up to 45 seconds for close/heartbeat detection, 55 seconds for host/presence expiry and 20 seconds for restored connectivity/backoff. These are bounded test waits for the documented heartbeat policy, not changes to production networking, game duration, expected identity/progress/privacy, score or puzzle rules. The relevant local eight-player cases and the entire public suite passed after the correction. No failed test was skipped or counted as passing.

## Evidence and limits

Generated local reports include docs/unit-test-results.json, docs/local-test-results.json, docs/public-test-results.json, docs/credits-link-recheck-test-results.json and the focused portfolio eight-player reports. Raw reports/traces/session data contain machine context and remain ignored; failed-attempt evidence is retained privately. The prior rc.2 aggregate record is in verification/released-rc2.json, with its historical methods in TEST-REPORT.md.

Automated browser sessions were isolated on one workstation/network. Actual phones, Safari/Firefox, separate physical internet connections, a dedicated 24-hour cleanup soak and platform-forced hibernation remain unverified. The user-and-Codex live playtest informed the finale; no new human usability study is claimed. Local workerd occasionally emitted its previously documented alarm-rescheduling warning while applicable tests passed.

Licensing remains unassigned by creator choice. GitHub/browser authentication used an OS credential store outside the project; the confirmed GitHub noreply identity protects the creator's personal email. Source, Git objects/index and curated images were reviewed before publication. Private editor checkpoints, credentials, generated builds, dependencies and runtime/session data were excluded. No history rewrite or fabricated historical commit dates were used.
