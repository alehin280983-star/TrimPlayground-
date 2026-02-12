import { encode } from 'gpt-tokenizer';
import { ModelConfig } from '@/types';

/**
 * Count tokens in a text string (synchronous)
 */
export function countTokensSync(text: string): number {
    try {
        return encode(text).length;
    } catch {
        // Fallback: rough estimate if tokenizer fails
        // Average: ~4 characters per token for English
        return Math.ceil(text.length / 4);
    }
}

/**
 * Estimate cost for a prompt and expected output
 */
export function estimateCost(
    inputTokens: number,
    outputTokens: number,
    model: ModelConfig
): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
} {
    const inputCost = (inputTokens / 1000) * model.inputPrice;
    const outputCost = (outputTokens / 1000) * model.outputPrice;

    return {
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
    };
}

/**
 * Format cost as a string with appropriate precision
 */
export function formatCost(cost: number): string {
    if (cost === 0) return '$0.00';
    if (cost < 0.0001) return '<$0.0001';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    if (cost < 100) return `$${cost.toFixed(2)}`;
    return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format token count with thousands separator
 */
export function formatTokens(tokens: number): string {
    return tokens.toLocaleString('en-US');
}

/**
 * Calculate confidence level for estimate
 */
export function calculateConfidence(
    mode: 'estimate' | 'sample',
    hasExpectedOutput: boolean,
    isReasoningModel: boolean
): 'low' | 'medium' | 'high' {
    if (mode === 'sample') {
        return 'high';
    }

    // Estimate mode
    if (isReasoningModel) {
        return 'low'; // Reasoning models are unpredictable
    }

    if (hasExpectedOutput) {
        return 'high'; // User provided expected output
    }

    return 'medium'; // Default estimate
}

/**
 * Generate warnings based on estimate parameters
 */
export function generateWarnings(
    mode: 'estimate' | 'sample',
    hasExpectedOutput: boolean,
    isReasoningModel: boolean,
    inputTokens: number
): string[] {
    const warnings: string[] = [];

    if (mode === 'estimate') {
        if (isReasoningModel) {
            warnings.push(
                'Reasoning models (o1/o3/o4 series) use variable output tokens. Actual cost may vary significantly.'
            );
        }

        if (!hasExpectedOutput) {
            warnings.push(
                'Output token count is estimated. Use "Expected Output Tokens" for better accuracy.'
            );
        }

        if (inputTokens > 50000) {
            warnings.push(
                'Large prompt detected. Context window costs may be higher than estimated.'
            );
        }
    }

    return warnings;
}

/**
 * Estimate output tokens based on prompt
 */
export function estimateOutputTokens(promptTokens: number, maxOutput: number): number {
    // Simple heuristic: output is usually 30-70% of input for conversational tasks
    const estimated = Math.floor(promptTokens * 0.5);

    // Cap at max output tokens and reasonable limits
    return Math.min(estimated, maxOutput, 2000);
}

/**
 * Check if a model supports prompt caching
 */
export function supportsCaching(model: ModelConfig): boolean {
    return model.cachedInputPrice !== undefined && model.cachedInputPrice > 0;
}

/**
 * Calculate cost with caching
 */
export function estimateCostWithCaching(
    inputTokens: number,
    cachedTokens: number,
    outputTokens: number,
    model: ModelConfig
): {
    inputCost: number;
    cachedCost: number;
    outputCost: number;
    totalCost: number;
    savings: number;
} {
    const regularInputTokens = inputTokens - cachedTokens;

    const inputCost = (regularInputTokens / 1000) * model.inputPrice;
    const cachedCost = (cachedTokens / 1000) * (model.cachedInputPrice || model.inputPrice);
    const outputCost = (outputTokens / 1000) * model.outputPrice;

    const totalCost = inputCost + cachedCost + outputCost;
    const costWithoutCaching = (inputTokens / 1000) * model.inputPrice + outputCost;
    const savings = costWithoutCaching - totalCost;

    return {
        inputCost,
        cachedCost,
        outputCost,
        totalCost,
        savings,
    };
}
