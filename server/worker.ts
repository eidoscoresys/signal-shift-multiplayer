import { BUILD_VERSION } from '../shared/protocol';
import { DurableObject } from 'cloudflare:workers';
import { apply, createRoom, expire, snapshot, restoreRoom, type Room, type Player } from './game/rules';
interface Env {
    ROOMS: DurableObjectNamespace<GameRoom>;
    ASSETS: Fetcher;
    CREATE_LIMITER: RateLimit;
    API_LIMITER: RateLimit;
}
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const hash = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, '0')).join('');
const cookieName = (code: string) => `ss_${code}`;
export class GameRoom extends DurableObject<Env> {
    room!: Room;
    queue: Promise<unknown> = Promise.resolve();
    rates = new Map<string, {
        at: number;
        count: number;
    }>();
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        ctx.blockConcurrencyWhile(async () => {
            this.room = restoreRoom(await ctx.storage.get<Room>('room'), Date.now());
            if (this.room.players.length) {
                const saved = await ctx.storage.get<string[]>(this.room.players.map(p => 'actions:' + p.id));
                for (const p of this.room.players) {
                    const ids = saved.get('actions:' + p.id);
                    if (ids)
                        this.room.seen[p.id] = ids;
                }
            }
        });
    }
    serial<T>(fn: () => Promise<T>): Promise<T> { const next = this.queue.then(fn); this.queue = next.catch(() => { }); return next; }
    async reserve(code: string) {
        return this.serial(async () => {
            if (this.room.code)
                return false;
            this.room.code = code;
            await this.save();
            return true;
        });
    }
    async save() {
        if (!this.room.code)
            return;
        const records: Record<string, unknown> = { room: { ...this.room, seen: {} } };
        for (const p of this.room.players)
            records['actions:' + p.id] = this.room.seen[p.id] ?? [];
        await this.ctx.storage.put(records);
        const pendingAlarm = await this.ctx.storage.getAlarm();
        const nextAlarm = Math.min(this.room.deadline && ['power', 'thermal', 'override'].includes(this.room.phase) ? this.room.deadline : Infinity, this.room.expires, this.sockets().length ? Date.now() + 10000 : Infinity, pendingAlarm && pendingAlarm > Date.now() ? pendingAlarm : Infinity);
        if (pendingAlarm !== nextAlarm)
            await this.ctx.storage.setAlarm(nextAlarm);
    }
    sockets() { return this.ctx.getWebSockets().filter(socket => socket.readyState === 1); }
    broadcast() {
        const connected = new Set<string>(this.sockets().map(s => s.deserializeAttachment()?.id));
        for (const s of this.sockets()) {
            const p = this.room.players.find(p => p.id === s.deserializeAttachment()?.id);
            if (p) {
                try {
                    s.send(JSON.stringify(snapshot(this.room, p, Date.now(), connected)));
                }
                catch { }
            }
        }
    }
    async player(request: Request) {
        const raw = request.headers.get('Cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName(this.room.code) + '='))?.split('=')[1];
        if (!raw)
            return;
        const h = await hash(raw);
        return this.room.players.find(p => p.tokenHash === h && p.expires > Date.now());
    }
    async fetch(request: Request) {
        return this.serial(async () => {
            try {
                const url = new URL(request.url);
                const code = url.pathname.split('/')[3];
                if (!this.room.code)
                    return json({ error: 'Room not found. Check your invite.' }, 404);
                const address = request.headers.get('CF-Connecting-IP') ?? 'local';
                const key = 'http:' + address;
                let requestRate = this.rates.get(key);
                if (!requestRate || Date.now() - requestRate.at > 60000) {
                    requestRate = { at: Date.now(), count: 0 };
                    this.rates.set(key, requestRate);
                }
                if (++requestRate.count > 60)
                    return json({ error: 'Too many room requests. Wait a minute.' }, 429);
                if (this.room.expires < Date.now())
                    return json({ error: 'Room expired. Create a new room.' }, 410);
                if (request.method === 'POST' && url.pathname.endsWith('/join')) {
                    const origin = request.headers.get('Origin');
                    if (origin && origin !== url.origin)
                        return json({ error: 'Invalid origin' }, 403);
                    const existing = await this.player(request);
                    if (existing)
                        return json({ code, id: existing.id });
                    if (this.room.phase !== 'lobby')
                        return json({ error: 'This crew is locked for the mission. Ask the commander to create a new room for a different crew.' }, 409);
                    if (this.room.players.length >= 8)
                        return json({ error: 'This eight-player flight is full.' }, 409);
                    const body = await request.text();
                    if (body.length > 256)
                        return json({ error: 'Payload too large' }, 413);
                    const { name } = JSON.parse(body);
                    if (typeof name !== 'string' || !/^[\p{L}\p{N} _-]{1,20}$/u.test(name.trim()))
                        return json({ error: 'Use 1–20 letters, numbers, spaces, _ or -.' }, 400);
                    const token = crypto.randomUUID() + crypto.randomUUID();
                    const now = Date.now();
                    const p: Player = { id: crypto.randomUUID(), name: name.trim(), role: (['engineer', 'analyst', 'decoder', 'operator'] as const)[this.room.players.length % 4], tokenHash: await hash(token), expires: now + 86400000, lastSeen: now };
                    this.room.players.push(p);
                    if (!this.room.host)
                        this.room.host = p.id;
                    this.room.version++;
                    await this.save();
                    this.broadcast();
                    return json({ code, id: p.id }, 200, { 'Set-Cookie': `${cookieName(code)}=${token}; HttpOnly; SameSite=Strict; Path=/api/rooms/${code}; Max-Age=86400${url.protocol === 'https:' ? '; Secure' : ''}` });
                }
                const p = await this.player(request);
                if (!p)
                    return json({ error: 'Join this room first.' }, 401);
                if (request.method === 'GET' && url.pathname.endsWith('/session'))
                    return json({ id: p.id });
                if (url.pathname.endsWith('/socket') && request.headers.get('Upgrade') === 'websocket') {
                    if (request.headers.get('Origin') !== url.origin)
                        return json({ error: 'Invalid origin' }, 403);
                    const pair = new WebSocketPair();
                    const client = pair[0], server = pair[1];
                    this.ctx.acceptWebSocket(server);
                    server.serializeAttachment({ id: p.id, seenAt: Date.now() });
                    // A fresh connection supersedes this player's old socket.
                    for (const s of this.sockets())
                        if (s !== server && s.deserializeAttachment()?.id === p.id)
                            s.close(1000, 'Replaced');
                    p.lastSeen = Date.now();
                    expire(this.room, Date.now());
                    await this.save();
                    this.broadcast();
                    return new Response(null, { status: 101, webSocket: client });
                }
                return json({ error: 'Unknown endpoint' }, 404);
            }
            catch {
                return json({ error: 'Invalid request' }, 400);
            }
        });
    }
    async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
        await this.serial(async () => {
            const id = socket.deserializeAttachment()?.id;
            const p = this.room.players.find(p => p.id === id);
            if (!p)
                return socket.close(1008, 'Invalid session');
            let actionId: string | undefined;
            try {
                if (p.expires < Date.now())
                    return socket.close(1008, 'Session expired');
                const now = Date.now();
                socket.serializeAttachment({ id: p.id, seenAt: now });
                let rate = this.rates.get(id);
                if (!rate || now - rate.at > 1000) {
                    rate = { at: now, count: 0 };
                    this.rates.set(id, rate);
                }
                if (++rate.count > 30) {
                    socket.close(1008, 'Rate limit exceeded. Refresh after a moment.');
                    return;
                }
                if (typeof message !== 'string' || message.length > 1024)
                    throw Error('Invalid payload.');
                const m = JSON.parse(message);
                p.lastSeen = now;
                if (m.type === 'ping') {
                    socket.send(JSON.stringify({ type: 'pong', serverTime: now }));
                    return;
                }
                if (m.type !== 'action' || typeof m.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(m.id) || !m.action || !['start', 'rotate', 'submit', 'replay', 'confirm', 'valve', 'mechanism', 'callout'].includes(m.action.type))
                    throw Error('Invalid action.');
                actionId = m.id;
                if ((m.expectedPhase !== undefined && m.expectedPhase !== this.room.phase) || (m.mission !== undefined && m.mission !== this.room.mission)) {
                    if (!(this.room.seen[p.id] ?? []).includes(m.id))
                        throw Error('Console state changed. Review the new mission snapshot.');
                }
                if ((m.action.type === 'start' || m.action.type === 'replay') && new Set(this.sockets().map(s => s.deserializeAttachment()?.id)).size !== this.room.players.length)
                    throw Error('All crew members must be connected.');
                apply(this.room, p, m.id, m.action, now, crypto.getRandomValues(new Uint32Array(1))[0]);
                await this.save();
                socket.send(JSON.stringify({ type: 'ack', actionId: m.id }));
                this.broadcast();
            }
            catch (e) {
                await this.save();
                this.broadcast();
                socket.send(JSON.stringify({ type: 'error', actionId, message: e instanceof Error ? e.message : 'Invalid action' }));
            }
        });
    }
    async webSocketClose(socket: WebSocket) {
        await this.serial(async () => {
            try {
                socket.close();
            }
            catch { }
            if (!this.room.code)
                return;
            const connected = new Set(this.sockets().filter(s => s !== socket).map(s => s.deserializeAttachment()?.id));
            if (!connected.has(this.room.host)) {
                const next = this.room.players.find(p => connected.has(p.id));
                if (next)
                    this.room.host = next.id;
            }
            this.room.version++;
            await this.save();
            this.broadcast();
        });
    }
    async webSocketError(socket: WebSocket) { await this.webSocketClose(socket); }
    async alarm() {
        await this.serial(async () => {
            if (Date.now() >= this.room.expires) {
                for (const s of this.sockets())
                    s.close(1000, 'Room expired');
                await this.ctx.storage.deleteAll();
                this.room = createRoom('', Date.now());
                return;
            }
            let stale = false;
            for (const socket of this.sockets()) {
                const attachment = socket.deserializeAttachment();
                const member = this.room.players.find(p => p.id === attachment?.id);
                if (!member || Date.now() - (attachment.seenAt ?? member.lastSeen) > 35000) {
                    socket.close(1001, 'Heartbeat timed out');
                    stale = true;
                }
            }
            if (stale) {
                const connected = new Set(this.sockets().map(s => s.deserializeAttachment()?.id));
                if (!connected.has(this.room.host)) {
                    const next = this.room.players.find(p => connected.has(p.id));
                    if (next)
                        this.room.host = next.id;
                }
                this.room.version++;
                if (!['won', 'lost'].includes(this.room.phase))
                    this.room.notice = 'Crew link lost. Assigned consoles will recover on reconnect.';
            }
            expire(this.room, Date.now());
            await this.save();
            this.broadcast();
        });
    }
}
export default { async fetch(request: Request, env: Env) {
        const origin = new URL(request.url);
        if (request.method === 'POST' && request.headers.get('Origin') && request.headers.get('Origin') !== origin.origin)
            return json({ error: 'Invalid origin' }, 403);
        if (origin.pathname.startsWith('/api/') && origin.pathname !== '/api/health') {
            const key = request.headers.get('CF-Connecting-IP') ?? 'local';
            const limiter = origin.pathname === '/api/create' ? env.CREATE_LIMITER : env.API_LIMITER;
            if (!(await limiter.limit({ key })).success)
                return json({ error: 'Request limit reached. Wait a minute.' }, 429, { 'Retry-After': '60' });
        }
        if (request.method === 'POST') {
            const reader = request.body?.getReader();
            let size = 0;
            const chunks: Uint8Array[] = [];
            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    size += value.byteLength;
                    if (size > 1024) {
                        await reader.cancel();
                        return json({ error: 'Payload too large' }, 413);
                    }
                    chunks.push(value);
                }
            }
            const bytes = new Uint8Array(size);
            let cursor = 0;
            for (const chunk of chunks) {
                bytes.set(chunk, cursor);
                cursor += chunk.byteLength;
            }
            if (bytes.byteLength > 1024)
                return json({ error: 'Payload too large' }, 413);
            request = new Request(request, { body: bytes });
        }
        const url = new URL(request.url);
        if (url.pathname === '/api/health')
            return json({ ok: true, version: BUILD_VERSION });
        if (url.pathname === '/api/create' && request.method === 'POST') {
            const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            for (let attempt = 0; attempt < 5; attempt++) {
                const bytes = crypto.getRandomValues(new Uint8Array(6));
                const code = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
                const room = env.ROOMS.get(env.ROOMS.idFromName(code));
                if (await room.reserve(code))
                    return json({ code });
            }
            return json({ error: 'Unable to allocate room. Try again.' }, 503);
        }
        if (url.pathname.startsWith('/api/rooms/')) {
            const code = url.pathname.split('/')[3];
            if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code))
                return json({ error: 'Invalid room code' }, 400);
            return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
        }
        const response = await env.ASSETS.fetch(request);
        const headers = new Headers(response.headers);
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('Referrer-Policy', 'same-origin');
        headers.set('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${origin.protocol === 'https:' ? 'wss:' : 'ws:'}//${origin.host}; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`);
        return new Response(response.body, { status: response.status, headers });
    } } satisfies ExportedHandler<Env>;
