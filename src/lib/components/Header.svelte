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
	let aboutOpen = $state(false);

	// Headline numbers, counted from the catalog (see the about modal).
	const STAT_RULES = '30+';
	const STAT_TELLS = '800+';
	const STAT_PAPERS = 4;
	const STAT_LANGS = 2;

	const PAPERS = [
		{ name: 'Kobak et al., Science Advances 2025', url: 'https://arxiv.org/abs/2406.07016' },
		{ name: 'Liang et al., ICML 2024', url: 'https://arxiv.org/abs/2403.07183' },
		{ name: 'Juzek & Ward, COLING 2025', url: 'https://aclanthology.org/2025.coling-main.426/' },
		{ name: 'Reinhart et al., PNAS 2025', url: 'https://arxiv.org/abs/2410.16107' }
	];
	const WIKI = {
		name: 'Wikipedia: Signs of AI writing',
		url: 'https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing'
	};
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') aboutOpen = false;
	}}
/>

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
			<button
				type="button"
				class="flex size-5 shrink-0 items-center justify-center rounded-full border border-ink/20 font-serif text-[11px] italic text-ink/40 hover:border-ink/50 hover:text-ink"
				aria-label={t.aboutTitle}
				onclick={() => (aboutOpen = true)}
			>
				i
			</button>
		</div>
	</div>
</header>

{#if aboutOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
		role="dialog"
		aria-modal="true"
		aria-label={t.aboutTitle}
	>
		<div class="w-full max-w-md rounded-lg border border-ink/20 bg-paper p-5 shadow-2xl">
			<div class="mb-4 flex items-start justify-between gap-4">
				<div class="flex items-center gap-3">
					<Parrot size={48} mood="calm" title={t.mascotName} />
					<h2 class="font-mono text-base font-semibold tracking-tight">isitslop</h2>
				</div>
				<button
					type="button"
					class="rounded border border-ink/20 px-2 py-1 font-mono text-xs uppercase hover:border-ink/60"
					onclick={() => (aboutOpen = false)}
				>
					{t.close}
				</button>
			</div>

			<p class="text-sm leading-relaxed text-ink/80">
				Most AI detectors are opaque, sketchy, and hungry for your data. I built
				<span class="font-semibold">isitslop</span> to be open-source and to run on the latest research
				into how AI writes!
			</p>

			<div class="my-4 grid grid-cols-4 gap-2 rounded border border-ink/10 bg-ink/[0.02] py-3 text-center">
				<div>
					<div class="font-mono text-lg font-semibold leading-none">{STAT_RULES}</div>
					<div class="mt-1 text-[10px] uppercase tracking-wide text-ink/50">rules</div>
				</div>
				<div>
					<div class="font-mono text-lg font-semibold leading-none">{STAT_TELLS}</div>
					<div class="mt-1 text-[10px] uppercase tracking-wide text-ink/50">tells</div>
				</div>
				<div>
					<div class="font-mono text-lg font-semibold leading-none">{STAT_PAPERS}</div>
					<div class="mt-1 text-[10px] uppercase tracking-wide text-ink/50">studies</div>
				</div>
				<div>
					<div class="font-mono text-lg font-semibold leading-none">{STAT_LANGS}</div>
					<div class="mt-1 text-[10px] uppercase tracking-wide text-ink/50">languages</div>
				</div>
			</div>

			<p class="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink/50">{t.aboutTitle}</p>
			<ul class="space-y-1.5">
				{#each PAPERS as s (s.url)}
					<li>
						<a
							class="text-sm text-ink underline decoration-ink/30 underline-offset-2 hover:decoration-ink"
							href={s.url}
							target="_blank"
							rel="noreferrer">{s.name}</a
						>
					</li>
				{/each}
			</ul>

			<div class="mt-3 rounded border border-ink/15 bg-ink/[0.03] p-2.5">
				<p class="mb-1 font-mono text-[10px] uppercase tracking-wide text-brick">Recommended reading</p>
				<a
					class="text-sm text-ink underline decoration-ink/30 underline-offset-2 hover:decoration-ink"
					href={WIKI.url}
					target="_blank"
					rel="noreferrer">{WIKI.name}</a
				>
			</div>
		</div>
	</div>
{/if}
