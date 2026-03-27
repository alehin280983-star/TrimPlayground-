import { WorkflowEstimate } from './types';

// Rank estimates: lower efficiencyScore = better (less cost per unit of success)
export function rankByEfficiency(estimates: WorkflowEstimate[]): WorkflowEstimate[] {
    return [...estimates].sort((a, b) => a.efficiencyScore - b.efficiencyScore);
}

// Normalize efficiency scores to 0..100 (100 = best/cheapest per success unit)
export function normalizeScores(
    estimates: WorkflowEstimate[]
): Array<WorkflowEstimate & { normalizedScore: number }> {
    if (estimates.length === 0) {
        return [];
    }
    const scores = estimates.map(e => e.efficiencyScore).filter(s => Number.isFinite(s) && s > 0);
    if (scores.length === 0) {
        return estimates.map(e => ({ ...e, normalizedScore: 0 }));
    }
    const minScore = Math.min(...scores); // best (lowest cost/success)
    return estimates.map(e => ({
        ...e,
        // Invert: lowest cost/success → 100, higher → lower score
        normalizedScore: Number.isFinite(e.efficiencyScore) && e.efficiencyScore > 0
            ? Math.round((minScore / e.efficiencyScore) * 100)
            : 0,
    }));
}

// Pick the recommendation: best efficiency (lowest cost per success)
export function recommend(estimates: WorkflowEstimate[]): WorkflowEstimate | null {
    if (estimates.length === 0) return null;
    const ranked = rankByEfficiency(estimates);
    return ranked[0];
}
