# section-nav

Sections sidebar as one Svelte component (`src/lib/SectionNav.svelte`), used as a normal component in SvelteKit sites and as the `<section-nav>` custom element in static HTML (dmox mockups). Design and behavior: SPEC.md; background: PLAN.md.

git: main-only

## Ports

- dev: 5241 (`pnpm dev`)

## Builds

- `pnpm build`: svelte-package, the normal component in `dist/`.
- `pnpm build:ce`: custom element, one ES module `dist-ce/section-nav.js` (gitignored).
- `pnpm build:all`: both.
