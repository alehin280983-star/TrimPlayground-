import { WorkflowTemplate } from './types';

// 4 canonical architecture patterns.
// Token fractions are applied to user's inputTokensPerCall / outputTokensPerCall.
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    {
        id: 'single',
        name: 'Single Agent',
        description: 'One model handles the entire task end-to-end. Lowest overhead, highest variance.',
        architecturePattern: 'single',
        taskClasses: ['chat', 'rag', 'json_extract', 'coding', 'agentic', 'research'],
        steps: [
            {
                agentId: 'executor',
                role: 'Executor',
                inputFraction: 1.0,
                outputFraction: 1.0,
                callsMultiplier: 1.0,
                cacheHitRate: 0,
            },
        ],
        coordinationOverheadRate: 0,
        retryRate: 0.15,
        successRate: 0.83,
        humanReviewRate: 0.05,
        humanReviewCostUsd: 0.5,
    },
    {
        id: 'router',
        name: 'Router + Executor',
        description: 'Cheap model classifies/routes. Main model handles complex cases only.',
        architecturePattern: 'router',
        taskClasses: ['chat', 'rag', 'json_extract', 'coding', 'agentic'],
        steps: [
            {
                agentId: 'router',
                role: 'Router',
                inputFraction: 0.25,
                outputFraction: 0.1,
                callsMultiplier: 1.0,
                cacheHitRate: 0.3,
            },
            {
                agentId: 'executor',
                role: 'Executor',
                inputFraction: 0.85,
                outputFraction: 1.0,
                callsMultiplier: 0.8, // ~80% of tasks escalate to main model
                cacheHitRate: 0.1,
            },
        ],
        coordinationOverheadRate: 0.03,
        retryRate: 0.1,
        successRate: 0.88,
        humanReviewRate: 0.04,
        humanReviewCostUsd: 0.5,
    },
    {
        id: 'pipeline',
        name: 'Planner → Executor → Reviewer',
        description: '3-step pipeline. Higher quality through structured decomposition and review.',
        architecturePattern: 'pipeline',
        taskClasses: ['coding', 'agentic', 'research', 'rag'],
        steps: [
            {
                agentId: 'planner',
                role: 'Planner',
                inputFraction: 0.4,
                outputFraction: 0.3,
                callsMultiplier: 1.0,
                cacheHitRate: 0.2,
            },
            {
                agentId: 'executor',
                role: 'Executor',
                inputFraction: 0.9,
                outputFraction: 1.0,
                callsMultiplier: 1.1,
                cacheHitRate: 0.1,
            },
            {
                agentId: 'reviewer',
                role: 'Reviewer',
                inputFraction: 0.6,
                outputFraction: 0.2,
                callsMultiplier: 1.0,
                cacheHitRate: 0.15,
            },
        ],
        coordinationOverheadRate: 0.06,
        retryRate: 0.07,
        successRate: 0.93,
        humanReviewRate: 0.02,
        humanReviewCostUsd: 0.5,
    },
    {
        id: 'parallel',
        name: 'Parallel Ensemble',
        description: '3 parallel attempts, best result selected. Maximum quality at highest cost.',
        architecturePattern: 'parallel',
        taskClasses: ['coding', 'research', 'json_extract'],
        steps: [
            {
                agentId: 'worker_a',
                role: 'Worker A',
                inputFraction: 1.0,
                outputFraction: 1.0,
                callsMultiplier: 1.0,
            },
            {
                agentId: 'worker_b',
                role: 'Worker B',
                inputFraction: 1.0,
                outputFraction: 1.0,
                callsMultiplier: 1.0,
            },
            {
                agentId: 'worker_c',
                role: 'Worker C',
                inputFraction: 1.0,
                outputFraction: 1.0,
                callsMultiplier: 1.0,
            },
        ],
        coordinationOverheadRate: 0.04,
        retryRate: 0.03,
        successRate: 0.97,
        humanReviewRate: 0.01,
        humanReviewCostUsd: 0.5,
    },
];

export function getTemplate(id: string): WorkflowTemplate | undefined {
    return WORKFLOW_TEMPLATES.find(t => t.id === id);
}
