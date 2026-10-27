import { test, expect } from '@playwright/test';
import { view, send } from './helpers';
test('wire permissions, deduplication, concurrent actions and cross-room isolation', async ({ browser }) => {
    const one = await browser.newContext(), two = await browser.newContext(), outsider = await browser.newContext();
    const init = () => {
        const Original = window.WebSocket;
        window.WebSocket = class extends Original {
            constructor(url: string | URL, protocols?: string | string[]) {
                super(url, protocols);
                const w = window as unknown as {
                    testSocket: WebSocket;
                    snapshots: unknown[];
                };
                w.testSocket = this;
                w.snapshots = [];
                this.addEventListener('message', event => {
                    const m = JSON.parse(event.data);
                    if (m.type === 'snapshot')
                        w.snapshots.push(m);
                });
            }
        };
    };
    await one.addInitScript(init);
    await two.addInitScript(init);
    await outsider.addInitScript(init);
    const e = await one.newPage(), a = await two.newPage();
    await e.goto('/');
    await e.getByLabel('YOUR CALLSIGN').fill('First');
    await e.getByRole('button', { name: 'CREATE A FLIGHT' }).click();
    await expect(e.getByText('Crew on standby.')).toBeVisible();
    const code = new URL(e.url()).searchParams.get('room')!;
    const origin = new URL(e.url()).origin;
    await a.goto(`/?room=${code}`);
    await a.getByLabel('YOUR CALLSIGN').fill('Second');
    await a.getByRole('button', { name: 'JOIN FLIGHT' }).click();
    await expect(a.getByText('Crew on standby.')).toBeVisible();
    const otherCode = (await (await outsider.request.post(origin + '/api/create')).json()).code;
    expect((await one.request.get(`${origin}/api/rooms/${otherCode}/socket`)).status()).toBe(401);
    const otherPage = await outsider.newPage();
    await otherPage.goto(`/?room=${otherCode}`);
    await otherPage.getByLabel('YOUR CALLSIGN').fill('Isolated');
    await otherPage.getByRole('button', { name: 'JOIN FLIGHT' }).click();
    await expect(otherPage.getByText('Crew on standby.')).toBeVisible();
    await e.getByRole('button', { name: 'BEGIN MISSION' }).click();
    await expect(a.getByRole('heading', { name: 'Thermal Analyst' })).toBeVisible();
    const before = await view(e);
    const telemetry = await view(a);
    expect(before.clue.kind).toBe('controls');
    expect(telemetry.clue.kind).toBe('telemetry');
    expect(JSON.stringify(before)).not.toMatch(/readings|offsets|seed|solution|tokenHash/);
    expect(JSON.stringify(telemetry)).not.toMatch(/AURORA|seed|solution|tokenHash/);
    await send(a, [{ type: 'action', id: 'illegal-role', action: { type: 'rotate', cell: 0 } }]);
    await expect(a.getByRole('alert')).toContainText('Only Power Engineer');
    expect((await view(e)).rotations).toEqual([0, 0, 0, 0]);
    await send(e, [{ type: 'action', id: 'same-action', action: { type: 'rotate', cell: 0 } }, { type: 'action', id: 'same-action', action: { type: 'rotate', cell: 0 } }]);
    await expect(a.getByText(/LIVE DIALS \/ EAST/)).toBeVisible();
    await expect.poll(async () => (await view(e)).rotations[0]).toBe(1);
    await send(e, [{ type: 'action', id: 'conflict-a', action: { type: 'rotate', cell: 0 } }, { type: 'action', id: 'conflict-b', action: { type: 'rotate', cell: 0 } }]);
    await expect(a.getByText(/LIVE DIALS \/ WEST/)).toBeVisible();
    await e.reload();
    await expect(e.getByRole('heading', { name: 'Power Engineer' })).toBeVisible();
    await send(e, [{ type: 'action', id: 'same-action', action: { type: 'rotate', cell: 0 } }]);
    await expect(e.getByRole('button', { name: 'Rotate circuit 1 AURORA' })).toContainText('WEST');
    expect((await outsider.request.post(`${origin}/api/rooms/${code}/join`, { data: { name: 'Late' } })).status()).toBe(409);
    const otherView = await view(otherPage);
    expect(otherView.phase).toBe('lobby');
    expect(otherView.rotations).toEqual([0, 0, 0, 0]);
    const replacement = await one.newPage();
    await replacement.goto(`/?room=${code}`);
    await expect(replacement.getByRole('heading', { name: 'Power Engineer' })).toBeVisible();
    await expect(e.locator('.link-status')).toContainText('DISCONNECTED');
    await expect(e.getByRole('alert')).toContainText('another tab');
    await one.close();
    await two.close();
    await outsider.close();
});
