<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { SpatialImage } from '#lib';
	import Source from '../Source.svelte';
	import { arrowStep } from './arrowStep';
	import Icon from './Icon.svelte';
	import MotionControl from './MotionControl.svelte';
	import { PHOTOS, photoUrls, type Photo } from './photos';

	let { source, photo }: { source: { code: string; html: string }; photo: Photo } = $props();

	const CUSTOM_ALT = 'Custom photo';

	const FIELDS = ['src', 'depth', 'back', 'backDepth', 'spatial'] as const;
	type Field = (typeof FIELDS)[number];

	const urls = (stem: string): Record<Field, string> => photoUrls(stem);

	let alt = $derived(photo.alt);
	let values = $derived(urls(photo.stem));
	let failure = $derived.by(() => {
		void photo;
		return '';
	});
	let strength = $state(0.08);
	let focus = $state(0.5);
	let scroll = $state(0.35);
	let shown = $state(true);
	let open = $state(false);
	const index = $derived(PHOTOS.findIndex((option) => option.slug === photo.slug));
	const previous = $derived(PHOTOS[(index + PHOTOS.length - 1) % PHOTOS.length]);
	const next = $derived(PHOTOS[(index + 1) % PHOTOS.length]);
	const objectUrls: Partial<Record<Field, string>> = {};
	const layered = $derived(values.back !== '' && values.backDepth !== '');

	function release(field: Field) {
		const url = objectUrls[field];
		if (url) URL.revokeObjectURL(url);
		delete objectUrls[field];
	}

	function pick(chosen: Photo) {
		for (const field of FIELDS) release(field);
		alt = chosen.alt;
		failure = '';
		values = urls(chosen.stem);
	}

	function commit(field: Field, value: string) {
		release(field);
		if (field === 'src') alt = CUSTOM_ALT;
		failure = '';
		values = { ...values, [field]: value };
	}

	function choose(field: Field, file: File | undefined) {
		if (!file) return;
		commit(field, URL.createObjectURL(file));
		objectUrls[field] = values[field];
	}

	function stepPhoto(event: KeyboardEvent) {
		const step = arrowStep(event);
		if (step === 0) return;
		const chosen = step < 0 ? previous : next;
		event.preventDefault();
		pick(chosen);
		void goto(`/spatial-image/${chosen.slug}`, { replace: true, reset: false });
	}

	function toggleOnTap(stage: HTMLElement) {
		let start = { x: 0, y: 0 };
		const down = (event: PointerEvent) => (start = { x: event.clientX, y: event.clientY });
		const click = (event: MouseEvent) => {
			if (!(event.target instanceof Element) || event.target.closest('.islands')) return;
			if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
			shown = !shown;
		};
		stage.addEventListener('pointerdown', down);
		stage.addEventListener('click', click);
		return () => {
			stage.removeEventListener('pointerdown', down);
			stage.removeEventListener('click', click);
		};
	}

	$effect(() => () => {
		for (const field of FIELDS) release(field);
	});
</script>

{#snippet photoLink(option: Photo, label: string, text: string)}
	<a
		href="/spatial-image/{option.slug}"
		aria-label={label}
		data-sveltekit-replacestate
		data-sveltekit-reset="false"
		onclick={() => pick(option)}>{text}</a
	>
{/snippet}

<svelte:window onkeydown={stepPhoto} />

<div class="stage" {@attach toggleOnTap}>
	<SpatialImage
		class="example-spatial"
		src={values.src || urls(photo.stem).src}
		depth={values.depth || undefined}
		back={layered ? values.back : undefined}
		backDepth={layered ? values.backDepth : undefined}
		spatial={values.spatial || undefined}
		{alt}
		onerror={(error) => (failure = error.message)}
		{strength}
		{focus}
		{scroll}
	>
		{#snippet controls({ motion, requestMotion, spatial, enterSpatial })}
			<div class="islands" data-shown={shown || undefined}>
				<div class="row bar">
					<MotionControl {motion} {requestMotion} />
					{#if shown}
						<button
							type="button"
							class="pill glyph"
							aria-label="Settings"
							title="Settings"
							aria-expanded={open}
							aria-controls="spatial-settings"
							onclick={() => (open = !open)}
						>
							<Icon name="settings" />
						</button>
					{/if}
					<button type="button" class="pill" onclick={() => (shown = !shown)}>
						{shown ? 'Hide controls' : 'Show controls'}
					</button>
				</div>

				<div class="hideable">
					<nav class="pill switcher" aria-label="Demo photo">
						{@render photoLink(previous, `Previous photo: ${previous.name}`, '‹')}
						<div class="title">
							<h1>SpatialImage</h1>
							<p>{photo.name} <span>{index + 1}/{PHOTOS.length}</span></p>
						</div>
						{@render photoLink(next, `Next photo: ${next.name}`, '›')}
					</nav>

					{#if spatial}
						<div class="row">
							<button type="button" class="pill" onclick={enterSpatial}>View in spatial</button>
						</div>
					{/if}

					{#if failure}
						<p class="pill failure" role="alert">{failure}</p>
					{/if}

					{#if open}
						<div
							id="spatial-settings"
							class="panel"
							transition:slide={{ duration: prefersReducedMotion.current ? 0 : 200 }}
						>
							<ul class="photos" aria-label="Demo photos">
								{#each PHOTOS as option (option.slug)}
									<li>
										<a
											href="/spatial-image/{option.slug}"
											aria-label={option.name}
											aria-current={option.slug === photo.slug ? 'true' : undefined}
											data-sveltekit-replacestate
											data-sveltekit-reset="false"
											onclick={() => pick(option)}
										>
											<img src="/spatial/{option.stem}.avif" alt="" width="300" height="200" loading="lazy" />
										</a>
									</li>
								{/each}
							</ul>

							<div class="ranges">
								<label>
									<span>strength <output>{strength.toFixed(2)}</output></span>
									<input type="range" min="0" max="0.5" step="0.01" bind:value={strength} />
								</label>
								<label>
									<span>focus <output>{focus.toFixed(2)}</output></span>
									<input type="range" min="0" max="1" step="0.01" bind:value={focus} />
								</label>
								<label>
									<span>scroll <output>{scroll.toFixed(2)}</output></span>
									<input type="range" min="0" max="1" step="0.01" bind:value={scroll} />
								</label>
							</div>

							<div class="fields">
								{#each FIELDS as field (field)}
									<div class="field">
										<label for="spatial-{field}-url">{field}</label>
										<input
											id="spatial-{field}-url"
											type="text"
											inputmode="url"
											value={values[field]}
											placeholder="https://"
											onchange={(event) => commit(field, event.currentTarget.value.trim())}
										/>
										<input
											type="file"
											accept={field === 'spatial' ? '.heic,image/heic' : 'image/*'}
											aria-label="Choose {field} file"
											onchange={(event) => choose(field, event.currentTarget.files?.[0])}
										/>
									</div>
								{/each}
							</div>
							<p class="note">
								Remote files need CORS headers. Clearing depth shows the flat image. Clearing back or backDepth drops the background layer, and the gap beside near objects shows a smooth smear instead. The spatial file only
								matters where the "View in spatial" button appears.
							</p>

							<Source {source} />
						</div>
					{/if}
				</div>
			</div>
		{/snippet}
	</SpatialImage>
</div>

<style>
	.stage {
		position: relative;
		block-size: 100dvh;
		background-color: var(--stage);
		background-image: radial-gradient(var(--dot) 1px, transparent 1px);
		background-size: 16px 16px;
	}

	.stage :global(.example-spatial) {
		inline-size: 100%;
		max-inline-size: calc(100dvh * 2.2);
		block-size: 100%;
		margin-inline: auto;
		overflow: clip;
	}

	.islands {
		--island-bg: color-mix(in srgb, var(--surface) 90%, transparent);
		position: absolute;
		inset: auto 0 0 0;
		display: flex;
		flex-direction: column-reverse;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem max(0.75rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom))
			max(0.75rem, env(safe-area-inset-left));
		pointer-events: none;
	}

	.islands > *,
	.hideable > * {
		pointer-events: auto;
	}

	.hideable {
		display: flex;
		flex-direction: column-reverse;
		align-items: center;
		gap: 0.5rem;
		inline-size: 100%;
		pointer-events: none;
	}

	.islands:not([data-shown]) .hideable {
		visibility: hidden;
		opacity: 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		.hideable {
			transition:
				opacity 0.2s,
				visibility 0.2s;
		}
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		max-inline-size: 100%;
		pointer-events: none;
	}

	.row > :global(*) {
		pointer-events: auto;
	}

	.bar {
		flex-wrap: nowrap;
	}

	.bar .pill {
		padding-inline: 0.875rem;
	}

	.bar .pill.glyph {
		padding: 0;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		box-sizing: border-box;
		min-block-size: 2.75rem;
		margin: 0;
		padding: 0 1rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--island-bg);
		backdrop-filter: blur(8px);
		box-shadow: var(--shadow);
		color: var(--ink);
		font: 500 0.875rem/1 system-ui, sans-serif;
		white-space: nowrap;
		-webkit-tap-highlight-color: transparent;
	}

	button.pill {
		cursor: pointer;
	}

	button.pill:hover {
		background: var(--hover);
	}

	button.pill:active {
		scale: 0.97;
	}

	.pill[aria-expanded='true'] {
		border-color: var(--accent);
		color: var(--accent-ink);
	}

	.pill.glyph {
		flex: none;
		justify-content: center;
		inline-size: 2.75rem;
		padding: 0;
	}

	.pill.failure {
		white-space: normal;
		max-inline-size: 100%;
		color: var(--danger, #c0392b);
		font: 0.8125rem/1.3 var(--mono);
	}

	.switcher {
		padding: 0 0.25rem;
		max-inline-size: 100%;
	}

	.switcher a {
		display: grid;
		place-items: center;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		border-radius: 999px;
		color: var(--ink);
		font-size: 1.5rem;
		text-decoration: none;
	}

	.switcher a:hover {
		background: var(--hover);
	}

	.title {
		display: grid;
		gap: 0.125rem;
		min-inline-size: 9rem;
		padding-block: 0.375rem;
		text-align: center;
	}

	h1 {
		margin: 0;
		font: 600 0.6875rem/1 system-ui, sans-serif;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-ink);
	}

	.title p {
		margin: 0;
		font: 600 1rem/1.2 var(--display);
		color: var(--ink);
	}

	.title span {
		font: 0.75rem/1 var(--mono);
		color: var(--muted);
	}

	.panel {
		container-type: inline-size;
		display: grid;
		gap: 1.25rem;
		box-sizing: border-box;
		inline-size: min(100%, 40rem);
		max-block-size: min(calc(100dvh - 15rem), 44rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: 1rem;
		background: color-mix(in srgb, var(--surface) 95%, transparent);
		backdrop-filter: blur(12px);
		box-shadow: var(--shadow-lift);
	}

	.islands a:focus-visible,
	.islands button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.note {
		margin: 0;
	}

	.photos {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.photos a {
		display: block;
		border: 2px solid transparent;
		border-radius: 0.5rem;
		overflow: clip;
	}

	.photos a[aria-current='true'] {
		border-color: var(--accent);
	}

	.photos img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 3 / 2;
		object-fit: cover;
	}

	.ranges {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 1rem;
	}

	.ranges label {
		display: grid;
		gap: 0.25rem;
		font: 0.8125rem/1.2 var(--mono);
	}

	.ranges output {
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	.ranges input {
		min-block-size: 2.75rem;
		accent-color: var(--accent);
	}

	.fields {
		display: grid;
		gap: 0.75rem;
	}

	.field {
		display: grid;
		grid-template-columns: 4.5rem minmax(0, 1fr) minmax(0, 14rem);
		gap: 0.5rem;
		align-items: center;
	}

	.field label {
		font: 0.8125rem/1 var(--mono);
	}

	.field input[type='text'] {
		min-width: 0;
		min-block-size: 2.75rem;
		box-sizing: border-box;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--line);
		border-radius: 0.375rem;
		background: var(--page);
		color: var(--ink);
		font: 0.8125rem/1.2 var(--mono);
	}

	.field input[type='file'] {
		min-width: 0;
		font-size: 0.8125rem;
	}

	@container (width < 32rem) {
		.field {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
