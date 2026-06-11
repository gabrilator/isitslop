import { GoogleGenAI } from '@google/genai';
import type { LLMAdapter, AnalyzeParams } from './adapter';
import { GEMINI_FLAGS_SCHEMA } from './schema';
import type { ZodTypeAny, infer as zInfer } from 'zod';

export const geminiAdapter: LLMAdapter = {
	async analyze<T extends ZodTypeAny>(params: AnalyzeParams<T>): Promise<zInfer<T>> {
		const ai = new GoogleGenAI({ apiKey: params.apiKey });
		const response = await ai.models.generateContent({
			model: params.model,
			contents: params.userText,
			config: {
				systemInstruction: params.systemPrompt,
				responseMimeType: 'application/json',
				responseSchema: GEMINI_FLAGS_SCHEMA,
				temperature: 0.1
			}
		});
		const text = response.text;
		if (!text) throw new Error('Gemini returned empty response');
		const parsed = JSON.parse(text);
		return params.jsonSchema.parse(parsed);
	}
};
