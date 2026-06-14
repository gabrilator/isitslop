<script lang="ts">
	import Parrot from './Parrot.svelte';
	import type { Strings } from '$lib/stores/i18n';
	import { wordCount } from '$lib/lang';

	interface Props {
		t: Strings;
		mood: 'calm' | 'sharp';
		scanning?: boolean;
		text: string;
		loading: boolean;
		canAnalyze: boolean;
		onAnalyze: () => void;
	}

	let { t, mood, scanning = false, text, loading, canAnalyze, onAnalyze }: Props = $props();

	let wc = $derived(wordCount(text));
	let over = $derived(wc > 1500);
</script>

<header class="border-b border-ink/10 bg-paper">
	<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
		<div class="flex items-center gap-3">
			<Parrot size={64} {mood} {scanning} title={t.mascotName} />
			<div class="leading-tight">
				<h1 class="font-mono text-lg font-semibold tracking-tight">isitslop</h1>
				<p class="text-xs text-ink/60">{t.tagline}</p>
			</div>
		</div>
		<div class="ml-auto flex w-full items-center gap-3 sm:w-auto">
			{#if wc > 0}
				<span class={`font-mono text-xs ${over ? 'text-brick' : 'text-ink/60'}`}>
					{wc}
					{wc === 1 ? t.word : t.words}{over ? ` · ${t.max}` : ''}
				</span>
			{/if}
			<button
				type="button"
				class="flex-1 rounded bg-ink px-4 py-2 font-mono text-xs uppercase tracking-wide text-paper disabled:opacity-40 sm:flex-none sm:py-1.5"
				disabled={!canAnalyze || loading}
				onclick={onAnalyze}
			>
				{loading ? t.analyzing : t.analyze}
			</button>
		</div>
	</div>
</header>
