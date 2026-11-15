<script lang="ts">
	import '../../theme.css';
	import '../../code.css';
	import SpatialExample from '../../examples/SpatialExample.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>SpatialImage · {data.photo.alt}</title>
	<meta name="description" content="A Svelte 5 image that turns a photo and its depth map into a box you look into." />
</svelte:head>

<SpatialExample source={data.source} photo={data.photo} />
