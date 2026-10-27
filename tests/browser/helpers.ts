import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { Snapshot } from '../../shared/protocol';
import { SYMBOLS, MECHANISMS } from '../../shared/protocol';
type TestWindow = Window & {
    testSocket: WebSocket;
    snapshots: Snapshot[];
};
export async function view(page: Page): Promise<Snapshot> {
    // A reconnect clears this test-only capture buffer before the first new frame.
    // Capture the returned object handle so another reconnect cannot race a second read.
    const captured = await page.waitForFunction(() => (window as unknown as TestWindow).snapshots?.at(-1));
    try { return await captured.jsonValue() as Snapshot; }
    finally { await captured.dispose(); }
}
export async function send(page: Page, messages: unknown[]) { await page.evaluate(messages => { const socket = (window as unknown as TestWindow).testSocket; messages.forEach(m => socket.send(JSON.stringify(m))); }, messages); }
export async function createCrew(browser: Browser, count: number) {
    const contexts: BrowserContext[] = [], pages: Page[] = [];
    let code = '';
    for (let i = 0; i < count; i++) {
        const context = await browser.newContext({ viewport: { width: i % 2 ? 360 : 390, height: 844 } });
        contexts.push(context);
        await context.addInitScript(() => {
            const Original = window.WebSocket;
            window.WebSocket = class extends Original {
                constructor(url: string | URL, protocols?: string | string[]) {
                    super(url, protocols);
                    const w = window as unknown as TestWindow;
                    w.testSocket = this;
                    w.snapshots = [];
                    this.addEventListener('message', e => {
                        const m = JSON.parse(e.data);
                        if (m.type === 'snapshot') {
                            w.snapshots.push(m);
                            if (w.snapshots.length > 30)
                                w.snapshots.shift();
                        }
                    });
                }
            };
        });
        const page = await context.newPage();
        pages.push(page);
        await page.goto(i ? `/?room=${code}` : '/');
        await page.getByLabel('YOUR CALLSIGN').fill(['Nova', 'Echo', 'Cipher', 'Atlas', 'Vega', 'Flux', 'Lyra', 'Pax'][i]);
        await page.getByRole('button', { name: i ? 'JOIN FLIGHT' : 'CREATE A FLIGHT' }).click();
        await expect(page.getByText('Crew on standby.')).toBeVisible({ timeout: 15000 });
        if (!i)
            code = new URL(page.url()).searchParams.get('room')!;
    }
    await expect.poll(async () => (await view(pages[0])).players.filter(p => p.connected).length).toBe(count);
    return { contexts, pages, code, close: () => Promise.all(contexts.map(c => c.close())) };
}
export async function phase(pages: Page[], name: string) {
    for (const p of pages) {
        await expect.poll(async () => (await view(p))?.phase).toBe(name);
        if (['power', 'thermal', 'override'].includes(name)) {
            await expect(p.locator('.mission-console')).toHaveClass(new RegExp('phase-' + name));
            expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            if (name === 'thermal')
                expect(await p.locator('.valve-controls button').evaluateAll(nodes => nodes.every(n => { const b = n.getBoundingClientRect(), parent = n.parentElement!.getBoundingClientRect(); return b.width >= 44 && b.height >= 44 && b.left >= parent.left - 1 && b.right <= parent.right + 1; }))).toBe(true);
        }
    }
}
export async function start(pages: Page[]) { await pages[0].getByRole('button', { name: 'BEGIN MISSION' }).click(); await phase(pages, 'power'); }
export async function confirms(pages: Page[]) {
    for (const page of pages) {
        const v = await view(page);
        if (v.clue.kind !== 'telemetry')
            continue;
        for (const cell of v.clue.lanes) {
            const label = v.phase === 'power' ? 'circuit' : v.phase === 'thermal' ? 'cooling' : 'symbol';
            if (!(await view(page)).ready.includes(cell)) {
                await page.getByRole('button', { name: `Confirm ${label} ${cell + 1}`, exact: true }).click();
                await expect.poll(async () => (await view(page)).ready.includes(cell)).toBe(true);
            }
        }
    }
    await expect.poll(async () => (await view(pages[0])).ready.length).toBe(4);
}
export async function solvePower(pages: Page[]) {
    const targets: number[] = [], offsets: number[] = [];
    for (const page of pages) {
        for (const data of await page.locator('.reading').evaluateAll(nodes => nodes.map(n => ({ cell: Number(n.getAttribute('data-cell')), target: Number(n.getAttribute('data-target')), offset: Number(n.getAttribute('data-offset')) })))) {
            targets[data.cell] = data.target;
            offsets[data.cell] = data.offset;
        }
    }
    expect(targets).toHaveLength(4);
    await confirms(pages);
    for (const page of pages) {
        const v = await view(page);
        if (v.clue.kind !== 'controls')
            continue;
        for (const cell of v.clue.lanes) {
            const goal = (targets[cell] - offsets[cell] + 4) % 4;
            const current = (await view(page)).rotations[cell];
            for (let n = 0; n < (goal - current + 4) % 4; n++) {
                await page.getByRole('button', { name: new RegExp(`Rotate circuit ${cell + 1} `) }).click();
                await expect.poll(async () => (await view(page)).rotations[cell]).toBe((current + n + 1) % 4);
                await page.waitForTimeout(100);
            }
        }
    }
    const reader = await findReader(pages);
    await reader.getByRole('button', { name: 'AUTHORIZE GRID TEST' }).click();
    await phase(pages, 'thermal');
}
export async function findReader(pages: Page[]) {
    for (const p of pages)
        if ((await view(p)).clue.kind === 'telemetry')
            return p;
    throw Error('No reading console');
}
export async function solveThermal(pages: Page[]) {
    const targets: number[] = [];
    for (const page of pages)
        for (const data of await page.locator('.thermal-reading').evaluateAll(nodes => nodes.map(n => ({ cell: Number(n.getAttribute('data-cell')), target: Number(n.getAttribute('data-target')) }))))
            targets[data.cell] = data.target;
    expect(targets).toHaveLength(4);
    await confirms(pages);
    for (const page of pages) {
        for (const calibration of await page.locator('.valve-card').evaluateAll(nodes => nodes.map(n => ({ cell: Number(n.getAttribute('data-cell')), base: Number(n.getAttribute('data-base')), gain: Number(n.getAttribute('data-gain')) })))) {
            const goal = (targets[calibration.cell] - calibration.base) / calibration.gain;
            while ((await view(page)).valves[calibration.cell] !== goal) {
                const current = (await view(page)).valves[calibration.cell];
                await page.getByRole('button', { name: `${current < goal ? 'Increase' : 'Decrease'} cooling circuit ${calibration.cell + 1}` }).click();
                await expect.poll(async () => (await view(page)).valves[calibration.cell]).toBe(current + (current < goal ? 1 : -1));
                await page.waitForTimeout(100);
            }
        }
    }
    const reader = await findReader(pages);
    await reader.getByRole('button', { name: 'STABILIZE COOLING' }).click();
    await phase(pages, 'override');
}
export async function solveOverride(pages: Page[]) {
    const symbols: number[] = [];
    for (const page of pages)
        for (const data of await page.locator('.sequence-reading').evaluateAll(nodes => nodes.map(n => ({ cell: Number(n.getAttribute('data-cell')), symbol: Number(n.getAttribute('data-symbol')) }))))
            symbols[data.cell] = data.symbol;
    expect(symbols).toHaveLength(4);
    await confirms(pages);
    for (let step = 0; step < 4; step++) {
        let owner: Page | undefined;
        for (const page of pages) {
            const v = await view(page);
            if (v.clue.kind === 'controls' && v.clue.lanes.includes(step)) {
                owner = page;
                break;
            }
        }
        expect(owner).toBeTruthy();
        const mapping = await owner!.locator('.mechanical-key span').filter({ hasText: SYMBOLS[symbols[step]] }).textContent();
        const mechanism = MECHANISMS.find(m => mapping?.includes(m));
        expect(mechanism).toBeTruthy();
        await owner!.getByRole('button', { name: `Step ${step + 1} ${mechanism}` }).click();
        if (step < 3) {
            for (const page of pages) {
                await expect.poll(async () => (await view(page)).overrideStep).toBe(step + 1);
                await expect(page.locator('.override-ack')).toContainText(`Steps 1–${step + 1} locked successfully`);
                await expect(page.locator('.turn-owner')).toContainText(`STEP 0${step + 2}`);
            }
        }
        await owner!.waitForTimeout(100);
    }
    await phase(pages, 'won');
}
export async function sharedResults(pages: Page[]) {
    const views = await Promise.all(pages.map(view));
    for (const v of views) {
        expect(v.phase).toBe('won');
        expect(v.integrity).toBe(100);
        expect(v.completed).toEqual(['power', 'thermal', 'override']);
        expect(v.score).toBe(1000 + Math.floor((v.deadline! - v.finishedAt!) / 1000) * 5);
        expect(v.score).toBe(views[0].score);
        expect(v.finishedAt).toBe(views[0].finishedAt);
        expect(v.deadline).toBe(views[0].deadline);
    }
}
