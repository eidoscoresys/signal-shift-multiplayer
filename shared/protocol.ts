export const BUILD_VERSION = '1.0.0-rc.3';
export const CALLOUTS = { key: 'Send symbol key', order: 'Confirm order', ready: 'Ready to activate' } as const;
export type CalloutCode = keyof typeof CALLOUTS;
export interface Callout {
    id: string;
    player: string;
    code: CalloutCode;
    at: number;
}
export type Role = 'engineer' | 'analyst' | 'decoder' | 'operator';
export type Phase = 'lobby' | 'power' | 'thermal' | 'override' | 'won' | 'lost';
export type ActivePhase = 'power' | 'thermal' | 'override';
export type Action = {
    type: 'callout';
    code: CalloutCode;
} | {
    type: 'start';
} | {
    type: 'rotate';
    cell: number;
} | {
    type: 'submit';
} | {
    type: 'replay';
} | {
    type: 'valve';
    cell: number;
    delta: number;
} | {
    type: 'confirm';
    cell: number;
} | {
    type: 'mechanism';
    step: number;
    mechanism: number;
};
export const ROLE_NAMES: Record<Role, string> = { engineer: 'Power Engineer', analyst: 'Thermal Analyst', decoder: 'Signal Decoder', operator: 'Systems Operator' };
export const SYMBOLS = ['◎', '△', '◇', '✦'];
export const MECHANISMS = ['VENT', 'CLAMP', 'ARM', 'IGNITE'];
export interface PlayerView {
    id: string;
    name: string;
    role: Role;
    roles: Role[];
    lanes: number[];
    connected: boolean;
}
export interface Snapshot {
    type: 'snapshot';
    protocol: 2;
    version: number;
    mission: number;
    code: string;
    you: string;
    host: string;
    players: PlayerView[];
    phase: Phase;
    integrity: number;
    deadline: number | null;
    finishedAt: number | null;
    serverTime: number;
    rotations: number[];
    valves: number[];
    ready: number[];
    overrideStep: number;
    callouts: Callout[];
    completed: ActivePhase[];
    cooldownUntil: number;
    score: number;
    clue: ({
        kind: 'controls';
        labels: string[];
        thermal: {
            cell: number;
            base: number;
            gain: number;
        }[];
        key: number[];
    } | {
        kind: 'telemetry';
        readings: number[];
        offsets: number[];
        thermal: {
            cell: number;
            target: number;
        }[];
        sequence: {
            cell: number;
            symbol: number;
        }[];
    }) & {
        lanes: number[];
    };
    notice: string;
}
export interface Envelope {
    type: 'action';
    id: string;
    action: Action;
    expectedPhase?: Phase;
    mission?: number;
}
export type ServerMessage = Snapshot | {
    type: 'error';
    message: string;
    actionId?: string;
} | {
    type: 'pong';
    serverTime: number;
} | {
    type: 'ack';
    actionId: string;
};
