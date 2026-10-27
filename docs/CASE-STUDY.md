# SIGNAL SHIFT — Technical case study

**Creator: Quindel Logan**  
**Game Creator, Product Designer, Creative Director, and AI Development Lead**

[Play SIGNAL SHIFT](https://signal-shift.signal-shift.workers.dev/) · [Contribution disclosure](CREDITS.md) · [Verification evidence](TEST-REPORT.md)

## The challenge

Create an original cooperative browser game that makes communication essential. A crew should feel urgency and interdependence while restoring a failing orbital station, with no installation or player accounts. The result needed to work for 2–8 people, retain private information, recover from network interruptions and present a polished competition-ready experience.

Quindel Logan supplied the concept, requirements, creative direction and product decisions, then led an AI-assisted development process with OpenAI Codex handling much of the implementation and automated verification. This is a record of human creative/product leadership and transparent AI assistance, not a claim of exclusively manual coding.

## Design decisions

**Asymmetric information creates cooperation.** Engineers/operators own controls and calibration/key data; analysts/decoders own different readings and sequence fragments. Every sector has an owner. Small crews combine duties, while larger crews split numbered responsibilities. Merely watching another console is insufficient to solve the complete mission alone through the intended interface.

**One deadline connects the crises.** Power Routing, Thermal Balance and Final Override share one five-minute server clock and integrity meter. Transitions preserve urgency instead of resetting time. Wrong tests cost integrity; a failed mechanical choice resets the finale sequence. Seeded configurations support replay without changing the rules.

**A shared visual identity supports distinct work.** Dark station panels, cyan/amber accents, readable numbered sectors and role-specific controls make the mission coherent. Responsive layouts, touch targets, contextual instructions, reduced-motion handling and clear connection states support browser play. Automated mobile viewports are verified; physical phones and additional browser engines are separately listed as unverified.

## From two-player prototype to 2–8-player release

The foundation separated typed network messages, pure game rules, puzzle generation and the UI. A two-player vertical slice established a working authoritative room, private clues, shared power controls and returning identities. It was implemented and tested before the remaining crises were expanded.

The next stage added Thermal Balance and Final Override, four specialties, role/sector allocation across every crew size 2–8, shared scoring/results, replay, host reassignment and stronger recovery checks. Odd-numbered crews received explicit acceptance tests rather than being inferred from even-sized groups. Milestones and scope were approved by Quindel, who required implementation and acceptance evidence instead of documentation-only scaffolding.

The published rc.2 application uses the same architecture as the prototype: one authoritative Durable Object per room. No browser-local multiplayer simulation is used in the released game.

## Multiplayer architecture

React renders player-specific consoles. A Cloudflare Worker validates HTTP traffic, reserves room codes, issues room-scoped HttpOnly cookies and authenticates WebSocket connections. Each room's Durable Object serializes events, validates actions and persists state/action history in SQLite-backed storage before acknowledging and broadcasting.

The server distributes public progress plus each player's authorized, phase-scoped clue variant. It withholds seeds, solution arrays, token digests and action-history internals. Membership, role, numbered-sector ownership, phase, values and replay/start requirements are checked server-side. Action IDs prevent duplicate application; phase/mission context rejects stale queued inputs. Rooms and cookies are isolated, and a replacement tab takes over the same identity intentionally.

Snapshots reconcile clients after actions and reconnects. Heartbeats detect silent links; the host can transfer to another connected player. Persisted roles, progress and the original deadline survive refresh and tested restart scenarios. Dedicated platform-forced hibernation and a 24-hour cleanup soak remain verification limits, not claimed successes.

## AI-assisted development process

Quindel defined the brief, priorities and acceptance expectations; approved architectural and release decisions; and directed iteration through explicit milestones. Codex implemented source changes, tooling, UI, tests and documentation and used observed failures to debug the application and its test harness. The process preserved a distinction between proposed work, passing local checks, public deployment and verified public behavior.

Missing command-line tooling was resolved using an available supported Node/pnpm setup. Local Cloudflare emulation allowed development without deployment credentials. Secure browser authorization was used only when public deployment became necessary. Credentials and generated runtime/session data are excluded from the publication set.

## Live playtesting changed the finale

In the first reported live cooperative playtest, Quindel played with Codex acting as a browser teammate. Power and Cooling were solved. The crew reached Final Override with **1:46 remaining** and finished at **80% integrity** after the mission clock expired. Quindel identified communication latency and unclear responsibilities as the main issue, rather than excessive difficulty or integrity loss.

The resulting product decision was deliberately narrow: preserve the five-minute timer, private information, cooperation and puzzle difficulty; reduce uncertainty about who knows what and who should act next.

The verified rc.2 improvements were:

- An immediate role-specific flow: read numbered symbols, match the control crew's private key, confirm the spoken order/readings, then activate steps 1–4.
- Three fixed-phrase real-time requests: Send symbol key, Confirm order and Ready to activate. They request communication; they do not reveal clues or operate mechanisms.
- Clear current-step ownership and persistent acknowledgments of successful steps, alongside shared sequence progress.
- A bounded request history restored after refresh/reconnect and cleared on replay.

Automated 2-, 4- and 8-player finale tests checked these changes against real local and published multiplayer rooms. A new human usability playtest is still needed to measure whether the revised instructions improve real-team communication; automation does not establish that subjective outcome.

## Testing strategy and observed issues

The released rc.2 passed 35 unit, 25 local browser and 21 public HTTPS/WSS acceptance tests in their final complete runs. The suite includes 700 complete unit-solved campaigns, varied seeds, every crew size 2–8, simultaneous actions, invalid/unauthorized inputs, privacy, room isolation, scoring, replay, disconnect/refresh recovery, host reassignment, local process restart and the actual five-minute server deadline.

Automated WCAG checks found zero tagged violations on audited screens. They do not claim complete accessibility certification, screen-reader validation or Safari/Firefox coverage. Browser sessions were isolated on one workstation/network; separate physical devices/networks remain a human check.

Public testing exposed assumptions in the test harness: a replacement socket could briefly have no captured snapshot, one client's update could arrive before another's, and a pre-mission connection could exceed the original five-second assertion. The fixes awaited actual snapshots, polled the relevant client's state and allowed a bounded 15-second initial lobby wait. The mission timer, gameplay assertions and security expectations were preserved, and a final complete public run passed. The full report records these issues rather than hiding them.

## Outcome and portfolio record

A two-player prototype grew into a publicly playable 2–8-player three-crisis campaign with real authoritative multiplayer and verified published acceptance. The playable URL, original artwork, actual screenshots, source code and verification record support a portfolio review. No competition award, submitted entry, external user metric or unperformed device test is claimed.

The rc.3 portfolio release adds creator/AI attribution and a separate About / Credits page. It passed 35 unit, 27 local browser and 23 public acceptance tests. The credits and public GitHub link are live. Its publication status and new verification results are recorded separately in PORTFOLIO-TEST-REPORT.md and PUBLICATION.md. Historical product milestones are not retroactively converted into invented Git commits.
