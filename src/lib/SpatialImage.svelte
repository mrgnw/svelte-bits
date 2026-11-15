<script module lang="ts">
	import type { MotionState } from './spatial-input.js';

	export type SpatialControls = {
		motion: MotionState;
		requestMotion: () => void;
		spatial: boolean;
		enterSpatial: () => void;
	};
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { HTMLAttributes } from 'svelte/elements';
	import { fullscreenSupported, imageControlsSupported } from './spatial-fullscreen.js';
	import { attachSpatialInput, type SpatialInput } from './spatial-input.js';
	import {
		acquireRenderer,
		SPATIAL_VIEWS,
		TEXTURE_SIZE_MAX,
		TEXTURE_SIZE_MIN,
		type Renderer,
		type SpatialView,
	} from './spatial-renderer.js';
	import { clampTilt, type Tilt } from './spatial-tilt.js';

	type Props = Omit<HTMLAttributes<HTMLDivElement>, 'onerror' | 'children'> & {
		src: string;
		alt: string;
		depth?: string;
		back?: string;
		backDepth?: string;
		spatial?: string;
		strength?: number;
		focus?: number;
		scroll?: number;
		textureSize?: number;
		tilt?: Tilt;
		view?: SpatialView;
		controls?: Snippet<[SpatialControls]>;
		onready?: () => void;
		onerror?: (error: Error) => void;
	};

	let {
		src,
		alt,
		depth,
		back,
		backDepth,
		spatial,
		strength = 0.08,
		focus = 0.5,
		scroll = 0.35,
		textureSize = 1024,
		tilt: controlledTilt,
		view = 'composite',
		controls,
		onready,
		onerror,
		class: className,
		...rest
	}: Props = $props();

	function assert(ok: boolean, message: string): asserts ok {
		if (!ok) throw new Error(`SpatialImage: ${message}`);
	}

	function assertRange(name: string, value: number, min: number, max: number) {
		assert(typeof value === 'number' && value >= min && value <= max, `${name} ${String(value)} must be from ${min} to ${max}`);
	}

	function assertUrl(name: string, value: string | undefined) {
		assert(value === undefined || (typeof value === 'string' && value !== ''), `${name} must be a non-empty string`);
	}

	const valid = $derived.by(() => {
		assert(typeof src === 'string' && src !== '', 'src must be a non-empty string');
		assert(typeof alt === 'string', 'alt must be a string');
		assertUrl('depth', depth);
		assertUrl('back', back);
		assertUrl('backDepth', backDepth);
		assert((back === undefined) === (backDepth === undefined), 'back and backDepth must be set together');
		assertUrl('spatial', spatial);
		assertRange('strength', strength, 0, 0.5);
		assertRange('focus', focus, 0, 1);
		assertRange('scroll', scroll, 0, 1);
		assert(Number.isInteger(textureSize), `textureSize ${String(textureSize)} must be an integer`);
		assertRange('textureSize', textureSize, TEXTURE_SIZE_MIN, TEXTURE_SIZE_MAX);
		assert(
			controlledTilt === undefined || (Number.isFinite(controlledTilt.x) && Number.isFinite(controlledTilt.y)),
			'tilt x and y must be finite numbers',
		);
		assert(SPATIAL_VIEWS.includes(view), `view ${String(view)} must be one of ${SPATIAL_VIEWS.join(', ')}`);
		assert(!view.startsWith('back') || back !== undefined, `view ${view} needs back and backDepth`);
		return true;
	});

	let renderer = $state.raw<Renderer | null>(null);
	let generation = $state(0);
	let ready = $state(false);
	let motion = $state<MotionState>('unsupported');
	let spatialDecoded = $state(false);
	let spatialImage = $state<HTMLImageElement | null>(null);
	let target: HTMLCanvasElement | null = null;
	let input: SpatialInput | null = null;
	let tilt: Tilt = { x: 0, y: 0 };
	const controlled = $derived(controlledTilt !== undefined);
	let announced = false;
	let loadedGeneration = 0;
	let loadedSource = '';

	const sceneSrc = $derived(src);
	const sceneDepth = $derived(depth);
	const sceneBack = $derived(back);
	const sceneBackDepth = $derived(backDepth);
	const sceneSize = $derived(textureSize);

	const spatialInline = $derived(spatialDecoded && !depth && imageControlsSupported(HTMLImageElement.prototype));

	const api: SpatialControls = $derived({
		motion,
		requestMotion: () => input?.requestMotion(),
		spatial: spatialDecoded,
		enterSpatial,
	});

	function report(error: unknown) {
		onerror?.(error instanceof Error ? error : new Error(`SpatialImage: ${String(error)}`));
	}

	function fail(error: unknown) {
		ready = false;
		report(error);
	}

	function enterSpatial() {
		assert(spatialImage !== null, 'enterSpatial called while spatial is false');
		spatialImage.requestFullscreen().catch(report);
	}

	function probeSpatial() {
		const url = spatial;
		spatialDecoded = false;
		if (!url || !fullscreenSupported(document.fullscreenEnabled, HTMLImageElement.prototype)) return;
		const probe = new Image();
		let live = true;
		probe.src = url;
		probe.decode().then(
			() => {
				if (live) spatialDecoded = true;
			},
			() => {},
		);
		return () => {
			live = false;
			probe.src = '';
		};
	}

	function draw() {
		if (!renderer || !target) return;
		if (!renderer.draw(target, tilt, strength, focus, view)) return;
		if (ready) return;
		ready = true;
		if (announced) return;
		announced = true;
		onready?.();
	}

	function attachRenderer(canvas: HTMLCanvasElement) {
		const acquired = acquireRenderer({
			onlost: () => (ready = false),
			onrestored: () => generation++,
			onerror: fail,
		});
		if (acquired instanceof Error) {
			untrack(() => fail(acquired));
			return;
		}
		target = canvas;
		renderer = acquired;
		const resize = new ResizeObserver(draw);
		resize.observe(canvas);
		return () => {
			resize.disconnect();
			acquired.release();
			renderer = null;
			target = null;
			ready = false;
		};
	}

	function attachInput(canvas: HTMLCanvasElement) {
		if (!renderer || controlled) return;
		const attached = attachSpatialInput(canvas, {
			scroll: () => scroll,
			ontilt: (next) => {
				tilt = next;
				draw();
			},
			onmotion: (state) => (motion = state),
		});
		input = attached;
		return () => {
			attached.destroy();
			input = null;
			motion = 'unsupported';
		};
	}

	function loadScene() {
		const restored = generation !== loadedGeneration;
		const source = [sceneSrc, sceneDepth, sceneBack, sceneBackDepth].join('\n');
		const depthUrl = sceneDepth;
		loadedGeneration = generation;
		const loader = renderer;
		if (!loader || !depthUrl) return;
		if (!restored || source !== loadedSource) announced = false;
		loadedSource = source;
		ready = false;
		loader.unload();
		const controller = new AbortController();
		const sources = { src: sceneSrc, depth: depthUrl, back: sceneBack, backDepth: sceneBackDepth };
		loader.load(sources, sceneSize, controller.signal).then(draw, (error: unknown) => {
			if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
			fail(error);
		});
		return () => controller.abort();
	}

	function follow() {
		if (!controlledTilt) return;
		tilt = clampTilt(controlledTilt);
		untrack(draw);
	}

	function redraw() {
		void strength;
		void focus;
		void view;
		void scroll;
		untrack(() => {
			draw();
			input?.wake();
		});
	}
</script>

{#if valid}
	<div {...rest} class={['spatial-image', className]} {@attach probeSpatial}>
		{#if !spatialInline}
			<img {src} {alt} />
		{/if}
		{#if depth}
			<canvas
				aria-hidden="true"
				data-ready={ready || undefined}
				{@attach attachRenderer}
				{@attach attachInput}
				{@attach loadScene}
				{@attach redraw}
				{@attach follow}
			></canvas>
		{/if}
		{#if spatialDecoded}
			<img
				src={spatial}
				{alt}
				class="spatial-image-spatial"
				data-inline={spatialInline || undefined}
				{...imageControlsSupported(HTMLImageElement.prototype) ? { controls: '' } : {}}
				bind:this={spatialImage}
			/>
		{/if}
		{#if controls}
			{@render controls(api)}
		{:else}
			{#if motion === 'prompt' && !prefersReducedMotion.current}
				<button type="button" class="spatial-image-motion" onclick={api.requestMotion}>Enable motion</button>
			{/if}
			{#if spatialDecoded && !spatialInline}
				<button type="button" class="spatial-image-enter" onclick={enterSpatial}>View in spatial</button>
			{/if}
		{/if}
	</div>
{/if}

<style>
	.spatial-image {
		position: relative;
	}

	img,
	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	img {
		object-fit: cover;
	}

	canvas {
		position: absolute;
		inset: 0;
		visibility: hidden;
		touch-action: pan-y;
	}

	canvas[data-ready] {
		visibility: visible;
	}

	.spatial-image-spatial:not([data-inline], :fullscreen) {
		display: none;
	}

	.spatial-image-spatial:fullscreen {
		object-fit: contain;
	}

	.spatial-image-motion {
		position: absolute;
		inset: auto 0.5rem 0.5rem auto;
	}

	.spatial-image-enter {
		position: absolute;
		inset: auto auto 0.5rem 0.5rem;
	}
</style>
