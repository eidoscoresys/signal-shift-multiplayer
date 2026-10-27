import { useEffect, useRef, useState } from 'react';
import type { Action, Envelope, Snapshot, ServerMessage } from '../shared/protocol';
type LinkState = 'OFFLINE' | 'CONNECTING' | 'RECONNECTING' | 'LIVE' | 'DISCONNECTED';
async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        const data = await response.json() as T & {
            error?: string;
        };
        if (!response.ok)
            throw Error(data.error ?? `Station request failed (${response.status}).`);
        return data;
    }
    catch (error) {
        if (error instanceof Error && error.name === 'AbortError')
            throw Error('The station took too long to respond. Check your connection and try again.');
        if (error instanceof TypeError)
            throw Error('Station unreachable. Check your connection and try again.');
        throw error;
    }
    finally {
        clearTimeout(timeout);
    }
}
export function useRoom() {
    const [code, setCode] = useState(new URLSearchParams(location.search).get('room')?.toUpperCase() ?? localStorage.getItem('signal-room') ?? '');
    const [name, setName] = useState(localStorage.getItem('signal-name') ?? '');
    const [joined, setJoined] = useState(false), [state, setState] = useState<Snapshot | null>(null), [connection, setConnection] = useState<LinkState>('OFFLINE'), [error, setError] = useState(''), [busy, setBusy] = useState(false), [now, setNow] = useState(Date.now());
    const ws = useRef<WebSocket | null>(null), pending = useRef(new Map<string, Envelope>()), offset = useRef(0), latest = useRef<Snapshot | null>(null);
    useEffect(() => { const timer = setInterval(() => setNow(Date.now() + offset.current), 250); return () => clearInterval(timer); }, []);
    async function join(roomCode = code) {
        setBusy(true);
        setError('');
        try {
            if (!/^[A-HJ-NP-Z2-9]{6}$/.test(roomCode))
                throw Error('Enter the six-character room code from your invite.');
            await api<{
                id: string;
            }>(`/api/rooms/${roomCode}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
            setCode(roomCode);
            localStorage.setItem('signal-room', roomCode);
            localStorage.setItem('signal-name', name);
            history.replaceState(null, '', `?room=${roomCode}`);
            setJoined(true);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    async function create() {
        setBusy(true);
        setError('');
        try {
            const data = await api<{
                code: string;
            }>('/api/create', { method: 'POST' });
            await join(data.code);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    useEffect(() => {
        if (!joined)
            return;
        let closed = false, attempts = 0;
        let retry: ReturnType<typeof setTimeout> | undefined, heartbeat: ReturnType<typeof setInterval> | undefined;
        let lastMessage = Date.now();
        let activeSocket: WebSocket | null = null;
        const stop = (message: string) => {
            if (closed)
                return;
            setConnection('DISCONNECTED');
            setError(message);
            pending.current.clear();
        };
        const connect = async () => {
            if (closed)
                return;
            if (attempts >= 3) {
                try {
                    const response = await fetch(`/api/rooms/${code}/session`, { signal: AbortSignal.timeout(5000) });
                    if (closed)
                        return;
                    if ([401, 404, 410].includes(response.status)) {
                        stop('This room or session has expired. Return home to create a new flight.');
                        return;
                    }
                }
                catch { /* An offline device should continue backing off. */ }
            }
            if (closed)
                return;
            setConnection(attempts ? 'RECONNECTING' : 'CONNECTING');
            const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/rooms/${code}/socket`);
            activeSocket = socket;
            ws.current = socket;
            socket.onopen = () => {
                if (closed) {
                    socket.close();
                    return;
                }
                attempts = 0;
                lastMessage = Date.now();
                setConnection('LIVE');
                for (const message of pending.current.values())
                    socket.send(JSON.stringify(message));
                heartbeat = setInterval(() => {
                    if (Date.now() - lastMessage > 35000) {
                        socket.close();
                        return;
                    }
                    if (socket.readyState === 1)
                        socket.send(JSON.stringify({ type: 'ping' }));
                }, 10000);
            };
            socket.onmessage = e => {
                if (closed)
                    return;
                lastMessage = Date.now();
                const m = JSON.parse(e.data) as ServerMessage;
                if (m.type === 'ack')
                    pending.current.delete(m.actionId);
                else if (m.type === 'snapshot') {
                    if (latest.current && m.version < latest.current.version)
                        return;
                    offset.current = m.serverTime - Date.now();
                    latest.current = m;
                    setState(m);
                }
                else if (m.type === 'pong')
                    offset.current = m.serverTime - Date.now();
                else if (m.type === 'error') {
                    setError(m.message);
                    if (m.actionId)
                        pending.current.delete(m.actionId);
                }
            };
            socket.onclose = event => {
                clearInterval(heartbeat);
                if (closed)
                    return;
                if (event.reason === 'Replaced' || event.reason === 'Room expired' || event.code === 1008) {
                    stop(event.reason === 'Replaced' ? 'This console is active in another tab. Close it or use Retry connection to take control.' : event.reason === 'Room expired' ? 'This room has expired. Return home to create a new flight.' : event.reason || 'Your session expired. Return home to create a new flight.');
                    return;
                }
                setConnection('RECONNECTING');
                retry = setTimeout(() => void connect(), Math.min(10000, 500 * 2 ** attempts++) + Math.random() * 250);
            };
        };
        void connect();
        return () => {
            closed = true;
            clearTimeout(retry);
            clearInterval(heartbeat);
            activeSocket?.close();
            if (ws.current === activeSocket)
                ws.current = null;
        };
    }, [joined, code]);
    useEffect(() => {
        if (localStorage.getItem('signal-room') === code && code)
            void join(code);
    }, []);
    function act(action: Action) {
        if (ws.current?.readyState !== 1) {
            setError('Wait for the station link to reconnect. Your controls are safely locked.');
            return;
        }
        setError('');
        const message: Envelope = { type: 'action', id: crypto.randomUUID(), action, expectedPhase: latest.current?.phase, mission: latest.current?.mission };
        pending.current.set(message.id, message);
        ws.current.send(JSON.stringify(message));
    }
    function leave() { pending.current.clear(); latest.current = null; setJoined(false); setState(null); setCode(''); setConnection('OFFLINE'); setError(''); localStorage.removeItem('signal-room'); history.replaceState(null, '', '/'); }
    return { code, setCode, name, setName, joined, state, connection, error, setError, busy, now, join, create, act, leave };
}
