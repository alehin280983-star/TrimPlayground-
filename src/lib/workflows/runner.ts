import { nanoid } from 'nanoid';
import { getModelById } from '@/lib/config';
import { ProviderType } from '@/types';
import {
    OpenAIProvider,
    AnthropicProvider,
    GoogleProvider,
    DeepSeekProvider,
    MistralProvider,
    CohereProvider,
    XAIProvider,
    AlibabaProvider,
    MoonshotProvider,
    ZhipuProvider,
} from '@/lib/providers';
import { BaseProvider } from '@/lib/providers/base';
import { normalizeOpenAIChat, normalizeAnthropic, normalizeGoogle, normalizeDeepSeek } from '@/lib/adapters';
import { WorkflowTemplate, Recommendation } from './types';
import { recommendFromLiveRun } from './recommendations';
import { TaskClass } from '@/lib/taxonomy';

function createProviderWithKey(providerType: ProviderType, apiKey: string): BaseProvider {
    switch (providerType) {
        case 'openai': return new OpenAIProvider(apiKey);
        case 'anthropic': return new AnthropicProvider(apiKey);
        case 'google': return new GoogleProvider(apiKey);
        case 'deepseek': return new DeepSeekProvider(apiKey);
        case 'mistral': return new MistralProvider(apiKey);
        case 'cohere': return new CohereProvider(apiKey);
        case 'xai': return new XAIProvider(apiKey);
        case 'alibaba': return new AlibabaProvider(apiKey);
        case 'moonshot': return new MoonshotProvider(apiKey);
        case 'zhipu': return new ZhipuProvider(apiKey);
        default: throw new Error(`Provider ${providerType} not supported`);
    }
}

function stepPrompt(role: string, userPrompt: string): string {
    switch (role.toLowerCase()) {
        case 'planner':
            return `Create a step-by-step plan to complete this task:\n\n${userPrompt}`;
        case 'reviewer':
            return `Review the following task for accuracy and quality, then provide a brief assessment:\n\n${userPrompt}`;
        case 'router':
            return `Classify this request as either 'simple' or 'complex' with one sentence of reasoning:\n\n${userPrompt}`;
        default:
            return userPrompt;
    }
}

export interface StepRunResult {
    agentId: string;
    role: string;
    model: string;
    provider: string;
    startedAt: Date;
    completedAt: Date;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    reasoningTokens: number;
    costUsd: number;
    success: boolean;
    retryCount: number;
    content: string;
}

export interface WorkflowRunResult {
    runId: string;
    templateId: string;
    taskClass: TaskClass;
    mode: 'live';
    confidence: 'Exact';
    steps: StepRunResult[];
    totalCostUsd: number;
    e2eMs: number;
    success: boolean;
    recommendation: Recommendation | null;
}

export async function runWorkflow(
    template: WorkflowTemplate,
    {
        prompt,
        modelId,
        apiKey,
        taskClass,
    }: {
        prompt: string;
        modelId: string;
        apiKey: string;
        taskClass: TaskClass;
    }
): Promise<WorkflowRunResult> {
    const runId = nanoid();
    const model = getModelById(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    const provider = createProviderWithKey(model.provider as ProviderType, apiKey);

    const runStart = Date.now();
    const stepResults: StepRunResult[] = [];

    const executeStep = async (step: WorkflowTemplate['steps'][number]): Promise<StepRunResult> => {
        const startedAt = new Date();
        let retryCount = 0;
        let lastError: unknown;

        for (let attempt = 0; attempt <= 1; attempt++) {
            try {
                const response = await provider.complete({
                    model: modelId,
                    prompt: stepPrompt(step.role, prompt),
                    provider: model.provider as import('@/types').ProviderType,
                    maxTokens: 1024,
                });

                const completedAt = new Date();
                const latencyMs = completedAt.getTime() - startedAt.getTime();

                return {
                    agentId: step.agentId,
                    role: step.role,
                    model: modelId,
                    provider: model.provider,
                    startedAt,
                    completedAt,
                    latencyMs,
                    inputTokens: response.inputTokens,
                    outputTokens: response.outputTokens,
                    cachedInputTokens: 0,
                    reasoningTokens: 0,
                    costUsd: response.totalCost,
                    success: true,
                    retryCount,
                    content: response.content,
                };
            } catch (err) {
                lastError = err;
                retryCount++;
            }
        }

        const completedAt = new Date();
        return {
            agentId: step.agentId,
            role: step.role,
            model: modelId,
            provider: model.provider,
            startedAt,
            completedAt,
            latencyMs: completedAt.getTime() - startedAt.getTime(),
            inputTokens: 0,
            outputTokens: 0,
            cachedInputTokens: 0,
            reasoningTokens: 0,
            costUsd: 0,
            success: false,
            retryCount,
            content: lastError instanceof Error ? lastError.message : 'Step failed',
        };
    };

    if (template.architecturePattern === 'parallel') {
        const results = await Promise.all(template.steps.map(executeStep));
        stepResults.push(...results);
    } else {
        for (const step of template.steps) {
            stepResults.push(await executeStep(step));
        }
    }

    const totalCostUsd = stepResults.reduce((sum, s) => sum + s.costUsd, 0);
    const e2eMs = Date.now() - runStart;
    const success = stepResults.every(s => s.success);

    return {
        runId,
        templateId: template.id,
        taskClass,
        mode: 'live',
        confidence: 'Exact',
        steps: stepResults,
        totalCostUsd,
        e2eMs,
        success,
        recommendation: recommendFromLiveRun(stepResults, e2eMs),
    };
}
