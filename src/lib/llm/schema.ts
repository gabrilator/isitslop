import { z } from 'zod';
import { Type } from '@google/genai';

export const LLMFlagSchema = z.object({
	ruleId: z.string().min(1).max(64),
	severity: z.enum(['red', 'yellow']),
	startIndex: z.number().int().min(0),
	endIndex: z.number().int().min(0),
	excerpt: z.string().min(1).max(400),
	explanation: z.string().min(1).max(140),
	suggestion: z.string().max(280).optional()
});

export const LLMFlagsResponseSchema = z.object({
	flags: z.array(LLMFlagSchema).max(40)
});

export type LLMFlag = z.infer<typeof LLMFlagSchema>;
export type LLMFlagsResponse = z.infer<typeof LLMFlagsResponseSchema>;

export const GEMINI_FLAGS_SCHEMA = {
	type: Type.OBJECT,
	properties: {
		flags: {
			type: Type.ARRAY,
			items: {
				type: Type.OBJECT,
				properties: {
					ruleId: { type: Type.STRING },
					severity: { type: Type.STRING, enum: ['red', 'yellow'] },
					startIndex: { type: Type.INTEGER },
					endIndex: { type: Type.INTEGER },
					excerpt: { type: Type.STRING },
					explanation: { type: Type.STRING },
					suggestion: { type: Type.STRING }
				},
				required: ['ruleId', 'severity', 'startIndex', 'endIndex', 'excerpt', 'explanation']
			}
		}
	},
	required: ['flags']
};
