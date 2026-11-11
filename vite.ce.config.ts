import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [svelte({ compilerOptions: { customElement: true, runes: true } })],
	build: {
		target: 'esnext',
		outDir: 'dist-ce',
		minify: false,
		rolldownOptions: { output: { minify: true } },
		lib: { entry: 'src/lib/section-nav/element.ts', formats: ['es'], fileName: () => 'section-nav.js' }
	}
});
