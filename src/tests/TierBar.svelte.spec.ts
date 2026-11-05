import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Fixture from './Fixture.svelte';

const link = (name: string) => page.getByRole('link', { name, exact: true });
const trigger = () => page.getByRole('button', { name: 'More sections' });

describe('TierBar', () => {
	it('shows the variants of the tier its width selects', async () => {
		render(Fixture, { width: 700 });
		await expect.element(link('Settings')).toBeVisible();
		await expect.element(page.getByText('Docs', { exact: true })).toBeVisible();
		await expect.element(trigger()).not.toBeInTheDocument();

		document.querySelector<HTMLElement>('[data-testid=frame]')!.style.width = '300px';
		await expect.element(trigger()).toBeVisible();
		await expect.element(link('Settings')).not.toBeInTheDocument();
		await expect.element(page.getByText('Docs', { exact: true })).not.toBeVisible();
		await expect.element(link('Docs')).toBeVisible();
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

	it('closes the menu after an item is activated', async () => {
		render(Fixture, { width: 300 });
		await trigger().click();
		await link('Help').click();
		await expect.element(link('Help')).not.toBeInTheDocument();
	});

	it('moves focus to the menu that now holds the focused item', async () => {
		render(Fixture, { width: 700 });
		link('Settings').element().focus();
		document.querySelector<HTMLElement>('[data-testid=frame]')!.style.width = '300px';
		await expect.poll(() => document.activeElement).toBe(trigger().element());
	});
});
