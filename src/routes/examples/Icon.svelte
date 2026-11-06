<script lang="ts" module>
	const PATHS: Record<string, string> = {
		home: 'M3 11l9-8 9 8M5 10v10h14V10',
		projects: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
		issues: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
		docs: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
		profile: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 4-6 8-6s8 2 8 6',
		settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
		help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01',
		bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
		italic: 'M10 5h8M6 19h8M15 5l-6 14',
		underline: 'M7 4v7a5 5 0 0 0 10 0V4M5 20h14',
		strike: 'M5 12h14M16 7a4 3 0 0 0-4-2c-2.5 0-4 1-4 2.5S9.5 10 12 11M8 17a4 3 0 0 0 4 2c2.5 0 4-1 4-2.5',
		link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
		code: 'M8 8l-4 4 4 4M16 8l4 4-4 4',
		quote: 'M5 18v-5a4 4 0 0 1 4-4M5 13h4v5H5zM14 18v-5a4 4 0 0 1 4-4M14 13h4v5h-4z',
		list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
		undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
		redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
		more: 'M5 12h.01M12 12h.01M19 12h.01',
		chevron: 'M6 9l6 6 6-6',
	};
</script>

<script lang="ts">
	let { name }: { name: string } = $props();
</script>

<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width={name === 'more' ? 3 : 1.75} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	<path d={PATHS[name]} />
</svg>
