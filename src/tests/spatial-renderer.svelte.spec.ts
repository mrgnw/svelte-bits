import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquireRenderer, type Renderer } from '#lib/spatial-renderer.ts';

const SIZE = 64;
const events = { onlost: () => {}, onrestored: () => {}, onerror: () => {} };

function dataUrl(paint: (context: CanvasRenderingContext2D) => void): string {
	const canvas = document.createElement('canvas');
	canvas.width = SIZE;
	canvas.height = SIZE;
	paint(canvas.getContext('2d')!);
	return canvas.toDataURL('image/png');
}

const photo = dataUrl((context) => {
	for (let x = 0; x < SIZE; x += 8) {
		context.fillStyle = x % 16 === 0 ? '#f00' : '#00f';
		context.fillRect(x, 0, 8, SIZE);
	}
});

const depth = dataUrl((context) => {
	const gradient = context.createLinearGradient(0, 0, SIZE, 0);
	gradient.addColorStop(0, '#000');
	gradient.addColorStop(1, '#fff');
	context.fillStyle = gradient;
	context.fillRect(0, 0, SIZE, SIZE);
});

const green = dataUrl((context) => {
	context.fillStyle = '#0f0';
	context.fillRect(0, 0, SIZE, SIZE);
});

const broken = 'data:image/png;base64,AAAA';

function target(size = SIZE): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.style.width = `${size}px`;
	canvas.style.height = `${size}px`;
	document.body.append(canvas);
	return canvas;
}

function pixels(canvas: HTMLCanvasElement): Uint8ClampedArray {
	return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
}

function acquire(handlers = events): Renderer {
	const renderer = acquireRenderer(handlers);
	if (renderer instanceof Error) throw renderer;
	held.push(renderer);
	return renderer;
}

const held: Renderer[] = [];

function captureContext(): () => WebGLRenderingContext {
	let captured: WebGLRenderingContext | undefined;
	const original = WebGLRenderingContext.prototype.getExtension;
	vi.spyOn(WebGLRenderingContext.prototype, 'getExtension').mockImplementation(function (
		this: WebGLRenderingContext,
		...args: unknown[]
	) {
		captured = this;
		return Reflect.apply(original, this, args);
	} as typeof original);
	return () => captured!;
}

function stubParameter(name: number, value: number) {
	const original = WebGLRenderingContext.prototype.getParameter;
	vi.spyOn(WebGLRenderingContext.prototype, 'getParameter').mockImplementation(function (
		this: WebGLRenderingContext,
		pname: number,
	) {
		return pname === name ? value : original.call(this, pname);
	});
}

afterEach(() => {
	vi.restoreAllMocks();
	for (const renderer of held.splice(0)) renderer.release();
	document.body.replaceChildren();
});

describe('spatial renderer', () => {
	it('draws a different frame at full tilt than at neutral', async () => {
		const renderer = acquire();
		await renderer.load({ src: photo, depth }, 64, new AbortController().signal);
		const canvas = target();

		expect(renderer.draw(canvas, { x: 0, y: 0 }, 0.2, 0.5)).toBe(true);
		const neutral = pixels(canvas);
		expect(renderer.draw(canvas, { x: 1, y: 0 }, 0.2, 0.5)).toBe(true);
		const tilted = pixels(canvas);

		expect(neutral.some((value, i) => value !== tilted[i])).toBe(true);
		expect(neutral.some((value, i) => i % 4 === 0 && value > 200)).toBe(true);
	});

	it('does not draw before a scene is loaded', () => {
		expect(acquire().draw(target(), { x: 0, y: 0 }, 0.08, 0.5)).toBe(false);
	});

	it('rejects a failed load', async () => {
		await expect(acquire().load({ src: broken, depth }, 64, new AbortController().signal)).rejects.toThrow(
			`SpatialImage: could not load ${broken}`,
		);
	});

	it('rejects an aborted load with the abort reason', async () => {
		const controller = new AbortController();
		const loading = acquire().load({ src: photo, depth }, 64, controller.signal);
		controller.abort();
		await expect(loading).rejects.toThrow(DOMException);
	});

	it('frees the program after the last release and builds a new one on acquire', async () => {
		const first = acquireRenderer(events);
		const second = acquireRenderer(events);
		if (first instanceof Error || second instanceof Error) throw new Error('no WebGL');
		const program = first.program;
		expect(program).not.toBeNull();

		first.release();
		expect(second.program).toBe(program);
		second.release();
		expect(second.program).toBeNull();

		const next = acquire();
		expect(next.program).not.toBeNull();
		expect(next.program).not.toBe(program);
		await next.load({ src: photo, depth }, 64, new AbortController().signal);
		expect(next.draw(target(), { x: 0, y: 0 }, 0.08, 0.5)).toBe(true);
	});

	it('draws two instances with different scenes and sizes', async () => {
		const stripes = acquire();
		const solid = acquire();
		await stripes.load({ src: photo, depth }, 64, new AbortController().signal);
		await solid.load({ src: green, depth }, 64, new AbortController().signal);
		const large = target(SIZE);
		const small = target(SIZE / 2);

		expect(stripes.draw(large, { x: 0, y: 0 }, 0.08, 0.5)).toBe(true);
		expect(solid.draw(small, { x: 0, y: 0 }, 0.08, 0.5)).toBe(true);
		expect(stripes.draw(large, { x: 0, y: 0 }, 0.08, 0.5)).toBe(true);

		expect(small.width).toBe(large.width / 2);
		const greens = pixels(small);
		for (let i = 0; i < greens.length; i += 4) expect(greens[i + 1]).toBeGreaterThan(200);
		expect(pixels(large).some((value, i) => i % 4 === 0 && value > 200)).toBe(true);
	});

	it('keeps the old scene when a load is aborted mid-way', async () => {
		const renderer = acquire();
		await renderer.load({ src: green, depth }, 64, new AbortController().signal);
		const controller = new AbortController();
		const loading = renderer.load({ src: photo, depth }, 64, controller.signal);
		controller.abort();
		await expect(loading).rejects.toThrow(DOMException);
		const canvas = target();
		expect(renderer.draw(canvas, { x: 0, y: 0 }, 0.08, 0.5)).toBe(true);
		expect(pixels(canvas)[1]).toBeGreaterThan(200);
	});

	it('ignores a second release and stays quiet after release', async () => {
		const first = acquire();
		const second = acquire();
		await first.load({ src: photo, depth }, 64, new AbortController().signal);
		first.release();
		first.release();
		expect(second.program).not.toBeNull();
		expect(first.draw(target(), { x: 0, y: 0 }, 0.08, 0.5)).toBe(false);
		await expect(first.load({ src: photo, depth }, 64, new AbortController().signal)).rejects.toThrow(
			expect.objectContaining({ name: 'AbortError' }),
		);
	});

	it('rejects a load that finishes after release with an AbortError', async () => {
		const renderer = acquire();
		const loading = renderer.load({ src: photo, depth }, 64, new AbortController().signal);
		renderer.release();
		await expect(loading).rejects.toThrow(expect.objectContaining({ name: 'AbortError' }));
	});

	it('drops the scene on context loss and rebuilds on restore', async () => {
		const gl = captureContext();
		const onlost = vi.fn();
		const onrestored = vi.fn();
		const renderer = acquire({ onlost, onrestored, onerror: () => {} });
		await renderer.load({ src: photo, depth }, 64, new AbortController().signal);
		const lose = gl().getExtension('WEBGL_lose_context')!;

		lose.loseContext();
		await expect.poll(() => onlost.mock.calls.length).toBe(1);
		expect(renderer.draw(target(), { x: 0, y: 0 }, 0.08, 0.5)).toBe(false);

		lose.restoreContext();
		await expect.poll(() => onrestored.mock.calls.length).toBe(1);
		expect(renderer.program).not.toBeNull();
		await renderer.load({ src: photo, depth }, 64, new AbortController().signal);
		expect(renderer.draw(target(), { x: 0, y: 0 }, 0.08, 0.5)).toBe(true);
	});

	it('reports a failed rebuild after restore through onerror', async () => {
		const gl = captureContext();
		const onerror = vi.fn();
		const onlost = vi.fn();
		const onrestored = vi.fn();
		acquire({ onlost, onrestored, onerror });
		const lose = gl().getExtension('WEBGL_lose_context')!;
		lose.loseContext();
		await expect.poll(() => onlost.mock.calls.length).toBe(1);
		vi.spyOn(WebGLRenderingContext.prototype, 'getShaderParameter').mockReturnValue(false);
		lose.restoreContext();
		await expect.poll(() => onerror.mock.calls.length).toBe(1);
		expect(onerror.mock.calls[0][0]).toBeInstanceOf(Error);
		expect(onrestored).not.toHaveBeenCalled();
	});

	it('clamps the output and texture size to the GL limits', async () => {
		const LIMIT = 16;
		stubParameter(WebGLRenderingContext.MAX_TEXTURE_SIZE, LIMIT);
		const uploads: number[] = [];
		const upload = WebGLRenderingContext.prototype.texImage2D;
		vi.spyOn(WebGLRenderingContext.prototype, 'texImage2D').mockImplementation(function (
			this: WebGLRenderingContext,
			...args: unknown[]
		) {
			const source = args[5] as HTMLCanvasElement;
			uploads.push(source.width, source.height);
			return Reflect.apply(upload, this, args);
		});
		const renderer = acquire();
		await renderer.load({ src: photo, depth }, 64, new AbortController().signal);
		const canvas = target();
		expect(renderer.draw(canvas, { x: 0, y: 0 }, 0.08, 0.5)).toBe(true);
		expect(uploads).toEqual([LIMIT, LIMIT, LIMIT, LIMIT]);
		expect(canvas.width).toBe(LIMIT);
		expect(canvas.height).toBe(LIMIT);
	});

	it('throws on programmer errors', async () => {
		const renderer = acquire();
		const signal = new AbortController().signal;
		await expect(renderer.load({ src: photo, depth }, 32, signal)).rejects.toThrow('textureSize 32');
		expect(() => renderer.draw(target(), { x: Number.NaN, y: 0 }, 0.08, 0.5)).toThrow('tilt must be finite');
	});
});

describe('two layers', () => {
	const square = (inside: string, outside: string) =>
		dataUrl((context) => {
			context.fillStyle = outside;
			context.fillRect(0, 0, SIZE, SIZE);
			context.fillStyle = inside;
			context.fillRect(16, 16, 32, 32);
		});
	const subject = square('#f00', '#00f');
	const subjectDepth = square('#fff', '#000');
	const flatDepth = dataUrl((context) => {
		context.fillStyle = '#000';
		context.fillRect(0, 0, SIZE, SIZE);
	});
	const magenta = dataUrl((context) => {
		context.fillStyle = '#f0f';
		context.fillRect(0, 0, SIZE, SIZE);
	});

	async function frame(back: string | undefined, tilt: { x: number; y: number }): Promise<Uint8ClampedArray> {
		const renderer = acquire();
		const sources = back ? { src: subject, depth: subjectDepth, back, backDepth: flatDepth } : { src: subject, depth: subjectDepth };
		await renderer.load(sources, 64, new AbortController().signal);
		const canvas = target(256);
		expect(renderer.draw(canvas, tilt, 0.06, 0)).toBe(true);
		return pixels(canvas);
	}

	function row(data: Uint8ClampedArray, y: number): number[][] {
		return Array.from({ length: 256 }, (_, x) => Array.from(data.subarray((y * 256 + x) * 4, (y * 256 + x) * 4 + 3)));
	}

	function differing(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
		let count = 0;
		for (let i = 0; i < a.length; i += 4) {
			if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 24) count++;
		}
		return count;
	}

	it('fills the revealed gap from the back layer instead of stretching the subject', async () => {
		const tilt = { x: 1, y: 0 };
		const overGreen = row(await frame(green, tilt), 128);
		const overMagenta = row(await frame(magenta, tilt), 128);
		const revealed = overGreen.filter((pixel, x) => pixel.some((value, c) => Math.abs(value - overMagenta[x][c]) > 24));
		expect(revealed.length).toBeGreaterThanOrEqual(10);
		expect(revealed.length).toBeLessThanOrEqual(96);
		const backOnly = revealed.filter(([r, g, b]) => g > 200 && r < 40 && b < 40);
		expect(backOnly.length).toBeGreaterThanOrEqual(8);
	});

	it('matches the single-layer render at neutral tilt', async () => {
		const neutral = { x: 0, y: 0 };
		const layered = await frame(green, neutral);
		const single = await frame(undefined, neutral);
		expect(differing(layered, single) / (256 * 256)).toBeLessThan(0.005);
	});

	it('requires back and backDepth together', async () => {
		const signal = new AbortController().signal;
		await expect(acquire().load({ src: subject, depth: subjectDepth, back: green }, 64, signal)).rejects.toThrow(
			'back and backDepth must be set together',
		);
	});
});
