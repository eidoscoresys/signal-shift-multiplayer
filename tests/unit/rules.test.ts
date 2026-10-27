import { describe, it, expect } from 'vitest';
import { apply, createRoom, puzzle, thermalPuzzle, overridePuzzle, snapshot, expire, lanesFor, isControl, restoreRoom, type Player, type Room } from '../../server/game/rules';
import type { Action } from '../../shared/protocol';
const roleOrder = ['engineer', 'analyst', 'decoder', 'operator'] as const;
function fixture(count = 2) { const room = createRoom('ABC234', 1000); room.players = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `Crew ${i}`, role: roleOrder[i % 4], tokenHash: `secret-${i}`, expires: 999999, lastSeen: 1000 })); room.host = 'p0'; return { room, engineer: room.players[0], analyst: room.players[1] }; }
let serial = 0;
function act(room: Room, p: Player, action: Action, now = 2000) { apply(room, p, `solver-${serial++}`, action, now); }
function confirm(room: Room, now = 2000) {
    for (const p of room.players.filter(p => !isControl(p.role)))
        for (const cell of lanesFor(room.players, p))
            act(room, p, { type: 'confirm', cell }, now);
}
function solveStage(room: Room, now = 2000) {
    const phase = room.phase;
    confirm(room, now);
    for (const p of room.players.filter(p => isControl(p.role))) {
        for (const cell of lanesFor(room.players, p)) {
            if (phase === 'power') {
                const target = puzzle(room.seed).solution[cell];
                for (let n = 0; n < (target - room.rotations[cell] + 4) % 4;) {
                    act(room, p, { type: 'rotate', cell }, now);
                    if (room.rotations[cell] === target)
                        break;
                }
            }
            else if (phase === 'thermal') {
                const target = thermalPuzzle(room.seed).solution[cell];
                while (room.valves[cell] !== target)
                    act(room, p, { type: 'valve', cell, delta: room.valves[cell] < target ? 1 : -1 }, now);
            }
        }
    }
    if (phase === 'override') {
        for (let step = 0; step < 4; step++) {
            const owner = room.players.find(p => isControl(p.role) && lanesFor(room.players, p).includes(step))!;
            act(room, owner, { type: 'mechanism', step, mechanism: overridePuzzle(room.seed).solution[step] }, now);
        }
    }
    else
        act(room, room.players.find(p => !isControl(p.role))!, { type: 'submit' }, now);
}
function solve(room: Room, now = 2000) {
    for (let i = 0; i < 3; i++)
        solveStage(room, now);
}
describe('power regression coverage', () => {
    it('generates solvable and varied power puzzles for 1000 seeds', () => {
        const solutions = new Set();
        for (let seed = 0; seed < 1000; seed++) {
            const p = puzzle(seed);
            expect(p.solution.every((r, i) => (r + p.offsets[i]) % 4 === p.readings[i])).toBe(true);
            solutions.add(p.solution.join());
        }
        expect(solutions.size).toBeGreaterThan(100);
    });
    it('completes all crises from authorized actions and scores deterministically', () => { const { room, engineer } = fixture(); apply(room, engineer, 'start', { type: 'start' }, 1000, 42); solve(room, 11000); expect(room.phase).toBe('won'); expect(room.score).toBe(2450); expect(room.completed).toEqual(['power', 'thermal', 'override']); expect(room.deadline).toBe(301000); });
    it('rejects unauthorized roles and malformed controls', () => { const { room, engineer, analyst } = fixture(); expect(() => apply(room, analyst, 'start', { type: 'start' }, 1000)).toThrow(); apply(room, engineer, 's', { type: 'start' }, 1000, 42); expect(() => apply(room, analyst, 'r', { type: 'rotate', cell: 0 }, 1000)).toThrow(); expect(() => apply(room, engineer, 'a', { type: 'submit' }, 1000)).toThrow(); expect(() => apply(room, engineer, 'bad', { type: 'rotate', cell: 9 }, 1000)).toThrow(); });
    it('applies duplicate actions once including after state restoration', () => { const { room, engineer } = fixture(); apply(room, engineer, 's', { type: 'start' }, 1000, 42); apply(room, engineer, 'r', { type: 'rotate', cell: 0 }, 1100); const restored = restoreRoom(JSON.parse(JSON.stringify(room)), 1200); expect(apply(restored, engineer, 'r', { type: 'rotate', cell: 0 }, 1200)).toBe(false); expect(restored.rotations[0]).toBe(1); });
    it('serializes simultaneous rotations in received order', () => {
        const { room, engineer } = fixture();
        apply(room, engineer, 's', { type: 'start' }, 1000, 42);
        for (let i = 0; i < 10; i++)
            apply(room, engineer, `r${i}`, { type: 'rotate', cell: 0 }, 1100);
        expect(room.rotations[0]).toBe(2);
        expect(room.version).toBe(11);
    });
    it('enforces cooldown, integrity and terminal states', () => {
        const { room, engineer, analyst } = fixture();
        apply(room, engineer, 's', { type: 'start' }, 1000, 42);
        confirm(room);
        room.rotations = puzzle(42).solution.map(r => (r + 1) % 4);
        for (let i = 0; i < 5; i++)
            apply(room, analyst, `x${i}`, { type: 'submit' }, 2000 + i * 3000);
        expect(room.integrity).toBe(0);
        expect(room.phase).toBe('lost');
        expect(() => apply(room, engineer, 'late', { type: 'rotate', cell: 0 }, 20000)).toThrow();
    });
    it('rejects actions during safety cooldown', () => { const { room, engineer, analyst } = fixture(); apply(room, engineer, 's', { type: 'start' }, 1000, 42); confirm(room); room.rotations = puzzle(42).solution.map(r => (r + 1) % 4); apply(room, analyst, 'x', { type: 'submit' }, 2000); expect(() => apply(room, engineer, 'r', { type: 'rotate', cell: 0 }, 2001)).toThrow('cooling'); });
    it('expires at the server deadline and prevents late success', () => { const { room, engineer, analyst } = fixture(); apply(room, engineer, 's', { type: 'start' }, 1000, 42); room.rotations = puzzle(42).solution; expect(() => apply(room, analyst, 'late', { type: 'submit' }, 301000)).toThrow(); expect(room.phase).toBe('lost'); expire(room, 400000); expect(room.phase).toBe('lost'); });
    it('never serializes seed, session digests, solution or another console’s private readings', () => {
        const { room, engineer, analyst } = fixture();
        apply(room, engineer, 's', { type: 'start' }, 1000, 42);
        const e = snapshot(room, engineer, 2000, new Set(['p0', 'p1'])), a = snapshot(room, analyst, 2000, new Set(['p0', 'p1']));
        expect(e.clue.kind).toBe('controls');
        expect(a.clue.kind).toBe('telemetry');
        for (const view of [e, a])
            expect(JSON.stringify(view)).not.toMatch(/tokenHash|secret-|solution|seed|seen|expires/);
        expect(JSON.stringify(e)).not.toMatch(/readings|offsets/);
        expect(JSON.stringify(a)).not.toMatch(/AURORA|KEPLER/);
    });
    it('resolves final rotation versus grid test by server arrival order', () => {
        for (const rotationFirst of [true, false]) {
            const { room, engineer, analyst } = fixture();
            apply(room, engineer, 's', { type: 'start' }, 1000, 42);
            confirm(room);
            room.rotations = [...puzzle(42).solution];
            room.rotations[0] = (room.rotations[0] + 3) % 4;
            if (rotationFirst) {
                apply(room, engineer, 'r', { type: 'rotate', cell: 0 }, 2000);
                apply(room, analyst, 'a', { type: 'submit' }, 2000);
                expect(room.phase).toBe('thermal');
            }
            else {
                apply(room, analyst, 'a', { type: 'submit' }, 2000);
                expect(() => apply(room, engineer, 'r', { type: 'rotate', cell: 0 }, 2000)).toThrow('cooling');
                expect(room.phase).toBe('power');
                expect(room.integrity).toBe(80);
            }
        }
    });
    it('retains authoritative finish time in later snapshots', () => { const { room, engineer } = fixture(); apply(room, engineer, 's', { type: 'start' }, 1000, 42); solve(room, 2000); expect(snapshot(room, engineer, 200000, new Set()).finishedAt).toBe(2000); expect(room.score).toBe(2495); });
});
describe('campaign generation, participation and privacy', () => {
    for (let count = 2; count <= 8; count++)
        it(`solves all phases for ${count} players across 100 seeds with exclusive responsibilities`, () => {
            for (let seed = 0; seed < 100; seed++) {
                const { room, engineer } = fixture(count);
                apply(room, engineer, 's', { type: 'start' }, 1000, seed);
                for (const control of [true, false]) {
                    const owners = room.players.filter(p => isControl(p.role) === control);
                    expect(owners.flatMap(p => lanesFor(room.players, p)).sort()).toEqual([0, 1, 2, 3]);
                    expect(owners.every(p => lanesFor(room.players, p).length > 0)).toBe(true);
                }
                solve(room);
                expect(room.phase).toBe('won');
                expect(room.integrity).toBe(100);
                expect(room.players.every(p => (room.seen[p.id]?.length ?? 0) > 0)).toBe(true);
            }
        });
    it('generates exact, unique cooling solutions and varied override keys', () => {
        const keys = new Set();
        for (let seed = 0; seed < 1000; seed++) {
            const t = thermalPuzzle(seed), o = overridePuzzle(seed);
            for (let cell = 0; cell < 4; cell++) {
                const matches = [0, 1, 2, 3, 4, 5].filter(v => t.base[cell] + t.gain[cell] * v === t.targets[cell]);
                expect(matches).toEqual([t.solution[cell]]);
            }
            expect([...o.key].sort()).toEqual([0, 1, 2, 3]);
            expect(o.solution).toEqual(o.symbols.map(s => o.key[s]));
            keys.add(o.key.join());
        }
        expect(keys.size).toBeGreaterThan(15);
    });
    it('requires every reading and blocks cross-sector actions', () => { const { room, engineer, analyst } = fixture(8); apply(room, engineer, 's', { type: 'start' }, 1000, 42); expect(() => act(room, analyst, { type: 'submit' })).toThrow('four private'); expect(() => act(room, analyst, { type: 'confirm', cell: 1 })).toThrow('another console'); expect(() => act(room, engineer, { type: 'rotate', cell: 1 })).toThrow('another console'); expect(() => act(room, analyst, { type: 'valve', cell: 0, delta: 1 })).toThrow(); });
    it('filters secrets by player AND phase', () => {
        const { room, engineer } = fixture(8);
        apply(room, engineer, 's', { type: 'start' }, 1000, 42);
        for (const phase of ['power', 'thermal', 'override'] as const) {
            for (const p of room.players) {
                const view = snapshot(room, p, 2000, new Set());
                expect(JSON.stringify(view)).not.toMatch(/seed|solution|tokenHash/);
                expect(view.clue.lanes).toHaveLength(1);
                if (view.clue.kind === 'telemetry') {
                    if (phase === 'power') {
                        expect(view.clue.readings.filter(v => v !== -1)).toHaveLength(1);
                        expect(view.clue.thermal).toEqual([]);
                        expect(view.clue.sequence).toEqual([]);
                    }
                    if (phase === 'thermal') {
                        expect(view.clue.thermal).toHaveLength(1);
                        expect(view.clue.sequence).toEqual([]);
                        expect(view.clue.readings).toEqual([-1, -1, -1, -1]);
                    }
                    if (phase === 'override') {
                        expect(view.clue.sequence).toHaveLength(1);
                        expect(view.clue.thermal).toEqual([]);
                    }
                }
                else {
                    if (phase !== 'override')
                        expect(view.clue.key).toEqual([]);
                    if (phase !== 'thermal')
                        expect(view.clue.thermal).toEqual([]);
                }
            }
            solveStage(room);
        }
    });
    it('deduplicates wrong tests and conflicting submissions without duplicate penalties', () => { const { room, engineer, analyst } = fixture(4); apply(room, engineer, 's', { type: 'start' }, 1000, 42); confirm(room); room.rotations = puzzle(42).solution.map(v => (v + 1) % 4); act(room, analyst, { type: 'submit' }); const integrity = room.integrity; expect(() => act(room, room.players[2], { type: 'submit' })).toThrow('cooling'); const id = room.seen[analyst.id].at(-1)!; expect(apply(room, analyst, id, { type: 'submit' }, 2000)).toBe(false); expect(room.integrity).toBe(integrity); });
    it('validates valves, final-step owner and exact sequence order', () => { const { room, engineer } = fixture(8); apply(room, engineer, 's', { type: 'start' }, 1000, 42); solveStage(room); expect(() => act(room, engineer, { type: 'valve', cell: 0, delta: 5 })).toThrow('Invalid valve'); expect(() => act(room, engineer, { type: 'valve', cell: 1, delta: 1 })).toThrow('another console'); solveStage(room); confirm(room); expect(() => act(room, engineer, { type: 'mechanism', step: 1, mechanism: 0 })).toThrow('another console'); expect(() => act(room, room.players[3], { type: 'mechanism', step: 1, mechanism: 0 })).toThrow('numbered step'); });
    it('resets a wrong override once and supports successful recovery', () => { const { room, engineer } = fixture(); apply(room, engineer, 's', { type: 'start' }, 1000, 42); solveStage(room); solveStage(room); confirm(room); const correct = overridePuzzle(42).solution[0]; apply(room, engineer, 'wrong', { type: 'mechanism', step: 0, mechanism: (correct + 1) % 4 }, 2000); expect(room.overrideStep).toBe(0); expect(room.integrity).toBe(80); apply(room, engineer, 'wrong', { type: 'mechanism', step: 0, mechanism: (correct + 1) % 4 }, 2000); expect(room.integrity).toBe(80); solveStage(room, 5000); expect(room.phase).toBe('won'); expect(room.score).toBe(2280); });
    it.each(['power', 'thermal', 'override'] as const)('expires authoritatively in %s', phase => { const { room, engineer } = fixture(); apply(room, engineer, 's', { type: 'start' }, 1000, 42); room.phase = phase; expire(room, 301000); expect(room.phase).toBe('lost'); expect(room.finishedAt).toBe(301000); });
    it('replays a full mission with a new seed and clean progress while retaining identity', () => { const { room, engineer } = fixture(8); apply(room, engineer, 's', { type: 'start' }, 1000, 42); solve(room); const players = JSON.stringify(room.players); apply(room, engineer, 'again', { type: 'replay' }, 5000, 99); expect(room.phase).toBe('power'); expect(room.mission).toBe(2); expect(room.seed).toBe(99); expect(room.integrity).toBe(100); expect(room.completed).toEqual([]); expect(room.ready).toEqual([]); expect(room.valves).toEqual([0, 0, 0, 0]); expect(JSON.stringify(room.players)).toBe(players); });
    it('migrates saved power-slice rooms without losing identity or progress', () => { const old = { code: 'ABC234', players: fixture().room.players, rotations: [1, 2, 3, 0], seed: 42, phase: 'power' as const, deadline: 301000 }; const room = restoreRoom(old, 1000); expect(room.schema).toBe(2); expect(room.rotations).toEqual(old.rotations); expect(room.players).toEqual(old.players); expect(room.valves).toEqual([0, 0, 0, 0]); expect(room.phase).toBe('power'); });
});
describe('legacy terminal results', () => { it('preserves a power-slice victory without claiming all three crises were completed', () => { const room = restoreRoom({ phase: 'won', score: 2400, seed: 42 }, 1000); expect(room.phase).toBe('won'); expect(room.score).toBe(2400); expect(room.completed).toEqual(['power']); }); });
describe('Final Override communication', () => {
    it.each([2, 4, 8])('preserves private clues, timer and puzzle rules with %i crew', count => {
        const { room, engineer } = fixture(count);
        act(room, engineer, { type: 'start' }, 1000);
        solveStage(room);
        solveStage(room);
        const before = { deadline: room.deadline, integrity: room.integrity, ready: [...room.ready], step: room.overrideStep };
        for (const p of room.players)
            act(room, p, { type: 'callout', code: 'key' }, 3000);
        expect(room.callouts).toHaveLength(count);
        for (const p of room.players) {
            const v = snapshot(room, p, 3000, new Set());
            expect(v.callouts).toEqual(room.callouts);
            expect(v.callouts.every(c => Object.keys(c).sort().join() === 'at,code,id,player')).toBe(true);
            expect(v.clue.kind === 'controls' ? !('sequence' in v.clue) : !('key' in v.clue)).toBe(true);
            if (v.clue.kind === 'telemetry')
                expect(v.clue.sequence.map(c => c.cell)).toEqual(lanesFor(room.players, p));
        }
        expect({ deadline: room.deadline, integrity: room.integrity, ready: room.ready, step: room.overrideStep }).toEqual(before);
        const restored = restoreRoom(JSON.parse(JSON.stringify(room)), 3500);
        expect(restored.callouts).toEqual(room.callouts);
        solveStage(restored, 4000);
        expect(restored.phase).toBe('won');
        act(restored, engineer, { type: 'replay' }, 5000);
        expect(restored.callouts).toEqual([]);
    });
    it('deduplicates, bounds history, rejects arbitrary text and limits spam without penalties', () => {
        const { room, engineer, analyst } = fixture();
        expect(() => act(room, engineer, { type: 'callout', code: 'key' })).toThrow('Final Override');
        act(room, engineer, { type: 'start' }, 1000);
        solveStage(room);
        solveStage(room);
        apply(room, engineer, 'call-1', { type: 'callout', code: 'ready' }, 3000);
        expect(apply(room, engineer, 'call-1', { type: 'callout', code: 'ready' }, 3100)).toBe(false);
        expect(() => act(room, engineer, { type: 'callout', code: 'order' }, 3100)).toThrow('Wait');
        expect(() => act(room, analyst, { type: 'callout', code: 'secret text' } as unknown as Action, 4000)).toThrow('Unknown');
        for (let n = 0; n < 10; n++)
            act(room, engineer, { type: 'callout', code: 'order' }, 5000 + n * 1500);
        expect(room.callouts).toHaveLength(8);
        expect(room.integrity).toBe(100);
        expect(room.overrideStep).toBe(0);
        room.cooldownUntil = 30000;
        act(room, analyst, { type: 'callout', code: 'key' }, 21000);
        expect(room.cooldownUntil).toBe(30000);
        room.phase = 'lost';
        expect(() => act(room, analyst, { type: 'callout', code: 'key' }, 25000)).toThrow('Final Override');
    });
    it('restores pre-callout rooms with an empty communication history', () => {
        const raw = { ...createRoom('OLD234', 1000) } as Partial<Room>;
        delete raw.callouts;
        expect(restoreRoom(raw, 2000).callouts).toEqual([]);
    });
});
