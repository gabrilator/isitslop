<script lang="ts">
	import type { Strings } from '$lib/stores/i18n';
	interface Props {
		t: Strings;
	}
	let { t }: Props = $props();
</script>

<footer class="border-t border-ink/10 px-4 py-4 text-xs text-ink/60 sm:px-6">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
		<span>{t.footerBy}</span>
		<a
			class="hover:text-ink hover:underline"
			href="https://gabricebria.com"
			target="_blank"
			rel="noreferrer">gabricebria.com</a
		>
	</div>
</footer>
