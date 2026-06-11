import type { Provider } from '$lib/types';

export const MODELS: Record<Provider, { fast: string; strong: string }> = {
	google: {
		fast: 'gemini-3.1-flash-lite-preview',
		strong: 'gemini-3.1-flash-lite-preview'
	}
};

export const PROVIDERS: Array<{ id: Provider; label: string }> = [
	{ id: 'google', label: 'Google Gemini' }
];
