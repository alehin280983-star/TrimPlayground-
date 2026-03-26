import { NormalizedUsage } from './types';

interface AnthropicUsage {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
}

// Extended thinking blocks contribute to output but are billed separately in some configs.
// thinking_tokens is not a standard field yet — captured via content block counting if needed.
export function normalizeAnthropic(
    usage: AnthropicUsage,
    latencyMs?: number,
    firstTokenMs?: number
): NormalizedUsage {
    return {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cachedInputTokens: usage.cache_read_input_tokens,
        latencyMs,
        firstTokenMs,
    };
}
