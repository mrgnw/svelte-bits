<script lang="ts">
	import SectionNav, { type Section } from '#lib/section-nav/index.ts';

	let { data } = $props();

	const sections: Section[] = [
		{ id: 'basics', title: 'Basics', group: true },
		{ id: 'install', title: 'Install' },
		{ id: 'usage', title: 'Usage' },
		{ id: 'props', title: 'Props' },
		{ id: 'theming', title: 'Theming' },
		{ id: 'behavior', title: 'Behavior', group: true },
		{ id: 'tracking', title: 'Scroll tracking' },
		{ id: 'collapse', title: 'Collapse' },
		{ id: 'keyboard', title: 'Keyboard' },
		{ id: 'mobile', title: 'Mobile popover' },
		{ id: 'builds', title: 'Builds' },
		{ id: 'caveats', title: 'Caveats' }
	];

	const propRows = [
		['sections', 'none', '{ id, title, group? }[] in page order. Omit it to scan the content.'],
		['levels', "'h2,h3'", 'Heading selectors to scan when sections is absent.'],
		['key', "'sidebar'", 'localStorage key for the collapsed state.'],
		['label', "'Sections'", 'The nav’s aria-label, and the mobile bar text before a section is current.'],
		['children', 'none', 'The page content. Every section id must match an element inside it.']
	];

	const variables = [
		['--nav-width', '13rem', 'Sidebar column width.'],
		['--nav-top', '1rem', 'Sticky offset of the desktop sidebar: header height plus a gap. Also the least scroll margin of scanned headings.'],
		['--bar-top', '0', 'Sticky offset of the mobile bar: header height. Below 64rem, scanned headings stop under the bar.'],
		['--nav-bg', 'Canvas', 'Mobile bar and popover background.'],
		['--nav-line', 'currentColor 15%', 'Borders.'],
		['--nav-muted', 'currentColor 55%', 'Link and icon color.']
	];

	const keys = [
		['j', 'Next section'],
		['k', 'Previous section'],
		['b', 'Collapse or expand the sidebar']
	];
</script>

<svelte:head>
	<title>SectionNav</title>
	<meta
		name="description"
		content="A Svelte 5 sections sidebar that tracks the heading in view and becomes a popover bar on narrow screens."
	/>
</svelte:head>

<header class="hero">
	<p class="eyebrow">Svelte 5 component</p>
	<h1>SectionNav</h1>
	<p class="lede">
		A sections sidebar for long pages. Wrap the page body in it to get a sticky list of sections that follows the
		scroll, a collapse handle, keyboard stepping, and a popover bar on narrow screens.
	</p>
	<p class="hint">This page is the demo. Press <kbd>j</kbd> and <kbd>k</kbd> to step, <kbd>b</kbd> to collapse.</p>
</header>

<SectionNav
	{sections}
	key="section-nav-demo"
	--nav-width="12rem"
	--nav-bg="var(--page)"
	--nav-line="var(--line)"
	--nav-muted="var(--muted)"
>
	<div class="docs">
		<h2 id="basics">Basics</h2>

		<section>
			<h3 id="install">Install</h3>
			<p>
				SectionNav ships in this package under its own entry point. The package is not on npm yet; clone it, build it,
				and add it by path as the <a href="https://github.com/mrgnw/svelte-bits#install">README</a> shows. Then
				import it:
			</p>
			<pre class="plain"><code>import SectionNav from '@mrgnw/svelte-bits/section-nav';</code></pre>
		</section>

		<section>
			<h3 id="usage">Usage</h3>
			<p>
				Pass the sections when you know them, so the nav is in the server-rendered HTML. Entries with
				<code>group: true</code> render as small uppercase headings and are not tracked or stepped.
			</p>
			{@html data.usage.html}
			<p>
				Leave out <code>sections</code> and the component scans its content for <code>levels</code> after mount. When
				both levels exist, the first becomes a group heading. Headings without an <code>id</code> get one from their
				text. The list is empty in the server HTML until the scan runs.
			</p>
			{@html data.scanned.html}
		</section>

		<section>
			<h3 id="props">Props</h3>
			<div class="table">
				<table>
					<thead><tr><th>Prop</th><th>Default</th><th>Purpose</th></tr></thead>
					<tbody>
						{#each propRows as [name, fallback, purpose] (name)}
							<tr><td><code>{name}</code></td><td><code>{fallback}</code></td><td>{purpose}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section>
			<h3 id="theming">Theming</h3>
			<p>
				Custom properties, all optional. Pass them as <code>--name="value"</code>. The current and hovered links take
				the inherited text color, and colors follow the page’s <code>color-scheme</code>.
			</p>
			<div class="table">
				<table>
					<thead><tr><th>Property</th><th>Default</th><th>Purpose</th></tr></thead>
					<tbody>
						{#each variables as [name, fallback, purpose] (name)}
							<tr><td><code>{name}</code></td><td><code>{fallback}</code></td><td>{purpose}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p>This page sits under a sticky site bar and maps the nav onto the site palette:</p>
			{@html data.theming.html}
		</section>

		<h2 id="behavior">Behavior</h2>

		<section>
			<h3 id="tracking">Scroll tracking</h3>
			<p>
				The current section is the last heading whose top is at most 96px below the viewport top. Below 64rem, when
				the mobile bar ends lower, the line moves to 24px under the bar instead. The current link gets
				<code>aria-current="location"</code>. Updates run at most once per animation frame, on scroll and resize.
			</p>
			<p>
				Near the bottom of the page, short final sections can never reach that line. A section picked by link or hash
				stays current there as long as it is in view.
			</p>
		</section>

		<section>
			<h3 id="collapse">Collapse</h3>
			<p>
				The handle above the list collapses the sidebar to a narrow column and the content takes the space. The state is
				saved in localStorage under <code>key</code> as <code>'collapsed'</code> or an empty string, and restored on
				mount. Give each page type its own key when they should remember separately.
			</p>
			<p>The change runs inside a view transition unless the user prefers reduced motion.</p>
		</section>

		<section>
			<h3 id="keyboard">Keyboard</h3>
			<dl class="keys">
				{#each keys as [key, action] (key)}
					<dt><kbd>{key}</kbd></dt>
					<dd>{action}</dd>
				{/each}
			</dl>
			<p>
				Keys are ignored while a modifier is held, while typing in a field, and while a <code>&lt;dialog&gt;</code> is
				open.
			</p>
		</section>

		<section>
			<h3 id="mobile">Mobile popover</h3>
			<p>
				Below 64rem the sidebar becomes a sticky bar showing the current section. Tapping it opens the full list as a
				native popover, closed by Escape, an outside tap, or picking a section. Set <code>--bar-top</code> to the height
				of any sticky header above it.
			</p>
		</section>

		<section>
			<h3 id="builds">Builds</h3>
			<p>
				One source file, built two ways. <code>pnpm build</code> packages the Svelte component into
				<code>dist/</code>. <code>pnpm build:ce</code> builds a <code>&lt;section-nav&gt;</code> custom element as one ES
				module at <code>dist-ce/section-nav.js</code>, for plain HTML pages:
			</p>
			{@html data.element.html}
			<p>
				On the element, set <code>levels</code>, <code>key</code> and <code>label</code> as attributes, and
				<code>sections</code> as a property from JS.
			</p>
		</section>

		<section>
			<h3 id="caveats">Caveats</h3>
			<ul>
				<li>One instance per page: the nav uses the fixed id <code>sections-nav</code>.</li>
				<li>
					Scroll tracking, keys, collapse and closing the popover need client-side rendering. Without it the nav renders
					but stays still.
				</li>
				<li>Custom elements do not render on the server, so the element’s sidebar appears once its script runs.</li>
				<li>
					Without <code>sections</code>, the content is scanned once on mount. Headings added later are not picked up;
					pass <code>sections</code> instead, which the nav follows when it changes.
				</li>
				<li>Scanning stops at 200 headings.</li>
			</ul>
		</section>
	</div>
</SectionNav>

<style>
	.docs {
		display: grid;
		gap: 3rem;
		max-width: 46rem;
	}

	h2 {
		margin: 0 0 -1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--line);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-ink);
	}

	h2:first-child {
		padding-top: 0;
		border-top: 0;
	}

	section {
		display: grid;
		gap: 1rem;
		min-width: 0;
	}

	h3 {
		margin: 0;
		font: 600 clamp(1.75rem, 4vw, 2.25rem) / 1.1 var(--display);
		letter-spacing: -0.02em;
	}

	h2,
	h3 {
		scroll-margin-top: calc(var(--bar-top, 0px) + 3.5rem);
	}

	@media (width < 64rem) {
		.docs {
			padding-top: 2rem;
		}
	}

	@media (width >= 64rem) {
		h2,
		h3 {
			scroll-margin-top: var(--nav-top, 1rem);
		}
	}

	section p,
	section ul {
		margin: 0;
	}

	section ul {
		display: grid;
		gap: 0.5rem;
		padding-left: 1.25rem;
		color: var(--muted);
	}

	a {
		color: var(--accent-ink);
		text-underline-offset: 0.2em;
	}

	code {
		font: 0.875em var(--mono);
		color: var(--ink);
	}

	kbd {
		display: inline-block;
		min-width: 1.5em;
		padding: 0 0.375em;
		border: 1px solid var(--line);
		border-bottom-width: 2px;
		border-radius: 0.375rem;
		background: var(--surface);
		color: var(--ink);
		font: 600 0.8125em/1.6 var(--mono);
		text-align: center;
	}

	.docs :global(pre) {
		margin: 0;
		padding: 1rem 1.25rem;
		overflow-x: auto;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		background: var(--code-bg);
		font: 0.8125rem/1.6 var(--mono);
		tab-size: 2;
	}

	.plain {
		white-space: pre-wrap;
	}

	.plain code {
		font-size: inherit;
	}

	.table {
		overflow-x: auto;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		background: var(--surface);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9375rem;
	}

	th,
	td {
		padding: 0.625rem 1rem;
		text-align: left;
		vertical-align: top;
	}

	th {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--muted);
		border-bottom: 1px solid var(--line);
	}

	td {
		color: var(--muted);
	}

	td:not(:last-child) {
		white-space: nowrap;
	}

	tr + tr td {
		border-top: 1px solid var(--line);
	}

	@media (width < 40rem) {
		thead {
			display: none;
		}

		tr {
			display: grid;
			grid-template-columns: auto 1fr;
			column-gap: 0.75rem;
			padding: 0.75rem 1rem;
		}

		tr + tr {
			border-top: 1px solid var(--line);
		}

		td,
		tr + tr td {
			padding: 0;
			border: 0;
		}

		td:last-child {
			grid-column: 1 / -1;
			margin-top: 0.25rem;
		}
	}

	.keys {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem 1rem;
		align-items: center;
		margin: 0;
	}

	.keys dd {
		margin: 0;
		color: var(--muted);
	}
</style>
