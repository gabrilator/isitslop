// Thin wrapper over the Umami tracker. No-op when Umami isn't loaded
// (no website id configured, SSR, or an ad-blocker), so callers never guard.

type UmamiData = Record<string, string | number | boolean | undefined>;

interface UmamiWindow {
	umami?: { track: (event: string, data?: UmamiData) => void };
}

export function track(event: string, data?: UmamiData): void {
	if (typeof window === 'undefined') return;
	(window as UmamiWindow).umami?.track(event, data);
}
