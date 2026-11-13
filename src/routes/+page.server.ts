import { to_html } from '@twinkleplop/core';
import { tokenize } from '@twinkleplop/svelte';
import navSource from './examples/NavExample.svelte?raw';
import toolbarSource from './examples/ToolbarExample.svelte?raw';

const highlight = tokenize();

function snippet(source: string) {
	const code = source.replaceAll("'#lib'", "'@mrgnw/svelte-bits'");
	return { code, html: to_html(code, highlight(code)) };
}

export function load() {
	return { nav: snippet(navSource), toolbar: snippet(toolbarSource) };
}
