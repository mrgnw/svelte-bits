import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import SectionNavFixture from './SectionNavFixture.svelte';

const sidebar = () => page.getByRole('navigation', { name: 'Sections' });
const entry = (name: string) => sidebar().getByRole('link', { name, exact: true });

describe('SectionNav', () => {
	beforeEach(async () => {
		await page.viewport(1280, 800);
		scrollTo(0, 0);
		location.hash = '';
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
});
