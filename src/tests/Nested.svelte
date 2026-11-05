<script lang="ts">
	import { TierBar, type Mode, type TierGroup, type TierItem } from '#lib';

	type Link = TierItem & { label: string };

	let { outerWidth, innerWidth }: { outerWidth: number; innerWidth: number } = $props();

	const outer: TierGroup<Link>[] = [
		{
			id: 'outer',
			label: 'Outer menu',
			items: [
				{ id: 'inner', label: 'Inner' },
				{ id: 'about', label: 'About', at: ['inline', 'menu'] },
			],
		},
	];
	const inner: TierGroup<Link>[] = [
		{
			id: 'inner',
			label: 'Inner menu',
			items: [
				{ id: 'docs', label: 'Docs', at: ['inline', 'inline', 'icon'] },
				{ id: 'help', label: 'Help', at: ['inline', 'menu'] },
			],
		},
	];
</script>

<div data-testid="outer" style:width="{outerWidth}px">
	<TierBar aria-label="Outer" role="group" breakpoints={[500]} groups={outer}>
		{#snippet item(link: Link, mode: Mode)}
			{#if link.id === 'inner'}
				<div data-testid="inner" style:width="{innerWidth}px">
					<TierBar aria-label="Inner" role="group" breakpoints={[400, 200]} groups={inner}>
						{#snippet item(link: Link, mode: Mode)}
							<a href="#{link.id}" aria-label={mode === 'icon' ? link.label : undefined}>{mode === 'icon' ? '•' : link.label}</a>
						{/snippet}
					</TierBar>
				</div>
			{:else}
				<a href="#{link.id}">{link.label}</a>
			{/if}
		{/snippet}
	</TierBar>
</div>
