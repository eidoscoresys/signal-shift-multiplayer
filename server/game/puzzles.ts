import type { Role, ActivePhase } from '../../shared/protocol';
export const ROLE_ORDER: Role[] = ['engineer', 'analyst', 'decoder', 'operator'];
export const isControl = (role: Role) => role === 'engineer' || role === 'operator';
export function duties(index: number, count: number): Role[] {
    if (count === 2)
        return index === 0 ? ['engineer', 'operator'] : ['analyst', 'decoder'];
    if (count === 3 && index === 0)
        return ['engineer', 'operator'];
    return [ROLE_ORDER[index % 4]];
}
export function lanesFor<T extends {
    id: string;
    role: Role;
}>(players: T[], player: T): number[] { const peers = players.filter(p => isControl(p.role) === isControl(player.role)); const index = peers.findIndex(p => p.id === player.id); return [0, 1, 2, 3].filter(cell => cell % peers.length === index); }
export function generator(seed: number) { let state = seed >>> 0; return (max: number) => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return (state >>> 8) % max; }; }
// Keep the original power generator stable so saved flights retain their clues.
export function puzzle(seed: number) { let state = seed >>> 0; const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; }; const offsets = [0, 1, 2, 3].map(() => (next() >>> 16) % 4); const readings = [0, 1, 2, 3].map(() => (next() >>> 16) % 4); return { offsets, readings, solution: readings.map((r, i) => (r - offsets[i] + 4) % 4) }; }
export function thermalPuzzle(seed: number) { const next = generator(seed ^ 0x715fa92b); const base = [0, 1, 2, 3].map(() => 8 + next(8)); const gain = [0, 1, 2, 3].map(() => 2 + next(3)); const solution = [0, 1, 2, 3].map(() => 1 + next(5)); return { base, gain, solution, targets: solution.map((v, i) => base[i] + gain[i] * v) }; }
export function overridePuzzle(seed: number) {
    const next = generator(seed ^ 0x36abd591);
    const key = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) {
        const j = next(i + 1);
        [key[i], key[j]] = [key[j], key[i]];
    }
    const symbols = [0, 1, 2, 3].map(() => next(4));
    return { key, symbols, solution: symbols.map(s => key[s]) };
}
export const ACTIVE_PHASES: ActivePhase[] = ['power', 'thermal', 'override'];
