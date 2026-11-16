import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes, createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const baseline = resolve(process.env.SPATIAL_BASELINE ?? '/Volumes/wd/cache/spatial-maker/research/51-baseline/2026-11-16');
const out = resolve(process.env.TILT_OVERSCAN ?? '/Volumes/wd/cache/spatial-maker/research/51-tilt-overscan/2026-11-16');
const bits = resolve(process.env.SVELTE_BITS_ROOT ?? '/Users/m/dev/svelte-bits');
const PINNED = '75fde16ae8e78aeefe909a21c78791c9f4a94092';
await access(join(out, 'capture.json')).then(
	() => assert.fail(`refusing to overwrite evidence in ${out}`),
	() => {},
);
const { chromium } = createRequire(join(bits, 'package.json'))('playwright');
const manifest = JSON.parse(await readFile(join(baseline, 'inputs.json'), 'utf8'));
const config = manifest.config;
const origin = 'http://tilt.test';
const digest = (data) => createHash('sha256').update(data).digest('hex');
for (const [name, info] of Object.entries(manifest.files)) {
	assert.equal(digest(await readFile(join(baseline, name))), info.sha256, `input changed: ${name}`);
}
for (const name of ['spatial-renderer', 'spatial-mesh', 'spatial-tilt']) {
	const pinned = execFileSync('git', ['-C', bits, 'show', `${PINNED}:src/lib/${name}.ts`]);
	assert(pinned.equals(await readFile(join(baseline, 'lib', `${name}.ts`))), `${name}.ts snapshot differs from ${PINNED}`);
}

// Experimental copy only: zoom strength scaled per tilt, clear colour injectable. The pinned module is not modified.
const PATCHES = [
	['const scale = coverScale(scene.aspect, width / height, strength, focus);', 'const scale = coverScale(scene.aspect, width / height, strength * globalThis.experiment.zoom(tilt), focus);'],
	['gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);', 'gl.clearColor(...globalThis.experiment.clear);\n\tgl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);'],
];
const pinnedRenderer = await readFile(join(baseline, 'lib/spatial-renderer.ts'), 'utf8');
let experimental = pinnedRenderer;
for (const [from, to] of PATCHES) {
	assert.equal(experimental.split(from).length, 2, `patch target not unique: ${from}`);
	experimental = experimental.replace(from, to);
}

const MODES = ['fixed', 'none', 'max', 'length'];
const TEXTURES = [1024, 1152, 1280, 1400];
const diagonal = Math.SQRT1_2;
const VIEWS = {
	neutral: { x: 0, y: 0 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
	'up-left': { x: -diagonal, y: -diagonal }, 'up-right': { x: diagonal, y: -diagonal },
	'down-left': { x: -diagonal, y: diagonal }, 'down-right': { x: diagonal, y: diagonal },
};
const steps = (count, at) => Array.from({ length: count }, (_, index) => at(index / (count - 1)));
const PATHS = {
	'sweep-x': steps(41, (u) => ({ x: 2 * u - 1, y: 0 })),
	'sweep-diagonal': steps(41, (u) => ({ x: (2 * u - 1) * diagonal, y: (2 * u - 1) * diagonal })),
	circle: Array.from({ length: 48 }, (_, index) => ({ x: Math.cos(2 * Math.PI * index / 48), y: Math.sin(2 * Math.PI * index / 48) })),
};

const args = (process.env.CHROMIUM_ARGS ?? '--use-angle=metal --ignore-gpu-blocklist').split(' ');
const errors = [];
let browser;
let page;

// One browser per photo: with --in-process-gpu, a renderer reused across photos drifted from the baseline after the first photo.
async function open() {
	browser = await chromium.launch({ args });
	page = await browser.newPage({ viewport: { width: 1600, height: 1600 }, deviceScaleFactor: config.deviceScaleFactor });
	page.setDefaultTimeout(120000);
	page.on('pageerror', (error) => errors.push(error.message));
	await page.route('**/*', serve);
	await page.goto(origin);
}

async function serve(route) {
	const url = new URL(route.request().url());
	if (url.origin !== origin) return route.abort();
	if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body style="margin:0">' });
	const name = decodeURIComponent(url.pathname.slice(1));
	if (name === 'lib/spatial-renderer.js') return route.fulfill({ contentType: 'text/javascript', body: stripTypeScriptTypes(experimental) });
	if (/^lib\/spatial-[a-z]+\.js$/.test(name)) {
		return route.fulfill({ contentType: 'text/javascript', body: stripTypeScriptTypes(await readFile(join(baseline, name.replace(/\.js$/, '.ts')), 'utf8')) });
	}
	if (!Object.hasOwn(manifest.files, name)) {
		errors.push(`unlisted asset: ${name}`);
		return route.abort();
	}
	return route.fulfill({ contentType: name.endsWith('.avif') ? 'image/avif' : 'image/png', body: await readFile(join(baseline, name)) });
}

const report = {
	browser: null, args, node: process.version, pinned: PINNED,
	pinnedRendererSha256: digest(pinnedRenderer), experimentalRendererSha256: digest(experimental), patches: PATCHES,
	modes: MODES, textures: TEXTURES, views: VIEWS, files: {}, photos: [],
};

async function save(name, data) {
	const content = Buffer.from(data.split(',')[1], 'base64');
	const path = join(out, name);
	await mkdir(resolve(path, '..'), { recursive: true });
	await writeFile(path, content);
	report.files[name] = { bytes: content.length, sha256: digest(content) };
}

async function setup(photo) {
	await page.evaluate(async ({ photo, config }) => {
		const { acquireRenderer } = await import('/lib/spatial-renderer.js');
		const zooms = {
			fixed: () => 1,
			none: () => 0,
			max: (tilt) => Math.min(1, Math.max(Math.abs(tilt.x), Math.abs(tilt.y))),
			length: (tilt) => Math.min(1, Math.hypot(tilt.x, tilt.y)),
		};
		globalThis.experiment = { zoom: zooms.fixed, clear: [0, 0, 0, 1], zooms };
		const target = document.createElement('canvas');
		target.style.cssText = `width:${config.cssWidth}px;height:${Math.round(config.cssWidth * photo.height / photo.width)}px`;
		document.body.replaceChildren(target);
		const renderer = acquireRenderer({ onlost() {}, onrestored() {}, onerror(error) { throw error; } });
		if (renderer instanceof Error) throw renderer;
		const sources = { src: `/assets/${photo.files.src}`, depth: `/assets/${photo.files.depth}`, back: `/assets/${photo.files.back}`, backDepth: `/assets/${photo.files.backDepth}` };
		window.tilt = { renderer, target, sources, previous: null };
	}, { photo, config });
}

async function load(texture) {
	await page.evaluate((texture) => window.tilt.renderer.load(window.tilt.sources, texture, AbortSignal.timeout(30000)), texture);
}

async function frame(mode, tilt, { image = false, delta = false } = {}) {
	return page.evaluate(({ mode, tilt, image, delta, strength, focus }) => {
		const { renderer, target } = window.tilt;
		const experiment = globalThis.experiment;
		experiment.zoom = experiment.zooms[mode];
		const pixels = (clear) => {
			experiment.clear = clear;
			if (!renderer.draw(target, tilt, strength, focus)) throw new Error('draw failed');
			return target.getContext('2d').getImageData(0, 0, target.width, target.height).data;
		};
		const black = pixels([0, 0, 0, 1]);
		const magenta = pixels([1, 0, 1, 1]);
		const { width, height } = target;
		const band = { left: 0, right: 0, top: 0, bottom: 0 };
		let uncovered = 0;
		for (let index = 0; index < black.length; index += 4) {
			if (black[index] === magenta[index] && black[index + 2] === magenta[index + 2]) continue;
			uncovered++;
			const pixel = index / 4;
			const x = pixel % width;
			const y = Math.floor(pixel / width);
			if (x < width / 2) band.left = Math.max(band.left, x + 1);
			else band.right = Math.max(band.right, width - x);
			if (y < height / 2) band.top = Math.max(band.top, y + 1);
			else band.bottom = Math.max(band.bottom, height - y);
		}
		const result = { tilt, zoom: 1 + 2 * strength * Math.max(focus, 1 - focus) * experiment.zoom(tilt), uncovered, uncoveredPct: uncovered / (width * height) * 100, band };
		if (delta && window.tilt.previous) {
			const previous = window.tilt.previous;
			let sum = 0;
			let over = 0;
			for (let index = 0; index < black.length; index += 4) {
				const d = Math.max(Math.abs(black[index] - previous[index]), Math.abs(black[index + 1] - previous[index + 1]), Math.abs(black[index + 2] - previous[index + 2]));
				sum += d;
				if (d > 24) over++;
			}
			result.stepMean = sum / (width * height);
			result.stepOver24Pct = over / (width * height) * 100;
		}
		window.tilt.previous = delta ? black : null;
		if (image) {
			experiment.clear = [1, 0, 1, 1];
			renderer.draw(target, tilt, strength, focus);
			result.png = target.toDataURL('image/png');
		}
		return result;
	}, { mode, tilt, image, delta, strength: config.effectiveStrength, focus: config.focus });
}

try {
	for (const photo of manifest.photos) {
		await open();
		report.browser = browser.version();
		await setup(photo);
		const record = { stem: photo.stem, slug: photo.slug, rest: {}, views: {}, paths: {} };
		for (const texture of TEXTURES) {
			await load(texture);
			for (const mode of ['fixed', 'max']) {
				const { png, ...rest } = await frame(mode, VIEWS.neutral, { image: true });
				assert.equal(rest.uncovered, 0, `${photo.stem} rest uncovered`);
				record.rest[`t${texture}-${mode}`] = rest;
				await save(`${photo.stem}/rest/t${texture}-${mode}.png`, png);
			}
		}
		await load(config.textureSize);
		for (const mode of MODES) {
			record.views[mode] = {};
			for (const [view, tilt] of Object.entries(VIEWS)) {
				const { png, ...result } = await frame(mode, tilt, { image: true });
				record.views[mode][view] = result;
				await save(`${photo.stem}/views/${mode}/${view}.png`, png);
			}
			record.paths[mode] = {};
			for (const [name, tilts] of Object.entries(PATHS)) {
				const frames = [];
				for (const tilt of tilts) frames.push(await frame(mode, tilt, { delta: true }));
				record.paths[mode][name] = frames;
				await page.evaluate(() => { window.tilt.previous = null; });
			}
		}
		report.photos.push(record);
		await browser.close();
		console.log(photo.stem);
	}
	assert.deepEqual(errors, []);
	await writeFile(join(out, 'capture.json'), JSON.stringify(report, null, '\t') + '\n');
} finally {
	await browser?.close();
}
