// Records the README demo loops from the demo routes, frame by frame.
// Needs `pnpm dev --port 5290` running and ffmpeg on PATH.
//   node scripts/record-demos.mjs [tierbar|section-nav|all]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { chromium } from 'playwright';

const ORIGIN = process.env.DEMO_ORIGIN ?? 'http://localhost:5290';
const FRAMES = process.env.FRAMES_DIR ?? '/tmp/svelte-bits-frames';
const MEDIA = 'docs/media';
const W = 900;
const H = 506;
const STRIP = 44;
const FPS = 50;
const SPEED = 0.25;

const harness = `<!doctype html><html><head><style>
	* { box-sizing: border-box; }
	html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #ebe7dd;
		background-image: radial-gradient(#d9d3c4 1px, transparent 1px); background-size: 16px 16px;
		font: 15px/1 system-ui, -apple-system, sans-serif; color: #1c1917; }
	#win { position: absolute; left: 0; top: 0; height: ${H - STRIP}px; overflow: hidden; background: #f7f5f0; }
	#win.windowed { left: 14px; top: 14px; border-radius: 10px; border: 1px solid #d6d0c2;
		box-shadow: 0 2px 4px rgb(60 40 10 / 0.06), 0 12px 32px rgb(60 40 10 / 0.12); }
	iframe { border: 0; display: block; transform-origin: 0 0; background: #fff; }
	#handle { position: absolute; width: 8px; height: 64px; border-radius: 4px; background: #d9480f;
		box-shadow: 0 0 0 3px #f7f5f0; display: none; }
	#strip { position: absolute; left: 0; right: 0; bottom: 0; height: ${STRIP}px; display: flex; align-items: center;
		gap: 14px; padding: 0 18px; background: #1c1917; color: #ede9e1; }
	#name { font: 700 19px/1 'Iowan Old Style', Palatino, Georgia, serif; letter-spacing: -0.01em; }
	#text { font: 500 14px/1 ui-monospace, 'SF Mono', Menlo, monospace; color: #a39d92; white-space: pre; }
	#text b { color: #ff8a4c; font-weight: 600; }
	#cursor { position: absolute; left: 0; top: 0; width: 22px; height: 22px; pointer-events: none;
		filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.35)); }
	#ring { position: absolute; left: -15px; top: -15px; width: 30px; height: 30px; border-radius: 50%;
		background: rgb(217 72 15 / 0.22); border: 2px solid rgb(217 72 15 / 0.7); opacity: 0; }
	#cursor.down #ring { opacity: 1; }
</style></head><body>
	<div id="win"><iframe id="frame"></iframe></div>
	<div id="handle"></div>
	<div id="strip"><span id="name"></span><span id="text"></span></div>
	<div id="cursor"><div id="ring"></div><svg width="22" height="22" viewBox="0 0 22 22">
		<path d="M3 2 L3 18 L7.5 14 L10.5 20.5 L13.2 19.3 L10.3 13 L16.5 13 Z" fill="#1c1917" stroke="#fff"
			stroke-width="1.6" stroke-linejoin="round"/></svg></div>
</body></html>`;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a, b, t) => a + (b - a) * t;

class Recorder {
	constructor(page, dir) {
		this.page = page;
		this.dir = dir;
		this.n = 0;
		this.cursor = { x: W + 40, y: H - 120, down: false };
		this.marks = {};
	}

	mark(name) {
		this.marks[name] = this.n;
	}

	async frame() {
		await this.page.evaluate(({ x, y, down }) => {
			const el = document.getElementById('cursor');
			el.style.translate = `${x}px ${y}px`;
			el.classList.toggle('down', down);
		}, this.cursor);
		await this.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
		this.n += 1;
		await this.page.screenshot({ path: `${this.dir}/${String(this.n).padStart(5, '0')}.png` });
	}

	async hold(seconds, each = async () => {}) {
		for (let i = 0; i < Math.round(seconds * FPS); i++) {
			await each();
			await this.frame();
		}
	}

	async tween(seconds, step) {
		const frames = Math.round(seconds * FPS);
		for (let i = 1; i <= frames; i++) {
			await step(ease(i / frames), i / frames);
			await this.frame();
		}
	}

	async glide(seconds, x, y, during = async () => {}) {
		const from = { ...this.cursor };
		await this.tween(seconds, async (t) => {
			this.cursor.x = lerp(from.x, x, t);
			this.cursor.y = lerp(from.y, y, t);
			if (this.cursor.down) await this.page.mouse.move(this.cursor.x, this.cursor.y);
			await during(t);
		});
	}

	async press(down) {
		this.cursor.down = down;
		await this.page.mouse.move(this.cursor.x, this.cursor.y);
		await (down ? this.page.mouse.down() : this.page.mouse.up());
	}
}

async function open(browser, path, { windowed, width, height, scale = 1, css = '' }) {
	const page = await browser.newPage({
		viewport: { width: W, height: H },
		deviceScaleFactor: 2,
		colorScheme: 'light',
	});
	await page.route(`${ORIGIN}/__record`, (route) => route.fulfill({ contentType: 'text/html', body: harness }));
	await page.goto(`${ORIGIN}/__record`);
	await page.evaluate(
		({ path, windowed, width, height, scale }) => {
			const frame = document.getElementById('frame');
			document.getElementById('win').classList.toggle('windowed', windowed);
			frame.style.width = `${width}px`;
			frame.style.height = `${height}px`;
			frame.style.transform = `scale(${scale})`;
			frame.src = path;
		},
		{ path, windowed, width, height, scale },
	);
	const inner = await (await page.$('#frame')).contentFrame();
	await inner.waitForURL(`${ORIGIN}${path}`);
	await inner.waitForSelector('main');
	await page.waitForLoadState('networkidle');
	if (css) await inner.addStyleTag({ content: css });
	await inner.evaluate(() => document.fonts.ready);
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Animation.enable');
	await cdp.send('Animation.setPlaybackRate', { playbackRate: SPEED });
	return { page, inner };
}

const strip = (page, name, html) =>
	page.evaluate(
		({ name, html }) => {
			document.getElementById('name').textContent = name;
			document.getElementById('text').innerHTML = html;
		},
		{ name, html },
	);

async function tierbar(browser, dir) {
	const { page, inner } = await open(browser, '/', { windowed: false, width: W, height: H - STRIP });
	await inner.evaluate(() => {
		const bench = document.querySelector('.bench');
		window.scrollTo(0, bench.getBoundingClientRect().top + window.scrollY - 52);
		document.querySelector('.hero')?.setAttribute('aria-hidden', 'true');
	});
	await page.locator("#win").evaluate((el, w) => (el.style.width = `${w}px`), W);
	const rec = new Recorder(page, dir);
	const slider = page.frameLocator('#frame').locator('.bench input[type=range]').first();
	const box = await slider.boundingBox();
	const thumbX = async () =>
		inner.evaluate(() => {
			const input = document.querySelector('.bench input[type=range]');
			const r = input.getBoundingClientRect();
			const t = (input.valueAsNumber - Number(input.min)) / (Number(input.max) - Number(input.min));
			return r.left + 8 + t * (r.width - 16);
		});
	const xFor = (px) => box.x + 8 + ((px - 240) / 760) * (box.width - 16);
	const y = box.y + box.height / 2;
	const caption = async () => {
		const { tier, counts } = await inner.evaluate(() => {
			const counts = { inline: 0, icon: 0, menu: 0 };
			for (const li of document.querySelector('.modes').querySelectorAll('li')) {
				const mode = [...li.classList].find((c) => c.startsWith('mode-'))?.slice(5);
				if (mode in counts) counts[mode] += 1;
			}
			const tier = document.querySelector('.ladder li.on b')?.textContent ?? '0';
			return { tier, counts };
		});
		const width = await inner.evaluate(() => document.querySelector('.bench .size').textContent);
		await strip(
			page,
			'TierBar',
			`tier <b>${tier}</b>  ${width.padStart(5)}   labels <b>${counts.inline}</b>  icons <b>${counts.icon}</b>  in menu <b>${counts.menu}</b>`,
		);
	};
	await caption();
	rec.cursor = { x: W - 120, y: H - 40, down: false };
	await rec.glide(0.6, await thumbX(), y, caption);
	await rec.press(true);
	await rec.glide(2.4, xFor(290), y, caption);
	await rec.press(false);
	await rec.hold(0.3, caption);
	const more = page.frameLocator('#frame').locator('.bench button[popovertarget]:visible').first();
	const mb = await more.boundingBox();
	await rec.glide(0.5, mb.x + mb.width / 2, mb.y + mb.height / 2, caption);
	await rec.press(true);
	await rec.hold(0.08, caption);
	await rec.press(false);
	await rec.hold(0.9, caption);
	rec.mark('hero');
	await rec.glide(0.5, await thumbX(), y, caption);
	await rec.press(true);
	await rec.press(false);
	await rec.press(true);
	await rec.glide(1.2, xFor(700), y, caption);
	await rec.press(false);
	await rec.glide(0.5, W - 120, H - 40, caption);
	await page.close();
	return rec.marks;
}

async function sectionNav(browser, dir) {
	const wide = 1100;
	const scale = (W - 28) / wide;
	const tall = Math.round((H - STRIP - 28) / scale);
	const css = `html { font-size: 18px; --nav-muted: rgb(28 25 23 / 0.42); }
		body { background: #fffdf9; color: #1c1917; }`;
	const { page, inner } = await open(browser, '/section-nav', { windowed: true, width: wide, height: tall, scale, css });
	const rec = new Recorder(page, dir);
	const setWidth = (cssWidth) =>
		page.evaluate(
			({ cssWidth, scale, top, height }) => {
				const frame = document.getElementById('frame');
				const win = document.getElementById('win');
				frame.style.width = `${cssWidth}px`;
				win.style.width = `${cssWidth * scale + 2}px`;
				const handle = document.getElementById('handle');
				handle.style.display = 'block';
				handle.style.left = `${14 + cssWidth * scale - 4}px`;
				handle.style.top = `${top + height / 2 - 32}px`;
			},
			{ cssWidth, scale, top: 14, height: H - STRIP - 28 },
		);
	const handleAt = (cssWidth) => ({ x: 14 + cssWidth * scale, y: 14 + (H - STRIP - 28) / 2 });
	const caption = async () => {
		const state = await inner.evaluate(() => {
			const width = window.innerWidth;
			const current = document.querySelector('[aria-current="true"], [aria-current="location"]');
			return { width, current: current?.textContent.trim() ?? '' };
		});
		const layout = state.width >= 1024 ? 'sidebar' : 'mobile bar';
		await strip(
			page,
			'SectionNav',
			`${String(state.width).padStart(4)}px  <b>${layout}</b>   reading <b>${state.current}</b>`,
		);
	};
	await setWidth(wide);
	await caption();
	const wheelAt = { x: 14 + 620 * scale, y: 200 };
	rec.cursor = { x: W - 60, y: H - 40, down: false };
	await rec.glide(0.3, wheelAt.x, wheelAt.y, caption);
	await page.mouse.move(wheelAt.x, wheelAt.y);
	const scrollBy = async (total, seconds) => {
		let done = 0;
		await rec.tween(seconds, async (t) => {
			const target = Math.round(total * t);
			if (target !== done) await page.mouse.wheel(0, target - done);
			done = target;
			await caption();
		});
	};
	await scrollBy(1500, 1.6);
	await rec.hold(0.1, caption);
	const grab = handleAt(wide);
	await rec.glide(0.4, grab.x, grab.y, caption);
	rec.cursor.down = true;
	const narrow = 620;
	await rec.tween(1.1, async (t) => {
		const cssWidth = Math.round(lerp(wide, narrow, t));
		await setWidth(cssWidth);
		rec.cursor.x = handleAt(cssWidth).x;
		await caption();
	});
	rec.cursor.down = false;
	await rec.glide(0.25, 14 + 400 * scale, 200, caption);
	await page.mouse.move(rec.cursor.x, rec.cursor.y);
	await scrollBy(600, 0.5);
	const bar = page.frameLocator('#frame').locator('button.bar');
	const bb = await bar.boundingBox();
	await rec.glide(0.35, bb.x + bb.width * 0.3, bb.y + bb.height / 2, caption);
	await rec.press(true);
	await rec.hold(0.06, caption);
	await rec.press(false);
	await rec.hold(0.85, caption);
	rec.mark('hero');
	await rec.press(true);
	await rec.hold(0.06, caption);
	await rec.press(false);
	await rec.hold(0.1, caption);
	await rec.glide(0.35, handleAt(narrow).x, handleAt(narrow).y, caption);
	rec.cursor.down = true;
	await rec.tween(0.8, async (t) => {
		const cssWidth = Math.round(lerp(narrow, wide, t));
		await setWidth(cssWidth);
		rec.cursor.x = handleAt(cssWidth).x;
		await caption();
	});
	rec.cursor.down = false;
	await rec.glide(0.2, wheelAt.x, wheelAt.y, caption);
	await page.mouse.move(wheelAt.x, wheelAt.y);
	const top = await inner.evaluate(() => window.scrollY);
	await scrollBy(-top, 0.7);
	await rec.glide(0.15, W - 60, H - 40, caption);
	await page.close();
	return rec.marks;
}

const ff = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

function encode(name, inputs, fade = 0.5) {
	const filter = [];
	let last = '[0:v]';
	let offset = 0;
	inputs.forEach((input, i) => {
		filter.push(`[${i}:v]trim=end_frame=${input.end ?? 99999},setpts=PTS-STARTPTS[s${i}]`);
		if (i === 0) {
			last = '[s0]';
			return;
		}
		offset += inputs[i - 1].end / FPS - fade;
		filter.push(`${last}[s${i}]xfade=transition=slideleft:duration=${fade}:offset=${offset.toFixed(3)}[x${i}]`);
		last = `[x${i}]`;
	});
	const sources = inputs.flatMap((input) => ['-framerate', String(FPS), '-i', `${input.dir}/%05d.png`]);
	const joined = `${filter.join(';')};${last}`;
	const out = `${MEDIA}/${name}`;
	ff(...sources, '-filter_complex', `${joined}format=yuv420p[v]`, '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow',
		'-crf', '20', '-movflags', '+faststart', `${out}.mp4`);
	ff('-i', `${out}.mp4`, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', `${out}.webm`);
	ff('-i', `${out}.mp4`, '-vf',
		`fps=25,scale=${W}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
		'-loop', '0', `${out}.gif`);
	for (const ext of ['gif', 'mp4', 'webm']) {
		console.log(`${out}.${ext}`, `${Math.round(statSync(`${out}.${ext}`).size / 1024)} KB`);
	}
}

async function socialPreview(browser, shots) {
	const card = (title, line, src) => `<figure><img src="${src}"><figcaption><b>${title}</b>${line}</figcaption></figure>`;
	const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
	await page.setContent(`<!doctype html><style>
		body { margin: 0; width: 1280px; height: 640px; box-sizing: border-box; padding: 62px 40px; background: #f7f5f0;
			color: #1c1917; font: 20px/1.3 system-ui, -apple-system, sans-serif; }
		header { display: flex; align-items: baseline; gap: 20px; height: 76px; }
		h1 { margin: 0; font: 700 60px/1 'Iowan Old Style', Palatino, Georgia, serif; letter-spacing: -0.03em; }
		h1 span { color: #b23a0a; }
		header p { margin: 0; color: #6b655c; }
		main { display: flex; gap: 40px; margin-top: 56px; }
		figure { margin: 0; width: 580px; }
		img { display: block; width: 580px; height: 326px; border-radius: 12px; border: 1px solid #e4dfd3;
			box-shadow: 0 2px 4px rgb(60 40 10 / 0.05), 0 10px 28px rgb(60 40 10 / 0.1); }
		figcaption { margin-top: 18px; color: #6b655c; }
		figcaption b { color: #1c1917; margin-right: 10px; font: 700 22px/1 'Iowan Old Style', Palatino, Georgia, serif; }
	</style>
	<header><h1><span>@mrgnw/</span>svelte-bits</h1><p>Svelte 5 · responsive navigation</p></header>
	<main>${card('TierBar', 'labels → icons → menu, by its own width', shots[0])}${card('SectionNav', 'sidebar → mobile bar, tracks the reader', shots[1])}</main>`);
	await page.evaluate(() => document.fonts.ready);
	await page.screenshot({ path: `${MEDIA}/social-preview.png` });
	await page.close();
}

const frameCount = (dir) => Number(execFileSync('sh', ['-c', `ls ${dir} | wc -l`]).toString().trim());

const which = process.argv[2] ?? 'all';
const marks = {};
const scenes = { tierbar, 'section-nav': sectionNav };
const browser = await chromium.launch({ args: ['--disable-smooth-scrolling', '--hide-scrollbars'] });
for (const [name, scene] of Object.entries(scenes)) {
	if (which !== 'all' && which !== name) continue;
	const dir = `${FRAMES}/${name}`;
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	marks[name] = await scene(browser, dir);
	console.log(name, frameCount(dir), 'frames');
}
if (which === 'all') {
	const shot = (name) =>
		`data:image/png;base64,${readFileSync(`${FRAMES}/${name}/${String(marks[name].hero).padStart(5, '0')}.png`).toString('base64')}`;
	await socialPreview(browser, [shot('tierbar'), shot('section-nav')]);
	console.log(`${MEDIA}/social-preview.png`);
}
await browser.close();

for (const name of Object.keys(scenes)) {
	if (which !== 'all' && which !== name) continue;
	encode(name, [{ dir: `${FRAMES}/${name}` }]);
}
if (which === 'all') {
	const tb = `${FRAMES}/tierbar`;
	const sn = `${FRAMES}/section-nav`;
	encode('hero', [
		{ dir: tb, end: marks.tierbar.hero },
		{ dir: sn, end: marks['section-nav'].hero },
	]);
}
