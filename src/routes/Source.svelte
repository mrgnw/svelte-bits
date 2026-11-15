<script lang="ts">
	let { source }: { source: { code: string; html: string } } = $props();

	let copied = $state(false);

	async function copy() {
		if (!navigator.clipboard) return;
		await navigator.clipboard.writeText(source.code);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<details class="source">
	<summary>Usage</summary>
	<button type="button" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
	{@html source.html}
</details>

<style>
	.source {
		position: relative;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		background: var(--code-bg);
		overflow: clip;
		min-width: 0;
	}

	summary {
		padding: 0.875rem 1rem;
		font-weight: 500;
		cursor: pointer;
	}

	.source button {
		position: absolute;
		top: 0.5rem;
		right: 0.625rem;
		z-index: 1;
		font: inherit;
		font-size: 0.8125rem;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 0.5rem;
		padding: 0.25rem 0.75rem;
		cursor: pointer;
	}

	.source:not([open]) button {
		display: none;
	}

	.source :global(pre) {
		margin: 0;
		padding: 0.75rem 1rem 1.25rem;
		max-height: 32rem;
		overflow: auto;
		border-top: 1px solid var(--line);
		background: none;
		font: 0.8125rem/1.6 var(--mono);
		tab-size: 2;
	}
</style>
