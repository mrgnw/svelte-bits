<script lang="ts">
	import SectionNav, { type Section } from '$lib';

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
	const items = sections.filter((section) => !section.group);
</script>

<main>
	<h1>section-nav</h1>
	<SectionNav {sections}>
		{#each sections as section}
			{#if section.group}
				<h2 id={section.id}>{section.title}</h2>
			{:else}
				<section id={section.id}>
					<h3>{section.title}</h3>
					<p>{section.title} section, {items.indexOf(section) + 1} of {items.length}.</p>
				</section>
			{/if}
		{/each}
	</SectionNav>
</main>

<style>
	main {
		max-width: 70rem;
		margin: 0 auto;
		padding: 1rem;
		font-family: system-ui, sans-serif;
	}

	section {
		min-height: 60vh;
	}
</style>
