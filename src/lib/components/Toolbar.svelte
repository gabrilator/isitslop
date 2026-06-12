<script lang="ts">
	import type { Strings } from '$lib/stores/i18n';
	import { wordCount } from '$lib/lang';

	interface Props {
		t: Strings;
		text: string;
		loading: boolean;
		canAnalyze: boolean;
		onAnalyze: () => void;
	}

	let { t, text, loading, canAnalyze, onAnalyze }: Props = $props();

	let wc = $derived(wordCount(text));
	let over = $derived(wc > 1500);
</script>

<div
	class="flex flex-wrap items-center gap-2 border-b border-ink/10 bg-paper px-4 py-2 text-sm sm:px-6"
>
	<div class="flex-1"></div>

	{#if wc > 0}
		<span class={`font-mono text-xs ${over ? 'text-brick' : 'text-ink/60'}`}>
			{wc}
			{t.words}{over ? ` · ${t.max}` : ''}
		</span>
	{/if}

	<button
		type="button"
		class="rounded bg-ink px-4 py-1.5 font-mono text-xs uppercase tracking-wide text-paper disabled:opacity-40"
		disabled={!canAnalyze || loading}
		onclick={onAnalyze}
	>
		{loading ? t.analyzing : t.analyze}
	</button>
</div>
