import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { SpatialImage } from '#lib';
import Fixture from './Fixture.svelte';

describe('TierBar on the server', () => {
	it('renders the tier rules and every variant into the first HTML', () => {
		const { head, body } = render(Fixture, { props: { width: 700, breakpoints: [500] } });
		expect(head).toMatch(/@container tierbar-\S+ \(width >= 500px\)/);
		expect(head).toMatch(/@container tierbar-\S+ \(width < 500px\)/);
		expect(head).toContain('[data-t]:not([data-t~="1"])');
		expect(body).toMatch(/data-item="settings" data-mode="inline" data-t="0"/);
		expect(body).toMatch(/data-holds="settings help" data-t="1"/);
		expect(body).toMatch(/data-item="docs" data-mode="icon" data-t="1"/);
		expect(body).toContain('popovertarget=');
	});

	it('rejects a breakpoint that is not a number, even with no groups', () => {
		const evil = '1px)}</style><script>alert(1)</script><style>' as unknown as number;
		let html = '';
		expect(() => {
			const { head, body } = render(Fixture, { props: { width: 700, breakpoints: [evil], groups: [] } });
			html = head + body;
		}).toThrow('breakpoint');
		expect(html).not.toContain('<script>alert');
	});
});

describe('SpatialImage on the server', () => {
	it('renders the flat image with its alt and a hidden canvas', () => {
		const { body } = render(SpatialImage, { props: { src: '/photo.jpg', alt: 'A photo', depth: '/depth.png' } });
		expect(body).toMatch(/<img src="\/photo.jpg" alt="A photo"/);
		expect(body).toContain('<canvas aria-hidden="true"');
		expect(body).not.toContain('data-ready');
	});

	it('renders no spatial image or button with spatial set', () => {
		const { body } = render(SpatialImage, { props: { src: '/photo.jpg', alt: 'A photo', spatial: '/photo.heic' } });
		expect(body).toMatch(/<img src="\/photo.jpg" alt="A photo"/);
		expect(body).not.toContain('/photo.heic');
		expect(body).not.toContain('<button');
	});

	it('renders a controlled tilt like the default and rejects a non-finite one', () => {
		const props = { src: '/photo.jpg', alt: 'A photo', depth: '/depth.png' };
		expect(render(SpatialImage, { props: { ...props, tilt: { x: 0.5, y: -0.5 } } }).body).toBe(render(SpatialImage, { props }).body);
		expect(() => render(SpatialImage, { props: { ...props, tilt: { x: 0, y: Number.POSITIVE_INFINITY } } }).body).toThrow('SpatialImage: tilt');
	});

	it('accepts every view and rejects an unknown one or a back view without back', () => {
		const props = { src: '/photo.jpg', alt: 'A photo', depth: '/depth.png', back: '/back.jpg', backDepth: '/back-depth.png' };
		for (const view of ['composite', 'front', 'back', 'depth', 'back-depth'] as const) {
			expect(render(SpatialImage, { props: { ...props, view } }).body).toContain('<canvas');
		}
		const invalid = 'normals' as unknown as 'depth';
		expect(() => render(SpatialImage, { props: { ...props, view: invalid } }).body).toThrow('SpatialImage: view normals');
		expect(() => render(SpatialImage, { props: { src: '/photo.jpg', alt: '', depth: '/depth.png', view: 'back-depth' } }).body).toThrow(
			'SpatialImage: view back-depth needs back',
		);
	});

	it('renders no canvas without depth and rejects bad props', () => {
		expect(render(SpatialImage, { props: { src: '/photo.jpg', alt: '' } }).body).not.toContain('<canvas');
		expect(() => render(SpatialImage, { props: { src: '/photo.jpg', alt: '', strength: 1 } }).body).toThrow('SpatialImage: strength');
	});
});
