<script lang="ts" module>
	export const breakpoints = [860, 600, 380];
</script>

<script lang="ts">
	import { TierBar, type Mode, type TierGroup, type TierItem } from '#lib';

	type Tool = TierItem & { label: string; icon: string; toggle: boolean };

	const FORMAT = [
		{ id: 'bold', label: 'Bold', icon: 'B' },
		{ id: 'italic', label: 'Italic', icon: 'I' },
		{ id: 'underline', label: 'Underline', icon: 'U' },
		{ id: 'strike', label: 'Strikethrough', icon: 'S' },
	];
	const INSERT = [
		{ id: 'link', label: 'Link', icon: '↗' },
		{ id: 'code', label: 'Code', icon: '‹›' },
		{ id: 'quote', label: 'Quote', icon: '❝' },
		{ id: 'list', label: 'List', icon: '≡' },
	];
	const HISTORY = [
		{ id: 'undo', label: 'Undo', icon: '↶' },
		{ id: 'redo', label: 'Redo', icon: '↷' },
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
			<span aria-hidden="true">{tool.icon}</span>
			{#if mode !== 'icon'}{tool.label}{/if}
		</button>
	{/snippet}
	{#snippet trigger(group: TierGroup<Tool>)}{group.label} ▾{/snippet}
</TierBar>

<style>
	button,
	:global(.example-toolbar .tierbar-trigger) {
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
		cursor: pointer;
	}

	button:hover,
	:global(.example-toolbar .tierbar-trigger:hover) {
		background: color-mix(in srgb, currentColor 8%, transparent);
	}

	button[aria-pressed='true'] {
		background: color-mix(in srgb, #2563eb 16%, transparent);
	}
</style>
