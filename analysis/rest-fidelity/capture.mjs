import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { create, freshDir } from './scratch.mjs';
import { stripTypeScriptTypes, createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const baseline = resolve(process.env.SPATIAL_BASELINE ?? '/Volumes/wd/cache/spatial-maker/research/51-baseline/2026-11-16');
const out = await freshDir('REST_FIDELITY');
const bits = resolve(process.env.SVELTE_BITS_ROOT ?? '/Users/m/dev/svelte-bits');
const PINNED = '75fde16ae8e78aeefe909a21c78791c9f4a94092';
const { chromium } = createRequire(join(bits, 'package.json'))('playwright');
const manifest = JSON.parse(await readFile(join(baseline, 'inputs.json'), 'utf8'));
const config = manifest.config;
const origin = 'http://rest.test';
const digest = (data) => createHash('sha256').update(data).digest('hex');
for (const [name, info] of Object.entries(manifest.files)) {
	assert.equal(digest(await readFile(join(baseline, name))), info.sha256, `input changed: ${name}`);
}
const libHashes = {};
for (const name of ['spatial-renderer', 'spatial-mesh', 'spatial-tilt']) {
	const pinned = execFileSync('git', ['-C', bits, 'show', `${PINNED}:src/lib/${name}.ts`]);
	const snapshot = await readFile(join(baseline, 'lib', `${name}.ts`));
	assert(pinned.equals(snapshot), `${name}.ts snapshot differs from ${PINNED}`);
	libHashes[name] = digest(snapshot);
}

const ZOOMS = { overscan: config.effectiveStrength, none: 0 };
const TEXTURES = [config.textureSize, 1400];
const PATHS = ['composite', 'front', 'quad', 'canvas'];

const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1600 }, deviceScaleFactor: config.deviceScaleFactor });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.route('**/*', async (route) => {
	const url = new URL(route.request().url());
	if (url.origin !== origin) return route.abort();
	if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body style="margin:0">' });
	const name = decodeURIComponent(url.pathname.slice(1));
	if (/^lib\/spatial-[a-z]+\.js$/.test(name)) {
		const source = await readFile(join(baseline, name.replace(/\.js$/, '.ts')), 'utf8');
		return route.fulfill({ contentType: 'text/javascript', body: stripTypeScriptTypes(source) });
	}
	if (!Object.hasOwn(manifest.files, name)) {
		errors.push(`unlisted asset: ${name}`);
		return route.abort();
	}
	return route.fulfill({ contentType: name.endsWith('.avif') ? 'image/avif' : 'image/png', body: await readFile(join(baseline, name)) });
});

const report = { browser: browser.version(), node: process.version, pinned: PINNED, libHashes, zooms: ZOOMS, textures: TEXTURES, paths: PATHS, files: {} };

async function save(name, data) {
	const content = Buffer.from(data.split(',')[1], 'base64');
	await create(out, name, content);
	report.files[name] = { bytes: content.length, sha256: digest(content) };
}

async function setup(photo) {
	await page.evaluate(async ({ photo, config }) => {
		const { acquireRenderer } = await import('/lib/spatial-renderer.js');
		const mesh = await import('/lib/spatial-mesh.js');
		const image = new Image();
		image.src = `/assets/${photo.files.src}`;
		await image.decode();
		const target = document.createElement('canvas');
		target.style.cssText = `width:${config.cssWidth}px;height:${Math.round(config.cssWidth * photo.height / photo.width)}px`;
		document.body.replaceChildren(target);
		const renderer = acquireRenderer({ onlost() {}, onrestored() {}, onerror(error) { throw error; } });
		if (renderer instanceof Error) throw renderer;
		const sources = { src: `/assets/${photo.files.src}`, depth: `/assets/${photo.files.depth}`, back: `/assets/${photo.files.back}`, backDepth: `/assets/${photo.files.backDepth}` };
		const front = { src: sources.src, depth: sources.depth };
		window.rest = { renderer, mesh, image, target, sources, front };
	}, { photo, config });
}

async function render(path, texture, strength) {
	return page.evaluate(async ({ path, texture, strength, focus }) => {
		const { renderer, mesh, image, target, sources, front } = window.rest;
		if (path === 'composite' || path === 'front') {
			await renderer.load(path === 'composite' ? sources : front, texture, AbortSignal.timeout(30000));
			if (!renderer.draw(target, { x: 0, y: 0 }, strength, focus)) throw new Error('draw failed');
			return target.toDataURL('image/png');
		}
		const { width, height } = target;
		const size = mesh.textureSize(image.naturalWidth, image.naturalHeight, texture);
		const shrunk = document.createElement('canvas');
		shrunk.width = size.width;
		shrunk.height = size.height;
		shrunk.getContext('2d').drawImage(image, 0, 0, size.width, size.height);
		const scale = mesh.coverScale(image.naturalWidth / image.naturalHeight, width / height, strength, focus);
		const output = document.createElement('canvas');
		output.width = width;
		output.height = height;
		if (path === 'canvas') {
			const sw = size.width / scale.x;
			const sh = size.height / scale.y;
			output.getContext('2d').drawImage(shrunk, (size.width - sw) / 2, (size.height - sh) / 2, sw, sh, 0, 0, width, height);
			return output.toDataURL('image/png');
		}
		const gl = document.createElement('canvas').getContext('webgl', { alpha: false, antialias: false });
		gl.canvas.width = width;
		gl.canvas.height = height;
		const compile = (type, source) => {
			const shader = gl.createShader(type);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
			return shader;
		};
		const program = gl.createProgram();
		gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 p; uniform vec2 scale; varying vec2 uv; void main() { uv = p; gl_Position = vec4((0.5 + (p - 0.5) * scale) * 2.0 - 1.0, 0.0, 1.0); }'));
		gl.attachShader(program, compile(gl.FRAGMENT_SHADER, 'precision highp float; uniform sampler2D photo; varying vec2 uv; void main() { gl_FragColor = texture2D(photo, uv); }'));
		gl.linkProgram(program);
		gl.useProgram(program);
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.uniform2f(gl.getUniformLocation(program, 'scale'), scale.x, scale.y);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, shrunk);
		gl.viewport(0, 0, width, height);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		output.getContext('2d').drawImage(gl.canvas, 0, 0);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
		return output.toDataURL('image/png');
	}, { path, texture, strength, focus: config.focus });
}

async function references() {
	return page.evaluate(({ strength, focus }) => {
		const { mesh, image, target } = window.rest;
		const { width, height } = target;
		const draw = (quality, zoom, invert) => {
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext('2d');
			context.imageSmoothingQuality = quality;
			const scale = zoom === null ? { x: 1, y: 1 } : mesh.coverScale(image.naturalWidth / image.naturalHeight, width / height, zoom, focus);
			const sw = image.naturalWidth / scale.x;
			const sh = image.naturalHeight / scale.y;
			context.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, 0, 0, width, height);
			if (invert) {
				context.globalCompositeOperation = 'difference';
				context.fillStyle = 'white';
				context.fillRect(0, 0, width, height);
			}
			return canvas.toDataURL('image/png');
		};
		return {
			plain: draw('low', null, false),
			'plain-repeat': draw('low', null, false),
			'plain-high': draw('high', null, false),
			inverted: draw('low', null, true),
			'framed-none': draw('low', 0, false),
			'framed-overscan': draw('low', strength, false),
			'framed-overscan-inverted': draw('low', strength, true),
		};
	}, { strength: config.effectiveStrength, focus: config.focus });
}

try {
	await page.goto(origin);
	report.photos = [];
	for (const photo of manifest.photos) {
		await setup(photo);
		await page.evaluate(({ texture, strength, focus }) => window.rest.renderer.load(window.rest.sources, texture, AbortSignal.timeout(30000)).then(() => window.rest.renderer.draw(window.rest.target, { x: 0, y: 0 }, strength, focus)), { texture: config.textureSize, strength: config.effectiveStrength, focus: config.focus });
		for (const [name, data] of Object.entries(await references())) await save(`${photo.stem}/ref/${name}.png`, data);
		for (const path of PATHS) {
			for (const texture of TEXTURES) {
				for (const [zoom, strength] of Object.entries(ZOOMS)) {
					await save(`${photo.stem}/${path}/t${texture}-${zoom}.png`, await render(path, texture, strength));
				}
			}
		}
		const size = await page.evaluate(() => ({ width: window.rest.target.width, height: window.rest.target.height }));
		report.photos.push({ stem: photo.stem, slug: photo.slug, ...size });
		await page.evaluate(() => window.rest.renderer.release());
		console.log(photo.stem, size);
	}
	assert.deepEqual(errors, []);
	await create(out, 'capture.json', JSON.stringify(report, null, '\t') + '\n');
} finally {
	await browser.close();
}
