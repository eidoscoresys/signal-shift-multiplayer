import { BUILD_VERSION } from '../../shared/protocol';
import { test, expect } from '@playwright/test';
import { createCrew, start, view, send } from './helpers';
test('published HTTPS serves assets and secure account-free room sessions', async ({ page, request, baseURL }) => {
    expect(new URL(baseURL!).protocol).toBe('https:');
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /One station/ })).toBeVisible();
    const assets = await page.locator('script[src],link[rel=stylesheet]').evaluateAll(nodes => nodes.map(n => n.getAttribute('src') ?? n.getAttribute('href')!));
    expect(assets.length).toBeGreaterThanOrEqual(2);
    for (const path of assets)
        expect((await request.get(path)).status()).toBe(200);
    const coverUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(new URL(coverUrl!).origin).toBe(new URL(baseURL!).origin);
    const cover = await request.get(coverUrl!);
    expect(cover.status()).toBe(200);
    expect(cover.headers()['content-type']).toContain('image/png');
    const bytes = await cover.body();
    expect(bytes.readUInt32BE(16)).toBe(1600);
    expect(bytes.readUInt32BE(20)).toBe(900);
    expect(errors).toEqual([]);
    const health = await request.get('/api/health');
    expect(health.ok()).toBe(true);
    expect((await health.json()).version).toBe(BUILD_VERSION);
    const created = await request.post('/api/create');
    expect(created.status()).toBe(200);
    const { code } = await created.json();
    const joined = await request.post(`/api/rooms/${code}/join`, { data: { name: 'PublicCheck' } });
    expect(joined.status()).toBe(200);
    const cookie = joined.headers()['set-cookie'] ?? '';
    for (const attribute of ['HttpOnly', 'SameSite=Strict', 'Secure'])
        expect(cookie.includes(attribute)).toBe(true);
    const session = await request.get(`/api/rooms/${code}/session`);
    expect(session.status()).toBe(200);
    expect((await session.json()).id).toBe((await joined.json()).id);
});
test('published WSS privacy, duplicate control and independent rooms remain isolated', async ({ browser }) => {
    const crew = await createCrew(browser, 4), other = await createCrew(browser, 2);
    try {
        await start(crew.pages);
        const snapshots = await Promise.all(crew.pages.map(view));
        expect(snapshots.every(v => v.protocol === 2)).toBe(true);
        for (const v of snapshots) {
            expect(JSON.stringify(v)).not.toMatch(/tokenHash|solution|seed/);
            if (v.clue.kind === 'telemetry') {
                expect(v.clue.readings.filter(r => r !== -1)).toHaveLength(2);
                expect(v.clue.thermal).toEqual([]);
                expect(v.clue.sequence).toEqual([]);
            }
        }
        await send(crew.pages[1], [{ type: 'action', id: 'public-forbidden', action: { type: 'rotate', cell: 0 } }]);
        await expect(crew.pages[1].getByRole('alert')).toContainText('Only Power Engineer');
        const action = { type: 'action', id: 'public-duplicate', action: { type: 'rotate', cell: 0 } };
        await send(crew.pages[0], [action, action]);
        for (const p of crew.pages)
            await expect.poll(async () => (await view(p)).rotations[0]).toBe(1);
        const isolated = await view(other.pages[0]);
        expect(isolated.phase).toBe('lobby');
        expect(isolated.rotations).toEqual([0, 0, 0, 0]);
        const origin = new URL(crew.pages[0].url()).origin;
        expect((await crew.contexts[0].request.get(`${origin}/api/rooms/${other.code}/session`)).status()).toBe(401);
        await crew.pages[0].reload();
        await expect(crew.pages[0].getByRole('heading', { name: 'Power Engineer' })).toBeVisible();
        await expect(crew.pages[0].getByRole('button', { name: 'Rotate circuit 1 AURORA' })).toContainText('EAST');
    }
    finally {
        await crew.close();
        await other.close();
    }
});
