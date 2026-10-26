import { z } from 'zod';

export const aiClassificationResultSchema = z.object({
  category: z.enum(['high_intent', 'medium_intent', 'low_intent', 'spam']),
  confidence: z.number().min(0).max(1),
  recommendedService: z.string(),
  reasoning: z.string(),
  suggestedTags: z.array(z.string()),
});

export type AIClassificationResult = z.infer<typeof aiClassificationResultSchema>;

export const aiSummaryResultSchema = z.object({
  keyPoints: z.array(z.string()),
  clientNeeds: z.string(),
  budgetIndicator: z.string().optional(),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']),
  nextRecommendedAction: z.string(),
});

export type AISummaryResult = z.infer<typeof aiSummaryResultSchema>;

export const aiReplySuggestionSchema = z.object({
  subject: z.string(),
  body: z.string(),
  callToAction: z.string(),
  tone: z.enum(['professional', 'friendly', 'consultative', 'urgent']),
});

export type AIReplySuggestion = z.infer<typeof aiReplySuggestionSchema>;

export interface AIServiceConfig {
  workspaceId: string;
  userId: string;
  maxTokens?: number;
}
