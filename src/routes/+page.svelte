<script lang="ts">
	import './theme.css';
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
