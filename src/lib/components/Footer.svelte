<script lang="ts">
	import type { Strings } from '$lib/stores/i18n';
	import Parrot from './Parrot.svelte';
	interface Props {
		t: Strings;
	}
	let { t }: Props = $props();
	let hallOpen = $state(false);
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') hallOpen = false;
	}}
/>

<footer class="border-t border-ink/10 px-4 py-4 text-xs text-ink/60 sm:px-6">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
		<a
			class="hover:text-ink hover:underline"
			href="https://gabricebria.com"
			target="_blank"
			rel="noreferrer">{t.footerBy}</a
		>
		<button
			type="button"
			class="cursor-pointer hover:text-ink hover:underline"
			onclick={() => (hallOpen = true)}>Hall of Slop</button
		>
		<div class="flex items-center gap-4">
			<a
				href="https://buymeacoffee.com/gabceboliw"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-1.5 font-semibold text-ochre hover:underline"
			>
				<svg viewBox="0 0 16 16" class="size-4" fill="none" aria-hidden="true">
					<path
						d="M4 7h7v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"
						stroke="currentColor"
						stroke-width="1.3"
						stroke-linejoin="round"
					/>
					<path
						d="M11 7.8h1.3a1.4 1.4 0 0 1 0 2.8H11"
						stroke="currentColor"
						stroke-width="1.3"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M6 3.2c.6.6.6 1.2 0 1.8M8.5 3.2c.6.6.6 1.2 0 1.8"
						stroke="currentColor"
						stroke-width="1.2"
						stroke-linecap="round"
						opacity="0.7"
					/>
				</svg>
				Donate
			</a>
			<a class="text-ink/50 hover:text-ink" href="mailto:gabceboli@gmail.com" aria-label="Contact">
				<svg viewBox="0 0 16 16" class="size-4" fill="none" aria-hidden="true">
					<rect
						x="1.5"
						y="3"
						width="13"
						height="10"
						rx="1.5"
						stroke="currentColor"
						stroke-width="1.3"
					/>
					<path
						d="M2 4.5 L8 9 L14 4.5"
						stroke="currentColor"
						stroke-width="1.3"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</a>
		</div>
	</div>
</footer>

{#if hallOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Hall of Slop"
	>
		<div class="relative w-full max-w-sm rounded-lg border border-ink/20 bg-paper p-6 text-center shadow-2xl">
			<button
				type="button"
				class="absolute right-3 top-3 rounded border border-ink/20 px-2 py-1 font-mono text-xs uppercase hover:border-ink/60"
				onclick={() => (hallOpen = false)}
			>
				{t.close}
			</button>
			<div class="flex flex-col items-center gap-4 pt-2">
				<Parrot size={120} mood="calm" title={t.mascotName} />
				<h2 class="font-mono text-2xl font-semibold tracking-tight text-ink">Hall of Slop</h2>
				<p class="font-mono text-xs uppercase tracking-widest text-brick">Coming soon</p>
				<p class="font-serif text-lg leading-relaxed text-ink">The biggest corporate slop, FRAMED!</p>
				<a
					class="font-serif text-base text-ink/80 underline decoration-ink/30 underline-offset-2 hover:decoration-ink"
					href="mailto:gabceboli@gmail.com">Email me at gabceboli@gmail.com</a
				>
			</div>
		</div>
	</div>
{/if}
