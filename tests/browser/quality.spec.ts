import { test, expect } from '@playwright/test';
import { createCrew, start, view, send, phase } from './helpers';
test('invites lead with joining, keyboard submission works and briefing explains the controls', async ({ browser }) => {
    const a = await browser.newContext({ viewport: { width: 390, height: 844 } }), b = await browser.newContext({ viewport: { width: 360, height: 800 } });
    try {
        const first = await a.newPage();
        await first.goto('/');
        await expect(first.getByRole('button', { name: 'Create a room', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await first.getByLabel('YOUR CALLSIGN').fill('Nova');
        await first.getByLabel('YOUR CALLSIGN').press('Enter');
        await expect(first.getByText('Crew on standby.')).toBeVisible();
        await expect(first.getByText('Invite at least one teammate to begin.')).toBeVisible();
        await first.getByRole('button', { name: 'NEXT BRIEFING' }).click();
        await expect(first.getByRole('heading', { name: 'Read. Relay. Confirm.' })).toBeVisible();
        const room = new URL(first.url()).searchParams.get('room')!;
        const second = await b.newPage();
        await second.goto(`/?room=${room}`);
        await expect(second.getByRole('button', { name: 'Join a room', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expect(second.getByLabel('ROOM CODE')).toHaveValue(room);
        await second.getByLabel('YOUR CALLSIGN').fill('Echo');
        await second.getByLabel('YOUR CALLSIGN').press('Enter');
        await expect(second.getByText('Crew on standby.')).toBeVisible();
        await expect(first.getByRole('button', { name: 'BEGIN MISSION' })).toBeEnabled();
        await first.getByRole('button', { name: 'BEGIN MISSION' }).click();
        await expect(second.locator('.equation')).toContainText('TARGET − OFFSET');
        await expect(second.getByRole('button', { name: '? CONSOLE HELP' })).toHaveAttribute('aria-expanded', 'false');
        await second.getByRole('button', { name: '? CONSOLE HELP' }).click();
        await expect(second.getByText(/Example: WEST/)).toBeVisible();
    }
    finally {
        await a.close();
        await b.close();
    }
});
test('loading and API failures remain understandable and retryable', async ({ page }) => { await page.goto('/'); await page.getByLabel('YOUR CALLSIGN').fill('Nova'); await page.route('**/api/create', route => route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Request limit reached. Wait a minute.' }) })); await page.getByRole('button', { name: 'CREATE A FLIGHT' }).click(); await expect(page.getByRole('alert')).toContainText('Request limit reached'); await expect(page.getByRole('button', { name: 'CREATE A FLIGHT' })).toBeEnabled(); await page.unroute('**/api/create'); await page.route('**/api/create', route => route.abort('failed')); await page.getByRole('button', { name: 'CREATE A FLIGHT' }).click(); await expect(page.getByRole('alert')).toContainText('Station unreachable'); await page.unroute('**/api/create'); let release: () => void = () => { }; const gate = new Promise<void>(resolve => release = resolve); await page.route('**/api/create', async (route) => { await gate; await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Station maintenance. Try again shortly.' }) }); }); await page.getByRole('button', { name: 'CREATE A FLIGHT' }).click(); await expect(page.getByRole('button', { name: 'CREATING FLIGHT' })).toBeDisabled(); await expect(page.getByRole('form', { name: 'Create a flight' })).toHaveAttribute('aria-busy', 'true'); release(); await expect(page.getByRole('alert')).toContainText('Station maintenance'); await expect(page.getByRole('button', { name: 'CREATE A FLIGHT' })).toBeEnabled(); });
test('an expired session stops reconnecting and offers a safe return home', async ({ browser }) => {
    const crew = await createCrew(browser, 2);
    try {
        await start(crew.pages);
        await crew.contexts[0].clearCookies();
        await crew.pages[0].evaluate(() => (window as unknown as {
            testSocket: WebSocket;
        }).testSocket.close());
        await expect(crew.pages[0].locator('.link-status')).toContainText('DISCONNECTED', { timeout: 15000 });
        await expect(crew.pages[0].getByRole('alert')).toContainText('expired');
        await crew.pages[0].getByRole('button', { name: 'RETURN HOME', exact: true }).click();
        await expect(crew.pages[0].getByRole('heading', { name: /One station/ })).toBeVisible();
    }
    finally {
        await crew.close();
    }
});
test('reduced motion and narrow touch controls work without hiding instructions', async ({ browser }) => {
    const crew = await createCrew(browser, 2);
    try {
        await crew.pages[0].emulateMedia({ reducedMotion: 'reduce' });
        await start(crew.pages);
        expect(await crew.pages[0].locator('.console-panel').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
        await expect(crew.pages[0].getByLabel('Station integrity')).toHaveAttribute('value', '100');
        await expect(crew.pages[0].locator('.equation')).toBeVisible();
        await crew.pages[0].getByRole('button', { name: '? CONSOLE HELP' }).focus();
        await expect(crew.pages[0].getByRole('button', { name: '? CONSOLE HELP' })).toBeFocused();
        expect(await crew.pages[0].evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    finally {
        await crew.close();
    }
});
