# Wire protocol v2

Types live in shared/protocol.ts. HTTP responses containing room/session data use Cache-Control:no-store. Same-origin browser POSTs and WebSocket upgrades are required. Payloads are bounded before parsing; names and room codes are validated server-side.

## HTTP

- POST /api/create → {code}. Cryptographic randomness selects a six-character code from ABCDEFGHJKLMNPQRSTUVWXYZ23456789. The target Durable Object reserves it atomically; collisions retry before returning.
- POST /api/rooms/:code/join with {name} → {code,id} plus private session cookie. An existing valid cookie restores membership even during play. Nicknames are 1–20 Unicode letters/numbers, spaces, underscore or hyphen. Full, locked, unknown and expired rooms return explicit errors.
- GET /api/rooms/:code/socket with Upgrade:websocket authenticates via the room cookie and checks Origin. One live socket per player; a new tab replaces the old one, which stops reconnecting.
- GET /api/health → {ok:true}.

## Client messages

{type:'ping'} requests a heartbeat. Actions use {type:'action',id,action,expectedPhase?,mission?}. IDs contain 1–64 alphanumeric/hyphen characters. Current clients include the expected phase and mission counter so delayed actions cannot accidentally apply to a later crisis/replay. The context fields remain optional for compatibility with the original slice protocol; roles, ownership, phase and values are always validated.

Actions: start; replay; rotate(cell); valve(cell,delta:+1|-1); confirm(cell); submit; mechanism(step,mechanism:0..3). All indices are integers 0–3. Valve positions are constrained server-side to 0–5. Only the commander starts/replays; every rostered crew member must be connected. Only the owner can change a control or confirm a reading.

## Server messages

- {type:'pong',serverTime}
- {type:'ack',actionId}
- {type:'error',message,actionId?}
- Snapshot: {type:'snapshot',protocol:2,version,mission,...} with authorized public state and one discriminated private clue variant.

Snapshots contain room code, local player ID, host, public crew duties/sectors/presence, phase, deadline, finish/server timestamps, integrity, dial/valve positions, reading confirmations, override progress, completed systems, cooldown, score and notice. Control clues contain sector names, owned cooling calibrations only during thermal, and the key only during override. Reading clues contain owned power values only during power (other entries are -1), owned thermal targets only during thermal, and owned sequence symbols only during override. No token/digest, seed, solution, deduplication history or room-storage object is serialized.

Accepted actions/membership/host changes/expiry advance the room version. Duplicates retain the current version. Snapshots reconcile clients after every accepted action/rejection, reconnect and terminal alarm. The browser discards older versions, estimates clock offset from snapshots/heartbeat timestamps, and freezes terminal clocks at finishedAt.

## Ordering, recovery and durability

One Durable Object and a promise queue serialize room events in arrival order. Rotations commute; a test evaluates the committed controls at its exact position in that order. A wrong test creates a cooldown before any following test executes. Action IDs are namespaced by player and retained across phases/replays, and resent messages keep their original ID/context.

Room state and per-player action-history keys are stored in a batch before ack/broadcast. Schema migration restores older rooms. Hibernating WebSockets attach player identity and the last received heartbeat timestamp, and constructors reload storage before accepting events. Persistent alarms check the shared deadline and later delete room/session/history data on expiry. Empty-room close callbacks cannot recreate a deleted room.

A server presence alarm runs at most ten seconds after the previous check while sockets exist, preserving an already scheduled earlier alarm during room activity. It closes connections silent for more than 35 seconds and reassigns command. Presence polling never postpones the mission deadline or recreates a deleted room. Clients heartbeat every ten seconds; 35 seconds without incoming traffic closes the stale link. Reconnect backoff doubles from 500 ms to 10 seconds plus jitter. Session cookies restore membership/roles/sectors/progress. Unacknowledged actions remain in memory across socket reconnects and are removed only by their own ack/error. A full browser refresh recovers persisted state, but does not retain unsent UI intent. Policy closures and replaced tabs stop automatic retries and explain recovery.


## Finale callouts (1.0.0-rc.2)

`callout(code)` accepts only `key`, `order`, or `ready`, during Final Override only. The server derives the sender from the authenticated connection. The fixed phrases are defined in shared/protocol.ts; arbitrary text is rejected. A callout cannot confirm a reading, reveal clues, activate a mechanism, change the deadline, score or integrity, or bypass the puzzle interlock. Communication remains available during that interlock.

Snapshots include `callouts: [{id,player,code,at}]`, a bounded eight-entry public request history, persisted with the room and reset on start/replay. The same existing action-ID deduplication, mission/phase context, authorization, storage and broadcast path applies. A 1.5-second sender interval limits repeat requests. Older persisted rooms default to an empty history; the Durable Object binding, schema version and migration history remain unchanged.
