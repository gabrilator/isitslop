<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import FlagsPanel from '$lib/components/FlagsPanel.svelte';
	import { strings } from '$lib/stores/i18n';
	import type { ScanResult } from '$lib/types';
	import { wordCount } from '$lib/lang';

	const t = strings('en');

	let text = $state('');
	let result = $state<ScanResult | null>(null);
	let loading = $state(false);
	let activeId = $state<string | null>(null);
	let error = $state<string | null>(null);
	let mobilePanelOpen = $state(false);
	let editing = $state(true);

	let mood = $derived<'calm' | 'sharp'>(
		result && result.summary.slopScore >= 40 ? 'sharp' : 'calm'
	);
	let wc = $derived(wordCount(text));
	let canAnalyze = $derived(wc >= 10 && wc <= 1500);

	async function analyze() {
		if (!canAnalyze) return;
		loading = true;
		error = null;
		result = null;
		activeId = null;
		try {
			const res = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					text,
					provider: 'google',
					language: 'auto'
				})
			});
			if (!res.ok) {
				const body = await res.text();
				throw new Error(body || `HTTP ${res.status}`);
			}
			result = (await res.json()) as ScanResult;
			editing = false;
			mobilePanelOpen = true;
			(window as { umami?: { track: (event: string, data?: object) => void } }).umami?.track(
				'analyze',
				{ language: result.language, score: result.summary.slopScore }
			);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	// Back to the textarea, but keep the last results in the panel.
	// They only reset on the next analyze, or when the text is deleted.
	function editAgain() {
		editing = true;
		error = null;
		activeId = null;
		mobilePanelOpen = false;
	}

	function onTextChange(v: string) {
		text = v;
		if (!v.trim()) {
			result = null;
			activeId = null;
			mobilePanelOpen = false;
		}
	}
</script>

<svelte:head>
	<title>isitslop · before it's too late</title>
	<meta name="description" content="Detect AI-prose tells in English and Spanish text." />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header {t} {mood} scanning={loading} {text} {loading} {canAnalyze} onAnalyze={analyze} />

	<main
		class={`mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-0 ${result ? 'lg:grid-cols-[1fr_380px]' : ''}`}
	>
		<section class="border-x border-ink/10">
			{#if error}
				<div class="m-4 rounded border border-brick/40 bg-brick/5 p-3 text-sm">
					<p class="mb-1 font-semibold text-brick">{t.errorTitle}</p>
					<p class="text-ink/80">{error}</p>
					<button
						type="button"
						class="mt-2 rounded border border-ink/20 px-2 py-1 font-mono text-xs uppercase hover:border-ink/60"
						onclick={analyze}
					>
						{t.rerun}
					</button>
				</div>
			{/if}
			<Editor
				{t}
				{text}
				flags={!editing && result ? result.flags : null}
				{loading}
				{onTextChange}
				onFlagClick={(id) => {
					activeId = id;
					mobilePanelOpen = true;
				}}
				onEditAgain={editAgain}
			/>
		</section>

		{#if result}
			<aside class="hidden border-r border-ink/10 lg:block">
				<FlagsPanel {t} {result} {activeId} onSelect={(id) => (activeId = id)} />
			</aside>
		{/if}
	</main>

	<Footer {t} />

	{#if result && !mobilePanelOpen}
		<button
			type="button"
			class="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 py-2 font-mono text-xs uppercase tracking-wide text-paper shadow-lg lg:hidden"
			onclick={() => (mobilePanelOpen = true)}
		>
			<span>{t.slopScore}: {result.summary.slopScore}</span>
			<span class="text-paper/60">· {result.flags.length} {t.flagsWord}</span>
			<svg viewBox="0 0 12 12" class="size-3" aria-hidden="true">
				<path
					d="M2 8 L6 4 L10 8"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	{/if}

	{#if result && mobilePanelOpen}
		<div
			class="sheet fixed inset-x-0 bottom-0 z-40 flex max-h-[70vh] flex-col rounded-t-2xl border-t border-ink/20 bg-paper shadow-2xl lg:hidden"
		>
			<div class="flex justify-center pb-1 pt-2">
				<button
					type="button"
					class="h-1.5 w-10 rounded-full bg-ink/20"
					aria-label={t.close}
					onclick={() => (mobilePanelOpen = false)}
				></button>
			</div>
			<div class="flex items-center justify-between border-b border-ink/10 px-3 pb-2">
				<span class="font-mono text-xs uppercase tracking-wide"
					>{t.slopScore}: {result.summary.slopScore}</span
				>
				<button
					type="button"
					class="rounded border border-ink/20 px-2 py-1 font-mono text-xs uppercase hover:border-ink/60"
					onclick={() => (mobilePanelOpen = false)}
				>
					{t.close}
				</button>
			</div>
			<div class="min-h-0 flex-1 overflow-y-auto">
				<FlagsPanel {t} {result} {activeId} onSelect={(id) => (activeId = id)} />
			</div>
		</div>
	{/if}
</div>
