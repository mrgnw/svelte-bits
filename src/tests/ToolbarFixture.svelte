<script lang="ts">
	import ToolbarExample from '../routes/examples/ToolbarExample.svelte';

	let { width }: { width: number } = $props();
</script>

<div data-testid="frame" style:width="{width}px">
	<ToolbarExample />
</div>
