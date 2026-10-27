# Campaign rules — version 0.3

## Crew assignment

A room accepts 2–8 members before start. Join order repeats Power Engineer, Thermal Analyst, Signal Decoder, Systems Operator. Engineering and operations are control roles; analysis and decoding are reading roles. Two-player crews combine Engineer+Operator and Analyst+Decoder. In a three-player crew the engineer also covers operations.

Each group receives all four numbered sectors exactly once. Within a group, sector i belongs to group member i modulo group size. Thus every player has 1–4 exclusive sectors in every crisis; eight-player crews have exactly one control or reading responsibility per player per crisis. Lobby joins can redistribute sectors; the roster/ownership lock when the mission starts. Joining after start is rejected with an explanation, but existing authenticated members may reconnect.

The first member commands the lobby. All rostered players must be connected to start/replay. If the commander disconnects, the first connected member in join order takes command. A server watchdog checks at ten-second intervals and closes links silent for more than 35 seconds, including when a device vanishes without a socket-close event. Primary roles and sectors do not change during a flight. There are no bots or automatic control transfers after a permanent departure; create a new room to change the crew.

## Mission lifecycle and time

Lobby → power → thermal → override → won/lost. The server generates a fresh 32-bit seed on start/replay and sets one deadline 300,000 ms later. Progression never extends it. Every game action and reconnect checks expiry; a persistent Durable Object alarm resolves the deadline without player input. At the deadline, failure wins over any attempted final action. At zero integrity the mission fails immediately. A final server timestamp freezes the displayed result clock and score.

Successful power/cooling tests advance one phase. Only four correct mechanical steps complete the mission. No puzzle actions are allowed in terminal states. Replay is commander-only, resets all progress, confirmations, integrity, cooldown and time, increments mission number, and preserves the crew and its identities. Action history remains intact across replay.

## Reproducible puzzles

All randomness is server-side. The original power generator remains stable to preserve saved power-slice flights: a 32-bit LCG (1664525*x+1013904223 modulo 2^32), using bits 16–17, generates four offsets and four targets. Dial_i = (target_i − offset_i + 4) modulo 4. Each dial can reach all four values.

Thermal and override generators use the same LCG with seed XOR domain separation (0x715fa92b for cooling; 0x36abd591 for override), drawing from state shifted by eight bits. Cooling generates base 8–15, gain 2–4, and valve solution 1–5 for each sector. Target = base + gain × solution. Strictly positive gain makes the valid position unique. Controllers see their calibration; readers see their targets.

Override uses a seeded Fisher–Yates permutation for a symbol-to-mechanism key, plus four symbol indices. Symbols are RING, TRIANGLE, DIAMOND and STAR. Mechanisms are VENT, CLAMP, ARM and IGNITE. Reading owners see only their numbered symbols; controllers see the key and their assigned sequence controls. Correct mechanism_i = key[symbol_i], executed in order.

Pure generators and action-based solvers are tested independently. No seed, explicit solution array or internal room record is sent to the browser. Secrets are filtered by both owner and active phase. Future-crisis secrets remain hidden. Public dial/valve positions, readiness, step progress, integrity and completed systems are shared.

## Collaboration and penalties

Readers explicitly confirm each assigned reading after relaying it. All four confirmations are required before power/cooling tests or final sequence execution. Either reading specialty can authorize the complete power/cooling test; neither controls circuits or valves. Every control action is checked against sector ownership. Decoders translate power glyphs using their displayed legend.

A wrong power or thermal test costs 20 integrity and triggers a three-second global interlock. A wrong override mechanism also costs 20, resets the sequence to step zero, and preserves already relayed confirmations. Unauthorized roles, invalid values, stale phase/mission actions and out-of-turn attempts are rejected without an integrity penalty. While cooling down, all game actions are rejected. Simultaneous submissions cannot duplicate penalties: the first wrong test activates the interlock, and duplicate action IDs never apply again.

Score at victory = integrity × 10 + floor(max(0,deadline − finish_time)/1000) × 5. Failure scores zero. Maximum possible score is 2500; actual elapsed time normally lowers it. The score is persisted once and shared with every player.

## Sessions and transport

Private random session cookies are HttpOnly, SameSite=Strict, Secure on HTTPS, scoped to the room API path, and expire 24 hours after join. Storage contains only SHA-256 token digests. Room expiry is 24 hours from creation, after which its alarm deletes state and action histories. Only the code and callsign are saved in browser localStorage.

Each player has a persisted history of up to 4096 action IDs; further actions are rejected instead of evicting history and allowing replay. Histories use separate storage keys and are committed with room state before acknowledgments. WebSocket bursts above 30 messages/second close the offending connection. Per-room HTTP throttling permits 60 requests/minute per IP. Edge bindings additionally limit room creation to 12/minute per IP and other API requests to 240/minute per IP, per Cloudflare location; these limits are approximate/locality-based rather than a global quota. Trusted Cloudflare client-IP headers supply the key in production.

Persistence restores older power-slice room records by adding campaign defaults, without changing existing players, dials, seed, deadline or terminal results.

