import { test, expect } from '@playwright/test';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
test('room membership, private roles, progress and deduplication survive a full workerd restart', async ({ browser }) => {
    test.setTimeout(150000);
    let child: ChildProcess | undefined;
    let logs = '';
    async function start() {
        child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--port', '8790', '--inspector-port', '9231', '--persist-to', '.wrangler/restart-tests'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        child.stdout?.on('data', b => { logs = (logs + b.toString()).slice(-6000); });
        child.stderr?.on('data', b => { logs = (logs + b.toString()).slice(-6000); });
        for (let attempt = 0; attempt < 300; attempt++) {
            if (child.exitCode !== null)
                throw Error(logs);
            try {
                if ((await fetch('http://127.0.0.1:8790/api/health')).ok)
                    return;
            }
            catch { }
            await delay(200);
        }
        throw Error('Restart-test server did not start: ' + logs);
    }
    async function stop() {
        if (!child || child.exitCode !== null)
            return;
        const owned = child;
        const exited = new Promise<void>(resolve => owned.once('exit', () => resolve()));
        if (process.platform === 'win32')
            execFileSync('taskkill.exe', ['/PID', String(owned.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        else
            owned.kill('SIGTERM');
        await exited;
        child = undefined;
    }
    const first = await browser.newContext(), second = await browser.newContext();
    await first.addInitScript(() => {
        const Original = window.WebSocket;
        window.WebSocket = class extends Original {
            constructor(url: string | URL, protocols?: string | string[]) {
                super(url, protocols);
                (window as unknown as {
                    testSocket: WebSocket;
                }).testSocket = this;
            }
        };
    });
    try {
        await start();
        const e = await first.newPage(), a = await second.newPage();
        await e.goto('http://127.0.0.1:8790');
        await e.getByLabel('YOUR CALLSIGN').fill('Persistent');
        await e.getByRole('button', { name: 'CREATE A FLIGHT' }).click();
        await expect(e.getByText('Crew on standby.')).toBeVisible();
        const code = new URL(e.url()).searchParams.get('room')!;
        await a.goto(`http://127.0.0.1:8790/?room=${code}`);
        await a.getByLabel('YOUR CALLSIGN').fill('Returning');
        await a.getByRole('button', { name: 'JOIN FLIGHT' }).click();
        await expect(a.getByText('Crew on standby.')).toBeVisible();
        await e.getByRole('button', { name: 'BEGIN MISSION' }).click();
        await expect(a.getByRole('heading', { name: 'Thermal Analyst' })).toBeVisible();
        await e.evaluate(() => (window as unknown as {
            testSocket: WebSocket;
        }).testSocket.send(JSON.stringify({ type: 'action', id: 'restart-rotation', action: { type: 'rotate', cell: 0 } })));
        await expect(a.getByText(/LIVE DIALS \/ EAST/)).toBeVisible();
        const readings = await a.locator('.readings').textContent();
        await stop();
        await expect(e.locator('.link-status')).toContainText('RECONNECTING');
        await start();
        await expect(e.locator('.link-status')).toContainText('LIVE', { timeout: 20000 });
        await expect(a.locator('.link-status')).toContainText('LIVE', { timeout: 20000 });
        await expect(e.getByRole('heading', { name: 'Power Engineer' })).toBeVisible();
        await expect(a.locator('.readings')).toHaveText(readings!);
        await expect(a.getByText(/LIVE DIALS \/ EAST/)).toBeVisible();
        await e.evaluate(() => (window as unknown as {
            testSocket: WebSocket;
        }).testSocket.send(JSON.stringify({ type: 'action', id: 'restart-rotation', action: { type: 'rotate', cell: 0 } })));
        await e.waitForTimeout(300);
        await expect(e.getByRole('button', { name: 'Rotate circuit 1 AURORA' })).toContainText('EAST');
    }
    finally {
        await first.close();
        await second.close();
        await stop();
    }
});
