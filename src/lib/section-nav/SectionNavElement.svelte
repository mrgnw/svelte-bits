<svelte:options customElement={{ tag: 'section-nav', props: { sections: { type: 'Array' } } }} />

<script lang="ts">
	import SectionNav, { type Section } from './SectionNav.svelte';

	let {
		sections,
		levels,
		key,
		label
	}: { sections?: Section[]; levels?: string; key?: string; label?: string } = $props();
</script>

<SectionNav {sections} {levels} {key} {label}><slot /></SectionNav>

<style>
	:host {
		display: block;
	}
</style>
