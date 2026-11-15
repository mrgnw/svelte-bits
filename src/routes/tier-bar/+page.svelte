<script lang="ts">
	import Stage from '../Stage.svelte';
	import NavExample, { breakpoints as navBreakpoints } from '../examples/NavExample.svelte';
	import ToolbarExample, { breakpoints as toolbarBreakpoints } from '../examples/ToolbarExample.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>TierBar</title>
	<meta name="description" content="A Svelte 5 bar that collapses through fixed tiers chosen by its own width, in pure CSS." />
</svelte:head>

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
