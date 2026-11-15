import { to_html } from '@twinkleplop/core';
import { tokenize } from '@twinkleplop/svelte';

const highlight = tokenize();

export function snippet(source: string) {
	const code = source.replaceAll("'#lib'", "'@mrgnw/svelte-bits'");
	return { code, html: to_html(code, highlight(code)) };
}
