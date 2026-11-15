import { describe, expect, it } from 'vitest';
import { coverScale, dilateDepth, gridSize, meshIndices, meshPositions, textureSize } from './spatial-mesh';

function largest(indices: ArrayLike<number>): number {
	let max = 0;
	for (let i = 0; i < indices.length; i++) max = Math.max(max, indices[i]);
	return max;
}

describe('grid', () => {
	it('is fine with 32-bit indices and coarse without', () => {
		expect(gridSize(true)).toBe(480);
		expect(gridSize(false)).toBe(240);
	});

	it('lays vertices on the unit square', () => {
		const positions = meshPositions(4);
		expect(positions).toHaveLength(5 * 5 * 2);
		expect([...positions.slice(0, 2)]).toEqual([0, 0]);
		expect([...positions.slice(8, 10)]).toEqual([1, 0]);
		expect([...positions.slice(-2)]).toEqual([1, 1]);
		expect([...positions.slice(2, 4)]).toEqual([0.25, 0]);
	});

	it('builds two triangles per quad within range', () => {
		const indices = meshIndices(240);
		expect(indices).toBeInstanceOf(Uint16Array);
		expect(indices).toHaveLength(240 * 240 * 6);
		expect(largest(indices)).toBe(241 * 241 - 1);
	});

	it('lays out each quad as two triangles', () => {
		const n = 4;
		const last = (n + 1) ** 2 - 1;
		const indices = meshIndices(n);
		expect([...indices.slice(0, 6)]).toEqual([0, 1, n + 1, 1, n + 2, n + 1]);
		expect([...indices.slice(-6)]).toEqual([last - n - 2, last - n - 1, last - 1, last - n - 1, last, last - 1]);
	});

	it('switches to 32-bit indices when 16 bits cannot address the vertices', () => {
		const indices = meshIndices(480);
		expect(indices).toBeInstanceOf(Uint32Array);
		expect(indices).toHaveLength(480 * 480 * 6);
		expect(largest(indices)).toBe(481 * 481 - 1);
		expect(meshIndices(255)).toBeInstanceOf(Uint16Array);
		expect(meshIndices(256)).toBeInstanceOf(Uint32Array);
	});

	it('rejects sizes outside 1 to 480', () => {
		for (const n of [0, -1, 1.5, 481, NaN]) {
			expect(() => meshPositions(n)).toThrow('SpatialImage');
			expect(() => meshIndices(n)).toThrow('SpatialImage');
		}
	});
});

describe('textureSize', () => {
	it('keeps the aspect ratio and fits the longest side', () => {
		expect(textureSize(4000, 2000, 1000)).toEqual({ width: 1000, height: 500 });
		expect(textureSize(2000, 4000, 1000)).toEqual({ width: 500, height: 1000 });
	});

	it('never upscales', () => {
		expect(textureSize(300, 200, 1024)).toEqual({ width: 300, height: 200 });
	});

	it('stays between 1 and maxSide', () => {
		expect(textureSize(10000, 1, 64)).toEqual({ width: 64, height: 1 });
		for (const [w, h, max] of [[4097, 3001, 4096], [1023, 1023, 1022], [7, 9000, 64]]) {
			const size = textureSize(w, h, max);
			expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(max);
			expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(1);
		}
	});

	it('rejects bad input', () => {
		expect(() => textureSize(0, 10, 64)).toThrow('SpatialImage');
		expect(() => textureSize(10, NaN, 64)).toThrow('SpatialImage');
		expect(() => textureSize(10, 10, 0)).toThrow('SpatialImage');
		expect(() => textureSize(10, 10, 64.5)).toThrow('SpatialImage');
		expect(() => textureSize(10, 10, 4097)).toThrow('maxSide');
	});
});

describe('coverScale', () => {
	it('is 1 by 1 for equal aspects at strength 0', () => {
		expect(coverScale(1.5, 1.5, 0, 0.5)).toEqual({ x: 1, y: 1 });
	});

	it('overflows the long axis of the image', () => {
		expect(coverScale(2, 1, 0, 0.5)).toEqual({ x: 2, y: 1 });
		expect(coverScale(0.5, 1, 0, 0.5)).toEqual({ x: 1, y: 2 });
	});

	it('keeps every box edge covered at the extreme depths and tilts', () => {
		const aspects = [0.5, 1, 1.5, 3];
		const strengths = [0, 0.08, 0.5];
		const focuses = [0, 0.3, 0.5, 1];
		for (const imageAspect of aspects) {
			for (const boxAspect of aspects) {
				for (const strength of strengths) {
					for (const focus of focuses) {
						const scale = coverScale(imageAspect, boxAspect, strength, focus);
						for (const depth of [0, 1]) {
							for (const tilt of [-1, 1]) {
								const shift = tilt * (depth - focus) * strength;
								const low = 0.5 + (0 - 0.5) * scale.x + shift;
								const high = 0.5 + (1 - 0.5) * scale.x + shift;
								const lowY = 0.5 + (0 - 0.5) * scale.y + shift;
								const highY = 0.5 + (1 - 0.5) * scale.y + shift;
								expect(low).toBeLessThanOrEqual(1e-12);
								expect(high).toBeGreaterThanOrEqual(1 - 1e-12);
								expect(lowY).toBeLessThanOrEqual(1e-12);
								expect(highY).toBeGreaterThanOrEqual(1 - 1e-12);
							}
						}
					}
				}
			}
		}
	});

	it('rejects bad input', () => {
		expect(() => coverScale(0, 1, 0.08, 0.5)).toThrow('SpatialImage');
		expect(() => coverScale(1, NaN, 0.08, 0.5)).toThrow('SpatialImage');
		expect(() => coverScale(1, 1, 0.51, 0.5)).toThrow('SpatialImage');
		expect(() => coverScale(1, 1, -0.01, 0.5)).toThrow('SpatialImage');
		expect(() => coverScale(1, 1, 0.08, 1.1)).toThrow('SpatialImage');
	});
});

describe('dilateDepth', () => {
	function depth(values: number[]): Uint8ClampedArray {
		return new Uint8ClampedArray(values.flatMap((value) => [value, value, value, 255]));
	}

	it('grows near depth by the radius on both axes', () => {
		const out = dilateDepth(depth([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 200, 0, 0, 0, 0, 0]), 4, 4, 1);
		const red = Array.from(out).filter((_, i) => i % 4 === 0);
		expect(red).toEqual([0, 0, 0, 0, 0, 200, 200, 200, 0, 200, 200, 200, 0, 200, 200, 200]);
	});

	it('keeps the input with radius 0 and rejects bad input', () => {
		const input = depth([10, 20, 30, 40]);
		expect(Array.from(dilateDepth(input, 2, 2, 0))).toEqual(Array.from(input));
		expect(() => dilateDepth(input, 3, 2, 1)).toThrow('expected 24');
		expect(() => dilateDepth(input, 2, 2, 17)).toThrow('radius 17');
	});
});
