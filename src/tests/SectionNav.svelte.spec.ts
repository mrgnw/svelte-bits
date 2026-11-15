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
});
