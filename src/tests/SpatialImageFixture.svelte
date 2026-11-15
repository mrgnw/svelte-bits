<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { SpatialImage, type SpatialControls } from '#lib';

	let { custom = false, ...props }: ComponentProps<typeof SpatialImage> & { custom?: boolean } = $props();
</script>

{#snippet customControls(api: SpatialControls)}
	<button type="button" data-motion={api.motion}>Custom control</button>
	{#if api.spatial}
		<button type="button" onclick={api.enterSpatial}>Custom spatial</button>
	{/if}
{/snippet}

<div style:width="64px">
	<SpatialImage {...props} controls={custom ? customControls : undefined} />
</div>
