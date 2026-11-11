# section-nav

Sections sidebar extracted from pygorst as one Svelte component, usable in SvelteKit sites and in static HTML (dmox mockups).

## Why

pygorst's sidebar is three pieces spread over the site: the `<nav>` markup in `src/lib/LangPage.svelte`, the behavior in the inline script in `src/routes/+layout.svelte` (scroll tracking, `b` collapse persisted in localStorage, `j`/`k` section stepping, mobile popover with a "current section" bar), and Tailwind utilities plus `.sections-nav` / `.sidebar-grid` rules in `layout.css`.

dmox serves hand-written HTML mockups with inline `<style>` and no build step. Mockups often have many tall sections. So the component must also ship as a custom element.

## Design

One source file, built two ways.

```svelte
<!-- SectionNav.svelte -->
<svelte:options customElement={{ tag: 'section-nav', props: { sections: { type: 'Array' } } }} />
<script>
	let { sections, levels = 'h2,h3', key = 'sidebar' } = $props();
	// sections given → render them (SSR in pygorst)
	// sections missing → scan slotted content for `levels` after mount (mockups)
</script>
<div class="grid"><nav popover>…</nav><slot /></div>
```

- Normal Svelte component for SvelteKit sites. Vite library build with `customElement: true` emits one `section-nav.js`. The tag option lives in a wrapper component that only the custom element build imports; on the component itself it would make Svelte inject CSS from JS.
- Plain CSS, no Tailwind: shadow DOM blocks global styles. `light-dark()` for color scheme. Host custom properties for theming: `--nav-width`, `--nav-muted`, `--nav-top`.
- The component owns the two-column layout and slots the content, so a page wraps its body in `<section-nav>` and gets the sidebar, mobile bar, collapse handle and keyboard shortcuts with no other markup.
- Behavior carried over: aria-current tracking on scroll, collapse with localStorage under `key`, `b` toggles, `j`/`k` step sections, below `lg` the nav is a popover opened from a sticky "current section" bar, view transitions on collapse.
- The component renders its own collapse handle (pygorst's header button goes away).

## Static HTML usage

dmox serves the built file itself: one axum route, `include_str!` of `section-nav.js` at `/_dmox/section-nav.js`. A mockup opts in:

```html
<script type="module" src="/_dmox/section-nav.js"></script>
<section-nav> …existing page… </section-nav>
```

## Order of work

1. This repo: library template (`sv create`, svelte-package), the component, both builds, a demo page in `mockups/` so dmox serves it.
2. dmox: embed the built file, add the route, convert one existing mockup.
3. pygorst: `pnpm add github:...`, replace the nav markup, delete the sidebar JS and CSS from the layout.

## Caveats

- pygorst ships no client JS beyond its inline script today. This adds hydration for one component. Keeping pygorst's inline version and only building the custom element avoids that at the cost of two implementations.
- Custom elements do not server-render. Fine for mockups; pygorst uses the regular component build so its nav stays in the static HTML.
- Skipped: npm publishing. Add when a third site needs it.
