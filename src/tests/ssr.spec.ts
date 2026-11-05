import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Fixture from './Fixture.svelte';

describe('TierBar on the server', () => {
	it('renders the tier rules and every variant into the first HTML', () => {
		const { head, body } = render(Fixture, { props: { width: 700, breakpoints: [500] } });
		expect(head).toMatch(/@container tierbar-\S+ \(width >= 500px\)/);
		expect(head).toMatch(/@container tierbar-\S+ \(width < 500px\)/);
		expect(head).toContain('[data-t]:not([data-t~="1"])');
		expect(body).toMatch(/data-item="settings" data-t="0"/);
		expect(body).toMatch(/data-holds="settings help" data-t="1"/);
		expect(body).toMatch(/data-item="docs" data-t="1"/);
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
