import { test, expect } from '@playwright/test';
test('eight-player capacity and returning identity are enforced before a mission', async ({ playwright }, testInfo) => {
    const contexts = await Promise.all(Array.from({ length: 9 }, () => playwright.request.newContext({ baseURL: String(testInfo.project.use.baseURL) })));
    try {
        const { code } = await (await contexts[0].post('/api/create')).json();
        for (let i = 0; i < 8; i++) {
            const r = await contexts[i].post(`/api/rooms/${code}/join`, { data: { name: `Crew ${i}` } });
            expect(r.status()).toBe(200);
        }
        expect((await contexts[8].post(`/api/rooms/${code}/join`, { data: { name: 'Ninth' } })).status()).toBe(409);
        expect((await contexts[0].post(`/api/rooms/${code}/join`, { data: { name: 'Returning' } })).status()).toBe(200);
    }
    finally {
        await Promise.all(contexts.map(c => c.dispose()));
    }
});
