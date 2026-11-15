<script lang="ts">
	import { onMount } from 'svelte';
	import type { MotionState } from '#lib';

	let { motion, requestMotion }: { motion: MotionState; requestMotion: () => void } = $props();

	const id = $props.id();
	const ALLOW = 'Allow motion: your browser will ask for permission';
	const ASKING = 'Asking for motion permission';
	const DENIED = 'Motion blocked. To allow it again in Safari, close and reopen the page, or clear website data for this site.';

	let touch = $state(false);
	let asked = $state(false);

	onMount(() => {
		touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
	});

	const asking = $derived(asked && motion === 'prompt');

	function allow() {
		asked = true;
		requestMotion();
	}
</script>

{#snippet glyph(badge: 'check' | 'lock' | 'cross')}
	<svg class="glyph" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
		<g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
			<rect x="6" y="2.5" width="9" height="15" rx="2" transform="rotate(-14 10.5 10)" />
			<path d="M2.5 9.5c-.8 1.8-.6 3.8.6 5.4M19.5 4.5c1 1 1.6 2.3 1.7 3.7" />
		</g>
		<circle class="badge" cx="18" cy="18" r="5.5" />
		<g class="mark" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
			{#if badge === 'check'}
				<path d="M15.5 18.2l1.7 1.6 3.3-3.4" />
			{:else if badge === 'lock'}
				<rect x="15.6" y="17.6" width="4.8" height="3.4" rx="0.6" />
				<path d="M16.6 17.6v-1.1a1.4 1.4 0 0 1 2.8 0v1.1" />
			{:else}
				<path d="M16 16l4 4M20 16l-4 4" />
			{/if}
		</g>
	</svg>
{/snippet}

{#if motion === 'prompt'}
	<div class="slot" style:--wide={asking ? '7.25rem' : '9rem'}>
		<button
			type="button"
			class="motion"
			data-state={asking ? 'asking' : 'prompt'}
			aria-label={asking ? ASKING : ALLOW}
			aria-busy={asking}
			title={asking ? ASKING : ALLOW}
			onclick={allow}
		>
			{@render glyph('lock')}
			<span class="label">{asking ? 'Asking…' : 'Allow motion'}</span>
		</button>
	</div>
{:else if motion === 'granted' && touch}
	<div class="slot" style:--wide="7.75rem">
		<span class="motion" data-state="granted" role="status" aria-label="Motion on" title="Motion on">
			{@render glyph('check')}
			<span class="label" aria-hidden="true">Motion on</span>
		</span>
	</div>
{:else if motion === 'denied'}
	<div class="slot" style:--wide="9.75rem">
		<button type="button" class="motion" data-state="denied" aria-label={DENIED} title={DENIED} popovertarget="{id}-hint">
			{@render glyph('cross')}
			<span class="label">Motion blocked</span>
		</button>
		<p id="{id}-hint" class="hint" popover>{DENIED}</p>
	</div>
{/if}

<style>
	.slot {
		--ok: #2f7d4f;
		--blocked: var(--danger, #b4321f);
		container: motion / inline-size;
		display: flex;
		flex: 0 1 auto;
		justify-content: center;
		inline-size: var(--wide);
		min-inline-size: 2.75rem;
	}

	@media (prefers-color-scheme: dark) {
		.slot {
			--ok: #6cc08b;
			--blocked: #f0806b;
		}
	}

	.motion {
		--tone: var(--accent);
		position: relative;
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		box-sizing: border-box;
		min-inline-size: 2.75rem;
		block-size: 2.75rem;
		margin: 0;
		padding: 0;
		border: 1.5px solid var(--tone);
		border-radius: 999px;
		background: var(--island-bg, var(--surface));
		backdrop-filter: blur(8px);
		box-shadow: var(--shadow);
		color: var(--tone);
		font: 600 0.8125rem/1 system-ui, sans-serif;
		white-space: nowrap;
		-webkit-tap-highlight-color: transparent;
	}

	[data-state='granted'] {
		--tone: var(--ok);
	}

	[data-state='denied'] {
		--tone: var(--blocked);
	}

	[data-state='asking'] {
		opacity: 0.7;
		cursor: progress;
	}

	button.motion:not([data-state='asking']) {
		cursor: pointer;
	}

	button.motion:hover {
		background: var(--hover);
	}

	button.motion:active {
		scale: 0.97;
	}

	.label {
		display: none;
	}

	@container motion (width >= 7.25rem) {
		[data-state='asking'] {
			padding-inline: 0.625rem 0.875rem;
		}

		[data-state='asking'] .label {
			display: inline;
		}
	}

	@container motion (width >= 7.75rem) {
		[data-state='granted'] {
			padding-inline: 0.625rem 0.875rem;
		}

		[data-state='granted'] .label {
			display: inline;
		}
	}

	@container motion (width >= 9rem) {
		[data-state='prompt'] {
			padding-inline: 0.625rem 0.875rem;
		}

		[data-state='prompt'] .label {
			display: inline;
		}
	}

	@container motion (width >= 9.75rem) {
		[data-state='denied'] {
			padding-inline: 0.625rem 0.875rem;
		}

		[data-state='denied'] .label {
			display: inline;
		}
	}

	.glyph {
		flex: none;
		overflow: visible;
	}

	.badge {
		fill: var(--tone);
		stroke: var(--island-bg, var(--surface));
		stroke-width: 1.5;
	}

	.mark {
		stroke: var(--surface);
	}

	@media (prefers-reduced-motion: no-preference) {
		[data-state='prompt']::after {
			content: '';
			position: absolute;
			inset: -1.5px;
			border-radius: inherit;
			box-shadow: 0 0 0 0 var(--tone);
			animation: ask 1.6s ease-out 3;
			pointer-events: none;
		}
	}

	@keyframes ask {
		to {
			box-shadow: 0 0 0 0.5rem transparent;
		}
	}

	.motion:focus-visible {
		outline: 2px solid var(--tone);
		outline-offset: 2px;
	}

	.hint {
		position: fixed;
		inset: auto 0 6.5rem;
		box-sizing: border-box;
		inline-size: min(calc(100% - 1.5rem), 22rem);
		margin: 0 auto;
		padding: 0.75rem 1rem;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		background: var(--surface);
		color: var(--ink);
		box-shadow: var(--shadow-lift);
		font: 0.875rem/1.4 system-ui, sans-serif;
	}
</style>
