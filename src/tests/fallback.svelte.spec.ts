import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { placeMenu, popoverSupported, toggleMenu } from '../lib/menus';
import Fixture from './Fixture.svelte';

const trigger = () => page.getByRole('button', { name: 'More sections' });
const menu = () => document.querySelector<HTMLElement>('.tierbar-menu')!;
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1);

describe('menu placement without anchor positioning', () => {
	it('puts the open menu under its button', async () => {
		render(Fixture, { width: 300 });
		await trigger().click();
		const button = trigger().element() as HTMLElement;
		placeMenu(button, menu());
		const b = button.getBoundingClientRect();
		const m = menu().getBoundingClientRect();
		near(m.top, b.bottom + 4);
		near(m.left, b.left);
	});

	it('flips to the left when the menu would leave the viewport', async () => {
		render(Fixture, { width: 300 });
		const frame = document.querySelector<HTMLElement>('[data-testid=frame]')!;
		const button = trigger().element() as HTMLElement;
		await expect.element(trigger()).toBeVisible();
		frame.style.marginLeft = `${innerWidth - 20 - button.getBoundingClientRect().right}px`;
		await trigger().click();
		placeMenu(button, menu());
		const m = menu().getBoundingClientRect();
		expect(m.right).toBeLessThanOrEqual(innerWidth);
		near(m.right, button.getBoundingClientRect().right);
	});
});

describe('menus without popover support', () => {
	const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'popover')!;
	const withoutPopover = () => {
		delete (HTMLElement.prototype as { popover?: unknown }).popover;
		expect(popoverSupported()).toBe(false);
	};
	afterEach(() => Object.defineProperty(HTMLElement.prototype, 'popover', descriptor));

	it('opens under the button and closes on Escape, returning focus', async () => {
		withoutPopover();
		render(Fixture, { width: 300 });
		const button = trigger().element() as HTMLElement;
		toggleMenu(button);
		await expect.element(page.getByRole('link', { name: 'Settings' })).toBeVisible();
		near(menu().getBoundingClientRect().top, button.getBoundingClientRect().bottom + 4);
		(page.getByRole('link', { name: 'Settings' }).element() as HTMLElement).focus();
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
		expect(document.activeElement).toBe(button);
	});

	it('closes on an outside click and after an item is activated', async () => {
		withoutPopover();
		render(Fixture, { width: 300 });
		const button = trigger().element() as HTMLElement;
		toggleMenu(button);
		await page.getByText('Outside').click();
		expect(menu().hasAttribute('data-open')).toBe(false);
		toggleMenu(button);
		await page.getByRole('link', { name: 'Help' }).click();
		expect(menu().hasAttribute('data-open')).toBe(false);
	});
});
