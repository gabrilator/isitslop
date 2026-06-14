<script lang="ts">
	import Parrot from '$lib/components/Parrot.svelte';
</script>

<svelte:head>
	<title>Hall of Slop · isitslop</title>
	<meta name="description" content="The worst AI slop, caught and framed. Coming soon." />
</svelte:head>

<main
	class="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center"
>
	<a href="/" class="flex items-center gap-2 text-ink/60 hover:text-ink">
		<Parrot size={40} mood="calm" />
		<span class="font-mono text-sm">isitslop</span>
	</a>

	<h1 class="font-mono text-3xl font-semibold tracking-tight">Hall of Slop</h1>

	<p class="font-mono text-xs uppercase tracking-widest text-brick">Coming soon</p>

	<p class="font-serif text-lg leading-relaxed text-ink/80">The worst AI slop, caught and framed.</p>

	<p class="font-serif text-base text-ink/70">
		Got a good one?
		<a
			class="underline decoration-ink/30 underline-offset-2 hover:decoration-ink"
			href="mailto:gabceboli@gmail.com?subject=Hall%20of%20Slop">Email me your examples with screenshots.</a
		>
	</p>

	<a href="/" class="mt-4 font-mono text-xs uppercase tracking-wide text-ink/50 hover:text-ink">
		← Back
	</a>
</main>
