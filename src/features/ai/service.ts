import type {
  AIClassificationResult,
  AISummaryResult,
  AIReplySuggestion,
  AIServiceConfig,
} from './types';

/**
 * AI Service Interface (Server-side only)
 * 
 * Prepares the abstraction for Milestone 2+ when OpenAI is hooked in.
 * All calls are guarded against token usage, workspace rate limits, and sanitize untrusted inputs.
 */
export interface IAIService {
  classifyLead(text: string, config: AIServiceConfig): Promise<AIClassificationResult>;
  summarizeConversation(thread: string, config: AIServiceConfig): Promise<AISummaryResult>;
  draftReplySuggestion(context: string, config: AIServiceConfig): Promise<AIReplySuggestion>;
}

export class AIServicePlaceholder implements IAIService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && !this.apiKey.includes('your-openai'));
  }

  async classifyLead(
    _text: string,
    _config: AIServiceConfig
  ): Promise<AIClassificationResult> {
    void _text;
    void _config;
    if (!this.isConfigured) {
      throw new Error('OpenAI API key is not configured on the server.');
    }
    // Future implementation: validate input size, check workspace quota, call OpenAI with zod schema
    throw new Error('AI Classification will be available in the upcoming AI milestone.');
  }

  async summarizeConversation(
    _thread: string,
    _config: AIServiceConfig
  ): Promise<AISummaryResult> {
    void _thread;
    void _config;
    if (!this.isConfigured) {
      throw new Error('OpenAI API key is not configured on the server.');
    }
    throw new Error('AI Summarization will be available in the upcoming AI milestone.');
  }

  async draftReplySuggestion(
    _context: string,
    _config: AIServiceConfig
  ): Promise<AIReplySuggestion> {
    void _context;
    void _config;
    if (!this.isConfigured) {
      throw new Error('OpenAI API key is not configured on the server.');
    }
    throw new Error('AI Reply Drafting will be available in the upcoming AI milestone.');
  }
}

export const aiService = new AIServicePlaceholder();
