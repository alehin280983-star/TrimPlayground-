export interface NormalizedUsage {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
    reasoningTokens?: number;
    toolTokens?: number;
    toolCostUsd?: number;
    latencyMs?: number;
    firstTokenMs?: number;
}
