import { describe, it, expect, beforeEach } from 'vitest';
import {
	checkRequest,
	checkLLM,
	recordLLM,
	resetRateLimits
} from '../src/lib/server/rateLimit';
import { textSanity } from '../src/lib/server/guards';
import { clientIp, isCloudflare } from '../src/lib/server/clientIp';

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

describe('clientIp — visitor address behind Cloudflare', () => {
	const cf = (value: string) => new Headers({ 'cf-connecting-ip': value });

	it('uses CF-Connecting-IP when the peer is a Cloudflare edge', () => {
		expect(clientIp('172.64.80.1', cf('203.0.113.7'))).toBe('203.0.113.7');
		expect(clientIp('2606:4700:10::6816:1', cf('2001:db8::5'))).toBe('2001:db8::5');
	});

	it('keeps visitors apart when they share an edge', () => {
		expect(clientIp('172.64.80.1', cf('203.0.113.7'))).not.toBe(
			clientIp('172.64.80.1', cf('198.51.100.9'))
		);
	});

	it('ignores the header from a peer that is not Cloudflare', () => {
		expect(clientIp('192.0.2.50', cf('10.0.0.1'))).toBe('192.0.2.50');
	});

	it('falls back to the peer when the header is missing or not an address', () => {
		expect(clientIp('172.64.80.1', new Headers())).toBe('172.64.80.1');
		expect(clientIp('172.64.80.1', cf('not-an-ip'))).toBe('172.64.80.1');
	});

	it('recognises edge ranges, including IPv4-mapped addresses', () => {
		expect(isCloudflare('104.16.0.1')).toBe(true);
		expect(isCloudflare('::ffff:162.158.1.2')).toBe(true);
		expect(isCloudflare('168.119.155.158')).toBe(false);
		expect(isCloudflare('')).toBe(false);
	});
});
