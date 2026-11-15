export const PHOTOS = [
	{ slug: 'framing-hands', name: 'Framing hands', stem: '_80', width: 933, height: 1400, alt: 'Black and white portrait of a man framing his face with his hands' },
	{ slug: 'pink-shirt', name: 'Pink shirt', stem: 'A7_00047', width: 979, height: 1400, alt: 'Smiling man in a pink shirt in front of green foliage' },
	{ slug: 'pigeon', name: 'Pigeon', stem: 'A7_00072', width: 886, height: 1400, alt: 'Pigeon on a cobbled square at sunset' },
	{ slug: 'mountain-train', name: 'Mountain train', stem: 'A7_00077-HDR', width: 933, height: 1400, alt: 'Train curving along a track toward snowy mountains' },
	{ slug: 'walking-dog', name: 'Walking dog', stem: 'A7_00355', width: 933, height: 1400, alt: 'Person walking a dog down a sunlit narrow street' },
	{ slug: 'wine-glasses', name: 'Wine glasses', stem: 'A7_00429', width: 1400, height: 1326, alt: 'Wine glasses and a jug on a sunlit table' },
	{ slug: 'stone-window', name: 'Stone window', stem: '_DSC3618', width: 927, height: 1400, alt: 'Stone window framing a grassy shore and a rock in the sea' },
	{ slug: 'london-cyclist', name: 'London cyclist', stem: '_DSC2483', width: 927, height: 1400, alt: 'Cyclist on a London street at dusk with Big Ben behind' },
	{ slug: 'big-ben-taxi', name: 'Big Ben taxi', stem: '0-5', width: 1400, height: 927, alt: 'Black and white view of Big Ben and a street with a taxi' },
];

export type Photo = (typeof PHOTOS)[number];

export const MOGE2_DEPTH = new Set(['A7_00355', '_DSC2483', '_DSC3618']);

export function photoUrls(stem: string) {
	return {
		src: `/spatial/${stem}.avif`,
		depth: `/spatial/${stem}-${MOGE2_DEPTH.has(stem) ? 'moge2' : 'da3'}-depth.avif`,
		back: `/spatial/${stem}-bg.avif`,
		backDepth: `/spatial/${stem}-bg-depth.png`,
		spatial: `/spatial/${stem}-da3-spatial.heic`,
	};
}

export function photoBySlug(slug: string | undefined): Photo | undefined {
	if (slug === undefined) return PHOTOS[0];
	return PHOTOS.find((photo) => photo.slug === slug);
}
