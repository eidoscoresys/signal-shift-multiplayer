# Troubleshooting

## Station unreachable / no live link

For the built game, run build then server and use http://127.0.0.1:8787. For frontend development, keep the Worker running on 8787 and Vite on 5173. Avoid mixing localhost and 127.0.0.1, since cookies are host-specific. A loopback address cannot be shared with friends on other devices; they need the public HTTPS deployment. For remote/LAN testing use a trusted HTTPS setup rather than treating HTTP on an arbitrary IP as a verified phone setup.

If the page is an old power-only build, refresh it to load the campaign bundle. A reconnect alone does not replace JavaScript already loaded in a tab. Session identity and authoritative progress survive refresh.

## Someone else's console appears / another tab took control

A browser profile has one identity per room. Use separate profiles/incognito contexts for different players. Opening the same invite in a new tab of the same profile takes over the existing console. The replaced tab stops reconnecting; refresh only if you intend to take it back.

## Host or teammate disappears

Command moves to a connected teammate when a socket closes or server heartbeat monitoring finds it silent. Heartbeats arrive every ten seconds; a silent connection expires after 35 seconds, checked at most every ten seconds. Assigned sectors stay fixed and recover on reconnect. The mission clock continues. If a player cannot return, create a new room with the available crew; the game does not silently reveal that player's private readings or let another role take their controls.

## Test is taking five minutes

The full suite deliberately waits for the real server deadline. It does not accelerate or override the game clock. The half-open-host scenario also waits for real heartbeat expiry while another player continues sending actions. Watch console progress instead of treating these waits as a hung test. Failed Playwright traces are retained in test-results/.

## Room full, locked or expired

Maximum crew is eight. The roster locks on start. An existing valid cookie can rejoin a running/full room, but a new browser profile is a new player. Rooms expire 24 hours after creation. Create a fresh room to change the crew or replace an expired flight.

## Rate limit / interlock

Wrong puzzle submissions cost 20 integrity and impose a three-second interlock. Repeated IDs do not apply twice; simultaneous tests cannot bypass the interlock. A WebSocket burst above 30 messages/second closes the sender; wait briefly and refresh. HTTP rate errors include Retry-After. Shared networks share IP limits. Their production enforcement is per Cloudflare location and still needs public verification.

## Windows tooling

Use scripts/pnpm.ps1 if npm/npx/Corepack are absent. pnpm may require permission to write/link its package store; workerd and Playwright require local process/socket access. Install Chromium through `./scripts/pnpm.ps1 exec playwright install chromium`. The dependency lockfile and allowlisted build scripts make setup reproducible. Do not delete arbitrary package stores or system runtimes to fix an installation.

## Competition limitations

Local browser emulation is not physical-phone testing, an Internet load test or proof of Cloudflare account eligibility. Track these gates in TEST-REPORT.md. The cover and project description are available under assets/ and docs/COMPETITION.md.
