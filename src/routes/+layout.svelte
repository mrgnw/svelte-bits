<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import './code.css';
	import { PHOTOS } from './examples/photos';

	let { children } = $props();
	let menu: HTMLElement;
	let open = $state(false);

	afterNavigate(() => menu.hidePopover());

	const bleed = $derived(page.url.pathname.startsWith('/spatial-image'));
	const compact = $derived(page.url.pathname.startsWith('/section-nav'));

	function current(href: string) {
		if (page.url.pathname === href) return 'page';
		if (page.url.pathname.startsWith(`${href}/`)) return 'true';
		return undefined;
	}
</script>

<div class="shell" data-bleed={bleed || undefined} data-compact={compact || undefined}>
	<nav class="sidebar" aria-label="Components">
		<a class="home" href="/" aria-current={current('/')}>svelte-bits</a>
		<button type="button" class="menu-button" popovertarget="site-menu" aria-expanded={open}>Menu</button>
		<ul id="site-menu" popover bind:this={menu} ontoggle={(event) => (open = event.newState === 'open')}>
			<li><a href="/tier-bar" aria-current={current('/tier-bar')}>TierBar</a></li>
			<li><a href="/section-nav" aria-current={current('/section-nav')}>SectionNav</a></li>
			<li>
				<a href="/spatial-image" aria-current={current('/spatial-image')}>SpatialImage</a>
				<ul>
					{#each PHOTOS as photo (photo.slug)}
						<li>
							<a href="/spatial-image/{photo.slug}" aria-current={current(`/spatial-image/${photo.slug}`)}>
								{photo.name}
							</a>
						</li>
					{/each}
				</ul>
			</li>
		</ul>
	</nav>

	<main>
		{@render children()}
	</main>
</div>

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

	.shell {
		padding-inline: env(safe-area-inset-left) env(safe-area-inset-right);
		min-height: 100dvh;
	}

	.sidebar {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-sizing: border-box;
		padding: 0.5rem clamp(1rem, 4vw, 2rem);
		border-bottom: 1px solid var(--line);
		background: var(--page);
	}

	.home {
		display: block;
		font: 600 1.125rem/1.2 var(--display);
		color: var(--ink);
		text-decoration: none;
	}

	.menu-button {
		display: block;
		min-block-size: 2.75rem;
		padding: 0 1rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}

	#site-menu {
		position: fixed;
		inset: calc(3.75rem + env(safe-area-inset-top)) clamp(1rem, 4vw, 2rem) auto auto;
		width: min(18rem, calc(100vw - 2rem));
		max-height: calc(100dvh - 5rem);
		padding: 0.75rem;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		overflow-y: auto;
		background: var(--surface);
		color: inherit;
		box-shadow: var(--shadow-lift);
	}

	#site-menu:not(:popover-open) {
		display: none;
	}

	[data-compact] main {
		--bar-top: calc(3.75rem + 1px);
		--nav-top: calc(4.75rem + 1px);
	}

	@media (width >= 56rem) {
		.shell:not([data-compact]) {
			display: grid;
			grid-template-columns: 14rem minmax(0, 1fr);

			.sidebar {
				align-self: start;
				display: block;
				max-height: 100dvh;
				overflow-y: auto;
				padding: 2rem 1.25rem;
				border-right: 1px solid var(--line);
				border-bottom: 0;
				background: none;
			}

			.home {
				margin-bottom: 1.5rem;
			}

			.menu-button {
				display: none;
			}

			#site-menu {
				display: block;
				position: static;
				inset: auto;
				width: auto;
				height: auto;
				max-height: none;
				margin: 0;
				padding: 0;
				border: 0;
				border-radius: 0;
				overflow: visible;
				background: none;
				box-shadow: none;
			}
		}
	}

	.sidebar ul {
		display: grid;
		gap: 0.125rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.sidebar ul ul {
		margin: 0.125rem 0 0.5rem 0.75rem;
		padding-left: 0.5rem;
		border-left: 1px solid var(--line);
	}

	.sidebar li a {
		display: block;
		padding: 0.375rem 0.625rem;
		border-radius: 0.375rem;
		color: var(--ink);
		text-decoration: none;
	}

	.sidebar ul ul a {
		padding-block: 0.25rem;
		font-size: 0.875rem;
		color: var(--muted);
	}


	.sidebar li a:hover {
		background: var(--hover);
	}

	.sidebar li a[aria-current] {
		color: var(--accent-ink);
		font-weight: 600;
	}

	.sidebar li a[aria-current='page'] {
		background: var(--accent-soft);
	}

	.sidebar a:focus-visible,
	.menu-button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	[data-bleed] {
		padding-inline: 0;
	}

	[data-bleed] main {
		display: block;
		max-width: none;
		padding: 0;
	}

	@media (width < 56rem) {
		[data-bleed] .sidebar {
			position: fixed;
			inset: 0 0 auto 0;
			padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) 0
				max(0.75rem, env(safe-area-inset-left));
			border: 0;
			background: none;
			pointer-events: none;
		}

		[data-bleed] .sidebar > * {
			pointer-events: auto;
		}

		[data-bleed] .home {
			display: flex;
			align-items: center;
			min-block-size: 2.75rem;
			padding: 0 1rem;
			border: 1px solid var(--line);
			border-radius: 999px;
			background: color-mix(in srgb, var(--surface) 90%, transparent);
			backdrop-filter: blur(8px);
			box-shadow: var(--shadow);
			font-size: 1rem;
		}

		[data-bleed] .menu-button {
			background: color-mix(in srgb, var(--surface) 90%, transparent);
			backdrop-filter: blur(8px);
			box-shadow: var(--shadow);
		}
	}

	main {
		display: grid;
		align-content: start;
		gap: clamp(3.5rem, 8vw, 6rem);
		box-sizing: border-box;
		width: 100%;
		max-width: 76rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 8vw, 6rem) clamp(1rem, 4vw, 2rem) 6rem;
	}

	main :global(.hero) {
		display: grid;
		gap: 1rem;
		max-width: 40rem;
	}

	main :global(.eyebrow) {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-ink);
	}

	main :global(.hero h1) {
		margin: 0;
		font: 700 clamp(3.5rem, 12vw, 6rem) / 0.95 var(--display);
		letter-spacing: -0.035em;
	}

	main :global(.lede) {
		margin: 0;
		font-size: 1.1875rem;
		color: var(--ink);
		max-width: 36rem;
	}

	main :global(.hint) {
		margin: 0;
		color: var(--muted);
	}

	:global(p) {
		color: var(--muted);
	}
</style>
