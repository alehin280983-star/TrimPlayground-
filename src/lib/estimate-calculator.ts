import { PriceEstimateV2, PriceRange, OutputInputRatio, PriorityMode, ModelConfig } from '@/types';
import { formatCost, formatTokens } from '@/lib/tokens';

export interface EnrichedEstimate extends PriceEstimateV2 {
    monthlyCost: PriceRange;
    modelConfig: ModelConfig;
    formulaSteps: string[];
    supportsCaching: boolean;
    supportsBatch: boolean;
}

interface RecomputeOptions {
    outputInputRatio: OutputInputRatio;
    customRatio?: number;
    cachingEnabled: boolean;
    cacheHitRate: number;       // 0-100
    batchEnabled: boolean;
    requestsPerMonth: number;
}

function getRatioMultiplier(ratio: OutputInputRatio, customRatio?: number): number {
    switch (ratio) {
        case '1:1': return 1;
        case '1:2': return 2;
        case '1:4': return 4;
        case 'custom': return customRatio ?? 2;
    }
}

export function recomputeEstimate(
    base: PriceEstimateV2,
    model: ModelConfig,
    opts: RecomputeOptions
): EnrichedEstimate {
    const inputTokens = base.breakdown.input.tokens;
    const multiplier = getRatioMultiplier(opts.outputInputRatio, opts.customRatio);
    const outputTokens = Math.round(inputTokens * multiplier);

    const outputRange: PriceRange = {
        min: Math.floor(outputTokens * 0.5),
        median: outputTokens,
        max: Math.ceil(outputTokens * 1.5),
    };

    // Input cost (with optional caching)
    let inputCost: number;
    const formulaSteps: string[] = [];
    const supportsCaching = !!model.cachedInputPrice;
    const supportsBatch = !!model.batchDiscount;

    if (opts.cachingEnabled && supportsCaching) {
        const hitRate = opts.cacheHitRate / 100;
        const cachedCost = (inputTokens * hitRate / 1000) * model.cachedInputPrice!;
        const uncachedCost = (inputTokens * (1 - hitRate) / 1000) * model.inputPrice;
        inputCost = cachedCost + uncachedCost;
        formulaSteps.push(
            `Input (cached ${opts.cacheHitRate}%): ${formatTokens(inputTokens)} tokens × ${hitRate * 100}% × $${model.cachedInputPrice!}/1K = ${formatCost(cachedCost)}`,
            `Input (uncached ${100 - opts.cacheHitRate}%): ${formatTokens(inputTokens)} tokens × ${(1 - hitRate) * 100}% × $${model.inputPrice}/1K = ${formatCost(uncachedCost)}`
        );
    } else {
        inputCost = (inputTokens / 1000) * model.inputPrice;
        formulaSteps.push(
            `Input: ${formatTokens(inputTokens)} tokens × $${model.inputPrice}/1K = ${formatCost(inputCost)}`
        );
    }

    // Output cost range
    const outputCostRange: PriceRange = {
        min: (outputRange.min / 1000) * model.outputPrice,
        median: (outputRange.median / 1000) * model.outputPrice,
        max: (outputRange.max / 1000) * model.outputPrice,
    };

    formulaSteps.push(
        `Output: ${formatTokens(outputTokens)} tokens × $${model.outputPrice}/1K = ${formatCost(outputCostRange.median)}`
    );

    // Per-request total
    const perRequest: PriceRange = {
        min: inputCost + outputCostRange.min,
        median: inputCost + outputCostRange.median,
        max: inputCost + outputCostRange.max,
    };

    formulaSteps.push(
        `Per request: ${formatCost(inputCost)} + ${formatCost(outputCostRange.median)} = ${formatCost(perRequest.median)}`
    );

    // Monthly cost
    let monthlyCost: PriceRange = {
        min: perRequest.min * opts.requestsPerMonth,
        median: perRequest.median * opts.requestsPerMonth,
        max: perRequest.max * opts.requestsPerMonth,
    };

    formulaSteps.push(
        `Monthly: ${opts.requestsPerMonth.toLocaleString()} requests × ${formatCost(perRequest.median)} = ${formatCost(monthlyCost.median)}`
    );

    // Batch discount
    if (opts.batchEnabled && supportsBatch) {
        const discount = model.batchDiscount!;
        monthlyCost = {
            min: monthlyCost.min * (1 - discount),
            median: monthlyCost.median * (1 - discount),
            max: monthlyCost.max * (1 - discount),
        };
        formulaSteps.push(
            `Batch API (${discount * 100}% off): ${formatCost(monthlyCost.median)}/mo`
        );
    }

    return {
        ...base,
        breakdown: {
            ...base.breakdown,
            input: { tokens: inputTokens, cost: inputCost },
            output: { tokens: outputRange, cost: outputCostRange },
        },
        total: perRequest,
        monthlyCost,
        modelConfig: model,
        formulaSteps,
        supportsCaching,
        supportsBatch,
    };
}

export function sortEstimates(
    estimates: EnrichedEstimate[],
    priority: PriorityMode
): EnrichedEstimate[] {
    const sorted = [...estimates];

    switch (priority) {
        case 'cost':
            sorted.sort((a, b) => a.monthlyCost.median - b.monthlyCost.median);
            break;
        case 'balanced': {
            const maxCost = Math.max(...sorted.map(e => e.monthlyCost.median), 1);
            sorted.sort((a, b) => {
                const scoreA = (a.monthlyCost.median / maxCost) * 0.6 + ((5 - a.modelConfig.speedRating) / 4) * 0.4;
                const scoreB = (b.monthlyCost.median / maxCost) * 0.6 + ((5 - b.modelConfig.speedRating) / 4) * 0.4;
                return scoreA - scoreB;
            });
            break;
        }
        case 'quality':
            sorted.sort((a, b) => {
                if (b.modelConfig.qualityRating !== a.modelConfig.qualityRating) {
                    return b.modelConfig.qualityRating - a.modelConfig.qualityRating;
                }
                return a.monthlyCost.median - b.monthlyCost.median;
            });
            break;
    }

    return sorted;
}

export function findCheapest(estimates: EnrichedEstimate[]): string {
    if (estimates.length === 0) return '';
    let cheapest = estimates[0];
    for (const est of estimates) {
        if (est.monthlyCost.median < cheapest.monthlyCost.median) {
            cheapest = est;
        }
    }
    return cheapest.modelId;
}
