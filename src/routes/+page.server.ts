import { snippet } from './snippet';
import navSource from './examples/NavExample.svelte?raw';
import toolbarSource from './examples/ToolbarExample.svelte?raw';

export function load() {
	return { nav: snippet(navSource), toolbar: snippet(toolbarSource) };
}
