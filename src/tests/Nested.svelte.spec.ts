import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Nested from './Nested.svelte';

const frame = (id: string) => document.querySelector<HTMLElement>(`[data-testid=${id}]`)!;
const inner = () => page.getByRole('group', { name: 'Inner' });

describe('nested TierBars', () => {
	it('follows focus inside the inner bar by its own tiers only', async () => {
		render(Nested, { outerWidth: 700, innerWidth: 300 });
		const docs = inner().getByRole('link', { name: 'Docs', exact: true });
		docs.element().focus();
		frame('inner').style.width = '100px';
		await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe('Docs');
	});

	it('leaves the inner menu open when only the outer tier changes', async () => {
		render(Nested, { outerWidth: 700, innerWidth: 300 });
		await inner().getByRole('button', { name: 'Inner menu' }).click();
		await expect.element(inner().getByRole('link', { name: 'Help' })).toBeVisible();
		frame('outer').style.width = '400px';
		await expect.element(page.getByRole('button', { name: 'Outer menu' })).toBeVisible();
		await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
		await expect.element(inner().getByRole('link', { name: 'Help' })).toBeVisible();
	});
});
