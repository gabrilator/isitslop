<script lang="ts">
	import Parrot from './Parrot.svelte';
	import type { Strings } from '$lib/stores/i18n';

	interface Props {
		t: Strings;
		mood: 'calm' | 'sharp';
		scanning?: boolean;
	}

	let { t, mood, scanning = false }: Props = $props();

	let aboutOpen = $state(false);

	const SOURCES = [
		{ name: 'Kobak et al., Science Advances 2025', url: 'https://arxiv.org/abs/2406.07016' },
		{ name: 'Liang et al., ICML 2024', url: 'https://arxiv.org/abs/2403.07183' },
		{ name: 'Juzek & Ward, COLING 2025', url: 'https://aclanthology.org/2025.coling-main.426/' },
		{ name: 'Reinhart et al., PNAS 2025', url: 'https://arxiv.org/abs/2410.16107' },
		{
			name: 'Wikipedia: Signs of AI writing',
			url: 'https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing'
		}
	];
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') aboutOpen = false;
	}}
/>

<header class="border-b border-ink/10 bg-paper">
	<div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
		<div class="flex items-center gap-3">
			<Parrot size={48} {mood} {scanning} title={t.mascotName} />
			<div class="leading-tight">
				<h1 class="font-mono text-lg font-semibold tracking-tight">isitslop</h1>
				<p class="text-xs text-ink/60">{t.tagline}</p>
			</div>
		</div>
		<button
			type="button"
			class="ml-auto flex size-5 items-center justify-center rounded-full border border-ink/20 font-serif text-[11px] italic text-ink/40 hover:border-ink/50 hover:text-ink"
			aria-label={t.aboutTitle}
			onclick={() => (aboutOpen = true)}
		>
			i
		</button>
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
			<div class="mb-2 flex items-center justify-between gap-4">
				<h2 class="font-mono text-sm font-semibold uppercase tracking-wide">{t.aboutTitle}</h2>
				<button
					type="button"
					class="rounded border border-ink/20 px-2 py-1 font-mono text-xs uppercase hover:border-ink/60"
					onclick={() => (aboutOpen = false)}
				>
					{t.close}
				</button>
			</div>
			<p class="mb-3 text-sm text-ink/70">{t.aboutPhilosophy}</p>
			<ul class="space-y-1.5">
				{#each SOURCES as s (s.url)}
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
		</div>
	</div>
{/if}
