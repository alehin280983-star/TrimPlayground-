import { ModelConfig } from '@/types';
import { WorkflowTemplate, WorkflowEstimate, WorkflowStepEstimate } from './types';
import { recommendFromEstimate } from './recommendations';

interface EstimatorInputs {
    inputTokensPerCall: number;
    outputTokensPerCall: number;
    tasksPerMonth: number;
}

function stepCost(
    model: ModelConfig,
    inputTokens: number,
    outputTokens: number,
    cachedShare: number
): number {
    const cachedInputPrice = model.cachedInputPrice ?? model.inputPrice;
    const uncachedTokens = Math.floor(inputTokens * (1 - cachedShare));
    const cachedTokens = inputTokens - uncachedTokens;

    const inputCost =
        (uncachedTokens / 1000) * model.inputPrice +
        (cachedTokens / 1000) * cachedInputPrice;
    const outputCost = (outputTokens / 1000) * model.outputPrice;
    return inputCost + outputCost;
}

export function estimateWorkflow(
    template: WorkflowTemplate,
    model: ModelConfig,
    inputs: EstimatorInputs
): WorkflowEstimate {
    const stepBreakdown: WorkflowStepEstimate[] = [];
    let baseCostPerTask = 0;

    for (const step of template.steps) {
        const inputTokens = Math.round(inputs.inputTokensPerCall * step.inputFraction);
        const outputTokens = Math.round(inputs.outputTokensPerCall * step.outputFraction);
        const cacheHit = step.cacheHitRate ?? 0;

        const costPerCall = stepCost(model, inputTokens, outputTokens, cacheHit);
        const costForStep = costPerCall * step.callsMultiplier;

        stepBreakdown.push({
            agentId: step.agentId,
            role: step.role,
            inputTokens: Math.round(inputTokens * step.callsMultiplier),
            outputTokens: Math.round(outputTokens * step.callsMultiplier),
            costUsd: costForStep,
        });

        baseCostPerTask += costForStep;
    }

    const retryCostUsd = baseCostPerTask * template.retryRate;
    const coordinationCostUsd = baseCostPerTask * template.coordinationOverheadRate;
    const hitlCostUsd = template.humanReviewRate * template.humanReviewCostUsd;

    const totalCostPerTask = baseCostPerTask + retryCostUsd + coordinationCostUsd + hitlCostUsd;
    const totalCostPerMonth = totalCostPerTask * inputs.tasksPerMonth;

    const efficiencyScore = totalCostPerTask > 0
        ? template.successRate / totalCostPerTask
        : 0;

    const estimate: WorkflowEstimate = {
        templateId: template.id,
        templateName: template.name,
        architecturePattern: template.architecturePattern,
        confidence: 'Estimated',
        stepBreakdown,
        baseCostPerTask,
        overheadBreakdown: {
            retryCostUsd,
            coordinationCostUsd,
            hitlCostUsd,
        },
        totalCostPerTask,
        totalCostPerMonth,
        successRate: template.successRate,
        efficiencyScore,
        recommendation: null,
    };

    estimate.recommendation = recommendFromEstimate(estimate);
    return estimate;
}
