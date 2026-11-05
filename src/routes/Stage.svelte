<script lang="ts">
	import { untrack, type Snippet } from 'svelte';

	let {
		title,
		breakpoints,
		source,
		children,
	}: { title: string; breakpoints: number[]; source: string; children: Snippet } = $props();

	const slug = $derived(title.toLowerCase().replaceAll(' ', '-'));
	const code = $derived(source.replaceAll("'#lib'", "'svelte-components'"));

	let width = $state(untrack(() => Math.min(breakpoints[0] + 20, 900)));
	let tier = $state(0);
	let modes = $state<[string, string][]>([]);
	let copied = $state(false);

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
		await navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<section aria-labelledby="{slug}-title">
	<h2 id="{slug}-title">{title}</h2>
	<div class="layout">
		<div class="live">
			<label class="width">
				<span>Width <output>{width}px</output></span>
				<input type="range" min="240" max="900" step="1" bind:value={width} />
			</label>
			<div class="stage">
				<div class="frame" style:width="{width}px" {@attach readout}>
					{@render children()}
				</div>
			</div>
			<dl class="readout">
				<div>
					<dt>Tier</dt>
					<dd><output>{tier}</output> of {breakpoints.length + 1}</dd>
				</div>
				<div>
					<dt>Breakpoints</dt>
					<dd>{breakpoints.map((b) => `${b}px`).join(' · ')}</dd>
				</div>
			</dl>
			<div class="modes">
				<span class="modes-label">Item modes</span>
				<ul>
					{#each modes as [id, mode] (id)}
						<li class="mode-{mode}">{id} <span>{mode}</span></li>
					{/each}
				</ul>
			</div>
		</div>
		<div class="source">
			<div class="source-head">
				<span>Usage</span>
				<button type="button" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
			</div>
			<pre><code>{code}</code></pre>
		</div>
	</div>
</section>

<style>
	section {
		display: grid;
		gap: 1rem;
	}

	h2 {
		margin: 0;
		font-size: 1.25rem;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 28rem);
		gap: 1.5rem;
		align-items: start;
	}

	@media (width < 72rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.live {
		display: grid;
		gap: 0.75rem;
		min-width: 0;
	}

	.width {
		display: grid;
		gap: 0.25rem;
		font-size: 0.875rem;
		color: var(--muted);
	}

	.width input {
		width: 100%;
	}

	.stage {
		overflow-x: auto;
		padding-block: 0.25rem;
	}

	.frame {
		padding: 0;
		outline: 1px dashed var(--line);
		outline-offset: 4px;
		background: var(--surface);
	}

	.readout {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 2rem;
		margin: 0;
		font-size: 0.875rem;
	}

	.readout div {
		display: flex;
		gap: 0.5rem;
	}

	dt {
		color: var(--muted);
	}

	dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}

	.modes {
		display: grid;
		gap: 0.375rem;
		font-size: 0.875rem;
	}

	.modes-label {
		color: var(--muted);
	}

	.modes ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.modes li {
		padding: 0.125rem 0.5rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
	}

	.modes li span {
		color: var(--muted);
	}

	.modes .mode-icon span {
		color: var(--accent);
	}

	.modes .mode-menu {
		border-style: dashed;
	}

	.source {
		min-width: 0;
		border: 1px solid var(--line);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.source-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.375rem 0.5rem 0.375rem 0.75rem;
		border-bottom: 1px solid var(--line);
		font-size: 0.875rem;
		color: var(--muted);
	}

	.source-head button {
		font: inherit;
		color: inherit;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 0.375rem;
		padding: 0.125rem 0.625rem;
		cursor: pointer;
	}

	pre {
		margin: 0;
		padding: 0.75rem;
		max-height: 32rem;
		overflow: auto;
		font-size: 0.8125rem;
		line-height: 1.5;
		tab-size: 2;
		background: var(--code-bg);
	}
</style>
