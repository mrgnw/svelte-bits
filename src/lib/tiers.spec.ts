import { describe, expect, it } from 'vitest';
import { menusOf, modeAt, tierCount, tierCss, tierQueries, tiersWhere, type TierGroup } from './tiers';

const group: TierGroup = {
	id: 'g',
	label: 'More',
	items: [
		{ id: 'a' },
		{ id: 'b', at: ['inline', 'icon'] },
		{ id: 'c', at: ['inline', 'menu'], current: true },
		{ id: 'd', at: ['inline', 'inline', 'menu'] },
	],
};

describe('tiers', () => {
	it('builds one container query per tier, widest first', () => {
		expect(tierQueries([900, 600])).toEqual(['(width >= 900px)', '(600px <= width < 900px)', '(width < 600px)']);
		expect(tierQueries([])).toEqual([]);
	});

	it('repeats the last mode and defaults to inline', () => {
		expect(modeAt(group.items[0], 2)).toBe('inline');
		expect(modeAt(group.items[1], 0)).toBe('inline');
		expect(modeAt(group.items[1], 2)).toBe('icon');
		expect(tiersWhere(group.items[3], 'inline', 3)).toEqual([0, 1]);
	});

	it('gives each distinct menu its own button, marked when it holds the current item', () => {
		expect(menusOf(group, 4)).toEqual([
			{ key: 'c', tiers: [1], items: [group.items[2]], current: true },
			{ key: 'c d', tiers: [2, 3], items: [group.items[2], group.items[3]], current: true },
		]);
		expect(menusOf({ ...group, items: [group.items[3]] }, 3)[0].current).toBe(false);
	});

	it('hides every variant not marked for the tier', () => {
		const css = tierCss('x', [500]);
		expect(css).toContain('@container tierbar-x (width >= 500px)');
		expect(css).toContain('[data-tierbar="x"] [data-t]:not([data-t~="1"])');
		expect(css).toContain('--tier: 1;');
	});

	it('validates breakpoints before building CSS', () => {
		expect(() => tierCss('x', ['1px}</style>' as never])).toThrow('breakpoint');
		expect(() => tierCss('x', [300, 600])).toThrow('descending');
		expect(() => tierCss('x', [Number.NaN])).toThrow('breakpoint');
	});

	it('rejects bad props', () => {
		expect(tierCount([900, 600], [group])).toBe(3);
		expect(() => tierCount([600, 900], [])).toThrow('descending');
		expect(() => tierCount([0], [])).toThrow('positive');
		expect(() => tierCount([], [{ ...group, items: [{ id: 'a' }, { id: 'a' }] }])).toThrow('twice');
		expect(() => tierCount([], [{ ...group, items: [{ id: 'a b' }] }])).toThrow('must match');
		expect(() => tierCount([], [{ ...group, items: [{ id: 'a', at: ['inline', 'icon'] }] }])).toThrow('2 modes for 1 tiers');
		expect(() => tierCount([900, 600], [group, { ...group, items: [] }])).toThrow('group id "g" is used twice');
		expect(() => tierCount([], [{ ...group, items: [{ id: 'a', at: 'hidden' as never }] }])).toThrow('mode "hidden"');
		expect(() => tierCount([900], [{ ...group, items: [{ id: 'a', at: ['inline', 'tiny' as never] }] }])).toThrow('mode "tiny"');
	});
});
