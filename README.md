# svelte-components

Reusable Svelte 5 components. The first is `TierBar`: a row of items that collapses through a fixed ladder of width tiers. In each tier an item is shown with its label, as an icon, or inside its group's menu. It suits navs, toolbars, action bars, filter rows and tab strips.

> [!NOTE]
> This project was built with heavy LLM assistance and should be considered proof-of-concept. Contributions are welcome, but I can't guarantee the accuracy of the code or that I will continue to maintain it. If there are any mistakes in attribution or anything else, please let me know.

- The tier comes from CSS container queries on the bar's own width. Nothing is measured, and the server-rendered HTML is correct on first paint.
- Menus are native popovers with their own button, closed by Escape, outside click and activating an item.
- Hidden variants are `display: none`, so they are out of the tab order and the accessibility tree. Focus follows to the visible counterpart when the tier changes.
- Targets Baseline widely available, with fallbacks for `popover` and anchor positioning.

## Install

The package is not on npm. Build it from a checkout and add it by path:

```sh
SVELTE_COMPONENTS_DIR=~/dev/svelte-components
```

```sh
pnpm --dir "$SVELTE_COMPONENTS_DIR" install
pnpm --dir "$SVELTE_COMPONENTS_DIR" build
pnpm add "$SVELTE_COMPONENTS_DIR"
```

## Quick start

```svelte
<script lang="ts">
	import { TierBar, type Mode, type TierGroup, type TierItem } from 'svelte-components';

	type Link = TierItem & { label: string; href: string };

	const groups: TierGroup<Link>[] = [
		{
			id: 'main',
			label: 'Sections',
			items: [
				{ id: 'home', label: 'Home', href: '/', current: true },
				{ id: 'docs', label: 'Docs', href: '/docs', at: ['inline', 'icon'] },
			],
		},
		{
			id: 'account',
			label: 'Account',
			items: [
				{ id: 'profile', label: 'Profile', href: '/profile', at: ['inline', 'menu'] },
				{ id: 'settings', label: 'Settings', href: '/settings', at: ['inline', 'menu'] },
			],
		},
	];
</script>

<TierBar as="nav" aria-label="Main" breakpoints={[600]} {groups}>
	{#snippet item(link: Link, mode: Mode, variant: string)}
		<a
			id="nav-{variant}"
			href={link.href}
			aria-current={link.current ? 'page' : undefined}
			aria-label={mode === 'icon' ? link.label : undefined}
		>
			{mode === 'icon' ? '•' : link.label}
		</a>
	{/snippet}
</TierBar>
```

At 600px and wider every item is inline. Below 600px, Docs drops to an icon and Profile and Settings move into the Account menu.

## Demo

The demo shows a nav and an editor toolbar with width sliders, a live readout of the tier and each item's mode, and the source of each example.

```sh
pnpm install
pnpm dev
```

It runs at http://localhost:5262.

## Docs

- [Usage](docs/usage.md): props, snippets, `variant` ids, modes, groups, styling
- [How it works](docs/how-it-works.md): tier CSS, container queries, no measurement, focus, menus
- [Browser support](docs/browser-support.md): the Baseline target and fallbacks

## Development

```sh
pnpm test
pnpm check
pnpm build
```

`pnpm test` runs unit tests in Node and browser tests in headless Chromium. Install the browser once with `pnpm exec playwright install chromium`.

## License

[MIT](LICENSE)
