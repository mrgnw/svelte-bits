# SectionNav component spec

One file `src/lib/SectionNav.svelte`, Svelte 5 runes, TypeScript, plain CSS (no Tailwind: the custom-element build runs in shadow DOM). Built two ways; see Builds.

## Props

```ts
type Section = { id: string; title: string; group?: boolean };
let { sections, levels = 'h2,h3', key = 'sidebar', label = 'Sections' } = $props();
```

- `sections?: Section[]` in document order. `group: true` entries render as uppercase group headings above the following items (pygorst's `##` groups). When given, the nav renders from it, so SSR works. Not rescanned if it changes later.
- `levels` is a comma-separated heading selector list. Used only when `sections` is absent: on mount, scan the slotted content for those headings. If the list has two tags and headings of both exist, the first tag is a group heading and the second an item; otherwise every heading is an item. Headings without an `id` get one slugified from their text (lowercase, non-alphanumerics to `-`, trimmed, `-2`, `-3` suffixes on duplicates). Scanned headings also get `style.scrollMarginTop ||= 'var(--nav-top, 1rem)'` so hash navigation clears a page header. Bound: at most 200 headings.
- `key` is the localStorage key for the collapsed state. Values `'collapsed'` or `''`.
- `label` is the nav's `aria-label` and the mobile bar fallback text.

Custom element options: `<svelte:options customElement={{ tag: 'section-nav', props: { sections: { type: 'Array' } } }} />`. Svelte ignores this when not compiling as a custom element.

## Markup

```svelte
<div class="grid" class:collapsed>
	<div class="side">
		<button class="handle" aria-expanded={!collapsed} aria-controls="sections-nav" aria-keyshortcuts="b" aria-label={label} title="{label} (b)" onclick={toggle}>sidebar icon svg</button>
		<button class="bar" popovertarget="sections-nav"><span class="now">{current item title or label}</span><span aria-hidden="true">▾</span></button>
		<nav id="sections-nav" aria-label={label} popover bind:this={nav}>
			per group: optional <a class="group" href="#id">, then <ul><li><a href="#id" aria-current="location" when current>
		</nav>
	</div>
	<div class="content" bind:this={content}><slot /></div>
</div>
```

Use `<slot />`, not `{@render children()}`: it is what the custom element needs, and in Svelte 5 it also renders the `children` snippet when used as a normal component. Confirm with svelte-check; if it errors, branch on `children` being defined.

Finding the slotted content for scanning: `content.querySelector('slot')?.assignedElements() ?? [content]`, then for each root take the root itself if it matches `levels` plus `root.querySelectorAll(levels)`.

Sidebar icon: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="2"/><path d="M6 2.5v11"/></svg>`.

## Behavior

- Tracking: on `scroll` (rAF-throttled, one update per frame) and on mount, current = last item whose heading (`document.getElementById`, headings live in the light DOM in both builds) has `getBoundingClientRect().top <= 96`, else 0. Only items are tracked, not group headings. After current changes and when `nav.scrollHeight > nav.clientHeight`, `scrollIntoView({ block: 'nearest' })` the current link.
- Collapse: `collapsed` state, read from `localStorage.getItem(key) === 'collapsed'` on mount, written on toggle. Toggle runs inside `document.startViewTransition` when available and `prefers-reduced-motion` is not `reduce`; the callback must `await tick()` so the DOM change is inside the transition.
- Keyboard, `<svelte:document onkeydown>`: ignore when meta/ctrl/alt is held, when `event.target.closest('input, textarea, select, [contenteditable]')`, or when `document.querySelector('dialog[open]')`. `b` toggles, `j` / `k` step to the next / previous item with `scrollIntoView({ block: 'start', behavior: 'instant' })`. `preventDefault` only for handled keys.
- A click on a nav link while `nav.matches(':popover-open')` calls `nav.hidePopover()`.
- Hash navigation is native `<a href="#id">`; no scroll JS on click.

## Styles

Host custom properties, all optional: `--nav-width` (13rem), `--nav-top` (1rem; sticky offset of the desktop sidebar and the scroll margin given to scanned headings), `--bar-top` (0; sticky offset of the mobile bar), `--nav-muted` (`color-mix(in oklab, currentColor 55%, transparent)`), `--nav-line` (`color-mix(in oklab, currentColor 15%, transparent)`), `--nav-bg` (`Canvas`). Text color is inherited. `:host { display: block }`.

Below 64rem: single column. `.side` is `position: sticky; top: var(--bar-top); z-index: 1`. `.handle` hidden. `.bar` is a full-width left-aligned button, 0.875rem text in `--nav-muted`, bottom border `--nav-line`, background `--nav-bg`, `.now` truncates. The nav is a popover panel: `position: fixed; inset: auto 1rem; top: calc(var(--bar-top, 0px) + 3rem); max-height: 70dvh; overflow: auto; padding: 1rem; border: 1px solid var(--nav-line); border-radius: .5rem; background: var(--nav-bg); color: inherit;` and a soft shadow. Item list gap 0.5rem.

From 64rem: `.grid { display: grid; grid-template-columns: var(--nav-width, 13rem) minmax(0, 1fr); column-gap: 2.5rem }`, collapsed → `1.5rem minmax(0, 1fr)` with 1rem gap. `.side { position: sticky; top: var(--nav-top); align-self: start; max-height: calc(100dvh - var(--nav-top, 1rem) - 1rem); display: flex; flex-direction: column }`. `.bar` hidden, `.handle` shown as a small icon button in `--nav-muted`, full color on hover. The nav overrides the popover styling back to a static block (`position: static; display: block; inset: auto; padding: 0; border: 0; background: transparent; box-shadow: none; overflow: auto; min-height: 0`), hidden when collapsed. Item list gap 0.25rem, 0.875rem text. Group link: block, 0.75rem, 600 weight, uppercase, 0.05em tracking, margin `1rem 0 .25rem`, none on the first.

Links: `--nav-muted`, no underline; hover and `aria-current` take the inherited color, current also weight 500.

Motion, inside `@media (prefers-reduced-motion: no-preference)`: popover open/close fades and slides 0.25rem over 0.15s using `transition: opacity, translate, display allow-discrete, overlay allow-discrete` with `@starting-style`. From 64rem, `nav { view-transition-name: section-nav }`.

## Builds

- `pnpm build` → svelte-package as scaffolded (the normal component, `dist/`). `src/lib/index.ts` exports `SectionNav` as default and the `Section` type.
- `pnpm build:ce` → `vite build --config vite.ce.config.ts`: `@sveltejs/vite-plugin-svelte` with `compilerOptions: { customElement: true, runes: true }`, lib build, entry `src/lib/element.ts` (which just imports the component so the tag registers), `formats: ['es']`, file name `section-nav.js`, `outDir: 'dist-ce'`, gitignored. Target modern browsers (`build.target: 'esnext'`).
- `pnpm build:all` runs both.
- Dev server port 5241, `strictPort`, `host: true`, `allowedHosts: ['.example.ts.net']`.

## Demo pages

- `src/routes/+page.svelte`: renders `<SectionNav sections={…}>` around a dozen tall sections with `h2` ids matching, two of them groups, each item 60vh tall so scrolling exercises tracking. Also one `<SectionNav>` without `sections` below that? No: one instance per page. Put the scan-mode demo in the mockup instead.
- `mockups/index.html`: plain HTML, `<script type="module" src="/_dmox/section-nav.js"></script>`, `<section-nav style="--nav-top: 1rem">` wrapping ten tall `<section><h2>…</h2></section>` blocks with no ids, two `h1`-less groups made of `h2` + several `h3`. Served by dmox once dmox embeds the file. For local verification before that, copy `dist-ce/section-nav.js` and this file into a temp dir, change the script src to `./section-nav.js`, and serve the dir with any static server.

## Done when

- `pnpm check` passes with no errors.
- Both builds succeed; `dist-ce/section-nav.js` is a single ES module under 60 KB (about 50 KB, 19 KB gzipped; the Svelte runtime is 30 KB of it).
- In the dev page (5241): sidebar tracks on scroll, `b` collapses with a transition and survives reload, `j`/`k` step, narrowing under 64rem shows the bar and the popover works, links close it.
- In the static demo: headings got ids, grouped h2/h3 render as groups and items, everything above works too.
- `CLAUDE.md` in the repo: one paragraph on what it is, `git: main-only`, the ports, the two builds, and a pointer to SPEC.md.
