import type { ComponentProps } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cdp, page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Fixture from './SpatialImageFixture.svelte';

const SIZE = 64;

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

const broken = 'data:image/png;base64,AAAA';

const square = dataUrl((context) => {
	context.fillStyle = '#000';
	context.fillRect(0, 0, SIZE, SIZE);
	context.fillStyle = '#fff';
	context.fillRect(SIZE / 4, SIZE / 4, SIZE / 2, SIZE / 2);
});

function solid(color: string): string {
	return dataUrl((context) => {
		context.fillStyle = color;
		context.fillRect(0, 0, SIZE, SIZE);
	});
}

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

function stubMotionPrompt() {
	Object.defineProperty(DeviceOrientationEvent, 'requestPermission', { value: () => Promise.resolve('granted'), configurable: true });
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const canvas = () => document.querySelector('canvas')!;
const pixels = () => canvas().getContext('2d')!.getImageData(0, 0, canvas().width, canvas().height).data;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('SpatialImage', () => {
	it('shows the canvas after onready', async () => {
		const onready = vi.fn();
		render(Fixture, { src: photo, alt: 'Stripes', depth, onready });
		expect(getComputedStyle(canvas()).visibility).toBe('hidden');
		await expect.poll(() => onready.mock.calls.length).toBe(1);
		expect(getComputedStyle(canvas()).visibility).toBe('visible');
		expect(getComputedStyle(canvas()).touchAction).toBe('pan-y');
		expect(canvas().getAttribute('aria-hidden')).toBe('true');
		await expect.element(page.getByRole('img', { name: 'Stripes' })).toBeInTheDocument();
	});

	it('changes the canvas pixels on a mouse move', async () => {
		const onready = vi.fn();
		render(Fixture, { src: photo, alt: 'Stripes', depth, strength: 0.2, scroll: 0, onready });
		await expect.poll(() => onready.mock.calls.length).toBe(1);
		const before = pixels();
		const rect = canvas().getBoundingClientRect();
		canvas().dispatchEvent(
			new PointerEvent('pointermove', { pointerType: 'mouse', clientX: rect.right - 1, clientY: rect.top + rect.height / 2, bubbles: true }),
		);
		await expect.poll(() => pixels().some((value, i) => value !== before[i])).toBe(true);
	});

	it('reloads the scene when src changes', async () => {
		const onready = vi.fn();
		const green = solid('#0f0');
		const { rerender } = render(Fixture, { src: photo, alt: 'Stripes', depth, onready });
		await expect.poll(() => onready.mock.calls.length).toBe(1);
		await rerender({ src: green });
		await expect.poll(() => pixels()[1]).toBeGreaterThan(200);
		expect(pixels()[0]).toBeLessThan(50);
	});

	it('calls onerror for a failing depth URL and keeps the image', async () => {
		const onerror = vi.fn();
		const onready = vi.fn();
		render(Fixture, { src: photo, alt: 'Stripes', depth: broken, onerror, onready });
		await expect.poll(() => onerror.mock.calls.length).toBe(1);
		expect(onerror.mock.calls[0][0]).toBeInstanceOf(Error);
		expect(onready).not.toHaveBeenCalled();
		expect(getComputedStyle(canvas()).visibility).toBe('hidden');
		await expect.element(page.getByRole('img', { name: 'Stripes' })).toBeVisible();
	});

	it('hides the old scene and stays hidden when a reload fails', async () => {
		const onready = vi.fn();
		const onerror = vi.fn();
		const { rerender } = render(Fixture, { src: photo, alt: 'Stripes', depth, onready, onerror });
		await expect.poll(() => onready.mock.calls.length).toBe(1);
		await rerender({ src: broken });
		expect(canvas().hasAttribute('data-ready')).toBe(false);
		await expect.poll(() => onerror.mock.calls.length).toBe(1);
		const rect = canvas().getBoundingClientRect();
		canvas().dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: rect.right - 1, clientY: rect.top, bubbles: true }));
		await nextFrame();
		expect(canvas().hasAttribute('data-ready')).toBe(false);
		expect(onready).toHaveBeenCalledOnce();
	});

	it('ends on the last src after rapid changes', async () => {
		const onready = vi.fn();
		const { rerender } = render(Fixture, { src: photo, alt: 'Stripes', depth, onready });
		await rerender({ src: solid('#0f0') });
		await rerender({ src: solid('#f00') });
		await rerender({ src: solid('#00f') });
		await expect.poll(() => canvas().hasAttribute('data-ready')).toBe(true);
		const [red, green, blue] = pixels();
		expect([red, green, blue]).toEqual([0, 0, 255]);
		expect(onready).toHaveBeenCalledOnce();
	});

	it('calls onready once across redraws', async () => {
		const onready = vi.fn();
		const { rerender } = render(Fixture, { src: photo, alt: 'Stripes', depth, scroll: 0, onready });
		await expect.poll(() => onready.mock.calls.length).toBe(1);
		const before = pixels();
		await rerender({ strength: 0.3, focus: 0.2, scroll: 0.5 });
		const rect = canvas().getBoundingClientRect();
		canvas().dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: rect.right - 1, clientY: rect.top, bubbles: true }));
		await expect.poll(() => pixels().some((value, i) => value !== before[i])).toBe(true);
		expect(onready).toHaveBeenCalledOnce();
	});

	it('releases the renderer on unmount and calls no onready after it', async () => {
		const deleteProgram = vi.spyOn(WebGLRenderingContext.prototype, 'deleteProgram');
		const early = vi.fn();
		render(Fixture, { src: photo, alt: 'Early', depth, onready: early }).unmount();
		expect(deleteProgram).toHaveBeenCalledOnce();
		const onready = vi.fn();
		const { unmount } = render(Fixture, { src: photo, alt: 'Stripes', depth, onready });
		await expect.poll(() => onready.mock.calls.length).toBe(1);
		expect(early).not.toHaveBeenCalled();
		unmount();
		expect(deleteProgram).toHaveBeenCalledTimes(2);
		expect(document.querySelector('canvas')).toBe(null);
	});

	it('keeps onready to one call across context loss and restore', async () => {
		const gl = captureContext();
		const onready = vi.fn();
		render(Fixture, { src: photo, alt: 'Stripes', depth, onready });
		await expect.poll(() => onready.mock.calls.length).toBe(1);
		const lose = gl().getExtension('WEBGL_lose_context')!;
		lose.loseContext();
		await expect.poll(() => canvas().hasAttribute('data-ready')).toBe(false);
		lose.restoreContext();
		await expect.poll(() => canvas().hasAttribute('data-ready')).toBe(true);
		expect(onready).toHaveBeenCalledOnce();
	});

	it('shows the flat image when depth is removed after mount', async () => {
		const onready = vi.fn();
		const { rerender } = render(Fixture, { src: photo, alt: 'Stripes', depth, onready });
		await expect.poll(() => onready.mock.calls.length).toBe(1);
		await rerender({ depth: undefined });
		expect(document.querySelector('canvas')).toBe(null);
		await expect.element(page.getByRole('img', { name: 'Stripes' })).toBeVisible();
	});

	it('passes class and other attributes to the wrapper', async () => {
		render(Fixture, { src: photo, alt: 'Stripes', class: 'framed', id: 'hero', 'data-kind': 'photo' });
		const wrapper = document.querySelector('.spatial-image')!;
		expect(wrapper.classList.contains('framed')).toBe(true);
		expect(wrapper.id).toBe('hero');
		expect(wrapper.getAttribute('data-kind')).toBe('photo');
	});

	it('renders no canvas without depth', async () => {
		render(Fixture, { src: photo, alt: 'Stripes' });
		await expect.element(page.getByRole('img', { name: 'Stripes' })).toBeVisible();
		expect(document.querySelector('canvas')).toBe(null);
	});

	it('replaces the default controls with a custom snippet', async () => {
		render(Fixture, { src: photo, alt: 'Stripes', depth, custom: true });
		await expect.element(page.getByRole('button', { name: 'Custom control' })).toBeInTheDocument();
		expect(page.getByRole('button', { name: 'Enable motion' }).query()).toBe(null);
	});

	it('hides the motion button under reduced motion', async () => {
		stubMotionPrompt();
		const session = cdp();
		await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
		try {
			render(Fixture, { src: photo, alt: 'Stripes', depth });
			await expect.poll(() => document.querySelector('canvas')).not.toBe(null);
			expect(page.getByRole('button', { name: 'Enable motion' }).query()).toBe(null);
			await session.send('Emulation.setEmulatedMedia', { features: [] });
			await expect.element(page.getByRole('button', { name: 'Enable motion' })).toBeInTheDocument();
		} finally {
			await session.send('Emulation.setEmulatedMedia', { features: [] });
			Reflect.deleteProperty(DeviceOrientationEvent, 'requestPermission');
		}
	});

	it('shows the default motion button while permission is a prompt', async () => {
		const requestPermission = vi.fn(() => Promise.resolve('granted'));
		Object.defineProperty(DeviceOrientationEvent, 'requestPermission', { value: requestPermission, configurable: true });
		try {
			render(Fixture, { src: photo, alt: 'Stripes', depth });
			await page.getByRole('button', { name: 'Enable motion' }).click();
			expect(requestPermission).toHaveBeenCalledOnce();
			await expect.element(page.getByRole('button', { name: 'Enable motion' })).not.toBeInTheDocument();
		} finally {
			Reflect.deleteProperty(DeviceOrientationEvent, 'requestPermission');
		}
	});

	it('draws a controlled tilt and ignores its own pointer input', async () => {
		const onready = vi.fn();
		const { rerender } = render(Fixture, { src: photo, alt: 'Stripes', depth, strength: 0.2, scroll: 0, tilt: { x: 0, y: 0 }, onready });
		await expect.poll(() => onready.mock.calls.length).toBe(1);
		const neutral = pixels();
		const rect = canvas().getBoundingClientRect();
		canvas().dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: rect.right - 1, clientY: rect.top, bubbles: true }));
		await nextFrame();
		await nextFrame();
		expect(pixels()).toEqual(neutral);
		await rerender({ tilt: { x: 1, y: 0 } });
		await expect.poll(() => pixels().some((value, i) => value !== neutral[i])).toBe(true);
		await rerender({ tilt: { x: 0, y: 0 } });
		await expect.poll(() => pixels()).toEqual(neutral);
	});

	it('draws the same pixels for the same controlled tilt in two instances', async () => {
		const onready = vi.fn();
		const tilt = { x: 0.7, y: -0.4 };
		render(Fixture, { src: photo, alt: 'First', depth, strength: 0.2, tilt, onready });
		render(Fixture, { src: photo, alt: 'Second', depth, strength: 0.2, tilt, onready });
		await expect.poll(() => onready.mock.calls.length).toBe(2);
		const [first, second] = document.querySelectorAll('canvas');
		const read = (target: HTMLCanvasElement) => target.getContext('2d')!.getImageData(0, 0, target.width, target.height).data;
		expect(read(first)).toEqual(read(second));
	});

	it('reports motion as unsupported and asks for nothing while controlled', async () => {
		stubMotionPrompt();
		try {
			render(Fixture, { src: photo, alt: 'Stripes', depth, tilt: { x: 0, y: 0 }, custom: true });
			await expect.element(page.getByRole('button', { name: 'Custom control' })).toHaveAttribute('data-motion', 'unsupported');
			expect(page.getByRole('button', { name: 'Enable motion' }).query()).toBe(null);
		} finally {
			Reflect.deleteProperty(DeviceOrientationEvent, 'requestPermission');
		}
	});

	it('returns to its own input when the tilt prop is removed', async () => {
		const onready = vi.fn();
		const { rerender } = render(Fixture, { src: photo, alt: 'Stripes', depth, strength: 0.2, scroll: 0, tilt: { x: 0, y: 0 }, onready });
		await expect.poll(() => onready.mock.calls.length).toBe(1);
		const neutral = pixels();
		await rerender({ tilt: undefined });
		const rect = canvas().getBoundingClientRect();
		canvas().dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: rect.right - 1, clientY: rect.top, bubbles: true }));
		await expect.poll(() => pixels().some((value, i) => value !== neutral[i])).toBe(true);
	});

	describe('view', () => {
		const layered = (): ComponentProps<typeof Fixture> => ({ src: photo, alt: 'Stripes', depth: square, back: solid('#0f0'), backDepth: solid('#000'), strength: 0.3, tilt: { x: 1, y: 0.3 } });
		const gray = (data: Uint8ClampedArray, i: number) => data[i] === data[i + 1] && data[i + 1] === data[i + 2];
		const green = (data: Uint8ClampedArray, i: number) => data[i + 1] > 200 && data[i] < 60 && data[i + 2] < 60;

		async function drawn(props: ComponentProps<typeof Fixture>) {
			const onready = vi.fn();
			const { unmount } = render(Fixture, { ...props, onready });
			await expect.poll(() => onready.mock.calls.length).toBe(1);
			const data = pixels();
			unmount();
			return data;
		}

		it('draws the same composite with and without view', async () => {
			expect(await drawn({ ...layered(), view: 'composite' })).toEqual(await drawn(layered()));
		});

		it('shows a checkerboard in the front view where the composite shows the back layer', async () => {
			const composite = await drawn(layered());
			const front = await drawn({ ...layered(), view: 'front' as const });
			const gaps = [];
			for (let i = 0; i < composite.length; i += 4) if (green(composite, i)) gaps.push(i);
			expect(gaps.length).toBeGreaterThan(0);
			expect(gaps.filter((i) => green(front, i))).toEqual([]);
			expect(gaps.filter((i) => gray(front, i)).length).toBeGreaterThan(gaps.length * 0.9);
		});

		it('draws only the back layer in the back view', async () => {
			const back = await drawn({ ...layered(), view: 'back' as const });
			for (let i = 0; i < back.length; i += 4) expect(green(back, i)).toBe(true);
		});

		it('draws the depth maps as grayscale', async () => {
			const depthView = await drawn({ ...layered(), view: 'depth' as const });
			const values = new Set<number>();
			for (let i = 0; i < depthView.length; i += 4) {
				expect(gray(depthView, i)).toBe(true);
				values.add(depthView[i]);
			}
			expect(values.size).toBeGreaterThan(1);
			const backDepth = await drawn({ ...layered(), view: 'back-depth' as const });
			for (let i = 0; i < backDepth.length; i += 4) expect(backDepth[i] + backDepth[i + 1] + backDepth[i + 2]).toBe(0);
		});
	});

	it.each([
		['strength', { strength: 0.6 }],
		['focus', { focus: -0.1 }],
		['scroll', { scroll: 2 }],
		['textureSize', { textureSize: 32 }],
		['textureSize', { textureSize: 100.5 }],
		['src', { src: '' }],
		['depth', { depth: '' }],
		['back', { back: '', backDepth: depth }],
		['back and backDepth', { back: photo }],
		['tilt', { tilt: { x: Number.NaN, y: 0 } }],
		['view', { view: 'normals' as 'depth' }],
		['view back', { view: 'back' as const }],
	])('throws on an invalid %s', (name, props) => {
		expect(() => render(Fixture, { src: photo, alt: 'Stripes', depth, ...props })).toThrow(`SpatialImage: ${name}`);
	});
});

describe('SpatialImage spatial fullscreen', () => {
	function stubFullscreenEnabled(value: boolean) {
		Object.defineProperty(document, 'fullscreenEnabled', { value, configurable: true });
	}

	afterEach(() => {
		Reflect.deleteProperty(document, 'fullscreenEnabled');
	});

	const spatialImage = () => document.querySelector<HTMLImageElement>('img.spatial-image-spatial');

	it('shows no spatial button for an undecodable spatial URL', async () => {
		stubFullscreenEnabled(true);
		const onerror = vi.fn();
		const decode = vi.spyOn(HTMLImageElement.prototype, 'decode');
		render(Fixture, { src: photo, alt: 'Stripes', depth, spatial: broken, onerror });
		await expect.element(page.getByRole('img', { name: 'Stripes' })).toBeVisible();
		await expect.poll(() => decode.mock.results.length).toBe(1);
		await Promise.allSettled(decode.mock.results.map((result) => result.value));
		await nextFrame();
		expect(page.getByRole('button', { name: 'View in spatial' }).query()).toBe(null);
		expect(spatialImage()).toBe(null);
		expect(onerror).not.toHaveBeenCalled();
	});

	it('shows no spatial button when fullscreen is disabled', async () => {
		stubFullscreenEnabled(false);
		const decode = vi.spyOn(HTMLImageElement.prototype, 'decode');
		render(Fixture, { src: photo, alt: 'Stripes', depth, spatial: photo });
		await expect.element(page.getByRole('img', { name: 'Stripes' })).toBeVisible();
		expect(decode).not.toHaveBeenCalled();
		expect(page.getByRole('button', { name: 'View in spatial' }).query()).toBe(null);
	});

	it('requests fullscreen on the hidden spatial image from the button', async () => {
		stubFullscreenEnabled(true);
		const requestFullscreen = vi.spyOn(Element.prototype, 'requestFullscreen').mockResolvedValue();
		render(Fixture, { src: photo, alt: 'Stripes', depth, spatial: photo });
		await page.getByRole('button', { name: 'View in spatial' }).click();
		expect(requestFullscreen).toHaveBeenCalledOnce();
		expect(requestFullscreen.mock.contexts[0]).toBe(spatialImage());
		expect(getComputedStyle(spatialImage()!).display).toBe('none');
		expect(spatialImage()!.alt).toBe('Stripes');
	});

	it('passes a refused fullscreen request to onerror and keeps the view', async () => {
		stubFullscreenEnabled(true);
		const refusal = new TypeError('Fullscreen request denied');
		vi.spyOn(Element.prototype, 'requestFullscreen').mockRejectedValue(refusal);
		const onerror = vi.fn();
		const onready = vi.fn();
		render(Fixture, { src: photo, alt: 'Stripes', depth, spatial: photo, onerror, onready });
		await expect.poll(() => onready.mock.calls.length).toBe(1);
		await page.getByRole('button', { name: 'View in spatial' }).click();
		await expect.poll(() => onerror.mock.calls.length).toBe(1);
		expect(onerror.mock.calls[0][0]).toBe(refusal);
		expect(getComputedStyle(canvas()).visibility).toBe('visible');
		expect(onready).toHaveBeenCalledOnce();
	});

	it('hands spatial and enterSpatial to a custom snippet', async () => {
		stubFullscreenEnabled(true);
		const requestFullscreen = vi.spyOn(Element.prototype, 'requestFullscreen').mockResolvedValue();
		render(Fixture, { src: photo, alt: 'Stripes', depth, spatial: photo, custom: true });
		const button = page.getByRole('button', { name: 'Custom spatial' });
		await expect.element(button).toBeInTheDocument();
		(button.element() as HTMLButtonElement).click();
		expect(requestFullscreen.mock.contexts[0]).toBe(spatialImage());
		expect(page.getByRole('button', { name: 'View in spatial' }).query()).toBe(null);
	});

	it('shows the spatial image inline with native controls when img controls exist and there is no depth', async () => {
		stubFullscreenEnabled(true);
		Object.defineProperty(HTMLImageElement.prototype, 'controls', { value: false, configurable: true, writable: true });
		try {
			render(Fixture, { src: photo, alt: 'Stripes', spatial: photo });
			await expect.poll(() => spatialImage()?.hasAttribute('controls')).toBe(true);
			expect(getComputedStyle(spatialImage()!).display).toBe('block');
			expect(document.querySelectorAll('img')).toHaveLength(1);
			expect(page.getByRole('button', { name: 'View in spatial' }).query()).toBe(null);
		} finally {
			Reflect.deleteProperty(HTMLImageElement.prototype, 'controls');
		}
	});
});
