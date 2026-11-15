import { describe, expect, it } from 'vitest';
import { PHOTOS, photoBySlug } from './photos';

describe('demo photo slugs', () => {
	it('gives every photo a unique, URL-safe slug', () => {
		const slugs = PHOTOS.map((photo) => photo.slug);
		expect(new Set(slugs).size).toBe(PHOTOS.length);
		for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	});

	it('resolves no slug to the first photo and an unknown slug to nothing', () => {
		expect(photoBySlug(undefined)).toBe(PHOTOS[0]);
		expect(photoBySlug('walking-dog')?.stem).toBe('A7_00355');
		expect(photoBySlug('nope')).toBeUndefined();
		expect(photoBySlug('')).toBeUndefined();
	});
});
