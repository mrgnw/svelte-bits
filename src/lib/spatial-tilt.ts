export type Tilt = { x: number; y: number };
export type Rect = { left: number; top: number; width: number; height: number };
export type Pose = { beta: number; gamma: number };

export const ORIENTATION_RANGE_DEG = 15;
export const HALF_LIFE_MS = 100;
export const DT_MAX_MS = 100;
export const SETTLE_EPSILON = 0.001;

const NEUTRAL: Tilt = { x: 0, y: 0 };
const SCREEN_ANGLES: readonly number[] = [0, 90, 180, 270];

function assert(ok: boolean, message: string): asserts ok {
	if (!ok) throw new Error(`SpatialImage: ${message}`);
}

function assertFinite(name: string, ...values: number[]): void {
	for (const value of values) assert(Number.isFinite(value), `${name} must be a finite number, got ${String(value)}`);
}

function wrap(value: number, period: number): number {
	const half = period / 2;
	return ((((value + half) % period) + period) % period) - half;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function clampTilt(tilt: Tilt): Tilt {
	assertFinite('tilt', tilt.x, tilt.y);
	const length = Math.hypot(tilt.x, tilt.y);
	if (length <= 1) return { x: tilt.x, y: tilt.y };
	return { x: tilt.x / length, y: tilt.y / length };
}

export function pointerTilt(clientX: number, clientY: number, rect: Rect): Tilt {
	assertFinite('pointer', clientX, clientY);
	assertFinite('rect', rect.left, rect.top, rect.width, rect.height);
	if (rect.width <= 0 || rect.height <= 0) return { ...NEUTRAL };
	return clampTilt({
		x: ((clientX - rect.left) / rect.width) * 2 - 1,
		y: ((clientY - rect.top) / rect.height) * 2 - 1,
	});
}

export function dragTilt(start: Tilt, dxPx: number, widthPx: number): Tilt {
	assertFinite('drag', dxPx, widthPx);
	if (widthPx <= 0) return clampTilt(start);
	return clampTilt({ x: start.x + (dxPx / widthPx) * 2, y: start.y });
}

export function orientationTilt(
	beta: number,
	gamma: number,
	neutral: Pose,
	screenAngle: number,
	rangeDeg: number,
): Tilt {
	assertFinite('orientation', beta, gamma, neutral.beta, neutral.gamma, screenAngle, rangeDeg);
	assert(rangeDeg > 0, `rangeDeg must be positive, got ${rangeDeg}`);
	const angle = ((screenAngle % 360) + 360) % 360;
	assert(SCREEN_ANGLES.includes(angle), `screenAngle must be a multiple of 90, got ${screenAngle}`);

	const db = wrap(beta - neutral.beta, 360) / rangeDeg;
	const dg = wrap(gamma - neutral.gamma, 180) / rangeDeg;
	const [x, y] =
		angle === 0 ? [dg, db] : angle === 90 ? [db, -dg] : angle === 180 ? [-dg, -db] : [-db, dg];
	return clampTilt({ x, y });
}

export function scrollTilt(rectTop: number, rectHeight: number, viewportHeight: number): number {
	assertFinite('scroll', rectTop, rectHeight, viewportHeight);
	assert(rectHeight >= 0, `rectHeight must not be negative, got ${rectHeight}`);
	if (viewportHeight <= 0) return 0;
	const centre = rectTop + rectHeight / 2;
	return clamp((centre - viewportHeight / 2) / (viewportHeight / 2), -1, 1);
}

export function combineTilt(primary: Tilt, scrollY: number, scrollWeight: number): Tilt {
	assertFinite('scroll', scrollY, scrollWeight);
	assert(scrollWeight >= 0 && scrollWeight <= 1, `scrollWeight must be from 0 to 1, got ${scrollWeight}`);
	return clampTilt({ x: primary.x, y: primary.y + scrollY * scrollWeight });
}

export function smoothTilt(current: Tilt, target: Tilt, dtMs: number, halfLifeMs: number): Tilt {
	assertFinite('tilt', current.x, current.y, target.x, target.y);
	assertFinite('time', dtMs, halfLifeMs);
	assert(halfLifeMs > 0, `halfLifeMs must be positive, got ${halfLifeMs}`);
	const step = 1 - 2 ** (-clamp(dtMs, 0, DT_MAX_MS) / halfLifeMs);
	return {
		x: current.x + (target.x - current.x) * step,
		y: current.y + (target.y - current.y) * step,
	};
}

export function isSettled(current: Tilt, target: Tilt): boolean {
	assertFinite('tilt', current.x, current.y, target.x, target.y);
	return Math.hypot(target.x - current.x, target.y - current.y) < SETTLE_EPSILON;
}
