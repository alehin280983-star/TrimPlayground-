import { NormalizedUsage } from './types';

interface GoogleUsageMetadata {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
    totalTokenCount?: number;
}

export function normalizeGoogle(
    usageMetadata: GoogleUsageMetadata,
    latencyMs?: number,
    firstTokenMs?: number
): NormalizedUsage {
    return {
        inputTokens: usageMetadata.promptTokenCount ?? 0,
        outputTokens: usageMetadata.candidatesTokenCount ?? 0,
        cachedInputTokens: usageMetadata.cachedContentTokenCount,
        // Google does not expose reasoning tokens separately
        latencyMs,
        firstTokenMs,
    };
}
