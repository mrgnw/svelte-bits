<script lang="ts">
	import { TierBar, type Mode, type TierGroup, type TierItem } from '#lib';

	type Link = TierItem & { label: string };

	const GROUPS: TierGroup<Link>[] = [
		{
			id: 'main',
			label: 'Sections',
			items: [
				{ id: 'home', label: 'Home', current: true },
				{ id: 'docs', label: 'Docs', at: ['inline', 'icon'] },
			],
		},
		{
			id: 'more',
			label: 'More sections',
			items: [
				{ id: 'settings', label: 'Settings', at: ['inline', 'menu'] },
				{ id: 'help', label: 'Help', at: ['inline', 'menu'] },
			],
		},
	];

	let {
		width,
		breakpoints = [500],
		groups = GROUPS,
		name = 'Main',
	}: { width: number; breakpoints?: number[]; groups?: TierGroup<Link>[]; name?: string } = $props();
</script>

<p>Outside</p>
<div data-testid="frame" style:width="{width}px">
	<TierBar as="nav" aria-label={name} {breakpoints} {groups}>
		{#snippet item(link: Link, mode: Mode, variant: string)}
			<a id="{link.id}-{variant}" href="#{link.id}" aria-label={mode === 'icon' ? link.label : undefined}>{mode === 'icon' ? '•' : link.label}</a>
		{/snippet}
	</TierBar>
</div>
