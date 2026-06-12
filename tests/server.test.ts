import { describe, it, expect, beforeEach } from 'vitest';
import {
	checkRequest,
	checkLLM,
	recordLLM,
	resetRateLimits
} from '../src/lib/server/rateLimit';
import { textSanity } from '../src/lib/server/guards';

const T0 = 1_700_000_000_000;

beforeEach(() => resetRateLimits());

describe('rateLimit — request gate', () => {
	it('allows 20 requests per minute, blocks the 21st with a retry-after', () => {
		for (let i = 0; i < 20; i++) {
			expect(checkRequest('1.2.3.4', T0 + i * 100).ok).toBe(true);
		}
		const blocked = checkRequest('1.2.3.4', T0 + 2100);
		expect(blocked.ok).toBe(false);
		expect(blocked.retryAfterSec).toBeGreaterThan(0);
	});

	it('recovers once the window slides past', () => {
		for (let i = 0; i < 20; i++) checkRequest('1.2.3.4', T0 + i * 100);
		expect(checkRequest('1.2.3.4', T0 + 61_000).ok).toBe(true);
	});

	it('tracks IPs independently', () => {
		for (let i = 0; i < 20; i++) checkRequest('1.2.3.4', T0 + i * 100);
		expect(checkRequest('5.6.7.8', T0 + 2100).ok).toBe(true);
	});
});

describe('rateLimit — LLM gate', () => {
	it('allows 10 LLM passes per hour, then refuses', () => {
		for (let i = 0; i < 10; i++) {
			expect(checkLLM('1.2.3.4', T0 + i * 1000)).toBe(true);
			recordLLM('1.2.3.4', T0 + i * 1000);
		}
		expect(checkLLM('1.2.3.4', T0 + 11_000)).toBe(false);
	});

	it('hourly window recovers, daily cap still applies', () => {
		for (let i = 0; i < 10; i++) recordLLM('1.2.3.4', T0 + i * 1000);
		// an hour later the hourly window is clear again
		expect(checkLLM('1.2.3.4', T0 + 3_700_000)).toBe(true);
		// pile up to the daily cap (40 total)
		for (let i = 10; i < 40; i++) recordLLM('1.2.3.4', T0 + 3_700_000 + i * 1000);
		expect(checkLLM('1.2.3.4', T0 + 7_500_000)).toBe(false);
		// next day it resets
		expect(checkLLM('1.2.3.4', T0 + 90_000_000)).toBe(true);
	});
});

describe('guards — textSanity', () => {
	const filler =
		'The river ran past the old mill and turned the wheel slowly in the morning light. ';

	it('accepts normal English prose', () => {
		expect(textSanity(filler.repeat(4))).toBeNull();
	});

	it('accepts normal Spanish prose with accents', () => {
		expect(
			textSanity(
				'El viaje duró tres días en tren y dormimos en pueblos chicos cerca de la estación. '.repeat(
					3
				)
			)
		).toBeNull();
	});

	it('rejects oversized text', () => {
		expect(textSanity('word '.repeat(4000))).toMatch(/too large/i);
	});

	it('rejects repeated-word spam', () => {
		expect(textSanity('spam '.repeat(80))).toMatch(/repeated/i);
	});

	it('rejects base64-like blobs', () => {
		const blob = Array.from({ length: 60 }, (_, i) => `aGVsbG8gd29ybGQ${i}ISEhIQzzzZm9vYmFy`).join(
			' '
		);
		expect(textSanity(blob)).toMatch(/natural prose/i);
	});

	it('rejects symbol soup', () => {
		expect(textSanity('{}[]();;== 0x1f 0x2e ::: ##### $$$ %%% ((( ))) '.repeat(10))).toMatch(
			/natural prose/i
		);
	});
});
