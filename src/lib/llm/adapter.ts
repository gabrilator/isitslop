import type { ZodTypeAny, infer as zInfer } from 'zod';

export interface AnalyzeParams<T extends ZodTypeAny> {
	model: string;
	systemPrompt: string;
	userText: string;
	jsonSchema: T;
	apiKey: string;
}

export interface LLMAdapter {
	analyze<T extends ZodTypeAny>(params: AnalyzeParams<T>): Promise<zInfer<T>>;
}
