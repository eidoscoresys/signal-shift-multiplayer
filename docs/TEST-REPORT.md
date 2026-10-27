# SIGNAL SHIFT — Final Override UX verification

Date: October 27, 2026 (America/New_York). Build: 1.0.0-rc.2.

Public game: https://signal-shift.signal-shift.workers.dev

Cloudflare deployment: 014fbf7f-e5e9-4420-893c-de3fdc57ac52. The existing Worker, Durable Object binding, SQLite migration and rate-limit configuration are preserved.

## Changes under test

- Role-specific finale briefing: readers relay numbered symbols; control crew matches its private key and repeats the mechanism order; readers confirm; owners activate steps 1–4.
- Three fixed-phrase real-time requests: Send symbol key, Confirm order, Ready to activate. Requests contain no clues or solutions, perform no puzzle action, and remain available during the safety interlock.
- Latest eight requests persist across refresh/reconnect and clear on replay. Server validation, authenticated sender identity, deduplication and a short repeat interval apply.
- Current numbered step names its control owner. A separate persistent success acknowledgment survives new requests; the existing shared progress track remains visible.
- Five-minute deadline, puzzle generation, ownership, confirmations, penalties, score and cooperative requirements are unchanged.

## Actual results

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Complete unit suite | 35 passed; zero failures |
| Complete local browser suite | 25 passed in 19.1 minutes; zero failures/skips/flaky results; corrected security and eight-player scenarios also passed focused local rechecks |
| Existing public release before redeployment | 18 passed; zero failures/skips/flaky results |
| Production frontend build | Passed; 33 modules; JavaScript 251.49 kB / 79.05 kB gzip; CSS 25.64 kB / 6.69 kB gzip |
| Worker deployment dry run | Passed; 25.20 KiB / 7.37 KiB gzip |
| Deployment and anonymous HTTPS probe | Passed; HTML/health 200; expected 1.0.0-rc.2 version |
| Published static assets | All 6 files byte-matched to the final local production build; HTTP 200 |
| Updated public acceptance | 21 passed in 15.9 minutes; zero failures/skips/flaky results |
| Physical phones on separate networks | NOT TESTED |

## Coverage and evidence

The new browser scenarios run complete real missions with 2, 4 and 8 isolated players. They check role instructions, 44-pixel callout touch targets, simultaneous requests received by every member, duplicate/invalid messages, temporary disconnects, refresh restoration, unchanged deadline/integrity/confirmation state, private clue separation, and successful completion with synchronized results. The shared solver verifies each successful intermediate override step and next-step feedback on every console.

Five new unit cases cover 2/4/8-player clue privacy and unchanged rules, restoration/replay clearing, fixed-vocabulary validation, duplicate suppression, bounded history, repeat limiting, requests during interlock, terminal rejection and migration of pre-callout stored rooms. All 30 original unit cases remain, including 700 complete campaigns across every crew size 2–8 and varied puzzle seeds.

The full local suite also checks all crew sizes 2–8, odd-numbered role distribution, simultaneous actions, privacy, room isolation, scoring, replay, host reassignment, HTTP/authentication/security, network errors, expired sessions, keyboard interactions, reduced motion, accessibility, rate limits, a full workerd restart and the actual five-minute server alarm. Automated WCAG checks reported zero tagged violations on audited screens, including every role and crisis.

The predeployment baseline used the unchanged rc.1 source archive in an isolated directory. Its 18 public tests passed in 15.5 minutes. An initial attempt was interrupted after a test-runner file-read failure caused by formatting local files during that run; the isolated rerun replaced it. This was not counted as a passing run.

Machine-readable evidence: docs/unit-test-results.json, docs/local-test-results.json, docs/baseline-public-test-results.json, docs/public-test-results.json, docs/local-security-recheck-test-results.json and docs/local-eight-recheck-test-results.json. Browser screenshots include docs/finale-callouts-mobile.png. The 360-pixel finale screenshot was visually reviewed for legibility. Generated reports, traces and local databases are excluded from the source archive.

A first updated-public attempt found a race in the test-only snapshot capture: replacement WebSockets cleared the capture buffer before the next frame, and a direct read returned undefined during replay setup after victory. The helper now waits for and captures an actual snapshot object. Local and public artifacts use separate output directories, and both complete suites were rerun after this harness correction. A subsequent public security check also read one client immediately after observing a different client; it now waits for the sender’s synchronized dial value and uses the shared snapshot reader. Its expected value and duplicate/isolation assertions are preserved. The corrected security scenario passed its local recheck, and the entire public suite passed after both corrections. An additional 8-player onboarding attempt exceeded the test’s five-second initial lobby wait while the client still displayed Connecting. The pre-mission lobby wait is now bounded at 15 seconds; mission/gameplay timing and assertions are unchanged. The eight-player local recheck and the final complete public suite passed with this wait. No production networking or puzzle code was changed for these test fixes.

## Limits

Automated browsers run on one workstation and network; they do not verify real phones, Safari/Firefox or separate physical internet connections. Use CROSS-DEVICE-TEST.md for that human check. A dedicated 24-hour cleanup soak and platform-forced hibernation test remain unverified. Local workerd occasionally logs a SQLite alarm-rescheduling cancellation warning; the applicable recovery and deadline acceptance scenarios passed. No new production debug routes or timing overrides were introduced.


## Historical evidence after portfolio preparation

This is the accepted rc.2 record. The curated aggregate record in verification/released-rc2.json was extracted from the preserved rc.2 source/delivery manifests; it is explicitly a summary, not a reconstructed per-test execution log. New candidate runs reuse the generated local report path, so docs/local-test-results.json now records the rc.3 candidate (27 scenarios). The original public rc.2 report was preserved locally as docs/released-rc2-public-test-results.json before the rc.3 public run. The current docs/public-test-results.json records the 23-scenario rc.3 release; the original unit report is also preserved as docs/released-rc2-unit-test-results.json. Candidate evidence and limitations are recorded separately in PORTFOLIO-TEST-REPORT.md.
