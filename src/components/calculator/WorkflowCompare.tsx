'use client';

import { useMemo, useState, useEffect } from 'react';
import { getAllModels, getModelById } from '@/lib/config';
import { formatCost } from '@/lib/tokens';
import { WORKFLOW_TEMPLATES, estimateWorkflow, normalizeScores, recommend } from '@/lib/workflows';
import { TaskClassSchema, TASK_CLASS_LABELS, TaskClass } from '@/lib/taxonomy';
import type { WorkflowRunResult } from '@/lib/workflows/runner';
import type { ModelConfig, ProviderType } from '@/types';
import { ProviderModelPickerLite } from './ProviderModelPickerLite';
import { EfficiencyFrontierChart } from './EfficiencyFrontierChart';

const API_KEY_STORAGE = 'wf_api_key';

const PATTERN_TAG_COLORS: Record<string, string> = {
    single: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    router: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
    pipeline: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    parallel: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
};

const TASK_CLASS_SHORT: Record<string, string> = {
    json_extract: 'Extraction',
    rag: 'RAG',
    coding: 'Coding',
    research: 'Research',
    chat: 'Chat',
    agentic: 'Agentic',
};

const SCALE_MIN = 1_000;
const SCALE_MAX = 500_000;

function sliderToScale(pos: number): number {
    return Math.round(SCALE_MIN * Math.pow(SCALE_MAX / SCALE_MIN, pos / 100));
}

function scaleToSlider(value: number): number {
    return Math.round((Math.log(value / SCALE_MIN) / Math.log(SCALE_MAX / SCALE_MIN)) * 100);
}

function formatScale(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return `${value}`;
}

export function WorkflowCompare() {
    const textModels = useMemo(
        () => getAllModels().filter(m => (m.modality ?? 'text') === 'text'),
        []
    );

    const defaultModelId = useMemo(
        () => textModels.find(m => m.id === 'gpt-4o')?.id ?? textModels[0]?.id ?? '',
        [textModels]
    );

    // Scenario params
    const [taskClass, setTaskClass] = useState<TaskClass>('coding');
    const [scalePos, setScalePos] = useState(scaleToSlider(10_000));
    const scale = useMemo(() => sliderToScale(scalePos), [scalePos]);
    const inputTokens = 800;
    const outputTokens = 400;

    // Mode + live run
    const [isLiveMode, setIsLiveMode] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [runningTemplateId, setRunningTemplateId] = useState<string | null>(null);
    const [liveResults, setLiveResults] = useState<Record<string, WorkflowRunResult>>({});
    const [liveErrors, setLiveErrors] = useState<Record<string, string>>({});

    // Template selection
    const allTemplateIds = useMemo(() => WORKFLOW_TEMPLATES.map(t => t.id), []);
    const [activeTemplateIds, setActiveTemplateIds] = useState<Set<string>>(new Set(allTemplateIds));

    // Per-template per-role model overrides (templateId → agentId → modelId)
    const [modelOverrides, setModelOverrides] = useState<Record<string, Record<string, string>>>({});

    // Drawer
    const [drawerTemplateId, setDrawerTemplateId] = useState<string | null>(null);

    // Persist API key in sessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem(API_KEY_STORAGE);
        if (stored) setApiKey(stored);
    }, []);
    useEffect(() => {
        if (apiKey) sessionStorage.setItem(API_KEY_STORAGE, apiKey);
    }, [apiKey]);

    const applicableTemplates = useMemo(
        () => WORKFLOW_TEMPLATES.filter(t => t.taskClasses.includes(taskClass) && activeTemplateIds.has(t.id)),
        [taskClass, activeTemplateIds]
    );

    const estimates = useMemo(() => {
        const defaultModel = getModelById(defaultModelId);
        if (!defaultModel) return [];
        return applicableTemplates.map(t => {
            const overridesForTemplate = modelOverrides[t.id] ?? {};
            const modelMap: Record<string, ModelConfig> = {};
            for (const step of t.steps) {
                const mid = overridesForTemplate[step.agentId];
                if (mid) {
                    const m = getModelById(mid);
                    if (m) modelMap[step.agentId] = m;
                }
            }
            return estimateWorkflow(
                t,
                defaultModel,
                { inputTokensPerCall: inputTokens, outputTokensPerCall: outputTokens, tasksPerMonth: scale },
                Object.keys(modelMap).length > 0 ? modelMap : undefined
            );
        });
    }, [applicableTemplates, modelOverrides, defaultModelId, inputTokens, outputTokens, scale]);

    const scored = useMemo(() => normalizeScores(estimates), [estimates]);
    const best = useMemo(() => recommend(estimates), [estimates]);

    const drawerTemplate = useMemo(
        () => WORKFLOW_TEMPLATES.find(t => t.id === drawerTemplateId) ?? null,
        [drawerTemplateId]
    );

    function applyPreset(templateId: string, preset: 'cheapest' | 'balanced' | 'quality') {
        const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
        if (!template) return;

        let sorted: ModelConfig[];
        if (preset === 'cheapest') {
            sorted = [...textModels].sort((a, b) => (a.inputPrice + a.outputPrice) - (b.inputPrice + b.outputPrice));
        } else if (preset === 'quality') {
            sorted = [...textModels].sort((a, b) => b.qualityRating - a.qualityRating);
        } else {
            sorted = [...textModels].sort((a, b) => {
                const rA = a.qualityRating / (a.inputPrice + a.outputPrice + 0.001);
                const rB = b.qualityRating / (b.inputPrice + b.outputPrice + 0.001);
                return rB - rA;
            });
        }

        const pick = sorted[0];
        if (!pick) return;
        const overrides: Record<string, string> = {};
        for (const step of template.steps) {
            overrides[step.agentId] = pick.id;
        }
        setModelOverrides(prev => ({ ...prev, [templateId]: overrides }));
    }

    async function runLive(templateId: string) {
        if (!prompt.trim() || !apiKey.trim()) return;
        setRunningTemplateId(templateId);
        setLiveErrors(prev => ({ ...prev, [templateId]: '' }));
        try {
            const res = await fetch('/api/workflows/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId, modelId: defaultModelId, apiKey, prompt, taskClass }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error ?? 'Run failed');
            setLiveResults(prev => ({ ...prev, [templateId]: json.data }));
        } catch (err) {
            setLiveErrors(prev => ({
                ...prev,
                [templateId]: err instanceof Error ? err.message : 'Run failed',
            }));
        } finally {
            setRunningTemplateId(null);
        }
    }

    return (
        <div className="flex min-h-[600px]">
            {/* ── Left Panel ── */}
            <div className="w-60 shrink-0 border-r border-foreground/10 flex flex-col gap-5 p-5 overflow-y-auto">
                {/* Scenario textarea */}
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/40 mb-1.5">Scenario</div>
                    <textarea
                        rows={4}
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Describe the task or paste a sample prompt…"
                        className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-foreground/25 text-foreground/80 placeholder-foreground/25"
                    />
                </div>

                {/* Task class chips */}
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/40 mb-1.5">Task Class</div>
                    <div className="flex flex-wrap gap-1.5">
                        {TaskClassSchema.options.map(tc => (
                            <button
                                key={tc}
                                type="button"
                                onClick={() => setTaskClass(tc)}
                                className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                    taskClass === tc
                                        ? 'bg-foreground text-background border-foreground'
                                        : 'bg-transparent border-foreground/12 text-foreground/45 hover:text-foreground/75 hover:border-foreground/25'
                                }`}
                            >
                                {TASK_CLASS_SHORT[tc] ?? tc}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scale slider */}
                <div>
                    <div className="flex justify-between items-baseline mb-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/40">Scale</div>
                        <div className="text-xs font-black tabular-nums">{formatScale(scale)}<span className="text-foreground/40 font-normal">/mo</span></div>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={scalePos}
                        onChange={e => setScalePos(Number(e.target.value))}
                        className="w-full accent-foreground"
                    />
                    <div className="flex justify-between text-[10px] text-foreground/25 mt-1">
                        <span>1k</span>
                        <span>500k</span>
                    </div>
                </div>

                {/* Mode toggle */}
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/40 mb-1.5">Mode</div>
                    <div className="flex rounded-lg border border-foreground/12 overflow-hidden text-[10px] font-bold uppercase tracking-wider">
                        <button
                            type="button"
                            onClick={() => setIsLiveMode(false)}
                            className={`flex-1 py-1.5 transition-colors ${!isLiveMode ? 'bg-foreground text-background' : 'text-foreground/40 hover:text-foreground/70'}`}
                        >
                            Virtual
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsLiveMode(true)}
                            className={`flex-1 py-1.5 transition-colors ${isLiveMode ? 'bg-foreground text-background' : 'text-foreground/40 hover:text-foreground/70'}`}
                        >
                            Live
                        </button>
                    </div>
                </div>

                {/* Live-mode API key */}
                {isLiveMode && (
                    <div className="flex flex-col gap-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/40">API Key</div>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder="sk-…"
                            className="w-full px-3 py-1.5 rounded-lg bg-foreground/5 border border-foreground/10 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/25"
                        />
                        <p className="text-[10px] text-foreground/25">sessionStorage only · never logged server-side</p>
                    </div>
                )}

                {/* Architecture checkboxes */}
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/40 mb-1.5">Architectures</div>
                    <div className="flex flex-col gap-2">
                        {WORKFLOW_TEMPLATES.map(t => (
                            <label key={t.id} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={activeTemplateIds.has(t.id)}
                                    onChange={e => {
                                        setActiveTemplateIds(prev => {
                                            const next = new Set(prev);
                                            if (e.target.checked) next.add(t.id);
                                            else next.delete(t.id);
                                            return next;
                                        });
                                    }}
                                    className="rounded accent-foreground"
                                />
                                <span className="text-xs text-foreground/60 group-hover:text-foreground/85 transition-colors">{t.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Center Panel ── */}
            <div className="flex-1 min-w-0 overflow-y-auto flex flex-col gap-5 p-5">
                {scored.length === 0 ? (
                    <div className="text-foreground/35 text-sm mt-12 text-center">
                        No architectures selected for this task class.
                    </div>
                ) : (
                    <>
                        {/* Cards grid */}
                        <div
                            className="grid gap-4"
                            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}
                        >
                            {scored.map(est => {
                                const isRec = est.templateId === best?.templateId;
                                const template = WORKFLOW_TEMPLATES.find(t => t.id === est.templateId)!;
                                const overrides = modelOverrides[est.templateId] ?? {};
                                const liveResult = liveResults[est.templateId];
                                const liveError = liveErrors[est.templateId];

                                return (
                                    <div
                                        key={est.templateId}
                                        className={`rounded-xl border flex flex-col gap-3 p-4 transition-all ${
                                            isRec
                                                ? 'border-blue-500/35 bg-blue-500/[0.04] shadow-lg shadow-blue-500/10'
                                                : 'border-foreground/10 bg-foreground/[0.02]'
                                        }`}
                                    >
                                        {/* Header */}
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${PATTERN_TAG_COLORS[est.architecturePattern] ?? ''}`}>
                                                    {est.architecturePattern}
                                                </span>
                                                {isRec && (
                                                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500 text-white">
                                                        Best
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-black text-sm">{est.templateName}</div>
                                            <div className="text-[11px] text-foreground/40 mt-0.5 leading-snug">{template.description}</div>
                                        </div>

                                        {/* Mini model stack */}
                                        <div className="flex flex-col gap-0.5 py-1 border-y border-foreground/7">
                                            {template.steps.map(step => {
                                                const mid = overrides[step.agentId] ?? defaultModelId;
                                                const m = getModelById(mid);
                                                return (
                                                    <div key={step.agentId} className="flex justify-between text-[11px]">
                                                        <span className="text-foreground/35">{step.role}</span>
                                                        <span className="font-mono text-foreground/55 truncate max-w-[140px]">{m?.name ?? mid}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Key metrics */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-foreground/5 rounded-lg p-2.5 text-center">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/35">Monthly</div>
                                                <div className="text-sm font-black mt-0.5 tabular-nums">{formatCost(est.totalCostPerMonth)}</div>
                                            </div>
                                            <div className="bg-foreground/5 rounded-lg p-2.5 text-center">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/35">Success</div>
                                                <div className="text-sm font-black mt-0.5">{Math.round(est.successRate * 100)}%</div>
                                            </div>
                                        </div>

                                        {/* Efficiency bar */}
                                        <div>
                                            <div className="flex justify-between text-[10px] text-foreground/35 mb-1">
                                                <span className="font-bold uppercase tracking-wider">Efficiency</span>
                                                <span className="tabular-nums">{est.normalizedScore}/100</span>
                                            </div>
                                            <div className="h-1.5 bg-foreground/8 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${isRec ? 'bg-blue-500' : 'bg-foreground/30'}`}
                                                    style={{ width: `${est.normalizedScore}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Live result indicator */}
                                        {liveError && (
                                            <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                                {liveError}
                                            </div>
                                        )}
                                        {liveResult && (
                                            <div className="flex justify-between text-[11px] bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-3 py-2">
                                                <span className="text-emerald-400 font-bold">Live · Exact</span>
                                                <span className="tabular-nums font-black">{formatCost(liveResult.totalCostUsd)}</span>
                                                <span className="text-foreground/40">{liveResult.e2eMs}ms</span>
                                            </div>
                                        )}

                                        {/* Configure button */}
                                        <button
                                            type="button"
                                            onClick={() => setDrawerTemplateId(
                                                drawerTemplateId === est.templateId ? null : est.templateId
                                            )}
                                            className={`mt-auto px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-colors ${
                                                drawerTemplateId === est.templateId
                                                    ? 'border-foreground/30 text-foreground bg-foreground/8'
                                                    : 'border-foreground/12 text-foreground/50 hover:text-foreground/80 hover:border-foreground/25'
                                            }`}
                                        >
                                            {drawerTemplateId === est.templateId ? 'Configured ×' : 'Configure'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Efficiency Frontier Chart */}
                        <div className="border border-foreground/10 rounded-xl p-4 bg-foreground/[0.02]">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/40 mb-3">
                                Efficiency Frontier
                            </div>
                            <EfficiencyFrontierChart estimates={scored} recommendedId={best?.templateId} />
                        </div>

                        {/* Live Run CTA */}
                        {isLiveMode && (
                            <div className="border border-foreground/10 rounded-xl p-4 flex items-center justify-between gap-4">
                                <div>
                                    <div className="font-bold text-sm">Confirm & Validate Live Run</div>
                                    <div className="text-xs text-foreground/45 mt-0.5">
                                        Execute all active architectures with your prompt and measure exact costs.
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={!prompt.trim() || !apiKey.trim() || runningTemplateId !== null}
                                    onClick={() => applicableTemplates.forEach(t => runLive(t.id))}
                                    className="shrink-0 px-5 py-2 rounded-xl bg-foreground text-background font-black text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                                >
                                    {runningTemplateId ? 'Running…' : 'Run All'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Right Drawer ── */}
            {drawerTemplate && (
                <div className="w-72 shrink-0 border-l border-foreground/10 flex flex-col overflow-y-auto bg-background">
                    {/* Drawer header */}
                    <div className="flex items-center justify-between p-4 border-b border-foreground/10 shrink-0">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/35">Configure</div>
                            <div className="font-black text-sm mt-0.5">{drawerTemplate.name}</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDrawerTemplateId(null)}
                            className="text-foreground/35 hover:text-foreground text-xl leading-none p-1 transition-colors"
                            aria-label="Close drawer"
                        >
                            ×
                        </button>
                    </div>

                    {/* Preset buttons */}
                    <div className="px-4 py-3 border-b border-foreground/10 shrink-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/35 mb-2">Preset</div>
                        <div className="flex gap-2">
                            {(['cheapest', 'balanced', 'quality'] as const).map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => applyPreset(drawerTemplate.id, preset)}
                                    className="flex-1 py-1.5 rounded-lg border border-foreground/12 text-[10px] font-bold uppercase tracking-wider text-foreground/50 hover:text-foreground hover:border-foreground/25 transition-colors capitalize"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Model pickers per step */}
                    <div className="p-4 flex flex-col gap-4 flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/35">Model per Role</div>
                        {drawerTemplate.steps.map(step => {
                            const currentId = modelOverrides[drawerTemplate.id]?.[step.agentId] ?? defaultModelId;
                            return (
                                <ProviderModelPickerLite
                                    key={step.agentId}
                                    label={step.role}
                                    value={currentId}
                                    onChange={newModelId =>
                                        setModelOverrides(prev => ({
                                            ...prev,
                                            [drawerTemplate.id]: {
                                                ...(prev[drawerTemplate.id] ?? {}),
                                                [step.agentId]: newModelId,
                                            },
                                        }))
                                    }
                                    models={textModels}
                                />
                            );
                        })}
                    </div>

                    {/* Live stats */}
                    {(() => {
                        const est = scored.find(e => e.templateId === drawerTemplate.id);
                        if (!est) return null;
                        const overheadPct = est.baseCostPerTask > 0
                            ? ((est.totalCostPerTask - est.baseCostPerTask) / est.baseCostPerTask * 100).toFixed(1)
                            : '0';
                        return (
                            <div className="px-4 py-3 border-t border-foreground/10 shrink-0 flex flex-col gap-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/35">Estimates</div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-foreground/45">Est. overhead</span>
                                    <span className="font-bold tabular-nums">{overheadPct}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-foreground/45">Retry cost</span>
                                    <span className="font-bold tabular-nums">{formatCost(est.overheadBreakdown.retryCostUsd)}</span>
                                </div>
                                <div className="flex justify-between text-xs border-t border-foreground/8 pt-2 mt-1">
                                    <span className="text-foreground/45">Total / month</span>
                                    <span className="font-black text-sm tabular-nums">{formatCost(est.totalCostPerMonth)}</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
