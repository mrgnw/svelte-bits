# svelte-components

git: main-only

Reusable Svelte 5 components, packaged with `svelte-package`. Components live in `src/lib`, the demo in `src/routes`, browser-test fixtures in `src/tests`.

- Dev server: `pnpm dev` on port 5262. Stop it when done.
- Checks: `pnpm test`, `pnpm check`, `pnpm build`.
- Components take no runtime dependencies. Styling stays minimal and overridable; consumers render through snippets.
- Imports inside the repo use `#lib`, not `$lib` (SvelteKit 3).
