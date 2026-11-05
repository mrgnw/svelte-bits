# How TierBar works

## One rendering per mode, hidden by CSS

For every item, TierBar renders one wrapper per bar mode the item uses (`inline`, `icon`) and one row in each menu that holds it. Each bar wrapper and each menu button carries the tiers it shows in:

```html
<span class="tierbar-slot" data-item="docs" data-mode="inline" data-t="0 1"></span>
<span class="tierbar-slot" data-item="docs" data-mode="icon" data-t="2"></span>
<span class="tierbar-slot" data-holds="docs settings" data-t="3"></span>
```

The wrappers are `display: contents`, so the bar lays out your elements as if the wrappers were not there. A variant whose `data-t` does not list the current tier is `display: none`. It is out of the tab order and the accessibility tree, and screen readers never meet the same item twice.

## Generated tier CSS

The breakpoints are props, but a component's `<style>` cannot hold runtime values. TierBar builds the rules from the props and renders them into `<svelte:head>`. For `breakpoints={[640, 480]}` and instance id `s1`:

```css
[data-tierbar="s1"] > [data-bar] { --tier: 0; }
@container tierbar-s1 (width >= 640px) {
	[data-tierbar="s1"] [data-t]:not([data-t~="0"]):not([data-tierbar="s1"] [data-tierbar] [data-t]) { display: none !important; }
	[data-tierbar="s1"] > [data-bar] { --tier: 0; }
}
@container tierbar-s1 (480px <= width < 640px) { … --tier: 1; }
@container tierbar-s1 (width < 480px) { … --tier: 2; }
```

The instance id comes from `$props.id()`, which is the same on the server and the client, so the rules match the server-rendered markup. The `:not(…)` part leaves the variants of a TierBar nested inside this one to that bar's own rules.

The rules go into an HTML `<style>` element, so their input is checked first: every breakpoint must be a finite number above 0, strictly descending, and is written with `Number(…)`. The instance id must be a plain identifier. Anything else throws before any CSS is built.

## Container queries, not media queries

A generic bar sits in headers, sidebars, cards and split panes. The width that decides its shape is its own, not the viewport's, so the tiers are container queries. The root is `container-type: inline-size` with a container name unique to the instance.

The cost: a size container cannot take its width from its content. The bar fills the space its parent gives it.

## No measurement

The ladder is fixed and the labels are known when you pick the breakpoints, so width alone decides the tier. No JavaScript measures items, counts what fits, or moves items between lists. The HTML from the server already contains every variant and the CSS that picks between them, so the first paint is correct and hydration changes nothing on screen.

## Focus following

When the tier changes, the focused control may become `display: none`, which drops focus to the page. TierBar moves it to where that control lives in the new tier, in this order:

1. The same item, in its new mode
2. The menu button that now holds it
3. The current item
4. The first item in the bar

It needs to know when the tier changed. `matchMedia` cannot see container queries, so each tier's rule also sets `--tier` on the bar, and TierBar reads it with `getComputedStyle`. It reads `--tier` again when a `ResizeObserver` on the root fires and when `breakpoints` change. The observer only signals that something may have changed; the tier always comes from the same CSS that decides visibility. Focus only moves if it was lost, so a user who has moved focus elsewhere keeps it there.

On a tier change, the bar's own open menus close. Menus of a nested TierBar are left alone.

## Menus

Each menu is a `popover="auto"` element right after its button in the DOM, so Tab goes from the button into the open menu. The button has `popovertarget`, `aria-label={group.label}`, and `data-current` when the menu holds the current item.

- Opening and closing by click, Enter and Space come from `popovertarget`.
- Escape and an outside click close the menu through native light dismiss, and Escape returns focus to the button.
- Activating a link or button inside the menu closes it.

The menu is placed under its button with CSS anchor positioning (`anchor-name`, `position-anchor`, `position-area: bottom span-right`), flipping left or up when there is no room. Where anchor positioning or `popover` is missing, JavaScript takes over; see [Browser support](browser-support.md).
