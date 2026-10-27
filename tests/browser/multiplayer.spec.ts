import { test, expect } from '@playwright/test';
import { ROLE_NAMES } from '../../shared/protocol';
import { createCrew, start, view, send, phase, solvePower, solveThermal, solveOverride, sharedResults } from './helpers';
for (const count of [2, 3, 4, 5, 6, 7, 8])
    test(`${count} independent crew sessions complete all crises, recover and replay`, async ({ browser }) => {
        test.setTimeout(240000);
        const crew = await createCrew(browser, count);
        const { pages, contexts } = crew;
        const engineer = pages[0], analyst = pages[1];
        try {
            if (count === 2) {
                await engineer.setViewportSize({ width: 1280, height: 900 });
                await engineer.screenshot({ path: 'docs/lobby-desktop.png', fullPage: true });
                await engineer.setViewportSize({ width: 390, height: 844 });
            }
            await start(pages);
            const assignments = await Promise.all(pages.map(view));
            for (const controls of [true, false]) {
                const members = assignments.filter(v => (v.clue.kind === 'controls') === controls);
                expect(members.every(v => v.clue.lanes.length > 0)).toBe(true);
                expect(members.flatMap(v => v.clue.lanes).sort()).toEqual([0, 1, 2, 3]);
            }
            const initialDeadline = (await view(engineer)).deadline;
            await engineer.getByRole('button', { name: 'Rotate circuit 1 AURORA' }).click();
            await expect(analyst.getByText(/LIVE DIALS \/ EAST/)).toBeVisible();
            await engineer.reload();
            await expect(engineer.getByRole('heading', { name: 'Power Engineer' })).toBeVisible();
            await expect(engineer.getByRole('button', { name: 'Rotate circuit 1 AURORA' })).toContainText('EAST');
            await contexts[1].setOffline(true);
            await send(analyst, []);
            await analyst.evaluate(() => (window as unknown as {
                testSocket: WebSocket;
            }).testSocket.close());
            await expect(analyst.locator('.link-status')).toContainText('RECONNECTING');
            await contexts[1].setOffline(false);
            await expect(analyst.locator('.link-status')).toContainText('LIVE');
            await analyst.reload();
            await expect(analyst.getByRole('heading', { name: 'Thermal Analyst' })).toBeVisible();
            if (count === 2) {
                await engineer.screenshot({ path: 'docs/engineer-mobile.png', fullPage: true });
                await analyst.screenshot({ path: 'docs/analyst-mobile.png', fullPage: true });
            }
            if (count === 4) {
                await pages[2].screenshot({ path: 'docs/decoder-mobile.png', fullPage: true });
                await pages[3].screenshot({ path: 'docs/operator-mobile.png', fullPage: true });
            }
            await solvePower(pages);
            expect((await view(engineer)).deadline).toBe(initialDeadline);
            if (count === 2) {
                await engineer.screenshot({ path: 'docs/thermal-engineer-mobile.png', fullPage: true });
                await analyst.screenshot({ path: 'docs/thermal-analyst-mobile.png', fullPage: true });
            }
            if (count >= 3) {
                const prior = await view(engineer);
                await contexts[0].setOffline(true);
                await engineer.evaluate(() => (window as unknown as {
                    testSocket: WebSocket;
                }).testSocket.close());
                await expect.poll(async () => (await view(analyst)).host).not.toBe(prior.you);
                await contexts[0].setOffline(false);
                await expect(engineer.locator('.link-status')).toContainText('LIVE');
                const restored = await view(engineer);
                expect(restored.you).toBe(prior.you);
                expect(restored.players.find(p => p.id === restored.you)?.role).toBe('engineer');
            }
            if (count >= 3) {
                const p = pages[count - 1], before = await view(p);
                const own = before.players.find(player => player.id === before.you)!;
                await p.reload();
                await expect(p.getByRole('heading', { name: ROLE_NAMES[own.role] })).toBeVisible();
                const after = await view(p);
                expect(after.you).toBe(before.you);
                expect(after.clue).toEqual(before.clue);
            }
            await solveThermal(pages);
            expect((await view(engineer)).deadline).toBe(initialDeadline);
            if (count === 2) {
                await engineer.screenshot({ path: 'docs/override-engineer-mobile.png', fullPage: true });
                await analyst.screenshot({ path: 'docs/override-analyst-mobile.png', fullPage: true });
            }
            await solveOverride(pages);
            await sharedResults(pages);
            for (const p of pages) {
                await expect(p.getByText('You brought us home.')).toBeVisible();
                expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            }
            const score = (await view(engineer)).score, finishClock = await engineer.getByLabel('Mission time').textContent();
            await analyst.reload();
            await expect(analyst.getByText('You brought us home.')).toBeVisible();
            expect((await view(analyst)).score).toBe(score);
            await engineer.waitForTimeout(1100);
            expect(await engineer.getByLabel('Mission time').textContent()).toBe(finishClock);
            if (count === 2)
                await engineer.screenshot({ path: 'docs/mission-victory.png', fullPage: true });
            const host = (await view(engineer)).host;
            let commander = engineer;
            for (const p of pages)
                if ((await view(p)).you === host)
                    commander = p;
            await commander.getByRole('button', { name: 'FLY AGAIN' }).click();
            await phase(pages, 'power');
            expect((await view(engineer)).mission).toBe(2);
            expect((await view(engineer)).completed).toEqual([]);
        }
        finally {
            await crew.close();
        }
    });
