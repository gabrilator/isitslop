import type { Flag } from './types';

const ESCAPE_MAP: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

export function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

export function renderFlaggedHtml(text: string, flags: Flag[]): string {
	if (!flags.length) return escapeHtml(text);
	const sorted = [...flags].sort((a, b) => a.startIndex - b.startIndex);
	const used: Flag[] = [];
	let cursor = 0;
	for (const f of sorted) {
		if (f.startIndex < cursor) continue;
		used.push(f);
		cursor = f.endIndex;
	}
	let out = '';
	let pos = 0;
	for (const [i, f] of used.entries()) {
		if (f.startIndex > pos) out += escapeHtml(text.slice(pos, f.startIndex));
		const id = `${f.ruleId}-${f.startIndex}-${f.endIndex}`;
		const intensity = Math.min(f.instance ?? 1, 3);
		const delay = Math.min(i * 45, 1100);
		out += `<mark class="flag ${f.severity}" data-flag-id="${id}" data-intensity="${intensity}" style="animation-delay:${delay}ms">${escapeHtml(
			text.slice(f.startIndex, f.endIndex)
		)}</mark>`;
		pos = f.endIndex;
	}
	if (pos < text.length) out += escapeHtml(text.slice(pos));
	return out;
}

export function flagId(f: Flag): string {
	return `${f.ruleId}-${f.startIndex}-${f.endIndex}`;
}
