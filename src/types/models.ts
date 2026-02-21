// Type definitions for AI providers and models

export type TierType = 'free' | 'pro';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderType;
  inputPrice: number;      // Per 1K tokens in USD
  outputPrice: number;     // Per 1K tokens in USD
  cachedInputPrice?: number; // Per 1K tokens in USD (Context Caching)
  pricePerSecond?: number;   // For video/audio models
  maxTokens: number;
  maxOutputTokens: number;
  freeTierAvailable: boolean;
  description: string;
  priceUpdatedAt: string;          // ISO date, e.g. '2026-02-20'
  priceSourceUrl?: string;         // Official pricing page URL
  speedRating: 1 | 2 | 3 | 4 | 5; // 1=slowest, 5=fastest
  qualityRating: 1 | 2 | 3 | 4 | 5;
  modality?: 'text' | 'image' | 'video' | 'audio' | 'embedding'; // Default: 'text'
  apiEndpoint?: 'chat' | 'responses' | 'completions' | 'images' | 'video'; // For OpenAI: which endpoint to use
  batchDiscount?: number; // 0-1, e.g. 0.5 = 50% off (OpenAI, Anthropic Batch API)
  pricingTiers?: {
    range: string;
    inputPrice: number;
    outputPrice: number;
  }[];
}

export type ProviderType = 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | 'deepseek' | 'xai' | 'alibaba' | 'moonshot' | 'zhipu';

export interface ProviderConfig {
  id: ProviderType;
  name: string;
  logo: string;
  models: ModelConfig[];
  streamSupported: boolean;
  tokenCountingSupported: boolean;
}

export interface CompletionRequest {
  prompt: string;
  model: string;
  provider: ProviderType;
  maxTokens?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  provider: ProviderType;
  model: string;
  content: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    durationSeconds?: number;
    status?: 'pending' | 'completed' | 'failed';
    requestId?: string;
  };
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;      // USD
  outputCost: number;     // USD
  totalCost: number;      // USD
  durationMs: number;
  finishReason: 'complete' | 'length' | 'stopped' | 'error';
}

export interface ComparisonResult {
  id: string;
  requestId: string;
  prompt: string;
  responses: Array<CompletionResponse | CompletionError>;
  totalCost: number;
  createdAt: Date;
}

export interface CompletionError {
  provider: ProviderType;
  model: string;
  error: {
    type: 'timeout' | 'rate_limit' | 'authentication' | 'server_error' | 'invalid_request';
    message: string;
    retryAfter?: number; // Seconds
  };
}

export interface CostEstimate {
  min: number;           // Minimum cost based on input tokens only
  max: number;           // Maximum cost (+50% safety margin for output)
  inputTokens: number;
  estimatedOutputTokens: number;
  disclaimer: string;
}

export interface TokenCount {
  count: number;
  method: 'tiktoken' | 'anthropic' | 'estimated';
  provider: ProviderType;
}

// Rate limiting types
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

// User types
export interface UserProfile {
  id: string;
  tier: TierType;
  creditsBalance: number;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'purchase' | 'spend' | 'refund';
  amount: number;        // In credits
  apiCost?: number;      // Actual API cost in USD
  modelUsed?: string;
  tokensUsed?: number;
  description?: string;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Cost projection types
export interface CostProjection {
  daily: number;
  monthly: number;
  annual: number;
}

export interface ProjectionInput {
  avgPromptTokens: number;
  avgResponseTokens: number;
  requestsPerDay: number;
  selectedModels: string[];
}

export interface ProjectionResult {
  model: string;
  provider: ProviderType;
  projections: CostProjection;
}
