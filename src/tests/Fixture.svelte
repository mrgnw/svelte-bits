<script lang="ts">
	import { TierBar, type Mode, type TierItem } from '#lib';

	type Link = TierItem & { label: string };

	let { width }: { width: number } = $props();

	const groups = [
		{
			id: 'main',
			label: 'Sections',
			items: [
				{ id: 'home', label: 'Home', current: true },
				{ id: 'docs', label: 'Docs', at: ['inline', 'icon'] as Mode[] },
			],
		},
		{
			id: 'more',
			label: 'More sections',
			items: [
				{ id: 'settings', label: 'Settings', at: ['inline', 'menu'] as Mode[] },
				{ id: 'help', label: 'Help', at: ['inline', 'menu'] as Mode[] },
			],
		},
	];
</script>

<div data-testid="frame" style:width="{width}px">
	<TierBar as="nav" aria-label="Main" breakpoints={[500]} {groups}>
		{#snippet item(link: Link, mode: Mode)}
			<a href="#{link.id}" aria-label={mode === 'icon' ? link.label : undefined}>{mode === 'icon' ? '•' : link.label}</a>
		{/snippet}
	</TierBar>
</div>
