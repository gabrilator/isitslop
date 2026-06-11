<script lang="ts">
	import Parrot from './Parrot.svelte';
	import type { Strings } from '$lib/stores/i18n';

	interface Props {
		t: Strings;
		mood: 'calm' | 'sharp';
		scanning?: boolean;
	}

	let { t, mood, scanning = false }: Props = $props();
</script>

<header class="border-b border-ink/10 bg-paper">
	<div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
		<div class="flex items-center gap-3">
			<Parrot size={48} {mood} {scanning} title={t.mascotName} />
			<div class="leading-tight">
				<h1 class="font-mono text-lg font-semibold tracking-tight">isitslop</h1>
				<p class="text-xs text-ink/60">{t.tagline}</p>
			</div>
		</div>
	</div>
</header>
