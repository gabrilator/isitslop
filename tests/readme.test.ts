import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanDeterministic } from '../src/lib/scanners/deterministic';
import { isWritingTip } from '../src/lib/scanners/merge';

// The landing page must pass its own product. Writing tips (adverbs, passive,
// long sentences) are allowed; slop rules are not.
describe('README practices what it preaches', () => {
	it('scans clean: zero slop flags in README.md', () => {
		const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf8');
		const { flags } = scanDeterministic(readme, 'en');
		const slop = flags.filter((f) => !isWritingTip(f.ruleId));
		expect(slop.map((f) => `${f.ruleId}: "${f.excerpt}"`)).toEqual([]);
	});
});
