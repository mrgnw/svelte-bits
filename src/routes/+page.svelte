<script lang="ts">
	import './code.css';
	import Stage from './Stage.svelte';
	import NavExample, { breakpoints as navBreakpoints } from './examples/NavExample.svelte';
	import ToolbarExample, { breakpoints as toolbarBreakpoints } from './examples/ToolbarExample.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>TierBar</title>
	<meta name="description" content="A Svelte 5 bar that collapses through fixed tiers chosen by its own width, in pure CSS." />
</svelte:head>

<main>
	<header class="hero">
		<p class="eyebrow">Svelte 5 component</p>
		<h1>TierBar</h1>
		<p class="lede">
			A bar that collapses by its own width. Each tier decides whether an item shows in full, as an icon, or inside
			a menu. CSS container queries pick the tier, so the server HTML is already right and nothing is measured.
		</p>
		<p class="hint">Drag the ladder under each demo. The lit step is the tier CSS picked.</p>
	</header>

	<Stage
		title="Navigation"
		blurb="Sections shrink to icons, then the account links fold into one menu."
		breakpoints={navBreakpoints}
		source={data.nav}
	>
		<NavExample />
	</Stage>

	<Stage
		title="Editor toolbar"
		blurb="Same component, no links: toggle buttons, three groups, three menus."
		breakpoints={toolbarBreakpoints}
		source={data.toolbar}
	>
		<ToolbarExample />
	</Stage>
</main>

<style>
	:global(:root) {
		color-scheme: light dark;
		--display: 'Iowan Old Style', 'Palatino Linotype', Palatino, Charter, Georgia, serif;
		--mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		--ink: #1c1917;
		--muted: #6b655c;
		--line: #e4dfd3;
		--surface: #fffdf9;
		--page: #f7f5f0;
		--stage: #f2efe7;
		--dot: #d9d3c4;
		--hover: #efebe0;
		--code-bg: #fbf9f4;
		--accent: #d9480f;
		--accent-ink: #b23a0a;
		--accent-soft: #fde8dc;
		--on-accent: #fffdf9;
		--shadow: 0 1px 2px rgb(60 40 10 / 0.04), 0 4px 16px rgb(60 40 10 / 0.06);
		--shadow-lift: 0 2px 4px rgb(60 40 10 / 0.04), 0 8px 24px rgb(60 40 10 / 0.08);
	}

	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--ink: #ede9e1;
			--muted: #a39d92;
			--line: #34312b;
			--surface: #1e1c19;
			--page: #151412;
			--stage: #181715;
			--dot: #2e2b26;
			--hover: #2a2723;
			--code-bg: #191816;
			--accent: #ff8a4c;
			--accent-ink: #ffa575;
			--accent-soft: #3d2618;
			--on-accent: #1c1917;
			--shadow: 0 1px 2px rgb(0 0 0 / 0.3), 0 4px 16px rgb(0 0 0 / 0.25);
			--shadow-lift: 0 2px 4px rgb(0 0 0 / 0.3), 0 8px 24px rgb(0 0 0 / 0.35);
		}
	}

	:global(body) {
		margin: 0;
		background: var(--page);
		color: var(--ink);
		font: 16px/1.65 system-ui, -apple-system, 'Segoe UI', sans-serif;
	}

	:global(::selection) {
		background: var(--accent-soft);
	}

	main {
		display: grid;
		gap: clamp(3.5rem, 8vw, 6rem);
		max-width: 72rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 8vw, 6rem) clamp(1rem, 4vw, 2rem) 6rem;
	}

	.hero {
		display: grid;
		gap: 1rem;
		max-width: 40rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-ink);
	}

	h1 {
		margin: 0;
		font: 700 clamp(3.5rem, 12vw, 6rem) / 0.95 var(--display);
		letter-spacing: -0.035em;
	}

	.lede {
		margin: 0;
		font-size: 1.1875rem;
		color: var(--ink);
		max-width: 36rem;
	}

	.hint {
		margin: 0;
		color: var(--muted);
	}

	:global(p) {
		color: var(--muted);
	}
</style>
