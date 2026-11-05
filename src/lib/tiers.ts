import { closeMenu, isOpen } from './menus.js';

/** How an item shows in one tier: in the bar with its label, in the bar as an icon, or in its group's menu. */
export type Mode = 'inline' | 'icon' | 'menu';

export type TierItem = {
	id: string;
	current?: boolean;
	/** One mode for every tier, or one per tier from widest to narrowest; the last repeats. Default 'inline'. */
	at?: Mode | readonly Mode[];
};

export type TierGroup<T extends TierItem = TierItem> = {
	id: string;
	/** Accessible name of the group's menu button. */
	label: string;
	items: readonly T[];
};

/** One menu button and its popover: the items it holds and the tiers it shows in. */
export type Menu<T extends TierItem = TierItem> = {
	key: string;
	tiers: number[];
	items: T[];
	current: boolean;
};

const ID = /^[A-Za-z][\w-]*$/;
const MODES: readonly string[] = ['inline', 'icon', 'menu'] satisfies Mode[];
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

function assert(ok: boolean, message: string): asserts ok {
	if (!ok) throw new Error(`TierBar: ${message}`);
}

/** Breakpoints as plain numbers: finite, positive, strictly descending. They end up in a <style>
 *  element, so nothing else may get through. */
function checkedBreakpoints(breakpoints: readonly number[]): number[] {
	return breakpoints.map((b, i) => {
		assert(typeof b === 'number' && Number.isFinite(b) && b > 0, `breakpoint ${String(b)} must be a positive number of px`);
		assert(i === 0 || b < breakpoints[i - 1], 'breakpoints must be strictly descending');
		return Number(b);
	});
}

/** Checks the props and returns how many tiers they define: one more than the breakpoints. */
export function tierCount(breakpoints: readonly number[], groups: readonly TierGroup[]): number {
	const count = checkedBreakpoints(breakpoints).length + 1;
	const ids = new Set<string>();
	const groupIds = new Set<string>();
	for (const group of groups) {
		assert(ID.test(group.id), `group id "${group.id}" must match ${ID}`);
		assert(!groupIds.has(group.id), `group id "${group.id}" is used twice`);
		groupIds.add(group.id);
		for (const item of group.items) {
			assert(ID.test(item.id), `item id "${item.id}" must match ${ID}`);
			assert(!ids.has(item.id), `item id "${item.id}" is used twice`);
			ids.add(item.id);
			const modes: readonly Mode[] = typeof item.at === 'string' ? [item.at] : (item.at ?? []);
			if (Array.isArray(item.at)) {
				assert(item.at.length > 0 && item.at.length <= count, `item "${item.id}" has ${item.at.length} modes for ${count} tiers`);
			}
			for (const mode of modes) assert(MODES.includes(mode), `item "${item.id}" has unknown mode "${mode}"`);
		}
	}
	return count;
}

export function modeAt(item: TierItem, tier: number): Mode {
	const at = item.at ?? 'inline';
	if (typeof at === 'string') return at;
	return at[Math.min(tier, at.length - 1)];
}

export function tiersWhere(item: TierItem, mode: Mode, count: number): number[] {
	return Array.from({ length: count }, (_, t) => t).filter((t) => modeAt(item, t) === mode);
}

/** A group's menus. Tiers whose menu holds the same items share one button, so a button's active
 *  mark always describes what it holds. */
export function menusOf<T extends TierItem>(group: TierGroup<T>, count: number): Menu<T>[] {
	const menus: Menu<T>[] = [];
	for (let t = 0; t < count; t++) {
		const items = group.items.filter((item) => modeAt(item, t) === 'menu');
		if (items.length === 0) continue;
		const key = items.map((item) => item.id).join(' ');
		const same = menus.find((menu) => menu.key === key);
		if (same) same.tiers.push(t);
		else menus.push({ key, tiers: [t], items, current: items.some((item) => item.current) });
	}
	return menus;
}

/** The container query for each tier, widest first. */
export function tierQueries(unchecked: readonly number[]): string[] {
	const breakpoints = checkedBreakpoints(unchecked);
	if (breakpoints.length === 0) return [];
	return [
		`(width >= ${breakpoints[0]}px)`,
		...breakpoints.slice(1).map((b, i) => `(${b}px <= width < ${breakpoints[i]}px)`),
		`(width < ${breakpoints[breakpoints.length - 1]}px)`,
	];
}

/** Per tier: hide every variant not marked for it, and expose the tier as --tier for the focus code.
 *  The :not() leaves the variants of a TierBar nested inside this one to its own rules. */
export function tierCss(id: string, breakpoints: readonly number[]): string {
	assert(/^[\w-]+$/.test(id), `instance id "${id}" must be a plain identifier`);
	const scope = `[data-tierbar="${id}"]`;
	const base = `${scope} > [data-bar] { --tier: 0; }\n`;
	return base + tierQueries(breakpoints)
		.map(
			(q, t) =>
				`@container tierbar-${id} ${q} {` +
				`${scope} [data-t]:not([data-t~="${t}"]):not(${scope} [data-tierbar] [data-t]) { display: none !important; }` +
				`${scope} > [data-bar] { --tier: ${t}; } }`,
		)
		.join('\n');
}

/** Whether an element shows in a tier: no ancestor up to its own TierBar root has a data-t that
 *  excludes the tier or is a closed menu. */
export function shownIn(el: Element, tier: number): boolean {
	for (let e: Element | null = el; e; e = e.parentElement) {
		const tiers = e.getAttribute('data-t');
		if (tiers !== null && !tiers.split(' ').includes(String(tier))) return false;
		if (e.hasAttribute('popover') && !isOpen(e)) return false;
		if (e.hasAttribute('data-tierbar')) break;
	}
	return true;
}

/** Whether an element belongs to this TierBar and not to one nested inside it. */
function own(root: HTMLElement, el: Element): boolean {
	return el.closest('[data-tierbar]') === root;
}

/** Whether an element sits in one of this bar's menus. A popover around the whole bar does not count. */
function inMenu(root: HTMLElement, el: Element): boolean {
	const menu = el.closest('[popover]');
	return menu !== null && root.contains(menu);
}

function readTier(bar: Element): number {
	return Number(getComputedStyle(bar).getPropertyValue('--tier')) || 0;
}

function focusableIn(el: HTMLElement | undefined): HTMLElement | undefined {
	if (!el) return undefined;
	return el.matches(FOCUSABLE) ? el : (el.querySelector<HTMLElement>(FOCUSABLE) ?? undefined);
}

/** Where focus goes when `from` is hidden: the same item, else the menu that holds it, else the
 *  current item, else the first item. */
function counterpart(root: HTMLElement, from: HTMLElement, tier: number): HTMLElement | undefined {
	const shown = (selector: string) =>
		[...root.querySelectorAll<HTMLElement>(selector)].filter(
			(el) => own(root, el) && shownIn(el, tier) && !inMenu(root, el),
		);
	const ids =
		from.closest<HTMLElement>('[data-item]')?.dataset.item?.split(' ') ??
		from.closest<HTMLElement>('[data-holds]')?.dataset.holds?.split(' ') ??
		[];
	const slots = shown('[data-item]');
	const same = slots.find((s) => ids.includes(s.dataset.item ?? ''));
	const holder = shown('[data-holds]').find((m) => m.dataset.holds?.split(' ').some((id) => ids.includes(id)));
	const current = slots.find((s) => s.hasAttribute('data-current'));
	return [same, holder, current, ...slots].map(focusableIn).find((el) => el !== undefined);
}

/** Focus handling for one TierBar. `attach` goes on the root; `check` runs after the tier may have
 *  changed. On a change it closes open menus and, if the focused control went display:none, moves
 *  focus to its visible counterpart. The tier is read from the CSS's own container queries (--tier).
 *  A ResizeObserver calls `check` on resize and the component calls it when the breakpoints change;
 *  neither measures anything. */
export function tierFocus() {
	let root: HTMLElement | null = null;
	let bar: HTMLElement | null = null;
	let tier = 0;
	let last: HTMLElement | null = null;

	const follow = (from: HTMLElement | null) => {
		if (!root || !from?.isConnected || shownIn(from, tier)) return;
		const active = document.activeElement;
		const lost = !active || active === document.body || (root.contains(active) && !shownIn(active, tier));
		if (!lost) return;
		const to = counterpart(root, from, tier);
		to?.focus();
		last = to ?? null;
	};

	/** `_css` is unused; passing it lets the caller re-run `check` whenever the generated CSS changes. */
	const check = (_css?: string) => {
		if (!root || !bar) return;
		const next = readTier(bar);
		if (next === tier) return;
		tier = next;
		const from = last;
		for (const menu of root.querySelectorAll<HTMLElement>('[popover]')) if (own(root, menu) && isOpen(menu)) closeMenu(menu);
		requestAnimationFrame(() => follow(from));
	};

	const attach = (el: HTMLElement) => {
		const found = el.querySelector<HTMLElement>('[data-bar]');
		assert(found !== null, 'root has no [data-bar]');
		root = el;
		bar = found;
		tier = readTier(found);
		const onFocusIn = (e: FocusEvent) => {
			const target = e.target as HTMLElement;
			if (own(el, target)) last = target;
		};
		const onFocusOut = (e: FocusEvent) => {
			const to = e.relatedTarget as Node | null;
			if (to && !el.contains(to)) last = null;
		};
		const observer = new ResizeObserver(() => check());
		el.addEventListener('focusin', onFocusIn);
		el.addEventListener('focusout', onFocusOut);
		observer.observe(el);
		return () => {
			el.removeEventListener('focusin', onFocusIn);
			el.removeEventListener('focusout', onFocusOut);
			observer.disconnect();
			root = bar = last = null;
		};
	};

	return { attach, check };
}
