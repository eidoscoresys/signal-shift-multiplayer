import { test } from '@playwright/test';
import { createCrew, start, solvePower, solveThermal, solveOverride } from './helpers';
import { accessible } from './accessibility';
test('WCAG automated checks cover landing, lobby, every role and every mission phase', async ({ browser, page }) => {
    test.setTimeout(240000);
    await page.goto('/');
    await accessible(page);
    await page.getByRole('button', { name: 'Join a room', exact: true }).click();
    await accessible(page);
    const crew = await createCrew(browser, 4);
    try {
        await accessible(crew.pages[0]);
        await start(crew.pages);
        for (const p of crew.pages)
            await accessible(p);
        await solvePower(crew.pages);
        for (const p of crew.pages)
            await accessible(p);
        await solveThermal(crew.pages);
        for (const p of crew.pages)
            await accessible(p);
        await solveOverride(crew.pages);
        await accessible(crew.pages[0]);
    }
    finally {
        await crew.close();
    }
});
