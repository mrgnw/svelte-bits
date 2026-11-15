import {
	HALF_LIFE_MS,
	ORIENTATION_RANGE_DEG,
	combineTilt,
	dragTilt,
	isSettled,
	orientationTilt,
	pointerTilt,
	scrollTilt,
	smoothTilt,
	type Pose,
	type Tilt,
} from './spatial-tilt.js';

export type MotionState = 'unsupported' | 'prompt' | 'granted' | 'denied';

export type SpatialInputOptions = {
	scroll: () => number;
	ontilt: (tilt: Tilt) => void;
	onmotion: (state: MotionState) => void;
};

export type SpatialInput = {
	requestMotion: () => void;
	wake: () => void;
	destroy: () => void;
};

type PermissionRequest = () => Promise<PermissionState | 'granted' | 'denied'>;

const NEUTRAL: Tilt = { x: 0, y: 0 };
const FIRST_FRAME_MS = 1000 / 60;

function assert(ok: boolean, message: string): asserts ok {
	if (!ok) throw new Error(`SpatialImage: ${message}`);
}

function permissionRequest(): PermissionRequest | undefined {
	const request: unknown = Reflect.get(DeviceOrientationEvent, 'requestPermission');
	return typeof request === 'function' ? (request.bind(DeviceOrientationEvent) as PermissionRequest) : undefined;
}

function initialMotion(): MotionState {
	if (typeof DeviceOrientationEvent === 'undefined') return 'unsupported';
	return permissionRequest() ? 'prompt' : 'granted';
}

function screenAngle(): number {
	return screen.orientation?.angle ?? 0;
}

function unwrapBeta(beta: number, neutral: number): number {
	const delta = ((((beta - neutral + 180) % 360) + 360) % 360) - 180;
	return neutral + delta;
}

export function attachSpatialInput(element: HTMLElement, options: SpatialInputOptions): SpatialInput {
	assert(element instanceof HTMLElement, 'input needs an HTMLElement');
	assert(typeof options.scroll === 'function', 'scroll must be a getter function');
	assert(typeof options.ontilt === 'function', 'ontilt must be a function');
	assert(typeof options.onmotion === 'function', 'onmotion must be a function');

	const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
	let destroyed = false;
	let motion = initialMotion();
	let visible = false;
	let mouse: Tilt | null = null;
	let drag: { pointerId: number; startX: number } | null = null;
	let dragged: Tilt | null = null;
	let orientation: Tilt | null = null;
	let neutralPose: Pose | null = null;
	let angle = screenAngle();
	let asking = false;
	let current: Tilt = { ...NEUTRAL };
	let frame = 0;
	let last = 0;

	function running(): boolean {
		return !destroyed && visible && document.visibilityState === 'visible';
	}

	function target(): Tilt {
		const reduced = reducedQuery.matches;
		const primary = dragged ?? (reduced ? null : (orientation ?? mouse)) ?? NEUTRAL;
		if (reduced) return combineTilt(primary, 0, 0);
		const rect = element.getBoundingClientRect();
		return combineTilt(primary, scrollTilt(rect.top, rect.height, innerHeight), options.scroll());
	}

	function tick(time: number) {
		frame = 0;
		if (!running()) return;
		const dt = last === 0 ? FIRST_FRAME_MS : time - last;
		last = time;
		const goal = target();
		const next = smoothTilt(current, goal, dt, HALF_LIFE_MS);
		const settled = isSettled(next, goal);
		current = settled ? goal : next;
		options.ontilt(current);
		if (!settled) frame = requestAnimationFrame(tick);
	}

	function wake() {
		if (frame !== 0 || !running()) return;
		last = 0;
		frame = requestAnimationFrame(tick);
	}

	function setMotion(state: MotionState) {
		if (destroyed || state === motion) return;
		motion = state;
		options.onmotion(state);
	}

	function onPointerDown(event: PointerEvent) {
		if (event.pointerType === 'mouse') return;
		drag = { pointerId: event.pointerId, startX: event.clientX };
		dragged = { ...NEUTRAL };
		wake();
	}

	function onPointerMove(event: PointerEvent) {
		if (event.pointerType === 'mouse') {
			mouse = pointerTilt(event.clientX, event.clientY, element.getBoundingClientRect());
		} else if (drag?.pointerId === event.pointerId) {
			dragged = dragTilt(NEUTRAL, event.clientX - drag.startX, element.getBoundingClientRect().width);
		} else return;
		wake();
	}

	function onPointerEnd(event: PointerEvent) {
		if (drag?.pointerId !== event.pointerId) return;
		drag = null;
		dragged = null;
		wake();
	}

	function onPointerLeave(event: PointerEvent) {
		if (event.pointerType !== 'mouse') return;
		mouse = null;
		wake();
	}

	function onOrientation(event: DeviceOrientationEvent) {
		if (motion !== 'granted' || event.beta === null || event.gamma === null) return;
		neutralPose ??= { beta: event.beta, gamma: event.gamma };
		const beta = unwrapBeta(event.beta, neutralPose.beta);
		orientation = orientationTilt(beta, event.gamma, neutralPose, angle, ORIENTATION_RANGE_DEG);
		wake();
	}

	function onScreenChange() {
		neutralPose = null;
		orientation = null;
		angle = screenAngle();
		wake();
	}

	const observer = new IntersectionObserver((entries) => {
		visible = entries[entries.length - 1].isIntersecting;
		wake();
	});
	observer.observe(element);

	const scrollOptions = { passive: true, capture: true };
	element.addEventListener('pointerdown', onPointerDown);
	element.addEventListener('pointermove', onPointerMove);
	element.addEventListener('pointerup', onPointerEnd);
	element.addEventListener('pointercancel', onPointerEnd);
	element.addEventListener('lostpointercapture', onPointerEnd);
	element.addEventListener('pointerleave', onPointerLeave);
	addEventListener('deviceorientation', onOrientation);
	addEventListener('scroll', wake, scrollOptions);
	addEventListener('resize', wake);
	document.addEventListener('visibilitychange', wake);
	screen.orientation?.addEventListener('change', onScreenChange);
	reducedQuery.addEventListener('change', wake);

	options.onmotion(motion);

	function requestMotion() {
		if (destroyed || asking || motion !== 'prompt') return;
		const request = permissionRequest();
		assert(request !== undefined, 'motion is prompt without requestPermission');
		asking = true;
		request()
			.then(
				(state) => setMotion(state === 'granted' ? 'granted' : 'denied'),
				() => setMotion('denied'),
			)
			.finally(() => {
				asking = false;
			});
	}

	function destroy() {
		if (destroyed) return;
		destroyed = true;
		cancelAnimationFrame(frame);
		frame = 0;
		observer.disconnect();
		element.removeEventListener('pointerdown', onPointerDown);
		element.removeEventListener('pointermove', onPointerMove);
		element.removeEventListener('pointerup', onPointerEnd);
		element.removeEventListener('pointercancel', onPointerEnd);
		element.removeEventListener('lostpointercapture', onPointerEnd);
		element.removeEventListener('pointerleave', onPointerLeave);
		removeEventListener('deviceorientation', onOrientation);
		removeEventListener('scroll', wake, scrollOptions);
		removeEventListener('resize', wake);
		document.removeEventListener('visibilitychange', wake);
		screen.orientation?.removeEventListener('change', onScreenChange);
		reducedQuery.removeEventListener('change', wake);
	}

	return { requestMotion, wake, destroy };
}
