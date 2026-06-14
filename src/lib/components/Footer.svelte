<script lang="ts">
	import type { Strings } from '$lib/stores/i18n';
	interface Props {
		t: Strings;
	}
	let { t }: Props = $props();
</script>

<footer class="border-t border-ink/10 px-4 py-4 text-xs text-ink/60 sm:px-6">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
		<a
			class="hover:text-ink hover:underline"
			href="https://gabricebria.com"
			target="_blank"
			rel="noreferrer">{t.footerBy}</a
		>
		<a class="hover:text-ink hover:underline" href="/hall-of-slop">Hall of Slop</a>
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
</footer>
