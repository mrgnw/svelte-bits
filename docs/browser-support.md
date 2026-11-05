# Browser support

Target: [Baseline](https://web.dev/baseline) widely available. `package.json` sets:

```json
"browserslist": ["baseline widely available"]
```

Statuses come from the `web-features` data, checked on 2026-11-05. Every feature that is not widely available has a fallback.

| Feature | Used for | Baseline | Fallback |
|-|-|-|-|
| Container size queries, range syntax | Picking the tier | Widely available since 2025-08 | None needed |
| `display: contents` on non-focusable elements | Item wrappers | Widely available since 2022-07 | None needed |
| `:not()` with complex selectors, `:is()` | Scoping tier rules, open-menu style | Widely available since 2023-07 | None needed |
| `ResizeObserver` | Signal to re-read the tier | Widely available since 2023-01 | None needed |
| Custom properties, `@supports`, flex `gap`, `color-mix()`, system colors | Styling | Widely available | None needed |
| `popover`, `popovertarget`, `:popover-open` | Menus | Newly available since 2025-01 | Menus without `popover`, below |
| CSS anchor positioning (`position-area`, `position-try-fallbacks`) | Menu placement | Not Baseline | Placement in JavaScript, below |

The demo page also uses the async Clipboard API (newly available since 2024-06) for its Copy buttons. The code is still selectable where it is missing.

## Menus without `popover`

Where `HTMLElement.prototype.popover` does not exist:

- The menu button toggles a `data-open` attribute on its menu.
- An open menu is `position: absolute` inside the bar's root and placed under its button.
- Escape closes it and returns focus to the button. A click outside the menu and its button closes it. Activating an item closes it.
- Focus following and tier changes treat a menu without `data-open` as closed.

The menu is not in the top layer, so an ancestor with `overflow: hidden` can clip it. `--tierbar-menu-z` sets its `z-index`.

## Placement without anchor positioning

Where `CSS.supports('position-area', 'bottom')` is false, the menu is placed when it opens:

- Under the button, 4px below, left edges aligned.
- Right edges aligned instead when it would leave the viewport on the right.
- Above the button when it would leave the viewport at the bottom.

The position is set once on open. The menu does not follow the button while the page scrolls.

## Tests

`src/tests/fallback.svelte.spec.ts` runs both fallbacks in Chromium:

- It calls the placement code directly and checks the menu sits under its button, and flips at the right edge.
- It removes `HTMLElement.prototype.popover` before rendering, then checks the `data-open` menu opens under its button and closes on Escape (returning focus), on an outside click and after an item is activated.

Chromium still runs native popover behaviour for the `popover` attribute, so the second test drives the fallback through its own functions rather than a real click on the button.
