<script lang="ts">
	interface Props {
		size?: number;
		mood?: 'calm' | 'sharp';
		scanning?: boolean;
		title?: string;
	}
	let { size = 48, mood = 'calm', scanning = false, title = 'Polly' }: Props = $props();
</script>

<svg
	class="parrot"
	class:scanning
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 64 64"
	role="img"
	aria-label={title}
>
	<title>{title}</title>

	<!-- head -->
	<circle cx="32" cy="34" r="22" fill="#b23a3a" stroke="#1a1a1a" stroke-width="2" />

	<!-- top tuft -->
	<path
		d="M16 18 Q22 4 30 14"
		fill="#b23a3a"
		stroke="#1a1a1a"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>

	<!-- wing hint -->
	<path
		d="M13 42 Q19 49 27 48"
		fill="none"
		stroke="#1a1a1a"
		stroke-width="1.6"
		stroke-linecap="round"
		opacity="0.45"
	/>

	<!-- cheek highlight -->
	<ellipse cx="22" cy="40" rx="6" ry="3" fill="#fafaf7" opacity="0.18" />

	<!-- left eye (open / blinks; narrows when sharp) -->
	<g class="open-eye">
		{#if mood === 'sharp'}
			<ellipse cx="24" cy="30" rx="5" ry="3.6" fill="#fafaf7" stroke="#1a1a1a" stroke-width="1.6" />
		{:else}
			<circle cx="24" cy="30" r="5" fill="#fafaf7" stroke="#1a1a1a" stroke-width="1.6" />
		{/if}
		<g class="pupil">
			<circle cx="25" cy="31" r="2" fill="#1a1a1a" />
		</g>
	</g>

	<!-- right eye (winked) -->
	<path
		d="M37 31 Q42 28 47 31"
		fill="none"
		stroke="#1a1a1a"
		stroke-width="2"
		stroke-linecap="round"
	/>

	{#if mood === 'sharp'}
		<!-- angled brows over both eyes -->
		<path
			d="M18 22 L31 24"
			stroke="#1a1a1a"
			stroke-width="2.2"
			stroke-linecap="round"
			fill="none"
		/>
		<path
			d="M48 24 L36 25"
			stroke="#1a1a1a"
			stroke-width="2.2"
			stroke-linecap="round"
			fill="none"
		/>
		<!-- frown beak -->
		<path
			d="M30 44 L40 42 L34 50 Z"
			fill="#fafaf7"
			stroke="#1a1a1a"
			stroke-width="1.8"
			stroke-linejoin="round"
		/>
	{:else}
		<!-- raised curious brow -->
		<path
			d="M19 23 Q24 20.5 29 23"
			stroke="#1a1a1a"
			stroke-width="1.6"
			stroke-linecap="round"
			fill="none"
			opacity="0.55"
		/>
		<!-- neutral beak -->
		<path
			d="M30 42 L42 42 L34 50 Z"
			fill="#fafaf7"
			stroke="#1a1a1a"
			stroke-width="1.8"
			stroke-linejoin="round"
		/>
	{/if}
</svg>
