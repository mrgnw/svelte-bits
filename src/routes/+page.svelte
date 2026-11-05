<script lang="ts">
	import Stage from './Stage.svelte';
	import NavExample, { breakpoints as navBreakpoints } from './examples/NavExample.svelte';
	import navSource from './examples/NavExample.svelte?raw';
	import ToolbarExample, { breakpoints as toolbarBreakpoints } from './examples/ToolbarExample.svelte';
	import toolbarSource from './examples/ToolbarExample.svelte?raw';
</script>

<svelte:head>
	<title>TierBar demo</title>
</svelte:head>

<main>
	<header>
		<h1>TierBar</h1>
		<p>
			A Svelte 5 bar that collapses through a fixed ladder of tiers chosen by its own width. In each tier an item
			is inline, icon-only, or inside its group's menu. The tier comes from CSS container queries, so the server
			HTML is already correct and nothing is measured.
		</p>
		<p>Drag a width slider. The readout shows the tier the CSS picked and the mode of every item.</p>
	</header>

	<Stage title="Navigation" breakpoints={navBreakpoints} source={navSource}>
		<NavExample />
	</Stage>

	<Stage title="Editor toolbar" breakpoints={toolbarBreakpoints} source={toolbarSource}>
		<ToolbarExample />
	</Stage>
</main>

<style>
	:global(:root) {
		color-scheme: light dark;
		--ink: #1b1b1f;
		--muted: #5f6068;
		--line: #d9d9de;
		--surface: #ffffff;
		--page: #f6f6f7;
		--code-bg: #f0f0f2;
		--accent: #1d4ed8;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--ink: #ececf0;
			--muted: #a0a1aa;
			--line: #3a3b42;
			--surface: #1d1e22;
			--page: #141518;
			--code-bg: #1a1b1f;
			--accent: #93b4ff;
		}
	}

	:global(body) {
		margin: 0;
		background: var(--page);
		color: var(--ink);
		font: 15px/1.5 system-ui, sans-serif;
	}

	main {
		display: grid;
		gap: 3rem;
		max-width: 90rem;
		margin: 0 auto;
		padding: 2rem 1rem 4rem;
	}

	header {
		max-width: 46rem;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.75rem;
	}

	p {
		margin: 0 0 0.5rem;
		color: var(--muted);
	}
</style>
