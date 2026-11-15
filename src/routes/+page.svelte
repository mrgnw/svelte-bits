<svelte:head>
	<title>svelte-bits</title>
	<meta name="description" content="Reusable Svelte 5 components: TierBar, SectionNav and SpatialImage." />
</svelte:head>

<header class="hero">
	<p class="eyebrow">Svelte 5 components</p>
	<h1>Components</h1>
	<p class="lede">Small Svelte 5 components with no runtime dependencies. Each one has a live demo and its source.</p>
</header>

<ul class="index">
	<li>
		<a href="/tier-bar">TierBar</a>
		<p>A bar that collapses through fixed tiers chosen by its own width, in pure CSS.</p>
	</li>
	<li>
		<a href="/section-nav">SectionNav</a>
		<p>A sections sidebar that tracks the heading in view and becomes a popover bar on narrow screens.</p>
	</li>
	<li>
		<a href="/spatial-image">SpatialImage</a>
		<p>A photo and its depth map as a box you look into, with mouse, touch, tilt and scroll.</p>
	</li>
</ul>

<style>
	.index {
		display: grid;
		gap: 1.5rem;
		max-width: 40rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.index a {
		font: 600 clamp(1.75rem, 4vw, 2.25rem) / 1.1 var(--display);
		letter-spacing: -0.02em;
		color: var(--ink);
		text-decoration-color: var(--accent);
		text-underline-offset: 0.2em;
	}

	.index a:hover {
		color: var(--accent-ink);
	}

	.index p {
		margin: 0.375rem 0 0;
	}
</style>
