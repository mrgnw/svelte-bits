# Contributing

Start with an [open issue](https://github.com/mrgnw/svelte-bits/issues), especially one marked [good first issue](https://github.com/mrgnw/svelte-bits/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22good%20first%20issue%22). Discuss new components in an issue before building them; [ROADMAP.md](ROADMAP.md) describes the intended scope.

## Setup

Use Node.js 22 or newer and pnpm 10, matching CI. Fork the repository, clone your fork, and create a branch for one change.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
ALLOWED_HOSTS=.skate-in.ts.net pnpm dev --host 0.0.0.0
```

Open http://localhost:5262 for TierBar or http://localhost:5262/section-nav for SectionNav. Stop the server when finished.

## Checks

```sh
pnpm test
pnpm check
pnpm build
```

Tests include unit tests and browser tests in headless Chromium. The build also packages the library and checks it with publint. If your browser cache is blocked, set the same browser path for installation and tests:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers pnpm exec playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers pnpm test
```

## Add or change a component

- Keep components in `src/lib`, with no runtime dependencies and minimal, overridable styles. Let consumers provide content through Svelte 5 snippets.
- Follow the existing export conventions in `src/lib/index.ts`, `src/lib/section-nav/index.ts`, and `package.json`. Imports inside this repo use `#lib`.
- Add a small demo under `src/routes` and focused tests beside the implementation or in `src/tests`. Cover keyboard behavior, accessible names, and responsive states when relevant.
- Update the component documentation and README example when its public API changes. Use tabs for code indentation.

Keep pull requests focused. Describe the user-visible change, link its issue, and include the checks you ran. Include a screenshot or short recording for visual changes. Contributions are covered by the existing [MIT license](LICENSE).
