export const MESH_FINE = 480;
export const MESH_COARSE = 240;
const MAX_INDEX_16 = 65535;
const MAX_TEXTURE_SIDE = 4096;

export type Size = { width: number; height: number };
export type Scale = { x: number; y: number };

function assert(ok: boolean, message: string): asserts ok {
	if (!ok) throw new Error(`SpatialImage: ${message}`);
}

function assertPositive(value: number, name: string) {
	assert(Number.isFinite(value) && value > 0, `${name} ${String(value)} must be a positive number`);
}

function assertGrid(n: number) {
	assert(Number.isInteger(n) && n >= 1 && n <= MESH_FINE, `mesh size ${String(n)} must be an integer from 1 to ${MESH_FINE}`);
}

export function gridSize(hasUintIndices: boolean): number {
	return hasUintIndices ? MESH_FINE : MESH_COARSE;
}

export function meshPositions(n: number): Float32Array<ArrayBuffer> {
	assertGrid(n);
	const positions = new Float32Array((n + 1) * (n + 1) * 2);
	for (let y = 0; y <= n; y++) {
		for (let x = 0; x <= n; x++) {
			const i = (y * (n + 1) + x) * 2;
			positions[i] = x / n;
			positions[i + 1] = y / n;
		}
	}
	return positions;
}

export function meshIndices(n: number): Uint16Array<ArrayBuffer> | Uint32Array<ArrayBuffer> {
	assertGrid(n);
	const vertices = (n + 1) * (n + 1);
	const indices = vertices - 1 > MAX_INDEX_16 ? new Uint32Array(n * n * 6) : new Uint16Array(n * n * 6);
	let k = 0;
	for (let y = 0; y < n; y++) {
		for (let x = 0; x < n; x++) {
			const a = y * (n + 1) + x;
			const b = a + 1;
			const c = a + n + 1;
			const d = c + 1;
			indices[k++] = a;
			indices[k++] = b;
			indices[k++] = c;
			indices[k++] = b;
			indices[k++] = d;
			indices[k++] = c;
		}
	}
	return indices;
}

export function textureSize(width: number, height: number, maxSide: number): Size {
	assertPositive(width, 'width');
	assertPositive(height, 'height');
	assert(
		Number.isInteger(maxSide) && maxSide >= 1 && maxSide <= MAX_TEXTURE_SIDE,
		`maxSide ${String(maxSide)} must be an integer from 1 to ${MAX_TEXTURE_SIDE}`,
	);
	const scale = Math.min(1, maxSide / Math.max(width, height));
	return {
		width: Math.min(maxSide, Math.max(1, Math.round(width * scale))),
		height: Math.min(maxSide, Math.max(1, Math.round(height * scale))),
	};
}

export function coverScale(imageAspect: number, boxAspect: number, strength: number, focus: number): Scale {
	assertPositive(imageAspect, 'imageAspect');
	assertPositive(boxAspect, 'boxAspect');
	assert(Number.isFinite(strength) && strength >= 0 && strength <= 0.5, `strength ${String(strength)} must be from 0 to 0.5`);
	assert(Number.isFinite(focus) && focus >= 0 && focus <= 1, `focus ${String(focus)} must be from 0 to 1`);
	const zoom = 1 + 2 * strength * Math.max(focus, 1 - focus);
	return {
		x: Math.max(1, imageAspect / boxAspect) * zoom,
		y: Math.max(1, boxAspect / imageAspect) * zoom,
	};
}

export function dilateDepth(pixels: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray<ArrayBuffer> {
	assert(Number.isInteger(width) && width >= 1 && Number.isInteger(height) && height >= 1, 'depth size must be positive integers');
	assert(pixels.length === width * height * 4, `depth has ${pixels.length} values, expected ${width * height * 4}`);
	assert(Number.isInteger(radius) && radius >= 0 && radius <= 16, `radius ${String(radius)} must be an integer from 0 to 16`);
	const rows = new Uint8ClampedArray(width * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let most = 0;
			for (let i = Math.max(0, x - radius); i <= Math.min(width - 1, x + radius); i++) most = Math.max(most, pixels[(y * width + i) * 4]);
			rows[y * width + x] = most;
		}
	}
	const out = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let most = 0;
			for (let j = Math.max(0, y - radius); j <= Math.min(height - 1, y + radius); j++) most = Math.max(most, rows[j * width + x]);
			const k = (y * width + x) * 4;
			out[k] = most;
			out[k + 1] = most;
			out[k + 2] = most;
			out[k + 3] = 255;
		}
	}
	return out;
}
