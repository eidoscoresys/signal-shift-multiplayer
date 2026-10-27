import { test, expect } from '@playwright/test';
import { createCrew, start, view, send, solvePower, solveThermal, solveOverride, sharedResults } from './helpers';
for (const count of [2, 4, 8])
    test(`${count} crew coordinate Final Override callouts, reconnect and retain private clues`, async ({ browser }) => {
        test.setTimeout(240000);
        const crew = await createCrew(browser, count);
        const { pages, contexts } = crew;
        try {
            await start(pages);
            await solvePower(pages);
            await solveThermal(pages);
            const before = await view(pages[0]);
            for (const p of pages) {
                const v = await view(p);
                await expect(p.getByRole('region', { name: 'Final Override briefing' })).toContainText(v.clue.kind === 'controls' ? 'YOU HOLD THE KEY' : 'YOU READ THE SYMBOLS');
                expect(await p.locator('.quick-callouts button').evaluateAll(nodes => nodes.every(n => n.getBoundingClientRect().height >= 44))).toBe(true);
                await expect(p.locator('.turn-owner')).toContainText('CURRENT OVERRIDE: STEP 01');
            }
            await Promise.all(pages.map((p, i) => p.getByRole('button', { name: i % 2 ? 'Confirm order' : 'Send symbol key', exact: true }).click()));
            for (const p of pages)
                await expect(p.locator('.callout-feed li')).toHaveCount(count);
            await send(pages[0], [{ type: 'action', id: 'invalid-callout', action: { type: 'callout', code: 'leak-key' } }]);
            await expect(pages[0].getByRole('alert')).toContainText('Unknown callout');
            const prior = await view(pages[1]);
            const callout = prior.callouts[0];
            const sender = pages.find((_, i) => before.players[i].id === callout.player)!;
            await send(sender, [{ type: 'action', id: callout.id, action: { type: 'callout', code: callout.code } }]);
            await contexts[1].setOffline(true);
            await pages[1].evaluate(() => (window as unknown as {
                testSocket: WebSocket;
            }).testSocket.close());
            await expect(pages[1].locator('.link-status')).toContainText('RECONNECTING');
            await contexts[1].setOffline(false);
            await expect(pages[1].locator('.link-status')).toContainText('LIVE');
            await pages[1].reload();
            await expect(pages[1].locator('.callout-feed li')).toHaveCount(count);
            const restored = await view(pages[1]);
            expect(restored.you).toBe(prior.you);
            expect(restored.clue).toEqual(prior.clue);
            expect(restored.callouts).toEqual(prior.callouts);
            for (const p of pages) {
                const v = await view(p);
                expect(v.deadline).toBe(before.deadline);
                expect(v.integrity).toBe(100);
                expect(v.overrideStep).toBe(0);
                expect(v.ready).toEqual([]);
                if (v.clue.kind === 'controls') {
                    expect('sequence' in v.clue).toBe(false);
                    await expect(p.locator('.sequence-reading')).toHaveCount(0);
                }
                else {
                    expect('key' in v.clue).toBe(false);
                    await expect(p.locator('.mechanical-key')).toHaveCount(0);
                    expect(v.clue.sequence.map(c => c.cell)).toEqual(v.clue.lanes);
                }
            }
            await expect(pages[1].getByRole('button', { name: 'Ready to activate', exact: true })).toBeEnabled();
            await pages[1].getByRole('button', { name: 'Ready to activate', exact: true }).click();
            for (const p of pages)
                await expect(p.locator('.callout-feed')).toContainText('Ready to activate');
            if (count === 2)
                await pages[1].screenshot({ path: 'docs/finale-callouts-mobile.png', fullPage: true });
            await solveOverride(pages);
            await sharedResults(pages);
        }
        finally {
            await crew.close();
        }
    });
