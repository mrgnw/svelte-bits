import { afterEach, describe, expect, it, vi } from 'vitest';
import { cdp } from 'vitest/browser';
import { attachSpatialInput, type MotionState, type SpatialInput } from '#lib/spatial-input.ts';
import type { Tilt } from '#lib/spatial-tilt.ts';

const WIDTH = 200;
const HEIGHT = 100;
const SETTLE = { timeout: 3000 };

let input: SpatialInput | undefined;
let element: HTMLElement | undefined;
const permission = Object.getOwnPropertyDescriptor(DeviceOrientationEvent, 'requestPermission');

afterEach(async () => {
	input?.destroy();
	element?.remove();
	input = undefined;
	element = undefined;
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	if (permission) Object.defineProperty(DeviceOrientationEvent, 'requestPermission', permission);
	else Reflect.deleteProperty(DeviceOrientationEvent, 'requestPermission');
	await reducedMotion('');
});

function stubPermission(value: unknown) {
	Object.defineProperty(DeviceOrientationEvent, 'requestPermission', { value, configurable: true, writable: true });
}

function reducedMotion(value: '' | 'reduce') {
	return cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value }] });
}

function setup(scroll = () => 0) {
	element = document.createElement('div');
	element.style.cssText = `position: fixed; left: 0; top: 0; width: ${WIDTH}px; height: ${HEIGHT}px;`;
	document.body.append(element);
	const tilts: Tilt[] = [];
	const motions: MotionState[] = [];
	input = attachSpatialInput(element, {
		scroll,
		ontilt: (tilt) => tilts.push(tilt),
		onmotion: (state) => motions.push(state),
	});
	return { element, tilts, motions, latest: () => tilts.at(-1) ?? { x: NaN, y: NaN } };
}

function pointer(target: EventTarget, type: string, pointerType: string, clientX: number, clientY: number, pointerId = 7) {
	target.dispatchEvent(new PointerEvent(type, { pointerType, pointerId, clientX, clientY, bubbles: true }));
}

function listenerTypes(target: EventTarget) {
	const added = vi.spyOn(target, 'addEventListener');
	const removed = vi.spyOn(target, 'removeEventListener');
	return {
		added: () => added.mock.calls.map((call) => call[0]).sort(),
		removed: () => removed.mock.calls.map((call) => call[0]).sort(),
	};
}

function orientation(beta: number, gamma: number) {
	dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta, gamma }));
}

async function expectTilt(latest: () => Tilt, x: number, y: number) {
	await expect.poll(() => latest().x, SETTLE).toBeCloseTo(x, 2);
	await expect.poll(() => latest().y, SETTLE).toBeCloseTo(y, 2);
}

function frames(count: number) {
	return new Promise<void>((resolve) => {
		const step = () => (--count <= 0 ? resolve() : requestAnimationFrame(step));
		requestAnimationFrame(step);
	});
}

describe('attachSpatialInput', () => {
	it('follows the mouse and returns to neutral on leave', async () => {
		const { element, latest } = setup();
		pointer(element, 'pointermove', 'mouse', WIDTH, HEIGHT / 2);
		await expectTilt(latest, 1, 0);
		pointer(element, 'pointermove', 'mouse', WIDTH / 2, 0);
		await expectTilt(latest, 0, -1);
		pointer(element, 'pointerleave', 'mouse', WIDTH / 2, 0);
		await expectTilt(latest, 0, 0);
	});

	it('smooths toward the target over several frames', async () => {
		const { element, tilts, latest } = setup();
		pointer(element, 'pointermove', 'mouse', WIDTH, HEIGHT / 2);
		await expectTilt(latest, 1, 0);
		const rising = tilts.map((tilt) => tilt.x).filter((x) => x > 0.01 && x < 0.99);
		expect(rising.length).toBeGreaterThan(2);
	});

	it('sets x only from a touch drag and releases to neutral', async () => {
		const { element, latest } = setup();
		pointer(element, 'pointerdown', 'touch', 20, 10);
		pointer(element, 'pointermove', 'touch', 70, 90);
		await expectTilt(latest, 0.5, 0);
		pointer(element, 'pointerup', 'touch', 70, 90);
		await expectTilt(latest, 0, 0);
	});

	it('releases a drag on pointercancel', async () => {
		const { element, latest } = setup();
		pointer(element, 'pointerdown', 'pen', 100, 50);
		pointer(element, 'pointermove', 'pen', 50, 50);
		await expectTilt(latest, -0.5, 0);
		pointer(element, 'pointercancel', 'pen', 50, 50);
		await expectTilt(latest, 0, 0);
	});

	it('releases a drag on lostpointercapture', async () => {
		const { element, latest } = setup();
		pointer(element, 'pointerdown', 'touch', 100, 50);
		pointer(element, 'pointermove', 'touch', 150, 50);
		await expectTilt(latest, 0.5, 0);
		pointer(element, 'lostpointercapture', 'touch', 150, 50);
		await expectTilt(latest, 0, 0);
	});

	it('lets a new pointerdown replace a drag whose pointerup was lost', async () => {
		const { element, latest } = setup();
		pointer(element, 'pointerdown', 'touch', 100, 50, 1);
		pointer(element, 'pointermove', 'touch', 150, 50, 1);
		await expectTilt(latest, 0.5, 0);
		pointer(element, 'pointerdown', 'touch', 100, 50, 2);
		pointer(element, 'pointermove', 'touch', 50, 50, 2);
		await expectTilt(latest, -0.5, 0);
	});

	it('ignores moves from a second touch id', async () => {
		const { element, latest } = setup();
		pointer(element, 'pointerdown', 'touch', 100, 50, 1);
		pointer(element, 'pointermove', 'touch', 150, 50, 1);
		pointer(element, 'pointermove', 'touch', 0, 50, 2);
		pointer(element, 'pointerup', 'touch', 0, 50, 2);
		await frames(5);
		await expectTilt(latest, 0.5, 0);
	});

	it('lets a drag beat orientation and the mouse', async () => {
		stubPermission(undefined);
		const { element, latest } = setup();
		pointer(element, 'pointermove', 'mouse', WIDTH, HEIGHT / 2);
		orientation(45, 0);
		orientation(45, 7.5);
		await expectTilt(latest, 0.5, 0);
		pointer(element, 'pointerdown', 'touch', 100, 50);
		pointer(element, 'pointermove', 'touch', 50, 50);
		orientation(45, 15);
		pointer(element, 'pointermove', 'mouse', WIDTH, HEIGHT / 2);
		await expectTilt(latest, -0.5, 0);
	});

	it('lets device orientation take over from the mouse', async () => {
		stubPermission(undefined);
		const { element, latest, motions } = setup();
		expect(motions).toEqual(['granted']);
		pointer(element, 'pointermove', 'mouse', WIDTH, HEIGHT / 2);
		await expectTilt(latest, 1, 0);
		orientation(45, 0);
		await expectTilt(latest, 0, 0);
		orientation(45 + 7.5, 3);
		await expectTilt(latest, 0.2, 0.5);
	});

	it('unwraps beta across +/-180 degrees', async () => {
		stubPermission(undefined);
		const { latest } = setup();
		orientation(170, 0);
		orientation(-175, 0);
		await expectTilt(latest, 0, 1);
	});

	it('re-centres when the screen orientation changes', async () => {
		stubPermission(undefined);
		const { latest } = setup();
		orientation(45, 0);
		orientation(45, 7.5);
		await expectTilt(latest, 0.5, 0);
		screen.orientation.dispatchEvent(new Event('change'));
		orientation(60, 10);
		await expectTilt(latest, 0, 0);
	});

	it('reads the scroll weight through the getter', async () => {
		let weight = 0;
		const { element, latest } = setup(() => weight);
		element.style.top = `${innerHeight / 2 - HEIGHT / 2 + innerHeight / 4}px`;
		dispatchEvent(new Event('scroll'));
		await expectTilt(latest, 0, 0);
		weight = 1;
		dispatchEvent(new Event('scroll'));
		await expectTilt(latest, 0, 0.5);
	});

	it('reports no frame after destroy', async () => {
		const { element, tilts, latest } = setup();
		pointer(element, 'pointermove', 'mouse', WIDTH, HEIGHT / 2);
		await expectTilt(latest, 1, 0);
		input!.destroy();
		input!.destroy();
		const count = tilts.length;
		pointer(element, 'pointermove', 'mouse', 0, HEIGHT / 2);
		orientation(45, 0);
		dispatchEvent(new Event('scroll'));
		await frames(5);
		expect(tilts.length).toBe(count);
	});

	it('stops frames when destroyed mid-animation', async () => {
		const { element, tilts } = setup();
		pointer(element, 'pointermove', 'mouse', WIDTH, HEIGHT / 2);
		await expect.poll(() => tilts.length).toBeGreaterThan(0);
		input!.destroy();
		const count = tilts.length;
		await frames(5);
		expect(tilts.length).toBe(count);
		expect(tilts.at(-1)!.x).toBeLessThan(0.99);
	});

	it('runs no frames offscreen or in a hidden tab', async () => {
		const { element, tilts, latest } = setup();
		pointer(element, 'pointermove', 'mouse', WIDTH, HEIGHT / 2);
		await expectTilt(latest, 1, 0);

		element.style.top = `${-HEIGHT * 4}px`;
		await frames(5);
		const offscreen = tilts.length;
		pointer(element, 'pointermove', 'mouse', 0, -HEIGHT * 4 + HEIGHT / 2);
		await frames(5);
		expect(tilts.length).toBe(offscreen);

		element.style.top = '0px';
		await expectTilt(latest, -1, 0);

		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
		document.dispatchEvent(new Event('visibilitychange'));
		const hidden = tilts.length;
		pointer(element, 'pointermove', 'mouse', WIDTH, HEIGHT / 2);
		await frames(5);
		expect(tilts.length).toBe(hidden);
	});

	it('removes every listener on destroy', () => {
		const target = document.createElement('div');
		document.body.append(target);
		const onElement = listenerTypes(target);
		const onWindow = listenerTypes(window);
		const onDocument = listenerTypes(document);
		const attached = attachSpatialInput(target, { scroll: () => 0, ontilt: () => {}, onmotion: () => {} });
		attached.destroy();
		target.remove();
		for (const spy of [onElement, onWindow, onDocument]) {
			expect(spy.added().length).toBeGreaterThan(0);
			expect(spy.removed()).toEqual(spy.added());
		}
	});

	it('turns mouse, orientation and scroll off with reduced motion, but not drag', async () => {
		stubPermission(undefined);
		await reducedMotion('reduce');
		const { element, latest } = setup(() => 1);
		element.style.top = `${innerHeight - HEIGHT}px`;
		pointer(element, 'pointermove', 'mouse', WIDTH, innerHeight - HEIGHT / 2);
		orientation(45, 0);
		orientation(45, 15);
		await frames(5);
		await expectTilt(latest, 0, 0);
		pointer(element, 'pointerdown', 'touch', 100, innerHeight - 50);
		pointer(element, 'pointermove', 'touch', 150, innerHeight - 50);
		await expectTilt(latest, 0.5, 0);
		await reducedMotion('');
		pointer(element, 'pointerup', 'touch', 150, innerHeight - 50);
		await expect.poll(() => latest().y, SETTLE).toBeGreaterThan(0.5);
	});

	it('reports unsupported motion without DeviceOrientationEvent', () => {
		vi.stubGlobal('DeviceOrientationEvent', undefined);
		const { motions } = setup();
		input!.requestMotion();
		expect(motions).toEqual(['unsupported']);
	});

	it('asks for permission only through requestMotion', async () => {
		const requestPermission = vi.fn(async () => 'denied');
		stubPermission(requestPermission);
		const { latest, motions } = setup();
		expect(motions).toEqual(['prompt']);
		expect(requestPermission).not.toHaveBeenCalled();
		orientation(45, 0);
		orientation(45, 15);
		await frames(5);
		await expectTilt(latest, 0, 0);
		input!.requestMotion();
		input!.requestMotion();
		await expect.poll(() => motions).toEqual(['prompt', 'denied']);
		input!.requestMotion();
		expect(requestPermission).toHaveBeenCalledOnce();
	});

	it('grants motion when permission is granted and treats a rejection as denied', async () => {
		stubPermission(async () => 'granted');
		const { motions } = setup();
		input!.requestMotion();
		await expect.poll(() => motions).toEqual(['prompt', 'granted']);
		input!.destroy();
		element!.remove();
		stubPermission(() => Promise.reject(new Error('no gesture')));
		const second = setup();
		input!.requestMotion();
		await expect.poll(() => second.motions).toEqual(['prompt', 'denied']);
	});

	it('throws on programmer errors', () => {
		const ontilt = () => {};
		const onmotion = () => {};
		expect(() => attachSpatialInput(null as unknown as HTMLElement, { scroll: () => 0, ontilt, onmotion })).toThrow(
			'SpatialImage',
		);
		expect(() =>
			attachSpatialInput(document.body, { scroll: 0 as unknown as () => number, ontilt, onmotion }),
		).toThrow('scroll');
	});
});
