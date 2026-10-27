import { test, expect } from '@playwright/test';
import { accessible } from './accessibility';
import { createCrew, start, view } from './helpers';
import { PLAY_URL, REPOSITORY_URL } from '../../shared/project';

test('credits are accessible, responsive and transparent about creator and AI contributions', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'Created and Directed by Quindel Logan' })).toBeVisible();
    await expect(page.getByText('Game Concept, Product Design, Creative Direction and AI-Assisted Development Oversight', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Built with OpenAI Codex' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Play SIGNAL SHIFT' })).toHaveAttribute('href', PLAY_URL);
    if (REPOSITORY_URL) await expect(page.getByRole('link', { name: 'GitHub source repository' })).toHaveAttribute('href', REPOSITORY_URL);
    else await expect(page.getByText('GitHub source repository: publication pending creator approval.')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await accessible(page);
    await page.screenshot({ path: 'docs/credits-mobile.png', fullPage: true });
});

test('opening credits during a mission preserves the active console, identity and deadline', async ({ browser }) => {
    const crew = await createCrew(browser, 2);
    const [engineer, reader] = crew.pages;
    try {
        await start(crew.pages);
        await engineer.getByRole('button', { name: 'Rotate circuit 1 AURORA' }).click();
        await expect.poll(async () => (await view(reader)).rotations[0]).toBe(1);
        const before = await view(engineer);
        const popup = engineer.waitForEvent('popup');
        await engineer.getByRole('link', { name: 'About / Credits' }).click();
        const credits = await popup;
        await credits.waitForURL('**/about');
        await expect(credits.getByRole('heading', { name: 'Created and Directed by Quindel Logan' })).toBeVisible();
        expect(await credits.evaluate(() => Object.hasOwn(window, 'testSocket'))).toBe(false);
        await expect(engineer.locator('.link-status')).toContainText('LIVE');
        const during = await view(engineer);
        expect(during.you).toBe(before.you); expect(during.deadline).toBe(before.deadline);
        expect(during.rotations).toEqual(before.rotations); expect(during.phase).toBe('power');
        await credits.close();
        await engineer.getByRole('button', { name: 'Rotate circuit 1 AURORA' }).click();
        await expect.poll(async () => (await view(reader)).rotations[0]).toBe(2);
        expect((await view(reader)).deadline).toBe(before.deadline);
    } finally { await crew.close(); }
});
