import { encode } from 'gpt-tokenizer';
import { ProviderType, TokenCount, CostEstimate, ModelConfig, ConfidenceLevel, CalculationMode } from '@/types';
import { getModelById } from '@/lib/config';


/**
 * Count tokens for a given text based on provider
 * OpenAI uses tiktoken, Anthropic uses their API, others use estimation
 */
export async function countTokens(
    text: string,
    provider: ProviderType
): Promise<TokenCount> {
    switch (provider) {
        case 'openai':
            return {
                count: encode(text).length,
                method: 'tiktoken',
                provider,
            };

        case 'anthropic':
            // For client-side, we can't call Anthropic's API directly
            // Return tiktoken estimation instead (Claude's tokenizer is similar)
            return {
                count: encode(text).length,
                method: 'tiktoken',
                provider,
            };

        default:
            // Rough estimation: 1 token ≈ 4 characters, with 20% safety margin
            return {
                count: Math.ceil((text.length / 4) * 1.2),
                method: 'estimated',
                provider,
            };
    }
}

/**
 * Synchronous token counting using tiktoken (OpenAI's tokenizer)
 * Works well for OpenAI and reasonable estimates for others
 */
export function countTokensSync(text: string): number {
    return encode(text).length;
}

/**
 * Estimate cost for a prompt before sending
 * Returns a range because we can't know exact output tokens in advance
 */
export function estimateCost(
    promptText: string,
    model: ModelConfig,
    estimatedOutputTokens?: number
): CostEstimate {
    const inputTokens = countTokensSync(promptText);

    // If not provided, estimate based on typical response length
    // Use 50% of max output as a reasonable estimate
    const outputEstimate = estimatedOutputTokens ?? Math.min(
        Math.floor(model.maxOutputTokens * 0.5),
        2000 // Cap at 2000 tokens for estimation
    );

    // Calculate costs
    const inputCost = (inputTokens / 1000) * model.inputPrice;
    const minOutputCost = 0; // Minimum: model might not respond
    const maxOutputCost = (outputEstimate * 1.5 / 1000) * model.outputPrice; // +50% safety margin
    const expectedOutputCost = (outputEstimate / 1000) * model.outputPrice;

    return {
        min: inputCost + minOutputCost,
        max: inputCost + maxOutputCost,
        inputTokens,
        estimatedOutputTokens: outputEstimate,
        disclaimer: 'Estimated cost. Actual cost depends on response length and may vary.',
    };
}

/**
 * Estimate costs for multiple models at once
 */
export function estimateCostsForModels(
    promptText: string,
    modelIds: string[],
    estimatedOutputTokens?: number
): Map<string, CostEstimate> {
    const estimates = new Map<string, CostEstimate>();

    for (const modelId of modelIds) {
        const model = getModelById(modelId);
        if (model) {
            estimates.set(modelId, estimateCost(promptText, model, estimatedOutputTokens));
        }
    }

    return estimates;
}

/**
 * Calculate actual cost from usage data
 */
export function calculateActualCost(
    inputTokens: number,
    outputTokens: number,
    model: ModelConfig
): { inputCost: number; outputCost: number; totalCost: number } {
    const inputCost = (inputTokens / 1000) * model.inputPrice;
    const outputCost = (outputTokens / 1000) * model.outputPrice;

    return {
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
    };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
    if (cost === 0) return 'FREE';
    if (cost < 0.0001) return `<$0.0001`;
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    if (cost < 100) return `$${cost.toFixed(2)}`;
    return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


/**
 * Format token count for display
 */
export function formatTokens(count: number): string {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(2)}M`;
}

/**
 * Calculate confidence level based on estimation parameters
 */
export function calculateConfidence(
    mode: CalculationMode,
    hasUserEstimate: boolean,
    isReasoningModel: boolean
): ConfidenceLevel {
    // Sample mode = always high (real data)
    if (mode === "sample") return "high";

    // Reasoning models = always low in estimate mode
    if (isReasoningModel) return "low";

    // User provided estimate = medium
    if (hasUserEstimate) return "medium";

    // Default estimate = low
    return "low";
}

/**
 * Generate warnings based on estimation context
 */
export function generateWarnings(
    mode: CalculationMode,
    hasUserEstimate: boolean,
    isReasoningModel: boolean,
    inputTokens: number
): string[] {
    const warnings: string[] = [];

    if (mode === "estimate") {
        warnings.push("This is a rough estimate. Actual cost may vary 2-3×.");
    }

    if (isReasoningModel && mode === "estimate") {
        warnings.push("Reasoning tokens highly variable. Cannot estimate without API call.");
    }

    if (!hasUserEstimate && mode === "estimate") {
        warnings.push("Output tokens estimated at 50% of max. Adjust for accuracy.");
    }

    if (inputTokens > 4000) {
        warnings.push("Prompt exceeds 4000 tokens. Consider summarizing.");
    }

    return warnings;
}
