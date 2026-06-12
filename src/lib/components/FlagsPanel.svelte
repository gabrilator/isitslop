<script lang="ts">
	import { tick } from 'svelte';
	import type { Flag, ScanResult } from '$lib/types';
	import type { Strings } from '$lib/stores/i18n';
	import { flagId } from '$lib/render';
	import { ruleContribution, isWritingTip } from '$lib/scanners/merge';

	interface Props {
		t: Strings;
		result: ScanResult | null;
		activeId: string | null;
		onSelect: (id: string) => void;
	}

	let { t, result, activeId, onSelect }: Props = $props();

	let expanded = $state<Record<string, boolean>>({});
	let slopOpen = $state(false);
	let tipsOpen = $state(false);
	let displayScore = $state(0);
	let panelEl: HTMLDivElement | undefined = $state();

	// New result: collapse everything and count the score up from zero.
	$effect(() => {
		const target = result?.summary.slopScore ?? 0;
		expanded = {};
		slopOpen = false;
		tipsOpen = false;
		const start = performance.now();
		const dur = 700;
		let raf = requestAnimationFrame(function step(now: number) {
			const p = Math.min(1, (now - start) / dur);
			displayScore = Math.round(target * (1 - Math.pow(1 - p, 3)));
			if (p < 1) raf = requestAnimationFrame(step);
		});
		return () => cancelAnimationFrame(raf);
	});

	// Clicking a mark in the editor expands its group and scrolls to the instance.
	$effect(() => {
		if (!activeId || !result) return;
		const f = result.flags.find((fl) => flagId(fl) === activeId);
		if (!f) return;
		expanded[f.ruleId] = true;
		if (isWritingTip(f.ruleId)) tipsOpen = true;
		else slopOpen = true;
		tick().then(() => {
			panelEl
				?.querySelector(`[id="flag-${activeId}"]`)
				?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		});
	});

	function scoreLabel(score: number): string {
		if (score < 15) return t.clean;
		if (score < 40) return 'Mild';
		if (score < 70) return 'Heavy';
		return 'Slop';
	}

	interface Group {
		ruleId: string;
		severity: Flag['severity'];
		count: number;
		flags: Flag[];
	}

	function groupFlags(flags: Flag[]): Group[] {
		const map = new Map<string, Group>();
		for (const f of flags) {
			let g = map.get(f.ruleId);
			if (!g) {
				g = { ruleId: f.ruleId, severity: f.severity, count: 0, flags: [] };
				map.set(f.ruleId, g);
			}
			g.count++;
			g.flags.push(f);
		}
		return [...map.values()].sort((a, b) => {
			const ca = ruleContribution(a.severity, a.count);
			const cb = ruleContribution(b.severity, b.count);
			if (ca !== cb) return cb - ca;
			if (a.severity !== b.severity) return a.severity === 'red' ? -1 : 1;
			return a.ruleId.localeCompare(b.ruleId);
		});
	}

	let allGroups = $derived(result ? groupFlags(result.flags) : []);
	let slopGroups = $derived(allGroups.filter((g) => !isWritingTip(g.ruleId)));
	let tipGroups = $derived(allGroups.filter((g) => isWritingTip(g.ruleId)));
	let slopCount = $derived(slopGroups.reduce((a, g) => a + g.count, 0));
	let tipCount = $derived(tipGroups.reduce((a, g) => a + g.count, 0));
	// section badge color follows the score: green is fine, ochre is a deal, brick is bad
	let slopBadgeClass = $derived.by(() => {
		const score = result?.summary.slopScore ?? 0;
		if (score < 15) return 'bg-[#3d7a4a]';
		if (score < 40) return 'bg-ochre';
		return 'bg-brick';
	});

	function gradeLabel(grade: number): string {
		if (grade <= 8) return t.gradeEasy;
		if (grade <= 12) return t.gradeFormal;
		return t.gradeDense;
	}

	let rhythm = $derived.by(() => {
		const cv = result?.summary.burstiness ?? null;
		if (cv === null) return null;
		const pct = (Math.min(cv, 0.9) / 0.9) * 100;
		const label = cv < 0.3 ? t.rhythmMonotone : cv < 0.45 ? t.rhythmSteady : t.rhythmVaried;
		return { cv, pct, label, monotone: cv < 0.3 };
	});

	function intensityClass(severity: Flag['severity'], count: number): string {
		if (count >= 3) return severity === 'red' ? 'bg-[#7a1818]' : 'bg-brick';
		if (count === 2) return severity === 'red' ? 'bg-[#9a2828]' : 'bg-[#a55d17]';
		return severity === 'red' ? 'bg-brick' : 'bg-ochre';
	}
</script>

{#snippet groupCard(g: Group, subdued: boolean, index: number)}
	{@const open = !!expanded[g.ruleId]}
	<li
		class={`group-card rounded border border-ink/10 ${subdued ? 'bg-paper/60' : 'bg-paper'}`}
		style={`animation-delay: ${Math.min(index * 50, 400)}ms`}
	>
		<button
			type="button"
			class="flex w-full items-center gap-2 p-3 text-left"
			aria-expanded={open}
			onclick={() => (expanded[g.ruleId] = !open)}
		>
			<span
				class={`inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-paper ${subdued ? 'bg-ink/30' : intensityClass(g.severity, g.count)}`}
				aria-hidden="true"
			>
				{g.count >= 2 ? g.count : ''}
			</span>
			<span class="font-mono text-[11px] uppercase tracking-wide text-ink/60">{g.ruleId}</span>
			<span class="ml-auto flex shrink-0 items-center gap-2">
				{#if g.count >= 2}
					<span class="font-mono text-[11px] uppercase tracking-wide text-ink/40">×{g.count}</span>
				{/if}
				<svg
					viewBox="0 0 12 12"
					class={`size-3 text-ink/40 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
					aria-hidden="true"
				>
					<path
						d="M2 4 L6 8 L10 4"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</span>
		</button>
		<p class="-mt-1 px-3 pb-2 text-xs text-ink/70">{g.flags[0].explanation}</p>
		{#if open}
			<ul class="space-y-1 px-3 pb-3">
				{#each g.flags as flag (flagId(flag))}
					{@const id = flagId(flag)}
					<li
						id={`flag-${id}`}
						class={`rounded px-2 py-1 ${activeId === id ? 'bg-ink/5 ring-2 ring-ink/40' : 'hover:bg-ink/5'}`}
					>
						<button
							type="button"
							class="block w-full whitespace-pre-wrap text-left font-serif text-sm italic text-ink"
							onclick={() => onSelect(id)}
						>
							"{flag.excerpt}"
						</button>
						{#if flag.suggestion}
							<p class="px-1 text-xs text-ink/60">→ {flag.suggestion}</p>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}

{#if !result}
	<div class="flex h-full flex-col items-start justify-start gap-3 p-6 text-sm text-ink/50">
		<p class="font-mono text-xs uppercase tracking-wide">{t.slopScore}</p>
		<p class="italic">{t.placeholder}.</p>
	</div>
{:else}
	<div class="flex h-full flex-col" bind:this={panelEl}>
		<div class="border-b border-ink/10 p-4">
			<div class="mb-3 flex items-baseline justify-between">
				<span class="font-mono text-xs uppercase tracking-wide text-ink/60">{t.slopScore}</span>
				<span class="font-mono text-xs uppercase tracking-wide text-ink/60"
					>{scoreLabel(result.summary.slopScore)}</span
				>
			</div>
			<div class="mb-3 flex items-baseline gap-2">
				<span class="font-mono text-4xl font-semibold">{displayScore}</span>
				<span class="text-xs text-ink/60">/ 100</span>
			</div>
			<dl class="grid grid-cols-2 gap-y-1 text-xs">
				<dt class="text-ink/60">{t.red}</dt>
				<dd class="text-right font-mono">{result.summary.redCount}</dd>
				<dt class="text-ink/60">{t.yellow}</dt>
				<dd class="text-right font-mono">{result.summary.yellowCount}</dd>
				<dt class="text-ink/60">{t.adverbs}</dt>
				<dd class="text-right font-mono">{result.summary.adverbPct}%</dd>
				<dt class="text-ink/60">{t.passive}</dt>
				<dd class="text-right font-mono">{result.summary.passiveCount}</dd>
			</dl>
			{#if rhythm}
				<div class="mt-3">
					<div class="mb-1 flex items-baseline justify-between gap-2">
						<span class="font-mono text-[10px] uppercase tracking-widest text-ink/40"
							>{t.rhythm}</span
						>
						<span class={`text-[11px] ${rhythm.monotone ? 'text-brick' : 'text-ink/60'}`}
							>{rhythm.label}</span
						>
					</div>
					<div class="relative h-1.5 rounded-full bg-ink/10">
						<div
							class={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper ${rhythm.monotone ? 'bg-brick' : 'bg-ink'}`}
							style={`left: ${rhythm.pct}%`}
						></div>
					</div>
				</div>
			{/if}
			{#if result.summary.readingGrade !== null}
				<div class="mt-3 flex items-baseline justify-between gap-2">
					<span class="font-mono text-[10px] uppercase tracking-widest text-ink/40"
						>{t.readingGrade}</span
					>
					<span class="text-[11px] text-ink/60">
						{result.summary.readingGrade} · {gradeLabel(result.summary.readingGrade)}
					</span>
				</div>
			{/if}
		</div>

		<div class="flex-1 overflow-y-auto p-3">
			{#if allGroups.length === 0}
				<p class="px-2 py-6 text-sm italic text-ink/60">{t.noFlags}</p>
			{:else}
				{#if slopGroups.length > 0}
					<button
						type="button"
						class="mb-2 flex w-full items-center justify-between gap-2 rounded px-1 py-1 hover:bg-ink/5"
						aria-expanded={slopOpen}
						onclick={() => (slopOpen = !slopOpen)}
					>
						<span class="font-mono text-[10px] uppercase tracking-widest text-ink/40"
							>{t.slopFlags}</span
						>
						<span class="flex items-center gap-2">
							<span
								class={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-paper ${slopBadgeClass}`}
							>
								{slopCount}
							</span>
							<svg
								viewBox="0 0 12 12"
								class={`size-3 text-ink/40 transition-transform duration-150 ${slopOpen ? 'rotate-180' : ''}`}
								aria-hidden="true"
							>
								<path
									d="M2 4 L6 8 L10 4"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
					</button>
					{#if slopOpen}
						<ul class="mb-4 space-y-2">
							{#each slopGroups as g, i (g.ruleId)}
								{@render groupCard(g, false, i)}
							{/each}
						</ul>
					{/if}
				{/if}

				{#if tipGroups.length > 0}
					<button
						type="button"
						class="mb-2 mt-2 flex w-full items-center justify-between gap-2 rounded px-1 py-1 hover:bg-ink/5"
						aria-expanded={tipsOpen}
						onclick={() => (tipsOpen = !tipsOpen)}
					>
						<span class="font-mono text-[10px] uppercase tracking-widest text-ink/40"
							>{t.writingTips}</span
						>
						<span class="flex items-center gap-2">
							<span
								class="rounded-full bg-ink/30 px-2 py-0.5 font-mono text-[10px] font-bold text-paper"
							>
								{tipCount}
							</span>
							<svg
								viewBox="0 0 12 12"
								class={`size-3 text-ink/40 transition-transform duration-150 ${tipsOpen ? 'rotate-180' : ''}`}
								aria-hidden="true"
							>
								<path
									d="M2 4 L6 8 L10 4"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
					</button>
					{#if tipsOpen}
						<ul class="space-y-2">
							{#each tipGroups as g, i (g.ruleId)}
								{@render groupCard(g, true, slopGroups.length + i)}
							{/each}
						</ul>
					{/if}
				{/if}
			{/if}
		</div>

		{#if result.warnings && result.warnings.length}
			<div class="border-t border-ink/10 bg-ochre/10 p-3 text-xs text-ink/70">
				{#each result.warnings as w (w)}
					<p>⚠ {w}</p>
				{/each}
			</div>
		{/if}
	</div>
{/if}
