import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { shownIn } from '#lib/tiers';
import Fixture from './Fixture.svelte';

const link = (name: string) => page.getByRole('link', { name, exact: true });
const trigger = () => page.getByRole('button', { name: 'More sections' });
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
		const ids = [...document.querySelectorAll('nav a[id]')].map((a) => a.id);
		expect(ids.sort()).toEqual(['x-inline-0', 'x-menu-1', 'x-menu-2', 'y-inline-0', 'y-menu-2']);
	});
});
