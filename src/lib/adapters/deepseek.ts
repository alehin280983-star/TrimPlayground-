import { NormalizedUsage } from './types';

interface DeepSeekUsage {
    prompt_tokens: number;
    completion_tokens: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
}

export function normalizeDeepSeek(
    usage: DeepSeekUsage,
    latencyMs?: number,
    firstTokenMs?: number
): NormalizedUsage {
    return {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cachedInputTokens: usage.prompt_cache_hit_tokens,
        // DeepSeek does not expose reasoning tokens in usage object
        latencyMs,
        firstTokenMs,
    };
}
