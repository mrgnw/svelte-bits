import { afterAll, beforeAll, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';

let server: ViteDevServer;
let browser: Browser;

beforeAll(async () => {
	server = await createServer({ configFile: 'vite.config.ts', logLevel: 'silent', server: { port: 0, strictPort: false } });
	await server.listen();
	browser = await chromium.launch();
}, 60_000);

afterAll(async () => {
	await Promise.allSettled([browser?.close(), server?.close()]);
});

it('hydrates the server-rendered demo without mismatch and keeps menus working', async () => {
	const page = await browser.newPage({ viewport: { width: 420, height: 700 } });
	const messages: string[] = [];
	page.on('console', (m) => messages.push(m.text()));
	page.on('pageerror', (e) => messages.push(e.message));

	const url = new URL('tier-bar', server.resolvedUrls!.local[0]).href;
	const html = await (await fetch(url)).text();
	expect(html).toMatch(/@container tierbar-\S+ \(width >= 920px\)/);
	expect(html).toContain('popovertarget=');

	await page.goto(url);
	await page.waitForLoadState('networkidle');

	await page.getByRole('slider').nth(1).fill('300');
	const insert = page.getByRole('button', { name: 'Insert' });
	await insert.focus();
	await page.keyboard.press('Enter');
	await expect.poll(() => page.getByRole('button', { name: 'Link', exact: true }).isVisible()).toBe(true);
	await page.keyboard.press('Escape');
	await expect.poll(() => page.getByRole('button', { name: 'Link', exact: true }).isVisible()).toBe(false);

	await page.getByRole('button', { name: 'Italic' }).click();
	await expect.poll(() => page.getByRole('button', { name: 'Italic' }).getAttribute('aria-pressed')).toBe('true');

	expect(messages.filter((m) => /hydration|mismatch|error/i.test(m))).toEqual([]);
	await page.close();
}, 60_000);


it('serves each demo photo at its slug and 404s an unknown one', async () => {
	const base = server.resolvedUrls!.local[0];
	const dog = await fetch(new URL('spatial-image/walking-dog', base));
	expect(dog.status).toBe(200);
	expect(await dog.text()).toContain('alt="Person walking a dog down a sunlit narrow street"');
	const first = await (await fetch(new URL('spatial-image', base))).text();
	expect(first).toContain('alt="Black and white portrait of a man framing his face with his hands"');
	expect((await fetch(new URL('spatial-image/no-such-photo', base))).status).toBe(404);
}, 60_000);
