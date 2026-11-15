import { coverScale, dilateDepth, gridSize, meshIndices, meshPositions, textureSize } from './spatial-mesh.js';
import type { Tilt } from './spatial-tilt.js';

export const TEXTURE_SIZE_MIN = 64;
export const TEXTURE_SIZE_MAX = 4096;
export const PIXEL_RATIO_MAX = 2;
export const CANVAS_SIZE_MAX = 4096;
export const LAYERED_STRENGTH_MAX = 0.06;
const FRONT_DILATE = 4;

export type RendererEvents = { onlost: () => void; onrestored: () => void; onerror: (error: Error) => void };

export type SpatialView = 'composite' | 'front' | 'back' | 'depth' | 'back-depth';

export const SPATIAL_VIEWS: readonly SpatialView[] = ['composite', 'front', 'back', 'depth', 'back-depth'];

export type SceneSources = { src: string; depth: string; back?: string; backDepth?: string };

export type Renderer = {
	readonly program: WebGLProgram | null;
	load: (sources: SceneSources, maxSide: number, signal: AbortSignal) => Promise<void>;
	draw: (target: HTMLCanvasElement, tilt: Tilt, strength: number, focus: number, view?: SpatialView) => boolean;
	unload: () => void;
	release: () => void;
};

type Layer = { photo: WebGLTexture; depth: WebGLTexture; texel: { x: number; y: number } };

type Scene = { front: Layer; back: Layer | null; aspect: number };

type Pipeline = {
	program: WebGLProgram;
	buffers: WebGLBuffer[];
	count: number;
	indexType: number;
	scale: WebGLUniformLocation;
	tilt: WebGLUniformLocation;
	strength: WebGLUniformLocation;
	focus: WebGLUniformLocation;
	texel: WebGLUniformLocation;
	front: WebGLUniformLocation;
	shade: WebGLUniformLocation;
	maxSide: number;
};

type Shared = {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;
	pipeline: Pipeline | null;
	instances: Set<RendererEvents>;
};

const VERTEX = `precision highp float;
attribute vec2 p;
uniform sampler2D depth;
uniform vec2 scale;
uniform vec2 tilt;
uniform float strength;
uniform float focus;
uniform vec2 texel;
uniform float front;
varying vec2 uv;
const float SMOOTH = 6.0;
float smoothed() {
	float sum = 0.0;
	for (int y = -2; y <= 2; y++) {
		for (int x = -2; x <= 2; x++) sum += texture2D(depth, p + vec2(float(x), float(y)) * texel * SMOOTH).r;
	}
	return sum / 25.0;
}
void main() {
	uv = p;
	float d = front > 0.5 ? texture2D(depth, p).r : smoothed();
	vec2 pos = 0.5 + (p - 0.5) * scale + tilt * (d - focus) * strength;
	gl_Position = vec4(pos * 2.0 - 1.0, -d, 1.0);
}`;

const FRAGMENT = `precision highp float;
uniform sampler2D photo;
uniform sampler2D depth;
uniform vec2 scale;
uniform vec2 tilt;
uniform float strength;
uniform vec2 texel;
uniform float front;
uniform float shade;
varying vec2 uv;
const int FEATHER = 3;
const float GAP = 0.003;
const float CHECKER = 12.0;
void main() {
	if (shade > 1.5) {
		float d = texture2D(depth, uv).r;
		gl_FragColor = vec4(d, d, d, 1.0);
		return;
	}
	if (shade > 0.5) {
		vec2 cell = floor(gl_FragCoord.xy / CHECKER);
		gl_FragColor = vec4(vec3(mod(cell.x + cell.y, 2.0) > 0.5 ? 0.8 : 0.6), 1.0);
		return;
	}
	vec4 color = texture2D(photo, uv);
	float motion = strength * length(tilt);
	if (front < 0.5 || motion < 0.00001) {
		gl_FragColor = color;
		return;
	}
	vec2 step = normalize(tilt / scale) * texel;
	float before = texture2D(depth, uv - step * float(FEATHER + 1)).r;
	float here = texture2D(depth, uv - step * float(FEATHER)).r;
	float cover = 0.0;
	for (int k = -FEATHER; k <= FEATHER; k++) {
		float after = texture2D(depth, uv + step * float(k + 1)).r;
		float edge = smoothstep(0.5, 1.5, motion * abs(after - before) / GAP);
		float reach = clamp((float(FEATHER + 1) - abs(float(k))) / float(FEATHER - 1), 0.0, 1.0);
		cover = max(cover, edge * reach);
		before = here;
		here = after;
	}
	if (cover > 0.996) discard;
	gl_FragColor = vec4(color.rgb, 1.0 - cover);
}`;

const COLOR = 0;
const CHECKER = 1;
const DEPTH = 2;

const PASSES: Record<SpatialView, { back: number | null; front: number | null }> = {
	composite: { back: COLOR, front: COLOR },
	front: { back: CHECKER, front: COLOR },
	back: { back: COLOR, front: null },
	depth: { back: null, front: DEPTH },
	'back-depth': { back: DEPTH, front: null },
};

let shared: Shared | null = null;

function assert(ok: boolean, message: string): asserts ok {
	if (!ok) throw new Error(`SpatialImage: ${message}`);
}

function failure(message: string): Error {
	return new Error(`SpatialImage: ${message}`);
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw failure('could not create a shader');
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
	const log = gl.getShaderInfoLog(shader);
	gl.deleteShader(shader);
	throw failure(`shader: ${log}`);
}

function uniform(gl: WebGLRenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
	const location = gl.getUniformLocation(program, name);
	if (!location) throw failure(`missing uniform ${name}`);
	return location;
}

function buffer(gl: WebGLRenderingContext, target: number, data: BufferSource): WebGLBuffer {
	const created = gl.createBuffer();
	if (!created) throw failure('could not create a buffer');
	gl.bindBuffer(target, created);
	gl.bufferData(target, data, gl.STATIC_DRAW);
	return created;
}

function canvasLimit(gl: WebGLRenderingContext): number {
	const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
	return Math.min(
		CANVAS_SIZE_MAX,
		gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
		gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
		viewport[0],
		viewport[1],
	);
}

function build(gl: WebGLRenderingContext): Pipeline {
	if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) throw failure('no vertex texture units');
	const program = gl.createProgram();
	if (!program) throw failure('could not create a program');
	const buffers: WebGLBuffer[] = [];
	try {
		return setup(gl, program, buffers);
	} catch (error) {
		free(gl, program, buffers);
		throw error;
	}
}

function setup(gl: WebGLRenderingContext, program: WebGLProgram, buffers: WebGLBuffer[]): Pipeline {
	gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
	gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw failure(`program: ${gl.getProgramInfoLog(program)}`);
	gl.useProgram(program);

	const n = gridSize(gl.getExtension('OES_element_index_uint') !== null);
	const indices = meshIndices(n);
	buffers.push(buffer(gl, gl.ARRAY_BUFFER, meshPositions(n)));
	buffers.push(buffer(gl, gl.ELEMENT_ARRAY_BUFFER, indices));
	const p = gl.getAttribLocation(program, 'p');
	gl.enableVertexAttribArray(p);
	gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.uniform1i(uniform(gl, program, 'photo'), 0);
	gl.uniform1i(uniform(gl, program, 'depth'), 1);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.clearColor(0, 0, 0, 1);
	return {
		program,
		buffers,
		count: indices.length,
		indexType: indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
		scale: uniform(gl, program, 'scale'),
		tilt: uniform(gl, program, 'tilt'),
		strength: uniform(gl, program, 'strength'),
		focus: uniform(gl, program, 'focus'),
		texel: uniform(gl, program, 'texel'),
		front: uniform(gl, program, 'front'),
		shade: uniform(gl, program, 'shade'),
		maxSide: canvasLimit(gl),
	};
}

function free(gl: WebGLRenderingContext, program: WebGLProgram, buffers: WebGLBuffer[]) {
	for (const shader of gl.getAttachedShaders(program) ?? []) gl.deleteShader(shader);
	gl.deleteProgram(program);
	for (const created of buffers) gl.deleteBuffer(created);
}

function released(): DOMException {
	return new DOMException('SpatialImage: renderer was released', 'AbortError');
}

function context(): Shared | Error {
	if (shared) return shared;
	const canvas = document.createElement('canvas');
	const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: true });
	if (!gl) return failure('WebGL is unavailable');
	const created: Shared = { canvas, gl, pipeline: null, instances: new Set() };
	canvas.addEventListener('webglcontextlost', (event) => {
		event.preventDefault();
		created.pipeline = null;
		for (const instance of created.instances) instance.onlost();
	});
	canvas.addEventListener('webglcontextrestored', () => {
		if (created.instances.size === 0) return;
		try {
			created.pipeline = build(gl);
		} catch (error) {
			const reported = error instanceof Error ? error : failure(String(error));
			for (const instance of created.instances) instance.onerror(reported);
			return;
		}
		for (const instance of created.instances) instance.onrestored();
	});
	shared = created;
	return created;
}

function loadImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		const abort = () => {
			image.src = '';
			reject(signal.reason);
		};
		signal.addEventListener('abort', abort, { once: true });
		image.crossOrigin = 'anonymous';
		image.onload = () => {
			signal.removeEventListener('abort', abort);
			resolve(image);
		};
		image.onerror = () => {
			signal.removeEventListener('abort', abort);
			reject(failure(`could not load ${url}`));
		};
		image.src = url;
	});
}

function shrink(image: HTMLImageElement, maxSide: number): HTMLCanvasElement {
	const size = textureSize(image.naturalWidth, image.naturalHeight, maxSide);
	const canvas = document.createElement('canvas');
	canvas.width = size.width;
	canvas.height = size.height;
	const context2d = canvas.getContext('2d');
	if (!context2d) throw failure('could not create a 2D canvas');
	context2d.drawImage(image, 0, 0, size.width, size.height);
	return canvas;
}

function dilated(canvas: HTMLCanvasElement, radius: number): ImageData {
	const context2d = canvas.getContext('2d');
	if (!context2d) throw failure('could not create a 2D canvas');
	const { width, height } = canvas;
	const pixels = context2d.getImageData(0, 0, width, height).data;
	return new ImageData(dilateDepth(pixels, width, height, radius), width, height);
}

function layerFrom(gl: WebGLRenderingContext, photo: HTMLImageElement, depth: HTMLImageElement, side: number, front: boolean): Layer {
	const photoTexture = texture(gl, shrink(photo, side));
	try {
		const depthCanvas = shrink(depth, side);
		return {
			photo: photoTexture,
			depth: texture(gl, front ? dilated(depthCanvas, FRONT_DILATE) : depthCanvas),
			texel: { x: 1 / depthCanvas.width, y: 1 / depthCanvas.height },
		};
	} catch (error) {
		gl.deleteTexture(photoTexture);
		throw error;
	}
}

function dropLayer(gl: WebGLRenderingContext, layer: Layer) {
	gl.deleteTexture(layer.photo);
	gl.deleteTexture(layer.depth);
}

function sceneFrom(gl: WebGLRenderingContext, images: HTMLImageElement[], side: number): Scene {
	const [photo, depth, back, backDepth] = images;
	const front = layerFrom(gl, photo, depth, side, true);
	try {
		return {
			front,
			back: back && backDepth ? layerFrom(gl, back, backDepth, side, false) : null,
			aspect: photo.naturalWidth / photo.naturalHeight,
		};
	} catch (error) {
		dropLayer(gl, front);
		throw error;
	}
}

function texture(gl: WebGLRenderingContext, source: HTMLCanvasElement | ImageData): WebGLTexture {
	const created = gl.createTexture();
	if (!created) throw failure('could not create a texture');
	gl.bindTexture(gl.TEXTURE_2D, created);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
	return created;
}

function drawLayer(gl: WebGLRenderingContext, pipeline: Pipeline, layer: Layer, strength: number, front: number, shade: number) {
	gl.uniform1f(pipeline.strength, strength);
	gl.uniform1f(pipeline.front, front);
	gl.uniform1f(pipeline.shade, shade);
	gl.uniform2f(pipeline.texel, layer.texel.x, layer.texel.y);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, layer.photo);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, layer.depth);
	gl.drawElements(gl.TRIANGLES, pipeline.count, pipeline.indexType, 0);
}

function render(
	gl: WebGLRenderingContext,
	pipeline: Pipeline,
	scene: Scene,
	width: number,
	height: number,
	tilt: Tilt,
	requested: number,
	focus: number,
	view: SpatialView,
) {
	const pass = PASSES[view];
	const strength = scene.back ? Math.min(requested, LAYERED_STRENGTH_MAX) : requested;
	const scale = coverScale(scene.aspect, width / height, strength, focus);
	gl.viewport(0, 0, width, height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.uniform2f(pipeline.scale, scale.x, scale.y);
	gl.uniform2f(pipeline.tilt, tilt.x, -tilt.y);
	gl.uniform1f(pipeline.focus, focus);
	if (pass.back !== null) drawLayer(gl, pipeline, scene.back ?? scene.front, strength, 0, pass.back);
	gl.clear(gl.DEPTH_BUFFER_BIT);
	if (pass.front !== null) drawLayer(gl, pipeline, scene.front, strength, 1, pass.front);
}

export function acquireRenderer(events: RendererEvents): Renderer | Error {
	const state = context();
	if (state instanceof Error) return state;
	const { canvas, gl } = state;
	if (!state.pipeline && !gl.isContextLost()) {
		try {
			state.pipeline = build(gl);
		} catch (error) {
			return error instanceof Error ? error : failure(String(error));
		}
	}
	let scene: Scene | null = null;
	let done = false;
	const instance: RendererEvents = {
		onlost() {
			scene = null;
			events.onlost();
		},
		onrestored: events.onrestored,
		onerror: events.onerror,
	};
	state.instances.add(instance);

	function dropScene() {
		if (!scene) return;
		dropLayer(gl, scene.front);
		if (scene.back) dropLayer(gl, scene.back);
		scene = null;
	}

	return {
		get program() {
			return state.pipeline?.program ?? null;
		},

		async load(sources, maxSide, signal) {
			if (done) throw released();
			const { src, depth, back, backDepth } = sources;
			assert(typeof src === 'string' && src !== '', 'src must be a non-empty string');
			assert(typeof depth === 'string' && depth !== '', 'depth must be a non-empty string');
			assert((back === undefined) === (backDepth === undefined), 'back and backDepth must be set together');
			assert(back !== '' && backDepth !== '', 'back and backDepth must be non-empty strings');
			assert(
				Number.isInteger(maxSide) && maxSide >= TEXTURE_SIZE_MIN && maxSide <= TEXTURE_SIZE_MAX,
				`textureSize ${String(maxSide)} must be an integer from ${TEXTURE_SIZE_MIN} to ${TEXTURE_SIZE_MAX}`,
			);
			signal.throwIfAborted();
			const urls = back && backDepth ? [src, depth, back, backDepth] : [src, depth];
			const images = await Promise.all(urls.map((url) => loadImage(url, signal)));
			signal.throwIfAborted();
			if (done) throw released();
			if (gl.isContextLost()) throw failure('WebGL context is lost');
			const side = Math.min(maxSide, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);
			const next = sceneFrom(gl, images, side);
			dropScene();
			scene = next;
		},

		draw(target, tilt, strength, focus, view = 'composite') {
			if (done) return false;
			assert(SPATIAL_VIEWS.includes(view), `view ${String(view)} is not one of ${SPATIAL_VIEWS.join(', ')}`);
			assert(Number.isFinite(tilt.x) && Number.isFinite(tilt.y), 'tilt must be finite');
			const pipeline = state.pipeline;
			if (!scene || !pipeline || gl.isContextLost()) return false;
			const ratio = Math.min(PIXEL_RATIO_MAX, window.devicePixelRatio || 1);
			const cssWidth = Math.round(target.clientWidth * ratio);
			const cssHeight = Math.round(target.clientHeight * ratio);
			if (cssWidth === 0 || cssHeight === 0) return false;
			const output = target.getContext('2d');
			if (!output) return false;
			const { width, height } = textureSize(cssWidth, cssHeight, pipeline.maxSide);
			if (target.width !== width) target.width = width;
			if (target.height !== height) target.height = height;
			if (canvas.width < width) canvas.width = width;
			if (canvas.height < height) canvas.height = height;
			render(gl, pipeline, scene, width, height, tilt, strength, focus, view);
			output.drawImage(canvas, 0, canvas.height - height, width, height, 0, 0, width, height);
			return true;
		},

		unload: dropScene,

		release() {
			if (done) return;
			done = true;
			dropScene();
			state.instances.delete(instance);
			if (state.instances.size > 0) return;
			canvas.width = 1;
			canvas.height = 1;
			if (!state.pipeline) return;
			free(gl, state.pipeline.program, state.pipeline.buffers);
			state.pipeline = null;
		},
	};
}
