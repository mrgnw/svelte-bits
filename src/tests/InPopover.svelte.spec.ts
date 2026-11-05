import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import InPopover from './InPopover.svelte';

it('follows focus for a TierBar inside an open popover', async () => {
	render(InPopover, { width: 700 });
	document.querySelector<HTMLElement>('#host')!.showPopover();
	const settings = page.getByRole('link', { name: 'Settings', exact: true });
	await expect.element(settings).toBeVisible();
	settings.element().focus();
	document.querySelector<HTMLElement>('[data-testid=frame]')!.style.width = '300px';
	await expect.poll(() => document.activeElement).toBe(page.getByRole('button', { name: 'More sections' }).element());
});
