import { test, expect } from '@playwright/test';
test('edge creation limits reject abusive bursts before room allocation', async ({ request }) => {
    for (let i = 0; i < 12; i++) {
        const r = await request.post('/api/create', { headers: { 'CF-Connecting-IP': '192.0.2.123' } });
        expect(r.status()).toBe(200);
    }
    const limited = await request.post('/api/create', { headers: { 'CF-Connecting-IP': '192.0.2.123' } });
    expect(limited.status()).toBe(429);
    expect(limited.headers()['retry-after']).toBe('60');
});
