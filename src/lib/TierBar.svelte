<script lang="ts" generics="T extends TierItem">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { keepFocus, menusOf, tierCount, tierCss, tiersWhere, type Mode, type TierGroup, type TierItem } from './tiers.js';

	type Props = HTMLAttributes<HTMLElement> & {
		/** Container widths in px, descending. n breakpoints make n + 1 tiers; tier 0 is the widest. */
		breakpoints: readonly number[];
		groups: readonly TierGroup<T>[];
		/** Renders one item in one mode. Render an accessible name yourself in 'icon' mode. An item can
		 *  render several times; `variant` (e.g. 'inline-0', 'menu-2') is unique per rendering, so suffix
		 *  DOM ids with it. */
		item: Snippet<[T, Mode, string]>;
		/** Contents of a group's menu button; `current` is true when the menu holds the current item. */
		trigger?: Snippet<[TierGroup<T>, boolean]>;
		as?: 'nav' | 'div';
	};

	let { breakpoints, groups, item, trigger, as = 'div', class: className, ...rest }: Props = $props();

	const id = $props.id();
	const count = $derived(tierCount(breakpoints, groups));
	const css = $derived(tierCss(id, breakpoints));
	const BAR_MODES = ['inline', 'icon'] as const;

	function closeAfterActivate(e: MouseEvent) {
		if ((e.target as Element).closest('a[href], button')) (e.currentTarget as HTMLElement).hidePopover();
	}
</script>

<svelte:head>
	{@html `<style>${css}</style>`}
</svelte:head>

<div class="tierbar-root" data-tierbar={id} style:container-name="tierbar-{id}" {@attach keepFocus}>
	<svelte:element this={as} {...rest} class={['tierbar', className]} data-bar>
		{#each groups as group (group.id)}
			<div class="tierbar-group" data-group={group.id}>
				{#each group.items as it (it.id)}
					{#each BAR_MODES as mode (mode)}
						{@const tiers = tiersWhere(it, mode, count)}
						{#if tiers.length > 0}
							<span class="tierbar-slot" data-item={it.id} data-t={tiers.join(' ')} data-current={it.current || undefined}>
								{@render item(it, mode, `${mode}-${tiers[0]}`)}
							</span>
						{/if}
					{/each}
				{/each}
				{#each menusOf(group, count) as menu (menu.key)}
					{@const menuId = `${id}-${group.id}-${menu.tiers[0]}`}
					<span class="tierbar-slot" data-holds={menu.key} data-t={menu.tiers.join(' ')}>
						<button
							type="button"
							class="tierbar-trigger"
							popovertarget={menuId}
							aria-label={group.label}
							data-current={menu.current || undefined}
							style:anchor-name="--{menuId}"
						>
							{#if trigger}{@render trigger(group, menu.current)}{:else}{group.label}{/if}
						</button>
						<!-- Clicks bubble from the links and buttons inside; Enter and Space on them fire click too. -->
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<div class="tierbar-menu" id={menuId} popover="auto" style:position-anchor="--{menuId}" onclick={closeAfterActivate}>
							{#each menu.items as it (it.id)}
								<span class="tierbar-slot" data-item={it.id} data-current={it.current || undefined}>
									{@render item(it, 'menu', `menu-${menu.tiers[0]}`)}
								</span>
							{/each}
						</div>
					</span>
				{/each}
			</div>
		{/each}
	</svelte:element>
</div>

<style>
	.tierbar-root {
		container-type: inline-size;
		min-width: 0;
	}

	.tierbar,
	.tierbar-group {
		display: flex;
		align-items: center;
		gap: var(--tierbar-gap, 0.25rem);
		min-width: 0;
		white-space: nowrap;
	}

	.tierbar {
		gap: var(--tierbar-group-gap, 1rem);
	}

	.tierbar-slot {
		display: contents;
	}

	.tierbar-trigger {
		font: inherit;
		color: inherit;
	}

	.tierbar-menu:popover-open {
		display: flex;
		flex-direction: column;
		gap: var(--tierbar-menu-gap, 0);
		padding: var(--tierbar-menu-padding, 0.25rem);
		min-width: var(--tierbar-menu-min-width, 10rem);
		background: var(--tierbar-menu-bg, Canvas);
		color: var(--tierbar-menu-color, CanvasText);
		border: var(--tierbar-menu-border, 1px solid color-mix(in srgb, currentColor 20%, transparent));
		border-radius: var(--tierbar-menu-radius, 0.5rem);
	}

	@supports (position-area: bottom) {
		.tierbar-menu {
			inset: auto;
			margin: var(--tierbar-menu-offset, 0.25rem) 0 0;
			position-area: bottom span-right;
			position-try-fallbacks: flip-inline, flip-block;
		}
	}
</style>
