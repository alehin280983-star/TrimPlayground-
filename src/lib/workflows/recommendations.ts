import { WorkflowEstimate, Recommendation } from './types';
import { StepRunResult } from './runner';

// Virtual estimate recommendations — based on template parameters
export function recommendFromEstimate(estimate: WorkflowEstimate): Recommendation | null {
    const { overheadBreakdown, baseCostPerTask, successRate, architecturePattern } = estimate;

    // High retry waste: retry cost > 20% of base
    if (baseCostPerTask > 0 && overheadBreakdown.retryCostUsd / baseCostPerTask > 0.2) {
        return {
            flag: 'high_retry_waste',
            detail: `Retry overhead is ${Math.round((overheadBreakdown.retryCostUsd / baseCostPerTask) * 100)}% of base cost`,
            alternative: 'Add an input validation step or switch to pipeline pattern with reviewer',
        };
    }

    // Low success rate
    if (successRate < 0.85) {
        return {
            flag: 'low_success_rate',
            detail: `Expected success rate is ${Math.round(successRate * 100)}% — below 85% threshold`,
            alternative: 'Add a reviewer step or use a stronger model for the executor role',
        };
    }

    // Parallel is overkill: success rate < 95% doesn't justify 3x cost
    if (architecturePattern === 'parallel' && successRate < 0.95) {
        return {
            flag: 'parallel_unjustified',
            detail: `Parallel ensemble costs ~3x but success rate is only ${Math.round(successRate * 100)}%`,
            alternative: 'Use pipeline pattern — similar quality at significantly lower cost',
        };
    }

    // High HITL rate
    if (overheadBreakdown.hitlCostUsd > baseCostPerTask * 0.15) {
        return {
            flag: 'high_hitl_cost',
            detail: 'Human review overhead exceeds 15% of compute cost',
            alternative: 'Add auto-validation step (schema check or assertion) to reduce review rate',
        };
    }

    return null;
}

// Live run recommendations — based on actual step results
export function recommendFromLiveRun(steps: StepRunResult[], e2eMs: number): Recommendation | null {
    const totalCost = steps.reduce((s, r) => s + r.costUsd, 0);
    const retries = steps.reduce((s, r) => s + r.retryCount, 0);
    const failedSteps = steps.filter(s => !s.success);

    if (failedSteps.length > 0) {
        return {
            flag: 'step_failure',
            detail: `${failedSteps.length} step(s) failed: ${failedSteps.map(s => s.role).join(', ')}`,
            alternative: 'Add error handling and fallback model for failing steps',
        };
    }

    if (retries > 0) {
        const retryCostEstimate = (retries / steps.length) * totalCost;
        return {
            flag: 'high_retry_waste',
            detail: `${retries} retries detected across ${steps.length} steps (~${Math.round((retryCostEstimate / totalCost) * 100)}% overhead)`,
            alternative: 'Improve prompt quality or add input validation before expensive steps',
        };
    }

    // Latency spike: any single step > 60% of e2e time
    const bottleneck = steps.find(s => s.latencyMs > e2eMs * 0.6);
    if (bottleneck && steps.length > 1) {
        return {
            flag: 'latency_bottleneck',
            detail: `Step "${bottleneck.role}" consumed ${Math.round((bottleneck.latencyMs / e2eMs) * 100)}% of total latency`,
            alternative: 'Consider parallelising this step or using a faster model for it',
        };
    }

    return null;
}
