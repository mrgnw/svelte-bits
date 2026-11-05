const GAP = 4;

export function popoverSupported(): boolean {
	return typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;
}

export function anchorSupported(): boolean {
	return typeof CSS !== 'undefined' && CSS.supports('position-area', 'bottom');
}

/** Whether a menu is open: a native open popover, or the data-open fallback where popover is missing. */
export function isOpen(menu: Element): boolean {
	return popoverSupported() ? menu.matches(':popover-open') : menu.hasAttribute('data-open');
}

export function closeMenu(menu: HTMLElement) {
	if (popoverSupported()) menu.hidePopover();
	else menu.removeAttribute('data-open');
}

function menuOf(button: HTMLElement): HTMLElement {
	const menu = document.getElementById(button.getAttribute('popovertarget') ?? '');
	if (!menu) throw new Error('TierBar: menu button has no menu');
	return menu;
}

function buttonOf(menu: HTMLElement): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[popovertarget="${menu.id}"]`);
}

/** Puts an open menu under its button, flipped to stay inside the viewport. Used where CSS anchor
 *  positioning is missing. A menu in the top layer is placed in viewport coordinates, a data-open
 *  fallback menu relative to the TierBar root. */
export function placeMenu(button: HTMLElement, menu: HTMLElement) {
	const b = button.getBoundingClientRect();
	const base = menu.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };
	const { clientWidth, clientHeight } = document.documentElement;
	const fitsRight = b.left + menu.offsetWidth <= clientWidth;
	const left = Math.max(0, fitsRight ? b.left : b.right - menu.offsetWidth);
	const fitsBelow = b.bottom + GAP + menu.offsetHeight <= clientHeight;
	const top = Math.max(0, fitsBelow ? b.bottom + GAP : b.top - GAP - menu.offsetHeight);
	menu.style.setProperty('position-area', 'none');
	menu.style.setProperty('position-try-fallbacks', 'none');
	menu.style.inset = 'auto';
	menu.style.margin = '0';
	menu.style.top = `${top - base.top}px`;
	menu.style.left = `${left - base.left}px`;
}

/** Click handler for a menu button. Native popovertarget opens the menu where popover exists. */
export function toggleMenu(button: HTMLElement) {
	if (popoverSupported()) return;
	const menu = menuOf(button);
	if (menu.toggleAttribute('data-open')) placeMenu(button, menu);
}

/** Toggle handler for a native popover menu: place it where anchor positioning is missing. */
export function onMenuToggle(e: Event) {
	const menu = e.currentTarget as HTMLElement;
	const button = buttonOf(menu);
	if ((e as ToggleEvent).newState === 'open' && button && !anchorSupported()) placeMenu(button, menu);
}

/** Attachment for the TierBar root where popover is missing: Escape and an outside click close the
 *  open data-open menus, as a native popover would. */
export function menuFallback(root: HTMLElement) {
	if (popoverSupported()) return;
	const open = () => [...root.querySelectorAll<HTMLElement>('[data-open]')];
	const onKey = (e: KeyboardEvent) => {
		if (e.key !== 'Escape') return;
		for (const menu of open()) {
			closeMenu(menu);
			if (menu.contains(document.activeElement)) buttonOf(menu)?.focus();
		}
	};
	const onClick = (e: MouseEvent) => {
		const target = e.target as Node;
		for (const menu of open()) if (!menu.contains(target) && !buttonOf(menu)?.contains(target)) closeMenu(menu);
	};
	document.addEventListener('keydown', onKey);
	document.addEventListener('click', onClick);
	return () => {
		document.removeEventListener('keydown', onKey);
		document.removeEventListener('click', onClick);
	};
}
