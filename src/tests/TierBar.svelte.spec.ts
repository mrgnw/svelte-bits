import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { shownIn } from '../lib/tiers';
import { expectNoAxeViolations } from './axe';
import Fixture from './Fixture.svelte';
import ToolbarFixture from './ToolbarFixture.svelte';

const link = (name: string) => page.getByRole('link', { name, exact: true });
const trigger = () => page.getByRole('button', { name: 'More sections' });
const nameOf = (el: Element) => el.getAttribute('aria-label') ?? el.textContent!.trim();
const tabOrder = async (limit = 20) => {
	(document.activeElement as HTMLElement | null)?.blur();
	const frame = document.querySelector('[data-testid=frame]')!;
	const names: string[] = [];
	for (let i = 0; i < limit; i++) {
		await userEvent.keyboard('{Tab}');
		const active = document.activeElement;
		if (!active || !frame.contains(active)) break;
		names.push(nameOf(active));
	}
	return names;
};
const resize = (width: number, frame = document.querySelector<HTMLElement>('[data-testid=frame]')!) => {
	frame.style.width = `${width}px`;
};

describe('TierBar', () => {
	it('shows the variants of the tier its width selects', async () => {
		render(Fixture, { width: 700 });
		await expect.element(link('Settings')).toBeVisible();
		await expect.element(page.getByText('Docs', { exact: true })).toBeVisible();
		await expect.element(trigger()).not.toBeInTheDocument();

		resize(300);
		await expect.element(trigger()).toBeVisible();
		await expect.element(link('Settings')).not.toBeInTheDocument();
		await expect.element(page.getByText('Docs', { exact: true })).not.toBeVisible();
		await expect.element(link('Docs')).toBeVisible();
	});

	it('switches tier exactly at the breakpoint', async () => {
		render(Fixture, { width: 501 });
		await expect.element(link('Settings')).toBeVisible();
		resize(500);
		await expect.element(link('Settings')).toBeVisible();
		await expect.element(trigger()).not.toBeInTheDocument();
		resize(499);
		await expect.element(trigger()).toBeVisible();
		await expect.element(link('Settings')).not.toBeInTheDocument();
	});

	it('keeps two instances on one page independent', async () => {
		render(Fixture, { width: 700, name: 'Wide' });
		render(Fixture, { width: 300, name: 'Narrow' });
		const wide = page.getByRole('navigation', { name: 'Wide' });
		const narrow = page.getByRole('navigation', { name: 'Narrow' });
		await expect.element(wide.getByRole('link', { name: 'Settings' })).toBeVisible();
		await expect.element(wide.getByRole('button', { name: 'More sections' })).not.toBeInTheDocument();
		await expect.element(narrow.getByRole('button', { name: 'More sections' })).toBeVisible();
		await expect.element(narrow.getByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
	});

	it('opens and closes the menu from the keyboard', async () => {
		render(Fixture, { width: 300 });
		await expect.element(trigger()).toBeVisible();
		trigger().element().focus();
		await userEvent.keyboard('{Enter}');
		await expect.element(link('Settings')).toBeVisible();
		await userEvent.keyboard('{Escape}');
		await expect.element(link('Settings')).not.toBeInTheDocument();
		expect(document.activeElement).toBe(trigger().element());
	});

	it('closes the menu on an outside click', async () => {
		render(Fixture, { width: 300 });
		await trigger().click();
		await expect.element(link('Settings')).toBeVisible();
		await page.getByText('Outside').click();
		await expect.element(link('Settings')).not.toBeInTheDocument();
	});

	it('closes the menu after an item is activated', async () => {
		render(Fixture, { width: 300 });
		await trigger().click();
		await link('Help').click();
		await expect.element(link('Help')).not.toBeInTheDocument();
	});

	it('moves focus to the menu that now holds the focused item', async () => {
		render(Fixture, { width: 700 });
		link('Settings').element().focus();
		resize(300);
		await expect.poll(() => document.activeElement).toBe(trigger().element());
	});

	it('keeps focus when the menu it was in closes on a tier change', async () => {
		render(Fixture, { width: 400, breakpoints: [500, 300] });
		await trigger().click();
		link('Settings').element().focus();
		resize(200);
		await expect.element(link('Settings')).not.toBeInTheDocument();
		await expect.poll(() => document.activeElement).toBe(trigger().element());
	});

	it('counts an item in a closed menu as hidden', async () => {
		render(Fixture, { width: 300 });
		await expect.element(trigger()).toBeVisible();
		const row = document.querySelector('[popover] [data-item=settings]')!;
		expect(shownIn(row, 1)).toBe(false);
		await trigger().click();
		expect(shownIn(row, 1)).toBe(true);
	});

	it('gives every rendering of an item its own variant key', async () => {
		const groups = [
			{
				id: 'g',
				label: 'More sections',
				items: [
					{ id: 'x', label: 'X', at: ['inline', 'menu'] as const },
					{ id: 'y', label: 'Y', at: ['inline', 'inline', 'menu'] as const },
				],
			},
		];
		render(Fixture, { width: 700, breakpoints: [500, 300], groups });
		const bar = document.querySelector<HTMLElement>('[data-tierbar]')!.dataset.tierbar;
		const ids = [...document.querySelectorAll('nav a[id]')].map((a) => a.id);
		expect(ids.sort()).toEqual(
			[`${bar}-x-inline-0`, `${bar}-x-menu-1`, `${bar}-x-menu-2`, `${bar}-y-inline-0`, `${bar}-y-menu-2`].map((v) => `link-${v}`),
		);
	});

	it('keeps a static prefix plus variant unique across items and bars', async () => {
		render(Fixture, { width: 700, name: 'First' });
		render(Fixture, { width: 700, name: 'Second' });
		const ids = [...document.querySelectorAll('nav a[id]')].map((a) => a.id);
		expect(ids.length).toBeGreaterThan(0);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('handles a tier change caused by new breakpoints', async () => {
		const { rerender } = render(Fixture, { width: 400, breakpoints: [500] });
		await trigger().click();
		await expect.element(link('Settings')).toBeVisible();
		link('Settings').element().focus();
		await rerender({ breakpoints: [300] });
		await expect.element(trigger()).not.toBeInTheDocument();
		await expect.poll(() => document.activeElement?.textContent).toBe('Settings');
		expect(document.querySelector(':popover-open')).toBe(null);
	});

	describe('Tab traversal', () => {
		it('follows the visual order and skips hidden variants when wide', async () => {
			render(Fixture, { width: 700 });
			expect(await tabOrder()).toEqual(['Home', 'Docs', 'Settings', 'Help']);
		});

		it('visits the icon, then the menu button, when narrow', async () => {
			render(Fixture, { width: 300 });
			expect(await tabOrder()).toEqual(['Home', 'Docs', 'More sections']);
		});

		it('reaches menu items after the trigger once the menu is open', async () => {
			render(Fixture, { width: 300 });
			await trigger().click();
			expect(await tabOrder()).toEqual(['Settings', 'Help']);
		});

		const FORMAT = ['Bold', 'Italic', 'Underline', 'Strike'];
		it.each([
			[1000, [...FORMAT, 'Link', 'Code', 'Quote', 'List', 'Undo', 'Redo']],
			[800, [...FORMAT, 'Link', 'Code', 'Quote', 'List', 'Undo', 'Redo']],
			[500, [...FORMAT, 'Insert', 'Undo', 'Redo']],
			[300, [...FORMAT, 'Insert', 'History']],
		])('keeps toolbar order at %ipx', async (width, expected) => {
			render(ToolbarFixture, { width });
			expect(await tabOrder()).toEqual(expected);
		});
	});

	describe('accessible names', () => {
		it('names every wide link by its label and marks the current one', async () => {
			render(Fixture, { width: 700 });
			for (const name of ['Home', 'Docs', 'Settings', 'Help']) await expect.element(link(name)).toBeVisible();
			await expect.element(link('Home')).toHaveAttribute('aria-current', 'page');
			await expect.element(link('Docs')).not.toHaveAttribute('aria-current');
		});

		it('keeps the name of an icon-mode item and names the menu button by its group', async () => {
			render(Fixture, { width: 300 });
			await expect.element(link('Docs')).toBeVisible();
			expect(link('Docs').element().textContent).toBe('•');
			await expect.element(link('Home')).toHaveAttribute('aria-current', 'page');
			await expect.element(trigger()).toBeVisible();
		});

		it('names icon-mode toolbar buttons and keeps their pressed state', async () => {
			render(ToolbarFixture, { width: 800 });
			const button = (name: string) => page.getByRole('button', { name, exact: true });
			for (const name of ['Bold', 'Link', 'Undo']) await expect.element(button(name)).toBeVisible();
			expect(button('Bold').element().textContent!.trim()).toBe('');
			await expect.element(button('Bold')).toHaveAttribute('aria-pressed', 'true');
			await expect.element(button('Italic')).toHaveAttribute('aria-pressed', 'false');
		});

		it('names the toolbar menu buttons by their group', async () => {
			render(ToolbarFixture, { width: 300 });
			await expect.element(page.getByRole('button', { name: 'Insert', exact: true })).toBeVisible();
			await expect.element(page.getByRole('button', { name: 'History', exact: true })).toBeVisible();
		});
	});

	describe('axe', () => {
		it.each([700, 300])('finds no violations in the nav example at %ipx', async (width) => {
			render(Fixture, { width });
			await expect.element(link('Home')).toBeVisible();
			await expectNoAxeViolations();
		});

		it('finds no violations with the nav menu open', async () => {
			render(Fixture, { width: 300 });
			await trigger().click();
			await expect.element(link('Settings')).toBeVisible();
			await expectNoAxeViolations();
		});

		it.each([1000, 800, 500, 300])('finds no violations in the toolbar example at %ipx', async (width) => {
			render(ToolbarFixture, { width });
			await expect.element(page.getByRole('button', { name: 'Bold', exact: true })).toBeVisible();
			await expectNoAxeViolations();
		});

		it('finds no violations with the toolbar menu open', async () => {
			render(ToolbarFixture, { width: 300 });
			await page.getByRole('button', { name: 'Insert', exact: true }).click();
			await expect.element(page.getByRole('button', { name: 'Link', exact: true })).toBeVisible();
			await expectNoAxeViolations();
		});
	});
});
