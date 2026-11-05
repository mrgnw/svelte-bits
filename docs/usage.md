# Using TierBar

## Props

| Prop | Type | Notes |
|-|-|-|
| `breakpoints` | `number[]` | Container widths in px, strictly descending, above 0. n breakpoints make n + 1 tiers. |
| `groups` | `TierGroup<T>[]` | `{ id, label, items }`. `label` is the accessible name of the group's menu button. |
| `item` | `Snippet<[T, Mode, string]>` | Renders one item in one mode. The third argument is `variant`. |
| `trigger` | `Snippet<[TierGroup<T>, boolean]>` | Optional contents of a menu button. The boolean is true when the menu holds the current item. Default: the group label. |
| `as` | `'nav' \| 'div'` | Element of the bar. Default `div`. |
| `class`, `role`, `aria-*`, other attributes | | Passed to the bar element. |

Invalid props throw: unsorted or non-numeric breakpoints, duplicate group or item ids, ids that do not match `/^[A-Za-z][\w-]*$/`, unknown modes, or more modes than tiers.

## Items

An item is `{ id, current?, at? }` plus any fields your snippet needs.

- `id` is unique within the bar.
- `current` marks the active item. Its wrapper gets `data-current`, and a menu that holds it marks its button with `data-current`. Set `aria-current` or `aria-pressed` yourself in the snippet.
- `at` is the item's mode per tier.

```ts
import type { TierItem } from 'svelte-components';

type Link = TierItem & { label: string; href: string };

const docsLink: Link = { id: 'docs', label: 'Docs', href: '/docs', at: ['inline', 'icon', 'menu'] };
```

## Tiers and modes

Tier 0 is the widest. With `breakpoints={[640, 480, 340]}`:

| Tier | Container width |
|-|-|
| 0 | `>= 640px` |
| 1 | `480px` to `640px` |
| 2 | `340px` to `480px` |
| 3 | `< 340px` |

The three modes:

| Mode | Where the item shows |
|-|-|
| `inline` | In the bar, with its label |
| `icon` | In the bar, label dropped. The snippet renders the icon and an accessible name. |
| `menu` | Inside its group's menu |

`at` is one mode for every tier, or a list from tier 0 down. The last entry repeats, so `['inline', 'menu']` means inline in tier 0 and in the menu in every narrower tier. Without `at` the item is always `inline`.

To keep the current item labelled at every width, compute `at` from it:

```ts
import type { Mode, TierItem } from 'svelte-components';

const currentId = 'issues';
const narrowing: Mode[] = ['inline', 'inline', 'icon'];

const sections: TierItem[] = ['home', 'projects', 'issues'].map((id) => ({
	id,
	current: id === currentId,
	at: id === currentId ? 'inline' : narrowing,
}));
```

## Groups

Items live in groups. Each group renders its bar items, then its menu button. A group whose items are all `menu` in a tier collapses into that button. Tiers whose menu holds the same items share one button and popover.

```ts
import type { TierGroup, TierItem } from 'svelte-components';

type Tool = TierItem & { label: string };

const insertGroup: TierGroup<Tool> = {
	id: 'insert',
	label: 'Insert',
	items: [
		{ id: 'link', label: 'Link', at: ['inline', 'icon', 'menu'] },
		{ id: 'code', label: 'Code', at: ['inline', 'icon', 'menu'] },
	],
};
```

## Snippets

`item(item, mode, variant)` runs once per rendering. Render a link or a button. Give it an accessible name in `icon` mode.

`trigger(group, current)` fills the menu button. The button already has `aria-label={group.label}`, so keep the visible text consistent with that name.

```svelte
<script lang="ts">
	import { TierBar, type Mode, type TierGroup, type TierItem } from 'svelte-components';

	type Tool = TierItem & { label: string; icon: string };

	const groups: TierGroup<Tool>[] = [
		{
			id: 'insert',
			label: 'Insert',
			items: [
				{ id: 'link', label: 'Link', icon: '↗', at: ['inline', 'icon', 'menu'] },
				{ id: 'code', label: 'Code', icon: '‹›', at: ['inline', 'icon', 'menu'] },
			],
		},
	];

	function run(tool: Tool) {
		console.log(tool.id);
	}
</script>

<TierBar aria-label="Insert tools" role="group" breakpoints={[400, 240]} {groups}>
	{#snippet item(tool: Tool, mode: Mode, variant: string)}
		<button id="tool-{variant}" type="button" aria-label={mode === 'icon' ? tool.label : undefined} onclick={() => run(tool)}>
			<span aria-hidden="true">{tool.icon}</span>
			{#if mode !== 'icon'}{tool.label}{/if}
		</button>
	{/snippet}
	{#snippet trigger(group: TierGroup<Tool>, current: boolean)}
		{group.label}{current ? ' •' : ''} ▾
	{/snippet}
</TierBar>
```

## Variant ids

An item renders more than once: once for each bar mode it uses, and once for each menu it appears in. Only one rendering is visible at a time, but all of them are in the DOM. `variant` is unique per rendered element on the page: it combines the bar instance, the item id, the mode and the first tier, for example `s1-docs-inline-0`. Use it as the id suffix for any DOM id and for `aria-*` references to that id:

```svelte
{#snippet item(link: Link, mode: Mode, variant: string)}
	<a id="nav-{variant}" href={link.href} aria-describedby="nav-hint-{variant}">{link.label}</a>
	<span id="nav-hint-{variant}" hidden>{link.label} section</span>
{/snippet}
```

## Styling

The component draws almost nothing. Your snippets draw the items.

| Hook | Use |
|-|-|
| `.tierbar` | The bar, a flex row. Takes your `class`. |
| `.tierbar-group`, `[data-group=id]` | A group, a flex row. |
| `.tierbar-trigger` | A menu button. `[data-current]` when it holds the current item. |
| `.tierbar-menu` | A menu, a flex column when open. |
| `[data-item=id]`, `[data-mode]`, `[data-current]` | Item wrappers. |
| `--tierbar-gap`, `--tierbar-group-gap` | Gap between items, and between groups. |
| `--tierbar-menu-gap`, `--tierbar-menu-padding`, `--tierbar-menu-min-width` | Menu layout. |
| `--tierbar-menu-bg`, `--tierbar-menu-color`, `--tierbar-menu-border`, `--tierbar-menu-radius` | Menu box. |
| `--tierbar-menu-offset`, `--tierbar-menu-z` | Gap under the button, and stacking where `popover` is missing. |

The classes are scoped inside the component. Reach them from your own component with `:global`:

```css
:global(.main-nav .tierbar-trigger[data-current]) {
	background: color-mix(in srgb, #2563eb 16%, transparent);
}

:global(.main-nav .tierbar-menu) {
	--tierbar-menu-radius: 0.75rem;
	--tierbar-menu-min-width: 12rem;
}
```

Elements rendered by your snippets are in your component's scope, including the rows inside menus, so plain scoped selectors style them.

## Layout

The bar's root is a size container (`container-type: inline-size`). Its width comes from its parent, not its content, so place it where it can fill a row: a flex item with `flex: 1`, a grid cell, or a block.
