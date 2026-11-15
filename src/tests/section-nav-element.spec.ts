import { afterAll, beforeAll, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { build } from 'vite';

const listLinks = (page: Page) => page.locator('section-nav').locator('nav a').allTextContents();

let outDir: string;
let browser: Browser;
let bundle: string;

beforeAll(async () => {
	outDir = await mkdtemp(join(tmpdir(), 'section-nav-ce-'));
	await build({ configFile: 'vite.ce.config.ts', logLevel: 'silent', build: { outDir, emptyOutDir: true } });
	bundle = await readFile(join(outDir, 'section-nav.js'), 'utf8');
	browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
	await Promise.allSettled([browser?.close(), outDir && rm(outDir, { recursive: true, force: true })]);
});

async function open(markup: string) {
	const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.setContent(`<body>${markup}</body>`);
	await page.addScriptTag({ content: bundle, type: 'module' });
	await page.waitForFunction(() => customElements.get('section-nav'));
	return { page, errors };
}

it('registers <section-nav> and lists slotted headings when storage is blocked', async () => {
	const { page, errors } = await open(
		'<section-nav><h2>Alpha</h2><p style="height:1200px"></p><h2>Beta</h2><p style="height:1200px"></p></section-nav>'
	);
	await expect.poll(() => listLinks(page)).toEqual(['Alpha', 'Beta']);
	expect(errors).toEqual([]);
	await page.close();
});

it('renders the sections property and toggles with b', async () => {
	const { page } = await open('<section-nav></section-nav>');
	await page.evaluate(() => {
		document.querySelector('section-nav')!.setAttribute('sections', JSON.stringify([{ id: 'one', title: 'One' }]));
	});
	await expect.poll(() => listLinks(page)).toEqual(['One']);
	const handle = page.locator('section-nav').getByRole('button', { name: 'Sections' });
	await expect.poll(() => handle.getAttribute('aria-expanded')).toBe('true');
	await page.keyboard.press('b');
	await expect.poll(() => handle.getAttribute('aria-expanded')).toBe('false');
	await page.close();
});
