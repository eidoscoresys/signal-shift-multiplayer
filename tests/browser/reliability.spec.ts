import { test, expect } from '@playwright/test';
import { createCrew, start, view, send, confirms, phase, solvePower, solveThermal, solveOverride } from './helpers';
test('simultaneous controls reconcile, sector permissions hold and stale messages are harmless', async ({ browser }) => {
    const crew = await createCrew(browser, 4);
    const { pages } = crew;
    try {
        await start(pages);
        await Promise.all([send(pages[0], [{ type: 'action', id: 'sim-e', action: { type: 'rotate', cell: 0 } }]), send(pages[3], [{ type: 'action', id: 'sim-o', action: { type: 'rotate', cell: 1 } }])]);
        for (const p of pages)
            await expect.poll(async () => (await view(p)).rotations).toEqual([1, 1, 0, 0]);
        await send(pages[0], [{ type: 'action', id: 'wrong-sector', action: { type: 'rotate', cell: 1 } }]);
        await expect(pages[0].getByRole('alert')).toContainText('another console');
        expect((await view(pages[0])).rotations).toEqual([1, 1, 0, 0]);
        await solvePower(pages);
        const before = await view(pages[0]);
        await send(pages[0], [{ type: 'action', id: 'sim-e', action: { type: 'rotate', cell: 0 }, expectedPhase: 'power', mission: before.mission }, { type: 'action', id: 'stale-new', action: { type: 'valve', cell: 0, delta: 1 }, expectedPhase: 'power', mission: before.mission }]);
        await expect(pages[0].getByRole('alert')).toContainText('Console state changed');
        expect((await view(pages[0])).integrity).toBe(100);
        expect((await view(pages[0])).valves).toEqual([0, 0, 0, 0]);
        const controls = await view(pages[0]), intel = await view(pages[1]);
        expect(controls.clue.kind).toBe('controls');
        expect(intel.clue.kind).toBe('telemetry');
        if (controls.clue.kind === 'controls')
            expect(controls.clue.thermal.map(x => x.cell)).toEqual([0, 2]);
        if (intel.clue.kind === 'telemetry') {
            expect(intel.clue.thermal.map(x => x.cell)).toEqual([0, 2]);
            expect(intel.clue.sequence).toEqual([]);
            expect(intel.clue.readings).toEqual([-1, -1, -1, -1]);
        }
        await confirms(pages);
        await Promise.all([send(pages[1], [{ type: 'action', id: 'concurrent-test-a', action: { type: 'submit' } }]), send(pages[2], [{ type: 'action', id: 'concurrent-test-b', action: { type: 'submit' } }])]);
        for (const p of pages)
            await expect.poll(async () => (await view(p)).integrity).toBe(80);
        await send(pages[1], [{ type: 'action', id: 'concurrent-test-a', action: { type: 'submit' } }]);
        expect((await view(pages[0])).integrity).toBe(80);
        await solveThermal(pages);
        await confirms(pages);
        await send(pages[3], [{ type: 'action', id: 'out-of-turn', action: { type: 'mechanism', step: 1, mechanism: 0 } }]);
        await expect(pages[3].getByRole('alert')).toContainText('numbered step');
        expect((await view(pages[0])).integrity).toBe(80);
        await solveOverride(pages);
    }
    finally {
        await crew.close();
    }
});
test('wrong tests deduct once, cooldown blocks conflicts and failure is shared and replayable', async ({ browser }) => {
    test.setTimeout(60000);
    const crew = await createCrew(browser, 2);
    const { pages } = crew;
    try {
        await start(pages);
        await confirms(pages);
        const intel = await view(pages[1]);
        if (intel.clue.kind !== 'telemetry')
            throw Error('Missing readings');
        const clue = intel.clue;
        const solution = clue.readings.map((r, i) => (r - clue.offsets[i] + 4) % 4);
        if (solution.every(v => v === 0)) {
            await pages[0].getByRole('button', { name: 'Rotate circuit 1 AURORA' }).click();
            await expect.poll(async () => (await view(pages[0])).rotations[0]).toBe(1);
        }
        const message = { type: 'action', id: 'wrong-once', action: { type: 'submit' } };
        await send(pages[1], [message, message, { type: 'action', id: 'conflicting-wrong', action: { type: 'submit' } }]);
        for (const p of pages)
            await expect.poll(async () => (await view(p)).integrity).toBe(80);
        expect((await view(pages[0])).phase).toBe('power');
        for (let i = 0; i < 4; i++) {
            await pages[1].getByRole('button', { name: 'AUTHORIZE GRID TEST' }).click();
            await expect.poll(async () => (await view(pages[0])).integrity).toBe(60 - i * 20);
        }
        await phase(pages, 'lost');
        await pages[1].screenshot({ path: 'docs/mission-failure.png', fullPage: true });
        const result = await view(pages[0]);
        expect(result.score).toBe(0);
        await send(pages[0], [{ type: 'action', id: 'after-loss', action: { type: 'rotate', cell: 0 } }]);
        await expect(pages[0].getByRole('alert')).toContainText('No active crisis');
        expect((await view(pages[0])).integrity).toBe(0);
        await pages[0].getByRole('button', { name: 'FLY AGAIN' }).click();
        await phase(pages, 'power');
        expect((await view(pages[0])).integrity).toBe(100);
    }
    finally {
        await crew.close();
    }
});
test('a WebSocket burst is closed without changing the authoritative game', async ({ browser }) => {
    const crew = await createCrew(browser, 2);
    try {
        await start(crew.pages);
        await send(crew.pages[1], Array.from({ length: 40 }, () => ({ type: 'ping' })));
        await expect(crew.pages[1].locator('.link-status')).toContainText('DISCONNECTED');
        await expect(crew.pages[1].getByRole('alert')).toContainText('Rate limit exceeded');
        expect((await view(crew.pages[0])).integrity).toBe(100);
        await crew.pages[1].waitForTimeout(1200);
        await crew.pages[1].reload();
        await expect(crew.pages[1].getByRole('heading', { name: 'Thermal Analyst' })).toBeVisible();
    }
    finally {
        await crew.close();
    }
});
test('a silent half-open host is detected by the server and recovers its original role', async ({ browser }) => {
    test.setTimeout(90000);
    const crew = await createCrew(browser, 2);
    const { pages, contexts } = crew;
    let activity: ReturnType<typeof setInterval> | undefined;
    let counter = 0;
    try {
        await start(pages);
        const before = await view(pages[0]);
        await pages[0].evaluate(() => {
            const socket = (window as unknown as {
                testSocket: WebSocket;
            }).testSocket;
            const original = socket.send.bind(socket);
            socket.send = (data) => {
                if (typeof data === 'string' && JSON.parse(data).type === 'ping')
                    return;
                original(data);
            };
            socket.close = () => { };
        });
        await contexts[0].setOffline(true);
        console.log('Simulating a silent host while its teammate continues taking actions.');
        activity = setInterval(() => { void send(pages[1], [{ type: 'action', id: 'presence-activity-' + counter++, action: { type: 'confirm', cell: 0 } }]).catch(() => { }); }, 4000);
        await expect.poll(async () => (await view(pages[1])).host, { timeout: 55000 }).not.toBe(before.you);
        expect((await view(pages[1])).players.find(p => p.id === before.you)?.connected).toBe(false);
        await contexts[0].setOffline(false);
        await expect(pages[0].locator('.link-status')).toContainText('LIVE', { timeout: 20000 });
        await expect.poll(async () => (await view(pages[1])).players.find(p => p.id === before.you)?.connected).toBe(true);
        const restored = await view(pages[0]);
        expect(restored.you).toBe(before.you);
        expect(restored.players.find(p => p.id === before.you)?.role).toBe('engineer');
        expect(restored.deadline).toBe(before.deadline);
        expect(restored.integrity).toBe(100);
    }
    finally {
        clearInterval(activity);
        await crew.close();
    }
});
