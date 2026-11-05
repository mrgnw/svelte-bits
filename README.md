# svelte-components

Reusable Svelte 5 components. The first is `TierBar`: a row of items that collapses through a fixed ladder of width tiers. It suits navs, toolbars, action bars, filter rows and tab strips.

> [!NOTE]
> This project was built with heavy LLM assistance and should be considered proof-of-concept. Contributions are welcome, but I can't guarantee the accuracy of the code or that I will continue to maintain it. If there are any mistakes in attribution or anything else, please let me know.

## TierBar

In each tier, every item is in one of three modes:

- `inline`: in the bar with its label
- `icon`: in the bar, label dropped (your snippet renders the icon and an accessible name)
- `menu`: inside its group's menu button, a native `popover`

A group whose items are all `menu` in a tier collapses into its menu button.

### Usage

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

`src/routes/+page.svelte` has a nav and an editor toolbar in resizable boxes.

### Props

| Prop | Type | Notes |
|-|-|-|
| `breakpoints` | `number[]` | Container widths in px, strictly descending. n breakpoints make n + 1 tiers. |
| `groups` | `TierGroup<T>[]` | `{ id, label, items }`. `label` is the menu button's accessible name. |
| `item` | `Snippet<[T, Mode, string]>` | Renders one item in one mode. The third argument, `variant`, is unique per rendered element on the page (instance, item, mode, tier, e.g. `s1-docs-inline-0`). |
| `trigger` | `Snippet<[TierGroup<T>, boolean]>` | Optional contents of a menu button; the boolean is true when the menu holds the current item. Default: the group label. |
| `as` | `'nav' \| 'div'` | Element of the bar. Default `div`. |
| `class`, `aria-*`, `role`, … | | Passed to the bar element. |

Items are `{ id, current?, at? }` plus any fields your snippet needs. `id` must match `/^[A-Za-z][\w-]*$/` and be unique in the bar.

### Defining tiers

Tier 0 is the widest. With `breakpoints={[640, 480, 340]}`:

| Tier | Container width |
|-|-|
| 0 | `>= 640px` |
| 1 | `480px` to `640px` |
| 2 | `340px` to `480px` |
| 3 | `< 340px` |

`at` is one mode for every tier, or one per tier from widest to narrowest. The last entry repeats, so `['inline', 'menu']` means inline in tier 0 and in the menu everywhere narrower. Omitted `at` means `inline`. Invalid props (unsorted breakpoints, duplicate ids, more modes than tiers) throw.

To keep the current item labelled, compute `at` from it: `at: current ? 'inline' : ['inline', 'icon']`.

### Behaviour

- An item renders more than once: once per bar mode it uses, and once per menu it appears in. Use `variant` as the id suffix (`id="nav-{variant}"`) for any DOM id and the `aria-*` references to it.
- Each rendering sits in a `display: contents` wrapper with `data-t="<tiers>"`. Variants not in the current tier are `display: none`, so they are out of the tab order and the accessibility tree.
- Menus are `popover="auto"` with their own `<button popovertarget>` and accessible name. Escape and outside click close them natively. Activating a link or button inside closes the menu. The popover follows its button in the DOM, so Tab reaches it.
- Tiers whose menu holds the same items share one button. A button gets `data-current` when its menu holds a `current` item.
- On a tier change, open menus close. If the focused control was hidden, focus moves to the same item in the new tier, else the menu that holds it, else the current item, else the first item.

### Styling

The component draws almost nothing. Your snippets draw the items.

| Hook | Use |
|-|-|
| `.tierbar` | The bar (flex row). Takes your `class`. |
| `.tierbar-group`, `[data-group=id]` | A group (flex row). |
| `.tierbar-trigger` | A menu button. `[data-current]` when it holds the current item. |
| `.tierbar-menu` | A menu popover (flex column when open). |
| `[data-item=id]`, `[data-current]` | Item wrappers. |
| `--tierbar-gap`, `--tierbar-group-gap` | Gap between items, between groups. |
| `--tierbar-menu-{gap,padding,min-width,bg,color,border,radius,offset}` | Menu box. |

Classes are scoped, so target them from a parent with `:global(.tierbar-menu)`.

### Why no measurement

The ladder is fixed and the labels are known, so width alone picks the tier. There is no ResizeObserver deciding layout and no JavaScript measuring items: the server-rendered HTML already carries the per-tier CSS, so the first paint is correct and nothing flickers on hydration.

Tiers use **container queries**, not media queries. A generic bar is placed in sidebars, cards and split panes, so the width that matters is its own, not the viewport's. The root sets `container-type: inline-size`, which means the bar's width comes from its parent (it fills the row), not from its content.

Breakpoints are props, but a component's `<style>` cannot hold runtime values. `TierBar` generates the rules from the props and puts them in `<svelte:head>`, scoped by an id from `$props.id()`, which matches between server and client. The CSS is built only from validated numbers and that id.

Focus handling needs to know when the tier changed. `matchMedia` cannot see container queries, so each tier's rule also sets `--tier` on the bar, and the code reads it with `getComputedStyle`. `--tier` is re-read when a ResizeObserver fires and when `breakpoints` change. The observer measures nothing, so the tier always comes from the same CSS that decides visibility.

A `TierBar` nested inside another keeps its own tiers, focus handling and menus. See Browser support for the menu fallbacks.

## Browser support

Target: [Baseline](https://web.dev/baseline) widely available (`browserslist`: `baseline widely available`). Statuses below are from the `web-features` data on 2026-11-05. Features that are not widely available have a fallback.

| Feature | Used for | Baseline | Fallback |
|-|-|-|-|
| Container size queries, range syntax | Picking the tier | Widely available (2025-08) | None needed |
| `display: contents` on non-focusable elements | Item wrappers | Widely available (2022-07) | None needed |
| `:not()` with complex selectors, `:is()` | Scoping tier rules, open-menu style | Widely available | None needed |
| `ResizeObserver` | Signal to re-read the tier | Widely available | None needed |
| Custom properties, `@supports`, flex `gap`, `color-mix()`, system colors | Styling | Widely available | None needed |
| `popover`, `popovertarget`, `:popover-open` | Menus | Newly available (2025-01) | Without `popover`, the button toggles `data-open` on the menu, which is placed under the button relative to the bar; Escape, outside click and activating an item close it. |
| CSS anchor positioning (`position-area`, `position-try-fallbacks`) | Menu placement | Not Baseline | Without it, the menu is placed under its button in JavaScript when it opens, flipped left or up to stay in the viewport. It does not follow the button while the page scrolls. |
| `resize` (demo only) | Resizable demo frames | Not Baseline (no iOS) | The demo also has a width slider. |

## Development

```sh
pnpm install
pnpm dev
pnpm test
pnpm check
pnpm build
```

The dev server runs on port 5262. `pnpm test` runs unit tests in Node and browser tests in headless Chromium (`pnpm exec playwright install chromium` once).
