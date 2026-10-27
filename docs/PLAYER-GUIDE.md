# How to play SIGNAL SHIFT

1. Gather 2–8 people. Sit together or open a voice call. Everyone opens the same public game URL in their own browser when hosting is available. For local testing, use separate browser profiles on the development computer.
2. Enter a callsign. One person creates a flight and shares its six-character code or invite. Others join before the commander starts. Use the three-step lobby briefing to learn your duties.
3. Look at your sector numbers. You can change or confirm only those sectors. Teammates have the rest. With two players, one combines engineering/operations and the other combines analysis/decoding.
4. Keep talking. Relay private information by sector or sequence-step number. Readers confirm each reading after sharing it; the reading crew can then authorize power/cooling tests.

## 01 — Power Routing

Reading consoles show target directions and calibration offsets. Decoders see direction glyphs and a translation legend. Control consoles show named numbered dials. NORTH=0, EAST=1, SOUTH=2, WEST=3. Set each dial to target minus offset, wrapping negative values by adding four.

Example: target WEST (3), offset 1 → dial SOUTH (2). Every click turns one quarter clockwise. Confirm all four readings, then an analyst or decoder selects AUTHORIZE GRID TEST.

## 02 — Thermal Balance

Readers have the target temperatures. Controllers have private base/gain calibrations and six valve positions, 0–5. Output = base + gain × position. Relay targets by number, then adjust each valve to reach its target.

Example: base 10, gain 3, target 22°C → position 4. Confirm all four target readings, then a reader selects STABILIZE COOLING.

## 03 — Final Override

Reading consoles hold fragments of a four-symbol sequence. Control consoles hold a private symbol-to-mechanism key. Relay and confirm every numbered symbol, translate them using the key, and execute the corresponding VENT / CLAMP / ARM / IGNITE actions in order. The owner of step 1 acts first, then step 2, and so on. Wrong mechanisms reset the sequence.

## Win, fail and recover

Restore all three systems within five minutes and above zero integrity. Wrong tests/mechanisms cost 20 integrity and lock controls for three seconds. Authorization, sector and out-of-turn errors are safely rejected. The clock continues across crises, cooldowns and disconnects. Score = integrity × 10 + whole seconds remaining × 5.

Refresh or reconnect to regain the same identity, role and progress. Only one tab per player is active. Command passes to a connected teammate if the commander disconnects. Sector ownership stays fixed; if someone cannot return, create a new flight with the remaining crew. Replay uses the same connected crew and a fresh puzzle seed. To change the crew after a mission has started, return home and create a new room.

No accounts, installations or in-game text chat. The application does not supply a voice call. Use CONSOLE HELP at any time for the current crisis.

## Final Override communication

On entering the finale, a role-specific briefing explains the sequence: read numbered symbols, match them using the control crew's private key, check the spoken order, confirm all four readings, then activate steps 1–4. Engineers/operators hold the key and operate only their assigned steps. Analysts/decoders read and confirm only their assigned symbols.

Three buttons broadcast requests to the entire room: **Send symbol key**, **Confirm order**, and **Ready to activate**. These send only the printed phrase; they do not transmit symbols, the key, answers, or an activation. Share the actual clues through your conversation. The latest eight callouts survive reconnects and refreshes, newest first, and clear on replay. A short 1.5-second per-sender interval prevents repeated accidental taps.

The current step names its control owner. Completed steps remain acknowledged even when new messages arrive. Callouts do not count as reading confirmations or operate any mechanism. The five-minute mission clock, 20-integrity wrong-input penalty, interlock, and sequence-reset rule are unchanged.
