import { WorkflowEstimate } from './types';

// Rank estimates: higher score = better efficiency (more success per dollar)
export function rankByEfficiency(estimates: WorkflowEstimate[]): WorkflowEstimate[] {
    return [...estimates].sort((a, b) => b.efficiencyScore - a.efficiencyScore);
}

// Normalize efficiency scores to 0..100 relative to the best in the set
export function normalizeScores(
    estimates: WorkflowEstimate[]
): Array<WorkflowEstimate & { normalizedScore: number }> {
    const maxScore = Math.max(...estimates.map(e => e.efficiencyScore));
    if (maxScore === 0) {
        return estimates.map(e => ({ ...e, normalizedScore: 0 }));
    }
    return estimates.map(e => ({
        ...e,
        normalizedScore: Math.round((e.efficiencyScore / maxScore) * 100),
    }));
}

// Pick the recommendation: best efficiency unless cost difference is negligible (<5%)
export function recommend(estimates: WorkflowEstimate[]): WorkflowEstimate | null {
    if (estimates.length === 0) return null;
    const ranked = rankByEfficiency(estimates);
    return ranked[0];
}
