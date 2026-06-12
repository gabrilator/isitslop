<script lang="ts">
	import type { Flag } from '$lib/types';
	import type { Strings } from '$lib/stores/i18n';
	import { renderFlaggedHtml, flagId as makeFlagId } from '$lib/render';

	interface Props {
		t: Strings;
		text: string;
		flags: Flag[] | null;
		loading: boolean;
		onTextChange: (text: string) => void;
		onFlagClick: (flagId: string) => void;
		onEditAgain: () => void;
	}

	let { t, text, flags, loading, onTextChange, onFlagClick, onEditAgain }: Props = $props();

	let renderedHtml = $derived(flags ? renderFlaggedHtml(text, flags) : '');
	let tooltip = $state<{ flag: Flag; x: number; y: number } | null>(null);
	let containerEl: HTMLDivElement | undefined = $state();
	let textHeight = $state(0);

	function onClickRendered(e: MouseEvent) {
		const target = e.target as HTMLElement | null;
		if (!target) return;
		const mark = target.closest('mark[data-flag-id]') as HTMLElement | null;
		if (!mark) {
			tooltip = null;
			return;
		}
		const id = mark.getAttribute('data-flag-id');
		if (!id || !flags || !containerEl) return;
		const flag = flags.find((f) => makeFlagId(f) === id);
		if (!flag) return;
		const markRect = mark.getBoundingClientRect();
		const containerRect = containerEl.getBoundingClientRect();
		tooltip = {
			flag,
			x: markRect.left - containerRect.left + markRect.width / 2,
			y: markRect.bottom - containerRect.top + 6
		};
		onFlagClick(id);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') tooltip = null;
	}

	function severityColor(severity: Flag['severity']): string {
		return severity === 'red' ? 'bg-brick' : 'bg-ochre';
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="paper relative h-full" bind:this={containerEl}>
	{#if flags}
		<button
			type="button"
			class="absolute right-3 top-3 z-10 rounded border border-ink/20 bg-paper px-2 py-1 font-mono text-xs uppercase tracking-wide hover:border-ink/60"
			onclick={onEditAgain}
		>
			{t.editAgain}
		</button>
		<div
			class="min-h-[320px] whitespace-pre-wrap break-words px-20 py-6 font-serif text-base leading-8"
			onclick={onClickRendered}
			role="presentation"
		>
			{@html renderedHtml}
		</div>

		{#if tooltip}
			<div
				class="absolute z-20 w-72 rounded-md border border-ink/20 bg-paper p-3 text-sm shadow-xl"
				style={`left: ${tooltip.x}px; top: ${tooltip.y}px; transform: translateX(-50%);`}
				role="tooltip"
			>
				<div class="mb-2 flex items-center gap-2">
					<span
						class={`inline-block size-2 rounded-full ${severityColor(tooltip.flag.severity)}`}
						aria-hidden="true"
					></span>
					<span class="font-mono text-[11px] uppercase tracking-wide text-ink/60">
						{tooltip.flag.ruleId}
					</span>
					{#if tooltip.flag.ruleCount && tooltip.flag.ruleCount > 1}
						<span class="font-mono text-[11px] uppercase tracking-wide text-ink/40">
							×{tooltip.flag.ruleCount}
						</span>
					{/if}
					<button
						type="button"
						class="ml-auto text-ink/40 hover:text-ink"
						aria-label="Close"
						onclick={(e) => {
							e.stopPropagation();
							tooltip = null;
						}}
					>
						×
					</button>
				</div>
				<p class="mb-1 whitespace-pre-wrap font-serif italic text-ink">"{tooltip.flag.excerpt}"</p>
				<p class="text-xs text-ink/70">{tooltip.flag.explanation}</p>
				{#if tooltip.flag.suggestion}
					<p class="mt-1 text-xs text-ink/60">→ {tooltip.flag.suggestion}</p>
				{/if}
			</div>
		{/if}
	{:else}
		<textarea
			class="page-input min-h-[320px] w-full resize-none whitespace-pre-wrap break-words bg-transparent px-20 py-6 font-serif text-base leading-8 placeholder:text-ink/40 focus:outline-none"
			placeholder={t.placeholder}
			value={text}
			oninput={(e) => onTextChange((e.currentTarget as HTMLTextAreaElement).value)}
			spellcheck="false"
			disabled={loading}
		></textarea>
	{/if}

	{#if loading}
		<!-- invisible mirror of the text to know where it ends, so the beam stops there -->
		<div
			class="invisible absolute inset-x-0 top-0 whitespace-pre-wrap break-words px-20 py-6 font-serif text-base leading-8"
			bind:clientHeight={textHeight}
			aria-hidden="true"
		>{text}</div>
		<div
			class="pointer-events-none absolute inset-x-0 top-0 max-h-full overflow-hidden"
			style={`height: ${textHeight}px`}
			aria-hidden="true"
		>
			<div class="scan-beam"></div>
			<div class="absolute inset-x-0 bottom-0 h-px">
				<div class="ink-line"></div>
			</div>
		</div>
	{/if}
</div>
