# svelte-bits

git: main-only

Reusable Svelte 5 components, packaged with `svelte-package`. Components live in `src/lib`, the demo in `src/routes`, browser-test fixtures in `src/tests`.

- Dev server: `pnpm dev` on port 5262. Stop it when done.
- Checks: `pnpm test`, `pnpm check`, `pnpm build`.
- Components take no runtime dependencies. Styling stays minimal and overridable; consumers render through snippets.
- Docs site: the demo, prerendered with `adapter-cloudflare` and served by a Worker (`wrangler.jsonc`). `pnpm site:preview` runs it locally on port 5263. The `ship` script deploys; run it only from clean, pushed `main`.
- Imports inside the repo use `#lib`, not `$lib` (SvelteKit 3).
