<script lang="ts">
	import { TierBar, type Mode, type TierGroup, type TierItem } from '#lib';

	type Link = TierItem & { label: string; icon: string };
	type Tool = TierItem & { label: string; icon: string; toggle?: boolean };

	const PRIMARY = [
		['home', 'Home', '⌂'],
		['projects', 'Projects', '▤'],
		['issues', 'Issues', '◉'],
		['docs', 'Docs', '❡'],
	] as const;
	const SECONDARY = [
		['profile', 'Profile', '☺'],
		['settings', 'Settings', '⚙'],
		['help', 'Help', '?'],
	] as const;

	let here = $state('issues');

	const nav: TierGroup<Link>[] = $derived([
		{
			id: 'main',
			label: 'Sections',
			items: PRIMARY.map(([id, label, icon]) => ({
				id,
				label,
				icon,
				current: id === here,
				at: id === here ? 'inline' : ['inline', 'inline', 'icon', 'icon'],
			})),
		},
		{
			id: 'account',
			label: 'Account and help',
			items: SECONDARY.map(([id, label, icon]) => ({
				id,
				label,
				icon,
				current: id === here,
				at: ['inline', 'menu'],
			})),
		},
	]);

	let pressed = $state<Record<string, boolean>>({ bold: true });

	function tools(list: readonly (readonly [string, string, string])[], at: readonly Mode[], toggle = false): Tool[] {
		return list.map(([id, label, icon]) => ({ id, label, icon, toggle, at, current: toggle && pressed[id] }));
	}

	const toolbar: TierGroup<Tool>[] = $derived([
		{
			id: 'format',
			label: 'Formatting',
			items: tools(
				[
					['bold', 'Bold', 'B'],
					['italic', 'Italic', 'I'],
					['underline', 'Underline', 'U'],
					['strike', 'Strikethrough', 'S'],
				],
				['inline', 'icon', 'icon', 'icon'],
				true,
			),
		},
		{
			id: 'insert',
			label: 'Insert',
			items: tools(
				[
					['link', 'Link', '🔗'],
					['code', 'Code', '‹›'],
					['quote', 'Quote', '❝'],
					['list', 'List', '≡'],
				],
				['inline', 'icon', 'menu'],
			),
		},
		{
			id: 'history',
			label: 'History',
			items: tools(
				[
					['undo', 'Undo', '↶'],
					['redo', 'Redo', '↷'],
				],
				['inline', 'icon', 'icon', 'menu'],
			),
		},
	]);
</script>

<main>
	<h1>TierBar</h1>
	<p>Drag the bottom-right corner of each box to resize it. The bar picks its tier from its own width.</p>

	<h2>Navigation</h2>
	<div class="frame">
		<TierBar as="nav" aria-label="Main" class="demo-nav" breakpoints={[640, 480, 340]} groups={nav}>
			{#snippet item(link: Link, mode: Mode)}
				<a
					href="#{link.id}"
					aria-current={link.current ? 'page' : undefined}
					aria-label={mode === 'icon' ? link.label : undefined}
					title={mode === 'icon' ? link.label : undefined}
					onclick={() => (here = link.id)}
				>
					<span aria-hidden="true">{link.icon}</span>
					{#if mode !== 'icon'}{link.label}{/if}
				</a>
			{/snippet}
			{#snippet trigger()}<span aria-hidden="true">⋯</span>{/snippet}
		</TierBar>
	</div>

	<h2>Editor toolbar</h2>
	<div class="frame">
		<TierBar aria-label="Formatting" role="group" class="demo-toolbar" breakpoints={[720, 520, 360]} groups={toolbar}>
			{#snippet item(tool: Tool, mode: Mode)}
				<button
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
	</div>
</main>

<style>
	main {
		font: 15px/1.4 system-ui, sans-serif;
		max-width: 60rem;
		margin: 2rem auto;
		padding-inline: 1rem;
	}

	.frame {
		resize: horizontal;
		overflow: auto;
		width: 100%;
		min-width: 12rem;
		max-width: 100%;
		padding: 0.5rem;
		border: 1px dashed #999;
	}

	:global(.demo-nav a),
	:global(.demo-nav .tierbar-trigger),
	:global(.demo-toolbar button) {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.6rem;
		border: 0;
		border-radius: 0.375rem;
		background: none;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
	}

	:global(.demo-nav a:hover),
	:global(.demo-toolbar button:hover) {
		background: #0000000f;
	}

	:global(.demo-nav [aria-current]),
	:global(.demo-toolbar [aria-pressed='true']),
	:global(.demo-nav .tierbar-trigger[data-current]) {
		background: #2563eb1f;
		color: #1d4ed8;
	}

	:global(.tierbar-menu a),
	:global(.tierbar-menu button) {
		justify-content: flex-start;
	}
</style>
