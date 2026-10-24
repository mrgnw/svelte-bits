# section-nav

A sections sidebar for long pages. Wrap the page body in it and you get:

- a sticky sidebar listing the page's sections, with the current one highlighted as you scroll
- a collapse handle, remembered in localStorage
- keys: `j` / `k` step to the next / previous section, `b` collapses the sidebar
- below 64rem, a sticky "current section" bar that opens the list as a popover

One Svelte component, built two ways: a normal Svelte component for SvelteKit sites, and a `<section-nav>` custom element for plain HTML pages.

> [!NOTE]
> This project was built with heavy LLM assistance and should be considered proof-of-concept. Contributions are welcome, but I can't guarantee the accuracy of the code or that I will continue to maintain it. If there are any mistakes in attribution or anything else, please let me know.

## SvelteKit

Install from GitHub. The package exports source, so there is no build step on install:

```sh
pnpm add github:mrgnw/section-nav
```

Pass the sections when you know them, so the nav is in the server-rendered HTML:

```svelte
<script lang="ts">
	import SectionNav, { type Section } from 'section-nav';

	const sections: Section[] = [
		{ id: 'basics', title: 'Basics', group: true },
		{ id: 'install', title: 'Install' },
		{ id: 'usage', title: 'Usage' }
	];
</script>

<SectionNav {sections} --nav-top="4rem" --bar-top="45px">
	<h2 id="basics">Basics</h2>
	<h3 id="install">Install</h3>
	<h3 id="usage">Usage</h3>
</SectionNav>
```

Every `id` must match a heading (or any element) on the page. Entries with `group: true` render as small uppercase headings and are not tracked or stepped.

Leave out `sections` and the component scans its content for `h2` and `h3` after mount instead. That works, but the list is empty in the server HTML.

The page needs client-side rendering (`csr` on, the SvelteKit default). Without it the nav renders and is styled, but scroll tracking, the keys, collapse, and closing the popover do not run.

pygorst is a working example: `src/lib/LangPage.svelte`.

## Plain HTML

Load the custom element and wrap the page:

```html
<script type="module" src="/_dmox/section-nav.js"></script>

<section-nav>
	<h2>Getting started</h2>
	<h3>Install</h3>
	<h3>Usage</h3>
	<h2>Behavior</h2>
	<h3>Keyboard</h3>
</section-nav>
```

dmox serves the file at `/_dmox/section-nav.js` for every mockup. Anywhere else, build it (below) and serve `dist-ce/section-nav.js` yourself.

The element scans its content for headings. When both levels exist, the first (`h2`) becomes a group heading and the second (`h3`) the items; with one level, every heading is an item. Headings without an `id` get one from their text (`Same title` becomes `same-title`, then `same-title-2`). It reads at most 200 headings. Scanned headings also get a scroll margin of `--nav-top`, so jumping to one clears a sticky header.

Custom elements do not render on the server, so the sidebar appears once the script runs.

## Props

| Prop | Default | |
|-|-|-|
| `sections` | none | `{ id, title, group? }[]` in page order. Omit to scan. |
| `levels` | `'h2,h3'` | Heading selectors to scan when `sections` is absent. |
| `key` | `'sidebar'` | localStorage key for the collapsed state. |
| `label` | `'Sections'` | The nav's `aria-label`, and the mobile bar text before a section is current. |

On the custom element, set `levels`, `key`, and `label` as attributes. Set `sections` as a property from JS (`el.sections = [...]`).

## Theming

Custom properties, all optional. On the Svelte component pass them as `--name="value"`; on the element set them in `style` or CSS.

| Property | Default | |
|-|-|-|
| `--nav-width` | `13rem` | Sidebar column width. |
| `--nav-top` | `1rem` | Sticky offset of the desktop sidebar. Set it to your header height plus a gap. |
| `--bar-top` | `0` | Sticky offset of the mobile bar. Set it to your header height. |
| `--nav-muted` | `currentColor` at 55% | Link and icon color. |
| `--nav-line` | `currentColor` at 15% | Borders. |
| `--nav-bg` | `Canvas` | Mobile bar and popover background. |

The current link and hovered links take the inherited text color. Colors follow the page's `color-scheme`.

## Behavior notes

- The current section is the last heading whose top is at most 96px below the viewport top.
- Keys are ignored while a modifier is held, while typing in a field, and while a `<dialog>` is open.
- Collapse runs inside a view transition unless the user prefers reduced motion.
- One instance per page: the nav uses the fixed id `sections-nav`.

## Develop

```sh
pnpm install
pnpm dev
```

The demo is at http://localhost:5241 (`src/routes/+page.svelte`). The plain HTML demo is `mockups/index.html`, which dmox serves.

## Build

```sh
pnpm build:all
```

- `pnpm build`: the Svelte component, packaged into `dist/`.
- `pnpm build:ce`: the custom element, one ES module at `dist-ce/section-nav.js` (about 50 KB, 19 KB gzipped).

The custom element's tag lives in `src/lib/SectionNavElement.svelte`, a wrapper that only `build:ce` uses. Keep `<svelte:options customElement>` out of `SectionNav.svelte`: Svelte treats any component carrying it as a custom element, even in a normal build, and then injects its CSS from JS instead of putting it in the page.

## Update the copies

After changing the component, push `main`, then update each consumer:

```sh
cd ~/dev/pygorst && pnpm update section-nav
```

dmox embeds a vendored copy of the custom element; its README has the refresh command.

Design details and the full spec: [SPEC.md](SPEC.md).

## License

Private repository; no license yet.
