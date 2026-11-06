<script lang="ts" module>
	export const breakpoints = [680, 500, 360];
</script>

<script lang="ts">
	import { TierBar, type Mode, type TierGroup, type TierItem } from '#lib';
	import Icon from './Icon.svelte';

	type Link = TierItem & { label: string };

	const SECTIONS = [
		{ id: 'home', label: 'Home' },
		{ id: 'projects', label: 'Projects' },
		{ id: 'issues', label: 'Issues' },
		{ id: 'docs', label: 'Docs' },
	];
	const ACCOUNT = [
		{ id: 'profile', label: 'Profile' },
		{ id: 'settings', label: 'Settings' },
		{ id: 'help', label: 'Help' },
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
			<Icon name={link.id} />
			{#if mode !== 'icon'}{link.label}{/if}
		</a>
	{/snippet}
	{#snippet trigger()}<Icon name="more" />{/snippet}
</TierBar>

<style>
	:global(.example-nav) {
		--tierbar-gap: 0.125rem;
		--tierbar-group-gap: 0.5rem;
		--tierbar-menu-bg: var(--surface);
		--tierbar-menu-color: var(--ink);
		--tierbar-menu-border: 1px solid var(--line);
		--tierbar-menu-radius: 0.75rem;
		--tierbar-menu-padding: 0.375rem;
	}

	:global(.example-nav .tierbar-group:last-child) {
		margin-inline-start: auto;
	}

	a,
	:global(.example-nav .tierbar-trigger) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 2.5rem;
		padding-inline: 0.75rem;
		border: 0;
		border-radius: 0.5rem;
		background: none;
		color: var(--muted);
		font: inherit;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		transition: background-color 0.12s, color 0.12s;
	}

	a:hover,
	:global(.example-nav .tierbar-trigger:hover) {
		background: var(--hover);
		color: var(--ink);
	}

	a[aria-current],
	:global(.example-nav .tierbar-trigger[data-current]) {
		background: var(--accent-soft);
		color: var(--accent-ink);
	}
</style>
