import { test, expect } from '@playwright/test';
import { createCrew, start, view, send, phase, solvePower, solveThermal } from './helpers';
test('the real five-minute server alarm ends an unfinished final override for every player', async ({ browser }) => {
    test.setTimeout(330000);
    const crew = await createCrew(browser, 2);
    const { pages } = crew;
    try {
        await start(pages);
        await solvePower(pages);
        await solveThermal(pages);
        const before = await view(pages[0]);
        expect(before.phase).toBe('override');
        expect(before.deadline! - before.serverTime).toBeGreaterThan(250000);
        console.log('Waiting for the actual server deadline; no accelerated clocks or timer overrides.');
        await expect(pages[0].getByText('Every signal deserves another chance.')).toBeVisible({ timeout: 310000 });
        await phase(pages, 'lost');
        for (const p of pages) {
            const result = await view(p);
            expect(result.integrity).toBe(100);
            expect(result.score).toBe(0);
            expect(result.finishedAt).toBe(before.deadline);
            expect(result.completed).toEqual(['power', 'thermal']);
            expect(result.serverTime).toBeGreaterThanOrEqual(before.deadline!);
        }
        await send(pages[0], [{ type: 'action', id: 'too-late', action: { type: 'mechanism', step: 0, mechanism: 0 } }]);
        await expect(pages[0].getByRole('alert')).toContainText('No active crisis');
        expect((await view(pages[0])).phase).toBe('lost');
    }
    finally {
        await crew.close();
    }
});
