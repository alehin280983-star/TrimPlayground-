'use client';

import { useMemo, useState } from 'react';
import { getAllModels, getModelById } from '@/lib/config';
import { formatCost, formatTokens } from '@/lib/tokens';
import { WORKFLOW_TEMPLATES, estimateWorkflow, normalizeScores, recommend } from '@/lib/workflows';
import { TaskClassSchema, TASK_CLASS_LABELS, TaskClass } from '@/lib/taxonomy';
import type { ProviderType } from '@/types';

const PROVIDER_LABELS: Record<ProviderType, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    mistral: 'Mistral',
    cohere: 'Cohere',
    deepseek: 'DeepSeek',
    xai: 'xAI',
    alibaba: 'Alibaba Cloud',
    moonshot: 'Moonshot',
    zhipu: 'Zhipu AI',
};

function toNumber(value: string): number {
    const num = Number(value.replace(/^0+(?=\d)/, ''));
    return Number.isFinite(num) ? num : 0;
}

const PATTERN_COLORS: Record<string, string> = {
    single: 'bg-blue-500',
    router: 'bg-violet-500',
    pipeline: 'bg-amber-500',
    parallel: 'bg-emerald-500',
};

export function WorkflowCompare() {
    const textModels = useMemo(() => {
        const all = getAllModels();
        return all.filter(m => (m.modality ?? 'text') === 'text');
    }, []);

    const defaultModelId = useMemo(() => {
        return textModels.find(m => m.id === 'gpt-4o')?.id ?? textModels[0]?.id ?? '';
    }, [textModels]);

    const [modelId, setModelId] = useState(defaultModelId);
    const [taskClass, setTaskClass] = useState<TaskClass>('coding');
    const [tasksPerMonth, setTasksPerMonth] = useState(10_000);
    const [inputTokens, setInputTokens] = useState(800);
    const [outputTokens, setOutputTokens] = useState(400);

    const model = useMemo(() => getModelById(modelId), [modelId]);

    const applicableTemplates = useMemo(
        () => WORKFLOW_TEMPLATES.filter(t => t.taskClasses.includes(taskClass)),
        [taskClass]
    );

    const estimates = useMemo(() => {
        if (!model) return [];
        return applicableTemplates.map(t =>
            estimateWorkflow(t, model, { inputTokensPerCall: inputTokens, outputTokensPerCall: outputTokens, tasksPerMonth })
        );
    }, [model, applicableTemplates, inputTokens, outputTokens, tasksPerMonth]);

    const scored = useMemo(() => normalizeScores(estimates), [estimates]);
    const best = useMemo(() => recommend(estimates), [estimates]);

    return (
        <div className="flex flex-col gap-8">
            {/* Inputs */}
            <div className="bg-background border border-foreground/10 rounded-xl p-6 shadow-sm">
                <h2 className="font-extrabold uppercase tracking-wider text-sm text-foreground/70 mb-4">
                    Workflow Inputs
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Task class */}
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">Task type</div>
                        <div className="flex flex-wrap gap-2">
                            {TaskClassSchema.options.map(tc => (
                                <button
                                    key={tc}
                                    type="button"
                                    onClick={() => setTaskClass(tc)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${
                                        taskClass === tc
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'bg-background border-foreground/15 text-foreground/60 hover:text-foreground'
                                    }`}
                                >
                                    {TASK_CLASS_LABELS[tc]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Model */}
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">Model (all roles)</div>
                        <select
                            value={modelId}
                            onChange={(e) => setModelId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/15 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                        >
                            {Object.entries(
                                textModels.reduce((acc, m) => {
                                    (acc[m.provider] ||= []).push(m);
                                    return acc;
                                }, {} as Record<ProviderType, typeof textModels>)
                            ).map(([provider, models]) => (
                                <optgroup key={provider} label={PROVIDER_LABELS[provider as ProviderType]}>
                                    {models
                                        .slice()
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map((m) => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                </optgroup>
                            ))}
                        </select>
                        {model && (
                            <div className="mt-1 text-xs text-foreground/50">
                                {formatCost(model.inputPrice)}/1K in · {formatCost(model.outputPrice)}/1K out
                            </div>
                        )}
                    </div>

                    {/* Volume + Tokens */}
                    <div className="flex flex-col gap-3">
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Tasks / month</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={tasksPerMonth}
                                onChange={(e) => setTasksPerMonth(Math.max(1, toNumber(e.target.value)))}
                                className="px-3 py-2 rounded-lg bg-background border border-foreground/15"
                            />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Input tokens</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={inputTokens}
                                    onChange={(e) => setInputTokens(Math.max(1, toNumber(e.target.value)))}
                                    className="px-3 py-2 rounded-lg bg-background border border-foreground/15"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Output tokens</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={outputTokens}
                                    onChange={(e) => setOutputTokens(Math.max(1, toNumber(e.target.value)))}
                                    className="px-3 py-2 rounded-lg bg-background border border-foreground/15"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-xs text-foreground/40 italic">
                    Virtual Preview — rule-based estimate. Confidence: Estimated. Use Live run for exact numbers.
                </div>
            </div>

            {/* Results */}
            {scored.length === 0 ? (
                <div className="text-foreground/50 text-sm">No templates available for this task type.</div>
            ) : (
                <>
                    {best && (
                        <div className="flex items-center gap-3 bg-foreground/5 border border-foreground/15 rounded-xl px-5 py-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">Recommended</div>
                            <div className="font-black text-sm">{best.templateName}</div>
                            <div className="text-xs text-foreground/50">
                                — best efficiency for {TASK_CLASS_LABELS[taskClass]} at {formatCost(best.totalCostPerTask)}/task
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {scored.map((est) => {
                            const isRecommended = est.templateId === best?.templateId;
                            const barColor = PATTERN_COLORS[est.architecturePattern] ?? 'bg-foreground';
                            const template = applicableTemplates.find(t => t.id === est.templateId)!;

                            return (
                                <div
                                    key={est.templateId}
                                    className={`bg-background border rounded-xl p-5 shadow-sm flex flex-col gap-4 ${isRecommended ? 'border-foreground/40' : 'border-foreground/10'}`}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block w-2 h-2 rounded-full ${barColor}`} />
                                                <span className="font-black text-sm">{est.templateName}</span>
                                                {isRecommended && (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest bg-foreground text-background px-2 py-0.5 rounded-full">Best</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-foreground/50 mt-1">{template.description}</div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-2xl font-black">{formatCost(est.totalCostPerTask)}</div>
                                            <div className="text-xs text-foreground/50">per task</div>
                                        </div>
                                    </div>

                                    {/* Efficiency bar */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Efficiency</span>
                                            <span className="text-[11px] font-bold text-foreground/70">{est.normalizedScore}/100</span>
                                        </div>
                                        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${barColor} transition-all`}
                                                style={{ width: `${est.normalizedScore}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Key metrics */}
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="bg-foreground/5 rounded-lg p-3">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Success</div>
                                            <div className="text-base font-black mt-1">{Math.round(est.successRate * 100)}%</div>
                                        </div>
                                        <div className="bg-foreground/5 rounded-lg p-3">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Monthly</div>
                                            <div className="text-base font-black mt-1">{formatCost(est.totalCostPerMonth)}</div>
                                        </div>
                                        <div className="bg-foreground/5 rounded-lg p-3">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Steps</div>
                                            <div className="text-base font-black mt-1">{est.stepBreakdown.length}</div>
                                        </div>
                                    </div>

                                    {/* Overhead breakdown */}
                                    <div>
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mb-2">Overhead breakdown</div>
                                        <div className="flex flex-col gap-1">
                                            {[
                                                { label: 'Base cost', value: est.baseCostPerTask },
                                                { label: 'Retry cost', value: est.overheadBreakdown.retryCostUsd },
                                                { label: 'Coordination', value: est.overheadBreakdown.coordinationCostUsd },
                                                { label: 'Human review', value: est.overheadBreakdown.hitlCostUsd },
                                            ].map(row => (
                                                <div key={row.label} className="flex justify-between text-xs">
                                                    <span className="text-foreground/60">{row.label}</span>
                                                    <span className="font-bold">{formatCost(row.value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Step breakdown */}
                                    <div>
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mb-2">Step breakdown</div>
                                        <div className="flex flex-col gap-1">
                                            {est.stepBreakdown.map(step => (
                                                <div key={step.agentId} className="flex justify-between text-xs">
                                                    <span className="text-foreground/60">{step.role}</span>
                                                    <span className="text-foreground/50">
                                                        {formatTokens(step.inputTokens)} in · {formatTokens(step.outputTokens)} out ·{' '}
                                                        <span className="font-bold">{formatCost(step.costUsd)}</span>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
