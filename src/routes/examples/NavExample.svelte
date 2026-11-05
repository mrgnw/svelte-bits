<script lang="ts" module>
	export const breakpoints = [640, 480, 340];
</script>

<script lang="ts">
	import { TierBar, type Mode, type TierGroup, type TierItem } from '#lib';

	type Link = TierItem & { label: string; icon: string };

	const SECTIONS = [
		{ id: 'home', label: 'Home', icon: '⌂' },
		{ id: 'projects', label: 'Projects', icon: '▤' },
		{ id: 'issues', label: 'Issues', icon: '◉' },
		{ id: 'docs', label: 'Docs', icon: '❡' },
	];
	const ACCOUNT = [
		{ id: 'profile', label: 'Profile', icon: '☺' },
		{ id: 'settings', label: 'Settings', icon: '⚙' },
		{ id: 'help', label: 'Help', icon: '?' },
	];

	let here = $state('issues');

	const groups: TierGroup<Link>[] = $derived([
		{
			id: 'sections',
			label: 'Sections',
			items: SECTIONS.map((link) => ({
				...link,
				current: link.id === here,
				at: link.id === here ? 'inline' : ['inline', 'inline', 'icon'],
			})),
		},
		{
			id: 'account',
			label: 'Account and help',
			items: ACCOUNT.map((link) => ({ ...link, current: link.id === here, at: ['inline', 'menu'] })),
		},
	]);
</script>

<TierBar as="nav" aria-label="Main" class="example-nav" {breakpoints} {groups}>
	{#snippet item(link: Link, mode: Mode, variant: string)}
		<a
			id="nav-{variant}"
			href="#{link.id}"
			aria-current={link.current ? 'page' : undefined}
			aria-label={mode === 'icon' ? link.label : undefined}
			title={mode === 'icon' ? link.label : undefined}
			onclick={(e) => {
				e.preventDefault();
				here = link.id;
			}}
		>
			<span aria-hidden="true">{link.icon}</span>
			{#if mode !== 'icon'}{link.label}{/if}
		</a>
	{/snippet}
	{#snippet trigger()}<span aria-hidden="true">⋯</span>{/snippet}
</TierBar>

<style>
	a,
	:global(.example-nav .tierbar-trigger) {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 2.25rem;
		padding-inline: 0.625rem;
		border: 0;
		border-radius: 0.375rem;
		background: none;
		color: inherit;
		font: inherit;
		text-decoration: none;
		cursor: pointer;
	}

	a:hover,
	:global(.example-nav .tierbar-trigger:hover) {
		background: color-mix(in srgb, currentColor 8%, transparent);
	}

	a[aria-current],
	:global(.example-nav .tierbar-trigger[data-current]) {
		background: color-mix(in srgb, #2563eb 16%, transparent);
	}
</style>
