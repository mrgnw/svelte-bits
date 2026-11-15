import { snippet } from '../snippet';

const usage = `<script lang="ts">
	import SectionNav, { type Section } from '@mrgnw/svelte-bits/section-nav';

	const sections: Section[] = [
		{ id: 'basics', title: 'Basics', group: true },
		{ id: 'install', title: 'Install' },
		{ id: 'usage', title: 'Usage' }
	];
</script>

<SectionNav {sections}>
	<h2 id="basics">Basics</h2>
	<h3 id="install">Install</h3>
	<h3 id="usage">Usage</h3>
</SectionNav>
`;

const scanned = `<SectionNav levels="h2,h3" key="docs-sidebar">
	{@html content}
</SectionNav>
`;

const theming = `<SectionNav
	{sections}
	--nav-top="4.75rem"
	--bar-top="3.75rem"
	--nav-width="12rem"
	--nav-bg="var(--page)"
	--nav-line="var(--line)"
	--nav-muted="var(--muted)"
>
	…
</SectionNav>
`;

const element = `<script type="module" src="/section-nav.js"></script>

<section-nav levels="h2,h3" key="mockup-sidebar">
	<h2>Getting started</h2>
	<h3>Install</h3>
	<h3>Usage</h3>
</section-nav>
`;

export function load() {
	return {
		usage: snippet(usage),
		scanned: snippet(scanned),
		theming: snippet(theming),
		element: snippet(element)
	};
}
