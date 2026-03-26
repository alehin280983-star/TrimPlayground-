import { TaskClass } from '@/lib/taxonomy';

export type ArchitecturePattern = 'single' | 'router' | 'pipeline' | 'parallel';

// A step inside a workflow template, expressed as fractions of the user's token budget
export interface WorkflowStepTemplate {
    agentId: string;
    role: string;
    // fraction of user's inputTokensPerCall allocated to this step
    inputFraction: number;
    // fraction of user's outputTokensPerCall allocated to this step
    outputFraction: number;
    // average LLM calls for this step per task (accounts for retry within step)
    callsMultiplier: number;
    // 0..1 — fraction of inputs that may hit cache
    cacheHitRate?: number;
}

export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    architecturePattern: ArchitecturePattern;
    taskClasses: TaskClass[];
    steps: WorkflowStepTemplate[];
    // Post-step overhead
    coordinationOverheadRate: number; // additive fraction of base cost (e.g. 0.05 = 5%)
    retryRate: number;                // fraction of tasks requiring a full retry
    successRate: number;              // 0..1 expected success probability
    humanReviewRate: number;          // 0..1 fraction of outputs needing human review
    humanReviewCostUsd: number;       // cost per human review session
}

export interface WorkflowStepEstimate {
    agentId: string;
    role: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
}

export interface WorkflowOverheadBreakdown {
    retryCostUsd: number;
    coordinationCostUsd: number;
    hitlCostUsd: number;
}

export interface WorkflowEstimate {
    templateId: string;
    templateName: string;
    architecturePattern: ArchitecturePattern;
    confidence: 'Estimated';

    stepBreakdown: WorkflowStepEstimate[];
    baseCostPerTask: number;
    overheadBreakdown: WorkflowOverheadBreakdown;
    totalCostPerTask: number;
    totalCostPerMonth: number;

    successRate: number;
    efficiencyScore: number;
}
