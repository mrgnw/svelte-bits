import axe from 'axe-core';
import { expect } from 'vitest';

export async function expectNoAxeViolations(context: Element = document.body) {
	const { violations } = await axe.run(context, { rules: { region: { enabled: false } } });
	expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)).toEqual([]);
}
