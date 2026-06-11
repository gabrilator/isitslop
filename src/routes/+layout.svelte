<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { env } from '$env/dynamic/public';

	let { children } = $props();

	// Umami analytics, only when configured. No cookies, no consent banner.
	const umamiId = env.PUBLIC_UMAMI_WEBSITE_ID;
	const umamiSrc = env.PUBLIC_UMAMI_SRC || 'https://cloud.umami.is/script.js';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#if umamiId}
		<script defer src={umamiSrc} data-website-id={umamiId}></script>
	{/if}
</svelte:head>
{@render children()}
