import { describe, expect, it } from 'vitest';
import {
	DT_MAX_MS,
	clampTilt,
	combineTilt,
	dragTilt,
	isSettled,
	orientationTilt,
	pointerTilt,
	scrollTilt,
	smoothTilt,
	type Tilt,
} from './spatial-tilt';

const rect = { left: 100, top: 50, width: 200, height: 100 };
const neutral = { beta: 45, gamma: 0 };
const RANGE = 15;

function expectTilt(actual: Tilt, expected: Tilt) {
	expect(actual.x).toBeCloseTo(expected.x, 6);
	expect(actual.y).toBeCloseTo(expected.y, 6);
}

describe('clampTilt', () => {
	it('keeps points inside the unit disc and scales points outside onto it', () => {
		expect(clampTilt({ x: 0.3, y: -0.4 })).toEqual({ x: 0.3, y: -0.4 });
		expectTilt(clampTilt({ x: 3, y: 4 }), { x: 0.6, y: 0.8 });
	});

	it('throws on NaN', () => {
		expect(() => clampTilt({ x: NaN, y: 0 })).toThrow('SpatialImage');
	});
});

describe('pointerTilt', () => {
	it('gives neutral at the centre', () => {
		expectTilt(pointerTilt(200, 100, rect), { x: 0, y: 0 });
	});

	it('reaches the edge midpoints and clamps corners to the disc', () => {
		expectTilt(pointerTilt(300, 100, rect), { x: 1, y: 0 });
		expectTilt(pointerTilt(100, 50, rect), { x: -Math.SQRT1_2, y: -Math.SQRT1_2 });
		expectTilt(pointerTilt(300, 150, rect), { x: Math.SQRT1_2, y: Math.SQRT1_2 });
	});

	it('gives neutral for a zero-size rect', () => {
		expectTilt(pointerTilt(5, 5, { left: 0, top: 0, width: 0, height: 0 }), { x: 0, y: 0 });
	});

	it('throws on non-finite input', () => {
		expect(() => pointerTilt(Infinity, 0, rect)).toThrow('SpatialImage');
		expect(() => pointerTilt(0, 0, { ...rect, width: NaN })).toThrow('SpatialImage');
	});
});

describe('dragTilt', () => {
	it('moves x by two units per image width and keeps y', () => {
		expectTilt(dragTilt({ x: 0, y: 0.2 }, 50, 200), { x: 0.5, y: 0.2 });
		expectTilt(dragTilt({ x: 0.5, y: 0 }, -100, 200), { x: -0.5, y: 0 });
	});

	it('clamps to the unit disc', () => {
		expectTilt(dragTilt({ x: 0.9, y: 0 }, 1000, 200), { x: 1, y: 0 });
		const length = Math.hypot(10, 0.9);
		expectTilt(dragTilt({ x: 0, y: 0.9 }, 1000, 200), { x: 10 / length, y: 0.9 / length });
	});

	it('keeps the start when the width is zero', () => {
		expectTilt(dragTilt({ x: 0.2, y: 0.1 }, 40, 0), { x: 0.2, y: 0.1 });
	});

	it('throws on NaN', () => {
		expect(() => dragTilt({ x: 0, y: 0 }, NaN, 100)).toThrow('SpatialImage');
	});
});

describe('orientationTilt', () => {
	it('gives neutral at the neutral pose for every screen angle', () => {
		for (const angle of [0, 90, 180, 270]) {
			expectTilt(orientationTilt(neutral.beta, neutral.gamma, neutral, angle, RANGE), { x: 0, y: 0 });
		}
	});

	it('clamps at rangeDeg', () => {
		expectTilt(orientationTilt(45, 15, neutral, 0, RANGE), { x: 1, y: 0 });
		expectTilt(orientationTilt(45, 80, neutral, 0, RANGE), { x: 1, y: 0 });
		expectTilt(orientationTilt(45 - 15, 0, neutral, 0, RANGE), { x: 0, y: -1 });
	});

	it('wraps gamma across the +/-90 jump and beta across the +/-180 jump', () => {
		const edge = { beta: 170, gamma: 89 };
		expectTilt(orientationTilt(170, -89, edge, 0, RANGE), { x: 2 / RANGE, y: 0 });
		expectTilt(orientationTilt(-178, 89, edge, 0, RANGE), { x: 0, y: 12 / RANGE });
		expectTilt(orientationTilt(170, 89, { beta: -178, gamma: -89 }, 0, RANGE), { x: -2 / RANGE, y: -12 / RANGE });
	});

	it('swaps and flips axes for each screen angle', () => {
		const beta = 45 + 7.5;
		const gamma = 3;
		expectTilt(orientationTilt(beta, gamma, neutral, 0, RANGE), { x: 0.2, y: 0.5 });
		expectTilt(orientationTilt(beta, gamma, neutral, 90, RANGE), { x: 0.5, y: -0.2 });
		expectTilt(orientationTilt(beta, gamma, neutral, 180, RANGE), { x: -0.2, y: -0.5 });
		expectTilt(orientationTilt(beta, gamma, neutral, 270, RANGE), { x: -0.5, y: 0.2 });
	});

	it('accepts negative and full-turn angles', () => {
		expectTilt(orientationTilt(52.5, 3, neutral, -90, RANGE), orientationTilt(52.5, 3, neutral, 270, RANGE));
		expectTilt(orientationTilt(52.5, 3, neutral, 360, RANGE), orientationTilt(52.5, 3, neutral, 0, RANGE));
	});

	it('throws on NaN, a bad angle or a bad range', () => {
		expect(() => orientationTilt(NaN, 0, neutral, 0, RANGE)).toThrow('SpatialImage');
		expect(() => orientationTilt(0, 0, neutral, 45, RANGE)).toThrow('screenAngle');
		expect(() => orientationTilt(0, 0, neutral, 0, 0)).toThrow('rangeDeg');
	});
});

describe('scrollTilt', () => {
	it('gives 0 when the image is centred in the viewport', () => {
		expect(scrollTilt(250, 300, 800)).toBe(0);
	});

	it('clamps at -1 and 1', () => {
		expect(scrollTilt(-2000, 300, 800)).toBe(-1);
		expect(scrollTilt(2000, 300, 800)).toBe(1);
		expect(scrollTilt(550, 100, 800)).toBeCloseTo(0.5, 6);
	});

	it('gives 0 for an empty viewport and throws on NaN', () => {
		expect(scrollTilt(0, 100, 0)).toBe(0);
		expect(() => scrollTilt(NaN, 100, 800)).toThrow('SpatialImage');
		expect(() => scrollTilt(0, -1, 800)).toThrow('rectHeight');
	});
});

describe('combineTilt', () => {
	it('returns the primary when the weight is 0', () => {
		expectTilt(combineTilt({ x: 0.3, y: -0.2 }, 1, 0), { x: 0.3, y: -0.2 });
	});

	it('adds the weighted scroll to y and clamps to the disc', () => {
		expectTilt(combineTilt({ x: 0.3, y: 0 }, 1, 0.35), { x: 0.3, y: 0.35 });
		expectTilt(combineTilt({ x: 0, y: 0.9 }, 1, 1), { x: 0, y: 1 });
	});

	it('throws on a weight outside 0 to 1', () => {
		expect(() => combineTilt({ x: 0, y: 0 }, 1, -0.1)).toThrow('scrollWeight');
		expect(() => combineTilt({ x: 0, y: 0 }, 1, 1.1)).toThrow('scrollWeight');
	});
});

describe('smoothTilt', () => {
	const from = { x: 0, y: 0 };
	const to = { x: 1, y: -1 };

	it('returns current at dt 0', () => {
		expectTilt(smoothTilt(from, to, 0, 100), from);
	});

	it('returns the midpoint at dt equal to the half-life', () => {
		expectTilt(smoothTilt(from, to, 100, 100), { x: 0.5, y: -0.5 });
	});

	it('makes two half steps equal one full step', () => {
		const half = smoothTilt(smoothTilt(from, to, 25, 100), to, 25, 100);
		expectTilt(half, smoothTilt(from, to, 50, 100));
	});

	it('caps the frame step at DT_MAX_MS', () => {
		expectTilt(smoothTilt(from, to, 5000, 100), smoothTilt(from, to, DT_MAX_MS, 100));
	});

	it('treats a negative dt as 0 and throws on NaN or a bad half-life', () => {
		expectTilt(smoothTilt(from, to, -10, 100), from);
		expect(() => smoothTilt(from, to, NaN, 100)).toThrow('SpatialImage');
		expect(() => smoothTilt(from, to, 16, 0)).toThrow('halfLifeMs');
	});
});

describe('isSettled', () => {
	it('is true within the epsilon and false beyond it', () => {
		expect(isSettled({ x: 0, y: 0 }, { x: 0.0005, y: 0 })).toBe(true);
		expect(isSettled({ x: 0, y: 0 }, { x: 0.01, y: 0 })).toBe(false);
	});

	it('throws on NaN', () => {
		expect(() => isSettled({ x: NaN, y: 0 }, { x: 0, y: 0 })).toThrow('SpatialImage');
	});
});
