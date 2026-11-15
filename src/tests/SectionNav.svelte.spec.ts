import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { expectNoAxeViolations } from './axe.ts';
import SectionNavFixture from './SectionNavFixture.svelte';

const sidebar = () => page.getByRole('navigation', { name: 'Sections' });
const entry = (name: string) => sidebar().getByRole('link', { name, exact: true });
const toggle = () => page.getByRole('button', { name: 'Sections' });
const list = () => document.getElementById('sections-nav')!;
const storageKey = 'sidebar';

function jumpTo(id: string) {
	document.getElementById(id)!.scrollIntoView({ block: 'start', behavior: 'instant' });
}

async function expectShortcutsIgnored(press: (key: string) => Promise<void>) {
	jumpTo('beta');
	await expect.element(entry('Beta')).toHaveAttribute('aria-current', 'location');
	for (const key of ['b', 'j', 'k']) {
		await press(key);
		await expect.element(toggle()).toHaveAttribute('aria-expanded', 'true');
		await expect.element(entry('Beta')).toHaveAttribute('aria-current', 'location');
	}
}

function addFixed<T extends HTMLElement>(tag: string) {
	const element = document.body.appendChild(document.createElement(tag)) as T;
	element.style.cssText = 'position: fixed; top: 0; right: 0';
	return element;
}

describe('SectionNav', () => {
	afterEach(() => {
		document.body.querySelectorAll(':scope > input, :scope > textarea, :scope > dialog').forEach((el) => el.remove());
	});

	beforeEach(async () => {
		await page.viewport(1280, 800);
		scrollTo(0, 0);
		location.hash = '';
		localStorage.clear();
	});

	it('lists a link for every scanned heading', async () => {
		render(SectionNavFixture);
		await expect.element(entry('Alpha')).toBeInTheDocument();
		await expect.element(entry('Beta')).toBeInTheDocument();
		await expect.element(entry('Gamma')).toBeInTheDocument();
		await expect.element(page.getByRole('heading', { name: 'Beta' })).toHaveAttribute('id', 'beta');
	});

	it('marks the first section current at the top and follows scrolling', async () => {
		render(SectionNavFixture);
		await expect.element(entry('Alpha')).toHaveAttribute('aria-current', 'location');
		document.getElementById('gamma')!.scrollIntoView({ block: 'start', behavior: 'instant' });
		await expect.element(entry('Gamma')).toHaveAttribute('aria-current', 'location');
		await expect.element(entry('Alpha')).not.toHaveAttribute('aria-current');
	});

	it('scrolls to a section when its link is clicked', async () => {
		render(SectionNavFixture);
		await entry('Beta').click();
		await expect.poll(() => document.getElementById('beta')!.getBoundingClientRect().top).toBeLessThan(150);
		await expect.element(entry('Beta')).toHaveAttribute('aria-current', 'location');
	});

	it('tracks a section jumped to below a tall mobile bar under a site header', async () => {
		await page.viewport(390, 800);
		render(SectionNavFixture, { barTop: '61px', lineHeight: '4' });
		await page.getByRole('button', { name: 'Alpha' }).click();
		await entry('Beta').click();
		const bar = document.querySelector('[popovertarget="sections-nav"]')!;
		await expect
			.poll(() => document.getElementById('beta')!.getBoundingClientRect().top)
			.toBeGreaterThanOrEqual(bar.getBoundingClientRect().bottom);
		await expect.element(entry('Beta')).toHaveAttribute('aria-current', 'location');
	});

	it('keeps a larger --nav-top as the mobile scroll margin', async () => {
		await page.viewport(390, 800);
		render(SectionNavFixture, { navTop: '200px' });
		const margin = () => {
			const heading = document.getElementById('beta');
			return heading && getComputedStyle(heading).scrollMarginTop;
		};
		await expect.poll(margin).toBe('200px');
	});

	describe('keyboard shortcuts', () => {
		it('j steps forward and clamps at the last section', async () => {
			render(SectionNavFixture);
			await userEvent.keyboard('j');
			await expect.element(entry('Beta')).toHaveAttribute('aria-current', 'location');
			await userEvent.keyboard('j');
			await expect.element(entry('Gamma')).toHaveAttribute('aria-current', 'location');
			await userEvent.keyboard('j');
			await expect.element(entry('Gamma')).toHaveAttribute('aria-current', 'location');
		});

		it('k steps back and clamps at the first section', async () => {
			render(SectionNavFixture);
			jumpTo('gamma');
			await expect.element(entry('Gamma')).toHaveAttribute('aria-current', 'location');
			await userEvent.keyboard('k');
			await expect.element(entry('Beta')).toHaveAttribute('aria-current', 'location');
			await userEvent.keyboard('k');
			await expect.element(entry('Alpha')).toHaveAttribute('aria-current', 'location');
			await userEvent.keyboard('k');
			await expect.element(entry('Alpha')).toHaveAttribute('aria-current', 'location');
		});

		it('b collapses and expands the sidebar', async () => {
			render(SectionNavFixture);
			await expect.element(toggle()).toHaveAttribute('aria-expanded', 'true');
			await userEvent.keyboard('b');
			await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
			await expect.element(list()).not.toBeVisible();
			await userEvent.keyboard('b');
			await expect.element(toggle()).toHaveAttribute('aria-expanded', 'true');
			await expect.element(list()).toBeVisible();
		});

		it('ignores shortcuts typed into an input or textarea', async () => {
			render(SectionNavFixture);
			const input = addFixed<HTMLInputElement>('input');
			const textarea = addFixed<HTMLTextAreaElement>('textarea');
			for (const field of [input, textarea]) {
				field.focus({ preventScroll: true });
				await expectShortcutsIgnored((key) => userEvent.keyboard(key));
				expect(field.value).toBe('bjk');
			}
		});

		it('ignores shortcuts while a dialog is open', async () => {
			render(SectionNavFixture);
			addFixed<HTMLDialogElement>('dialog').show();
			await expectShortcutsIgnored((key) => userEvent.keyboard(key));
		});

		it.each(['Control', 'Meta', 'Alt'])('ignores shortcuts with %s held', async (modifier) => {
			render(SectionNavFixture);
			await expectShortcutsIgnored((key) => userEvent.keyboard(`{${modifier}>}${key}{/${modifier}}`));
		});
	});

	describe('collapse state', () => {
		it('exposes aria-expanded and aria-controls on the handle', async () => {
			render(SectionNavFixture);
			await expect.element(toggle()).toHaveAttribute('aria-expanded', 'true');
			await expect.element(toggle()).toHaveAttribute('aria-controls', 'sections-nav');
			await expect.element(toggle()).toHaveAttribute('aria-keyshortcuts', 'b');
			await toggle().click();
			await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
		});

		it('persists the collapsed state in localStorage', async () => {
			render(SectionNavFixture);
			await toggle().click();
			await expect.poll(() => localStorage.getItem(storageKey)).toBe('collapsed');
			await toggle().click();
			await expect.poll(() => localStorage.getItem(storageKey)).toBe('');
		});

		it('restores a collapsed sidebar on mount', async () => {
			localStorage.setItem(storageKey, 'collapsed');
			render(SectionNavFixture);
			await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
			await expect.element(list()).not.toBeVisible();
		});
	});

	describe('below 64rem', () => {
		beforeEach(async () => {
			await page.viewport(390, 800);
		});

		const bar = () => page.getByRole('button', { name: 'Alpha' });

		it('shows the popover bar instead of the handle and hides the list until opened', async () => {
			render(SectionNavFixture);
			await expect.element(bar()).toBeVisible();
			await expect.element(toggle()).not.toBeInTheDocument();
			await expect.element(list()).not.toBeVisible();
		});

		it('opens the list from the bar and closes it after choosing a section', async () => {
			render(SectionNavFixture);
			await bar().click();
			await expect.poll(() => list().matches(':popover-open')).toBe(true);
			await expect.element(list()).toBeVisible();
			await entry('Beta').click();
			await expect.poll(() => list().matches(':popover-open')).toBe(false);
			await expect.element(page.getByRole('button', { name: 'Beta' })).toBeVisible();
		});

		it('closes the popover on Escape', async () => {
			render(SectionNavFixture);
			await bar().click();
			await expect.poll(() => list().matches(':popover-open')).toBe(true);
			await userEvent.keyboard('{Escape}');
			await expect.poll(() => list().matches(':popover-open')).toBe(false);
		});
	});

	describe('accessibility', () => {
		it('has no axe violations on desktop', async () => {
			const { container } = render(SectionNavFixture);
			await expect.element(entry('Alpha')).toBeInTheDocument();
			await expectNoAxeViolations(container);
		});

		it('has no axe violations collapsed', async () => {
			localStorage.setItem(storageKey, 'collapsed');
			const { container } = render(SectionNavFixture);
			await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
			await expectNoAxeViolations(container);
		});

		it('has no axe violations on mobile with the popover open', async () => {
			await page.viewport(390, 800);
			const { container } = render(SectionNavFixture);
			await page.getByRole('button', { name: 'Alpha' }).click();
			await expect.element(list()).toBeVisible();
			await expectNoAxeViolations(container);
		});
	});
});
