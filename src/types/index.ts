export * from './models';
import type { ProviderType } from './models';


// ============================================
// NEW TYPES FOR SPEC v2.0
// ============================================

export type CalculationMode = "estimate" | "sample";
export type ConfidenceLevel = "low" | "medium" | "high";
export type OutputInputRatio = '1:1' | '1:2' | '1:4' | 'custom';
export type PriorityMode = 'cost' | 'balanced' | 'quality';

export interface PriceRange {
    min: number;
    median: number;
    max: number;
}

export interface TokenBreakdown {
    input: {
        tokens: number;
        cost: number;
    };
    output: {
        tokens: number | PriceRange;
        cost: number | PriceRange;
    };
    reasoning?: {
        tokens: PriceRange;
        cost: PriceRange;
        warning: string;
    };
}

export interface PriceEstimateV2 {
    modelId: string;
    modelName: string;
    provider: ProviderType;
    mode: CalculationMode;
    breakdown: TokenBreakdown;
    total: PriceRange;
    confidence: ConfidenceLevel;
    warnings: string[];
    calculatedAt: string;
}

export interface SampleResultV2 extends PriceEstimateV2 {
    actualUsage: {
        inputTokens: number;
        outputTokens: number;
        reasoningTokens?: number;
    };
    actualCost: number;
    responsePreview: string;
    media?: {
        type: 'image' | 'video';
        url: string;
        durationSeconds?: number;
        status?: 'pending' | 'completed' | 'failed';
        requestId?: string;
    };
    latencyMs: number;
}

// Legacy types for backward compatibility with ResponseCard
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
    inputCost: number;
    outputCost: number;
    totalCost: number;
    durationMs: number;
    finishReason: 'complete' | 'length' | 'stopped' | 'error';
}

export interface CompletionError {
    provider: ProviderType;
    model: string;
    error: {
        type: 'timeout' | 'rate_limit' | 'authentication' | 'invalid_request' | 'server_error';
        message: string;
        retryAfter?: number;
    };
}

// Request/Response types
export interface CompletionRequest {
    prompt: string;
    model: string;
    provider: ProviderType;
    maxTokens?: number;
    temperature?: number;
}
