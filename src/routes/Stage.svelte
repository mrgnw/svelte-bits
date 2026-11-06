<script lang="ts">
	import { untrack, type Snippet } from 'svelte';

	let {
		title,
		blurb,
		breakpoints,
		source,
		children,
	}: { title: string; blurb: string; breakpoints: number[]; source: { code: string; html: string }; children: Snippet } = $props();

	const slug = $derived(title.toLowerCase().replaceAll(' ', '-'));

	const MIN = 240;
	const MAX = 1000;

	let width = $state(untrack(() => Math.min(breakpoints[0] + 20, MAX)));
	let tier = $state(0);
	let modes = $state<[string, string][]>([]);
	let copied = $state(false);

	const ladder = $derived(
		breakpoints
			.map((_, i) => i)
			.concat(breakpoints.length)
			.map((t) => {
				const lower = breakpoints[t] ?? MIN;
				const upper = breakpoints[t - 1] ?? MAX;
				return { t, lower, span: upper - lower };
			})
			.reverse(),
	);

	function readout(frame: HTMLElement) {
		const read = () => {
			const bar = frame.querySelector<HTMLElement>('[data-bar]');
			if (!bar) return;
			tier = Number(getComputedStyle(bar).getPropertyValue('--tier')) || 0;
			const seen = new Map<string, string>();
			for (const slot of frame.querySelectorAll<HTMLElement>('[data-item]')) {
				const id = slot.dataset.item ?? '';
				if (!seen.has(id)) seen.set(id, '');
				const tiers = slot.closest('[data-t]')?.getAttribute('data-t')?.split(' ') ?? [];
				if (tiers.includes(String(tier))) seen.set(id, slot.dataset.mode ?? '');
			}
			modes = [...seen];
		};
		const resized = new ResizeObserver(read);
		const changed = new MutationObserver(read);
		resized.observe(frame);
		changed.observe(frame, { subtree: true, attributeFilter: ['data-t'] });
		read();
		return () => {
			resized.disconnect();
			changed.disconnect();
		};
	}

	async function copy() {
		if (!navigator.clipboard) return;
		await navigator.clipboard.writeText(source.code);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<section aria-labelledby="{slug}-title">
	<header>
		<h2 id="{slug}-title">{title}</h2>
		<p>{blurb}</p>
	</header>

	<div class="bench">
		<div class="stage">
			<span class="size">{width}px</span>
			<div class="frame" style:width="{width}px" {@attach readout}>
				{@render children()}
			</div>
		</div>

		<div class="controls">
			<div class="ladder">
				<ol aria-hidden="true">
					{#each ladder as step (step.t)}
						<li class:on={step.t === tier} style:flex-grow={step.span}>
							<b>{step.t}</b>
							{#if step.t < breakpoints.length}<small>{step.lower}</small>{/if}
						</li>
					{/each}
				</ol>
				<input type="range" min={MIN} max={MAX} step="1" bind:value={width} aria-label="{title} width in pixels" />
			</div>

			<ul class="modes" aria-label="Item modes at tier {tier}">
				{#each modes as [id, mode] (id)}
					<li class="mode-{mode}">{id} <span>{mode}</span></li>
				{/each}
			</ul>
		</div>
	</div>

	<details class="source">
		<summary>Usage</summary>
		<button type="button" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
		{@html source.html}
	</details>
</section>

<style>
	section {
		display: grid;
		gap: 1.5rem;
		min-width: 0;
	}

	header {
		display: grid;
		gap: 0.375rem;
		max-width: 40rem;
	}

	h2 {
		margin: 0;
		font: 600 clamp(1.75rem, 4vw, 2.25rem) / 1.1 var(--display);
		letter-spacing: -0.02em;
	}

	header p {
		margin: 0;
	}

	.bench {
		border: 1px solid var(--line);
		border-radius: 1rem;
		background: var(--surface);
		box-shadow: var(--shadow);
		overflow: clip;
		min-width: 0;
	}

	.stage {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.5rem;
		padding: 1rem clamp(0.75rem, 4vw, 2.5rem) 2.5rem;
		background-color: var(--stage);
		background-image: radial-gradient(var(--dot) 1px, transparent 1px);
		background-size: 16px 16px;
		min-height: 9rem;
		align-content: start;
	}

	.size {
		font: 0.75rem/1 var(--mono);
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	.frame {
		max-width: 100%;
		padding: 0.5rem;
		box-sizing: border-box;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		background: var(--surface);
		box-shadow: var(--shadow-lift);
	}

	.controls {
		display: grid;
		gap: 1rem;
		padding: 1.25rem clamp(0.75rem, 4vw, 2.5rem) 1.5rem;
		border-top: 1px solid var(--line);
	}

	.ladder {
		position: relative;
		margin-bottom: 1.25rem;
	}

	.ladder ol {
		display: flex;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.ladder li {
		position: relative;
		flex-basis: 0;
		display: grid;
		place-items: center;
		height: 2.75rem;
		border-radius: 0.375rem;
		background: var(--hover);
		color: var(--muted);
		transition: background-color 0.15s, color 0.15s;
	}

	.ladder li.on {
		background: var(--accent);
		color: var(--on-accent);
	}

	.ladder b {
		font: 600 1.125rem/1 var(--display);
	}

	.ladder small {
		position: absolute;
		left: 0;
		bottom: -1.25rem;
		font: 0.6875rem/1 var(--mono);
		color: var(--muted);
		transform: translateX(-50%);
		font-variant-numeric: tabular-nums;
	}

	.ladder input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		background: none;
		appearance: none;
		cursor: ew-resize;
	}

	.ladder input::-webkit-slider-runnable-track {
		height: 100%;
		background: none;
	}

	.ladder input::-moz-range-track {
		height: 100%;
		background: none;
	}

	.ladder input::-webkit-slider-thumb {
		appearance: none;
		width: 6px;
		height: 3.5rem;
		margin-top: -0.375rem;
		border-radius: 3px;
		background: var(--ink);
		box-shadow: 0 0 0 2px var(--surface);
	}

	.ladder input::-moz-range-thumb {
		width: 6px;
		height: 3.5rem;
		border: 0;
		border-radius: 3px;
		background: var(--ink);
		box-shadow: 0 0 0 2px var(--surface);
	}

	.ladder input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 4px;
		border-radius: 0.375rem;
	}

	.modes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
		font: 0.75rem/1.2 var(--mono);
	}

	.modes li {
		padding: 0.25rem 0.5rem;
		border-radius: 999px;
		background: var(--hover);
		color: var(--ink);
	}

	.modes li span {
		color: var(--muted);
	}

	.modes .mode-icon span {
		color: var(--accent-ink);
	}

	.modes .mode-menu {
		background: none;
		outline: 1px dashed var(--line);
		outline-offset: -1px;
	}

	.source {
		position: relative;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		background: var(--code-bg);
		overflow: clip;
		min-width: 0;
	}

	summary {
		padding: 0.875rem 1rem;
		font-weight: 500;
		cursor: pointer;
	}

	.source button {
		position: absolute;
		top: 0.5rem;
		right: 0.625rem;
		z-index: 1;
		font: inherit;
		font-size: 0.8125rem;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 0.5rem;
		padding: 0.25rem 0.75rem;
		cursor: pointer;
	}

	.source:not([open]) button {
		display: none;
	}

	.source :global(pre) {
		margin: 0;
		padding: 0.75rem 1rem 1.25rem;
		max-height: 32rem;
		overflow: auto;
		border-top: 1px solid var(--line);
		background: none;
		font: 0.8125rem/1.6 var(--mono);
		tab-size: 2;
	}
</style>
