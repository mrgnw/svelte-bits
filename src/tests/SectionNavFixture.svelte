<script lang="ts">
	import SectionNav from '#lib/section-nav/index.ts';

	let {
		barTop = '0px',
		navTop = '1rem',
		lineHeight = 'normal'
	}: { barTop?: string; navTop?: string; lineHeight?: string } = $props();
</script>

<div style:line-height={lineHeight}>
	<SectionNav --bar-top={barTop} --nav-top={navTop}>
		<h2>Alpha</h2>
		<div style:height="1200px"></div>
		<h2>Beta</h2>
		<div style:height="1200px"></div>
		<h2>Gamma</h2>
		<div style:height="1600px"></div>
	</SectionNav>
</div>
