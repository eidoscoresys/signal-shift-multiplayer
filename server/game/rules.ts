import { CALLOUTS, type Callout } from '../../shared/protocol';
import type { Action, Phase, Role, Snapshot, ActivePhase } from '../../shared/protocol';
import { puzzle, thermalPuzzle, overridePuzzle, lanesFor, duties, isControl, ACTIVE_PHASES } from './puzzles';
export { puzzle, thermalPuzzle, overridePuzzle, lanesFor, duties, isControl } from './puzzles';
export const LABELS = ['AURORA', 'KEPLER', 'ORION', 'VEGA'];
export interface Player {
    id: string;
    name: string;
    role: Role;
    tokenHash: string;
    expires: number;
    lastSeen: number;
}
export interface Room {
    schema: 2;
    code: string;
    version: number;
    mission: number;
    players: Player[];
    host: string;
    phase: Phase;
    integrity: number;
    deadline: number | null;
    finishedAt: number | null;
    rotations: number[];
    valves: number[];
    ready: number[];
    overrideStep: number;
    callouts: Callout[];
    completed: ActivePhase[];
    seed: number;
    cooldownUntil: number;
    score: number;
    seen: Record<string, string[]>;
    notice: string;
    expires: number;
}
export function createRoom(code: string, now: number): Room { return { schema: 2, code, version: 0, mission: 0, players: [], host: '', phase: 'lobby', integrity: 100, deadline: null, finishedAt: null, rotations: [0, 0, 0, 0], valves: [0, 0, 0, 0], ready: [], overrideStep: 0, callouts: [], completed: [], seed: 0, cooldownUntil: 0, score: 0, seen: {}, notice: 'Assemble your crew.', expires: now + 86400000 }; }
export function restoreRoom(raw: Partial<Room> | undefined, now: number): Room { return { ...createRoom(raw?.code ?? '', now), ...raw, completed: raw?.completed ?? (raw?.phase === 'won' ? ['power'] : []), schema: 2 }; }
export function expire(room: Room, now: number) {
    if (ACTIVE_PHASES.includes(room.phase as ActivePhase) && now >= (room.deadline ?? 0)) {
        room.phase = 'lost';
        room.finishedAt = room.deadline;
        room.notice = 'Mission clock expired. Station evacuated.';
        room.version++;
    }
}
function penalty(room: Room, now: number, message: string) {
    room.integrity = Math.max(0, room.integrity - 20);
    room.cooldownUntil = now + 3000;
    room.notice = message + ' Integrity −20. Interlock: 3 seconds.';
    if (!room.integrity) {
        room.phase = 'lost';
        room.finishedAt = now;
    }
}
function advance(room: Room, now: number) {
    const phase = room.phase as ActivePhase;
    room.completed.push(phase);
    room.ready = [];
    if (phase === 'power') {
        room.phase = 'thermal';
        room.notice = 'Grid online. Reactor temperature rising: coordinate coolant valves.';
    }
    else if (phase === 'thermal') {
        room.phase = 'override';
        room.notice = 'Cooling stable. Decode the beacon and execute the mechanical sequence.';
    }
    else {
        room.phase = 'won';
        room.finishedAt = now;
        room.score = room.integrity * 10 + Math.max(0, Math.floor(((room.deadline ?? now) - now) / 1000)) * 5;
        room.notice = 'All systems restored. Your crew brought the station home.';
    }
}
export function apply(room: Room, player: Player, id: string, action: Action, now: number, seed: number = room.seed): boolean {
    expire(room, now);
    if (!room.players.some(p => p.id === player.id))
        throw Error('Not a room member.');
    const seen = room.seen[player.id] ??= [];
    if (seen.includes(id))
        return false;
    if (seen.length >= 4096)
        throw Error('Session action limit reached. Create a new room.');
    seen.push(id);
    room.seen[player.id] = seen;
    if (action.type === 'start' || action.type === 'replay') {
        if (room.host !== player.id)
            throw Error('Only the commander can start a mission.');
        if (action.type === 'start' && room.phase !== 'lobby')
            throw Error('Mission already started.');
        if (action.type === 'replay' && !['won', 'lost'].includes(room.phase))
            throw Error('Finish this mission first.');
        if (room.players.length < 2 || room.players.length > 8)
            throw Error('A mission requires 2–8 crew members.');
        Object.assign(room, { mission: room.mission + 1, seed, phase: 'power', integrity: 100, deadline: now + 300000, finishedAt: null, rotations: [0, 0, 0, 0], valves: [0, 0, 0, 0], ready: [], overrideStep: 0, callouts: [], completed: [], cooldownUntil: 0, score: 0, notice: 'Power emergency. Exchange your private information.' });
    }
    else if (action.type === 'callout') {
        if (room.phase !== 'override')
            throw Error('Callouts are available during Final Override.');
        if (typeof action.code !== 'string' || !Object.prototype.hasOwnProperty.call(CALLOUTS, action.code))
            throw Error('Unknown callout.');
        const previous = [...room.callouts].reverse().find(c => c.player === player.id);
        if (previous && now - previous.at < 1500)
            throw Error('Wait a moment before sending another callout.');
        room.callouts = [...room.callouts, { id, player: player.id, code: action.code, at: now }].slice(-8);
    }
    else {
        if (!ACTIVE_PHASES.includes(room.phase as ActivePhase))
            throw Error('No active crisis.');
        if (now < room.cooldownUntil)
            throw Error('Safety interlock cooling down.');
        const controls = isControl(player.role), lanes = lanesFor(room.players, player);
        if (action.type === 'confirm') {
            if (controls)
                throw Error('Only analysts and decoders can confirm readings.');
            if (!Number.isInteger(action.cell) || !lanes.includes(action.cell))
                throw Error('This reading belongs to another console.');
            if (!room.ready.includes(action.cell))
                room.ready.push(action.cell);
            room.notice = 'Private reading confirmed. Keep talking to your crew.';
        }
        else if (action.type === 'rotate') {
            if (room.phase !== 'power')
                throw Error('Power routing is closed.');
            if (!controls)
                throw Error('Only Power Engineer or Systems Operator can route circuits.');
            if (!Number.isInteger(action.cell) || !lanes.includes(action.cell))
                throw Error('This circuit belongs to another console.');
            room.rotations[action.cell] = (room.rotations[action.cell] + 1) % 4;
            room.notice = 'Circuit orientation updated.';
        }
        else if (action.type === 'valve') {
            if (room.phase !== 'thermal')
                throw Error('Cooling controls are closed.');
            if (!controls || !Number.isInteger(action.cell) || !lanes.includes(action.cell))
                throw Error('This valve belongs to another console.');
            if (action.delta !== 1 && action.delta !== -1)
                throw Error('Invalid valve movement.');
            const value = room.valves[action.cell] + action.delta;
            if (value < 0 || value > 5)
                throw Error('Valve range is 0–5.');
            room.valves[action.cell] = value;
            room.notice = 'Coolant flow adjusted.';
        }
        else if (action.type === 'submit') {
            if (controls)
                throw Error('Only Thermal Analyst or Signal Decoder can authorize the test.');
            if (room.phase === 'override')
                throw Error('Execute the mechanical sequence instead.');
            if (room.ready.length !== 4)
                throw Error('All four private readings must be confirmed first.');
            const correct = room.phase === 'power' ? room.rotations.every((v, i) => v === puzzle(room.seed).solution[i]) : room.valves.every((v, i) => v === thermalPuzzle(room.seed).solution[i]);
            if (correct)
                advance(room, now);
            else
                penalty(room, now, room.phase === 'power' ? 'Phase mismatch.' : 'Temperature mismatch.');
        }
        else if (action.type === 'mechanism') {
            if (room.phase !== 'override')
                throw Error('Override controls are closed.');
            if (!controls || !Number.isInteger(action.step) || !lanes.includes(action.step))
                throw Error('This sequence step belongs to another console.');
            if (!Number.isInteger(action.mechanism) || action.mechanism < 0 || action.mechanism > 3)
                throw Error('Invalid mechanism.');
            if (room.ready.length !== 4)
                throw Error('All four decoded symbols must be confirmed first.');
            if (action.step !== room.overrideStep)
                throw Error('Wait for your numbered step.');
            if (action.mechanism === overridePuzzle(room.seed).solution[action.step]) {
                room.overrideStep++;
                room.notice = `Mechanical step ${room.overrideStep}/4 locked.`;
                if (room.overrideStep === 4)
                    advance(room, now);
            }
            else {
                room.overrideStep = 0;
                penalty(room, now, 'Incorrect mechanism. Sequence reset.');
            }
        }
        else
            throw Error('Invalid action.');
    }
    room.version++;
    return true;
}
export function snapshot(room: Room, player: Player, now: number, connected: Set<string>): Snapshot {
    expire(room, now);
    const lanes = lanesFor(room.players, player);
    const power = puzzle(room.seed), thermal = thermalPuzzle(room.seed), override = overridePuzzle(room.seed);
    const controls = isControl(player.role);
    const active = ACTIVE_PHASES.includes(room.phase as ActivePhase);
    // Secrets are stage-scoped as well as player-scoped; unassigned array entries are sentinels.
    const clue: Snapshot['clue'] = controls ? { kind: 'controls', lanes, labels: LABELS, thermal: room.phase === 'thermal' ? lanes.map(cell => ({ cell, base: thermal.base[cell], gain: thermal.gain[cell] })) : [], key: room.phase === 'override' ? override.key : [] } : { kind: 'telemetry', lanes, readings: [0, 1, 2, 3].map(i => room.phase === 'power' && lanes.includes(i) ? power.readings[i] : -1), offsets: [0, 1, 2, 3].map(i => room.phase === 'power' && lanes.includes(i) ? power.offsets[i] : -1), thermal: room.phase === 'thermal' ? lanes.map(cell => ({ cell, target: thermal.targets[cell] })) : [], sequence: room.phase === 'override' ? lanes.map(cell => ({ cell, symbol: override.symbols[cell] })) : [] };
    return { type: 'snapshot', protocol: 2, version: room.version, mission: room.mission, code: room.code, you: player.id, host: room.host, players: room.players.map((p, i) => ({ id: p.id, name: p.name, role: p.role, roles: duties(i, room.players.length), lanes: lanesFor(room.players, p), connected: connected.has(p.id) })), phase: room.phase, integrity: room.integrity, deadline: room.deadline, finishedAt: room.finishedAt, serverTime: now, rotations: [...room.rotations], valves: [...room.valves], ready: active ? [...room.ready] : [], overrideStep: room.overrideStep, callouts: room.callouts.map(c => ({ ...c })), completed: [...room.completed], cooldownUntil: room.cooldownUntil, score: room.score, clue, notice: room.notice };
}
