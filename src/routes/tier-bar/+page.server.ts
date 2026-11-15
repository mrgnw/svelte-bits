import navSource from '../examples/NavExample.svelte?raw';
import toolbarSource from '../examples/ToolbarExample.svelte?raw';
import { snippet } from '../snippet';

export function load() {
	return { nav: snippet(navSource), toolbar: snippet(toolbarSource) };
}
