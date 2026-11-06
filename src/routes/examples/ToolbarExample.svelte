<script lang="ts" module>
	export const breakpoints = [920, 640, 420];
</script>

<script lang="ts">
	import { TierBar, type Mode, type TierGroup, type TierItem } from '#lib';
	import Icon from './Icon.svelte';

	type Tool = TierItem & { label: string; toggle: boolean };

	const FORMAT = [
		{ id: 'bold', label: 'Bold' },
		{ id: 'italic', label: 'Italic' },
		{ id: 'underline', label: 'Underline' },
		{ id: 'strike', label: 'Strike' },
	];
	const INSERT = [
		{ id: 'link', label: 'Link' },
		{ id: 'code', label: 'Code' },
		{ id: 'quote', label: 'Quote' },
		{ id: 'list', label: 'List' },
	];
	const HISTORY = [
		{ id: 'undo', label: 'Undo' },
		{ id: 'redo', label: 'Redo' },
	];

	let pressed = $state<Record<string, boolean>>({ bold: true });

	const groups: TierGroup<Tool>[] = $derived([
		{
			id: 'format',
			label: 'Formatting',
			items: FORMAT.map((tool) => ({ ...tool, toggle: true, current: !!pressed[tool.id], at: ['inline', 'icon'] })),
		},
		{
			id: 'insert',
			label: 'Insert',
			items: INSERT.map((tool) => ({ ...tool, toggle: false, at: ['inline', 'icon', 'menu'] })),
		},
		{
			id: 'history',
			label: 'History',
			items: HISTORY.map((tool) => ({ ...tool, toggle: false, at: ['inline', 'icon', 'icon', 'menu'] })),
		},
	]);
</script>

<TierBar aria-label="Text formatting" role="group" class="example-toolbar" {breakpoints} {groups}>
	{#snippet item(tool: Tool, mode: Mode, variant: string)}
		<button
			id="tool-{variant}"
			type="button"
			aria-pressed={tool.toggle ? !!pressed[tool.id] : undefined}
			aria-label={mode === 'icon' ? tool.label : undefined}
			title={tool.label}
			onclick={() => tool.toggle && (pressed[tool.id] = !pressed[tool.id])}
		>
			<Icon name={tool.id} />
			{#if mode !== 'icon'}{tool.label}{/if}
		</button>
	{/snippet}
	{#snippet trigger()}<Icon name="more" />{/snippet}
</TierBar>

<style>
	:global(.example-toolbar) {
		--tierbar-gap: 0.125rem;
		--tierbar-group-gap: 0.75rem;
		--tierbar-menu-bg: var(--surface);
		--tierbar-menu-color: var(--ink);
		--tierbar-menu-border: 1px solid var(--line);
		--tierbar-menu-radius: 0.75rem;
		--tierbar-menu-padding: 0.375rem;
	}

	:global(.example-toolbar .tierbar-group + .tierbar-group) {
		padding-inline-start: 0.75rem;
		border-inline-start: 1px solid var(--line);
	}

	button,
	:global(.example-toolbar .tierbar-trigger) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 2.5rem;
		padding-inline: 0.625rem;
		border: 0;
		border-radius: 0.5rem;
		background: none;
		color: var(--muted);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.12s, color 0.12s;
	}

	button:hover,
	:global(.example-toolbar .tierbar-trigger:hover) {
		background: var(--hover);
		color: var(--ink);
	}

	button[aria-pressed='true'] {
		background: var(--accent-soft);
		color: var(--accent-ink);
	}
</style>
