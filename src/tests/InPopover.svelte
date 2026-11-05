<script lang="ts">
	import Fixture from './Fixture.svelte';

	let { width }: { width: number } = $props();
</script>

<div id="host" popover="manual">
	<Fixture {width} />
</div>
