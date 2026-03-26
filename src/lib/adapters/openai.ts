import { NormalizedUsage } from './types';

// Chat Completions API usage shape
interface OpenAIChatUsage {
    prompt_tokens: number;
    completion_tokens: number;
    prompt_tokens_details?: {
        cached_tokens?: number;
    };
    completion_tokens_details?: {
        reasoning_tokens?: number;
    };
}

// Responses API usage shape
interface OpenAIResponsesUsage {
    input_tokens: number;
    output_tokens: number;
    input_tokens_details?: {
        cached_tokens?: number;
    };
    output_tokens_details?: {
        reasoning_tokens?: number;
    };
}

export function normalizeOpenAIChat(
    usage: OpenAIChatUsage,
    latencyMs?: number,
    firstTokenMs?: number
): NormalizedUsage {
    return {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cachedInputTokens: usage.prompt_tokens_details?.cached_tokens,
        reasoningTokens: usage.completion_tokens_details?.reasoning_tokens,
        latencyMs,
        firstTokenMs,
    };
}

export function normalizeOpenAIResponses(
    usage: OpenAIResponsesUsage,
    latencyMs?: number,
    firstTokenMs?: number
): NormalizedUsage {
    return {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cachedInputTokens: usage.input_tokens_details?.cached_tokens,
        reasoningTokens: usage.output_tokens_details?.reasoning_tokens,
        latencyMs,
        firstTokenMs,
    };
}
