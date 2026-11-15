import { error } from '@sveltejs/kit';
import { PHOTOS, photoBySlug } from '../../examples/photos';
import { snippet } from '../../snippet';

const spatialSource = `<script lang="ts">
	import { SpatialImage } from '@mrgnw/svelte-bits';
</script>

<SpatialImage
	src="/photo.avif"
	depth="/photo-depth.avif"
	spatial="/photo-spatial.heic"
	alt="A harbour at dusk"
	strength={0.08}
	focus={0.5}
	scroll={0.35}
>
	{#snippet controls({ motion, requestMotion, spatial, enterSpatial })}
		{#if motion === 'prompt'}<button type="button" onclick={requestMotion}>Enable motion</button>{/if}
		{#if spatial}<button type="button" onclick={enterSpatial}>View in spatial</button>{/if}
	{/snippet}
</SpatialImage>
`;

export function entries() {
	return PHOTOS.map((photo) => ({ slug: photo.slug }));
}

export function load({ params }) {
	const photo = photoBySlug(params.slug);
	if (!photo) error(404, 'No such photo');
	return { photo, source: snippet(spatialSource) };
}
