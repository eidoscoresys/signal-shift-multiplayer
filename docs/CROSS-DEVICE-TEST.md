# Two real devices, two Internet connections

Status: instructions prepared; physical-device results must be supplied from actual devices. Automated desktop browser contexts are recorded separately in TEST-REPORT.md.

Public game: https://signal-shift.signal-shift.workers.dev. Use this exact HTTPS URL on both devices. Never use 127.0.0.1 or localhost on another device.

## Setup

- Device A: phone/tablet/laptop on home or school Wi-Fi.
- Device B: a different physical device using cellular data or a different Wi-Fi Internet connection. Turn off its original Wi-Fi if using mobile data.
- Record device model, OS version, browser/version, connection type and test time. Use a voice call or sit together. No game accounts or apps are needed.
- Open the public URL separately. A creates a flight as Nova and shares its invite/code. B joins as Echo. Check both names/roles are visible and both say ONLINE. A should have engineering/operations; B analysis/decoding.

## Test each behavior

1. **Touch and layout:** portrait at normal zoom; no sideways scrolling or overlapping buttons. Enter callsigns, switch Create/Join, use the keyboard Enter action, advance the three-step briefing and open Console Help. Note any small or hard-to-read controls.
2. **Live synchronization:** start the mission, rotate one dial on A, and watch B's LIVE DIALS. Repeat another dial. Record visible delay; do not claim a measured latency unless timed.
3. **Power puzzle:** B reads the numbered targets/offsets and confirms each. A sets dial = target − offset (wrap 0–3). B authorizes the grid test. Both must advance to Thermal Balance without resetting the five-minute timer.
4. **Cooling:** B relays each target temperature. A uses its base + gain × valve-position calibration, matching every target. B confirms all measurements and stabilizes cooling. Both advance to Final Override under the same deadline.
5. **Refresh:** refresh B. Check callsign, role, assigned sectors, current mission, remaining time and private data recover. Refresh A and check its valve/dial progress and role recover. Do not clear cookies: that intentionally removes the private returning identity. Closing every private/incognito window can also discard its cookies; use a normal browser for a continuing crew identity.
6. **Real network loss:** on A, disable both Wi-Fi and cellular (airplane mode with Wi-Fi off) for about 50 seconds. B should eventually show A away and become commander. The server watchdog checks silent links after 35 seconds, normally within roughly 45 seconds. The mission clock continues. Restore A's Internet; check its same role/sectors/progress return. If the mission expires during this test, verify shared failure and repeat a fresh flight for completion.
7. **Override:** B relays/then confirms the four numbered symbols. A translates them using its key and executes steps in order. Both should reach the same victory, integrity and score. The result clock should freeze.
8. **Replay:** the current commander selects Fly Again. Both remain in the same room/roles, with reset progress and a new five-minute deadline. Use New Crew / New Room to change the roster instead.
9. **Failure:** in another mission, intentionally submit a known incorrect grid. Both lose exactly 20 integrity and see a three-second interlock. Recover and complete, or repeat until shared failure. A duplicate tap during the interlock must not cause another penalty.
10. **Browser backgrounding:** switch to another app, then return after 30–60 seconds. Mobile systems may suspend the browser and disconnect it. Verify automatic recovery and clear connection guidance, rather than assuming the tab stays live in the background.

## Result record

For each step record PASS / FAIL / NOT TESTED, the observed behavior and a screenshot where useful. Record whether the actual devices used separate Internet connections. Do not include cookies, OAuth pages, tokens or credentials in screenshots. Send only device/browser details, test steps and observed outcomes; never private credentials.

A public deployment does not, by itself, verify these physical-device steps. Keep this checklist marked unverified until a person completes it on real hardware.


## Final Override callouts (rc.2)

During the finale, check that the reading device says YOU READ THE SYMBOLS and the control device says YOU HOLD THE KEY. Relay a numbered symbol and match it manually with the private control key. Tap Send symbol key, Confirm order and Ready to activate in turn; allow the short repeat interval between taps. Verify the sender name and exact phrase appear on the other device. No symbol, mapping or mechanism should be sent automatically.

Temporarily disconnect one device, send a request from the other, then reconnect/refresh. Its role, clues, progress and original countdown should return, along with the latest callouts. Confirm readings and execute the ordered mechanisms together. Both screens should identify the current step owner and acknowledge each successful step. Replay should clear the callout history. Record results explicitly; this procedure is not evidence of completed physical-device testing.
