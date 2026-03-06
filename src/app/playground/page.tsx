'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { usePostHog } from 'posthog-js/react';
import { Header } from '@/components/layout';
import { ModelCard, PromptInput, ResponseCard, EstimateCard, ModeToggle, RatioSelector, PrioritySelector, AdvancedSettings } from '@/components/playground';
import { ModelConfig, SampleResultV2, PriceEstimateV2, CalculationMode, ProviderType, OutputInputRatio, PriorityMode } from '@/types';
import { getAllModels } from '@/lib/config';
import { recomputeEstimate, sortEstimates, findCheapest, EnrichedEstimate } from '@/lib/estimate-calculator';
import { PlaygroundExportButtons } from '@/components/playground/PlaygroundExportButtons';
import { ExitIntentPopup } from '@/components/playground/ExitIntentPopup';

type ModelCategory = 'text_code' | 'image' | 'audio' | 'video' | 'embedding';

const CATEGORY_ORDER: ModelCategory[] = ['text_code', 'image', 'audio', 'video', 'embedding'];

const CATEGORY_LABELS: Record<ModelCategory, string> = {
    text_code: 'Text / Code',
    image: 'Image',
    audio: 'Audio',
    video: 'Video',
    embedding: 'Embedding',
};

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

const SAMPLE_SUPPORTED_MODALITIES: Record<ProviderType, Array<'text' | 'image' | 'video' | 'audio' | 'embedding'>> = {
    openai: ['text', 'video'],
    anthropic: ['text'],
    google: ['text', 'image', 'video'],
    mistral: ['text'],
    cohere: ['text'],
    deepseek: ['text'],
    xai: ['text', 'image', 'video'],
    alibaba: ['text'],
    moonshot: ['text'],
    zhipu: ['text'],
};

function fmtPrice(p: number | undefined): string {
    if (!p) return '—';
    const per1M = p * 1000;
    if (per1M >= 1) return `$${per1M.toFixed(2)}`;
    if (per1M >= 0.1) return `$${per1M.toFixed(3)}`;
    return `$${per1M.toFixed(4)}`;
}

function getModelCategory(model: ModelConfig): ModelCategory {
    if (model.modality === 'image') return 'image';
    if (model.modality === 'audio') return 'audio';
    if (model.modality === 'video') return 'video';
    if (model.modality === 'embedding') return 'embedding';
    return 'text_code';
}

function isSampleSupportedModel(model: ModelConfig): boolean {
    const id = model.id.toLowerCase();
    // Realtime models require realtime API flow (WS/WebRTC), not sample text-completion flow.
    if (id.includes('realtime')) return false;
    // OCR models require image/document input and a dedicated OCR endpoint.
    if (id.includes('ocr')) return false;
    // QVQ visual reasoning models require image input.
    if (id.includes('qvq')) return false;
    const modality = model.modality ?? 'text';
    return SAMPLE_SUPPORTED_MODALITIES[model.provider].includes(modality);
}

export default function PlaygroundPage() {
    const { isSignedIn } = useAuth();
    const ph = usePostHog();
    const [selectedModels, setSelectedModels] = useState<ModelConfig[]>([]);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [estimateResult, setEstimateResult] = useState<{
        estimates: PriceEstimateV2[];
        cheapest: string;
    } | null>(null);
    const [sampleResult, setSampleResult] = useState<{
        results: SampleResultV2[];
        cheapest: { modelId: string; cost: number } | null;
        fastest: { modelId: string; latencyMs: number } | null;
    } | null>(null);

    // New state for SPEC v2.0
    const [mode, setMode] = useState<CalculationMode>('estimate');
    const [requestsPerMonth, setRequestsPerMonth] = useState(1000);
    const [expandedProvider, setExpandedProvider] = useState<ProviderType | null>(null);

    // Progressive form state (estimate mode)
    const [outputRatio, setOutputRatio] = useState<OutputInputRatio>('1:2');
    const [customRatio, setCustomRatio] = useState(2);
    const [priority, setPriority] = useState<PriorityMode>('cost');
    const [cachingEnabled, setCachingEnabled] = useState(false);
    const [cacheHitRate, setCacheHitRate] = useState(80);
    const [batchEnabled, setBatchEnabled] = useState(false);
    const [refineOpen, setRefineOpen] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);

    // Constraint inputs for winner badge
    const [maxLatencyMs, setMaxLatencyMs] = useState<number | null>(null);
    const [maxBudget, setMaxBudget] = useState<number | null>(null);

    const resultsRef = useRef<HTMLDivElement>(null);
    const [calcCount, setCalcCount] = useState(0);
    const [ctaDismissed, setCtaDismissed] = useState(true); // start hidden, load from storage

    useEffect(() => {
        const count = parseInt(localStorage.getItem('trim_calc_count') ?? '0', 10);
        const dismissed = localStorage.getItem('trim_pro_cta_dismissed') === 'true';
        setCalcCount(count);
        setCtaDismissed(dismissed);
    }, []);

    useEffect(() => {
        ph?.capture('playground_viewed', { is_signed_in: isSignedIn ?? false });
    }, [ph, isSignedIn]);

    const allModels = getAllModels();
    const visibleModels = mode === 'sample' ? allModels.filter(isSampleSupportedModel) : allModels;

    useEffect(() => {
        if (mode !== 'sample') return;
        setSelectedModels(prev => prev.filter(isSampleSupportedModel));
    }, [mode]);

    // Group models by Provider -> Category for the sidebar
    const modelsByProvider = visibleModels.reduce((acc, model) => {
        if (!acc[model.provider]) acc[model.provider] = {} as Record<ModelCategory, ModelConfig[]>;
        const category = getModelCategory(model);
        if (!acc[model.provider][category]) acc[model.provider][category] = [];
        acc[model.provider][category].push(model);
        return acc;
    }, {} as Record<ProviderType, Record<ModelCategory, ModelConfig[]>>);

    const providerEntries = (Object.keys(modelsByProvider) as ProviderType[])
        .sort((a, b) => PROVIDER_LABELS[a].localeCompare(PROVIDER_LABELS[b]));

    // Persist collapse states
    useEffect(() => {
        const saved2 = localStorage.getItem('trim_refine_open');
        const saved3 = localStorage.getItem('trim_advanced_open');
        if (saved2 === 'true') setRefineOpen(true);
        if (saved3 === 'true') setAdvancedOpen(true);
    }, []);
    useEffect(() => { localStorage.setItem('trim_refine_open', String(refineOpen)); }, [refineOpen]);
    useEffect(() => { localStorage.setItem('trim_advanced_open', String(advancedOpen)); }, [advancedOpen]);

    // Enriched estimates with client-side recomputation
    const enrichedEstimates = useMemo(() => {
        if (!estimateResult || !estimateResult.estimates.length) return null;
        const models = getAllModels();
        const recomputed = estimateResult.estimates.map(est => {
            const model = models.find(m => m.id === est.modelId);
            if (!model) return null;
            return recomputeEstimate(est, model, {
                outputInputRatio: outputRatio,
                customRatio,
                cachingEnabled,
                cacheHitRate,
                batchEnabled,
                requestsPerMonth,
            });
        }).filter(Boolean) as EnrichedEstimate[];
        const sorted = sortEstimates(recomputed, priority);
        return { estimates: sorted, cheapest: findCheapest(sorted) };
    }, [estimateResult, outputRatio, customRatio, priority, cachingEnabled, cacheHitRate, batchEnabled, requestsPerMonth]);

    // Winner computation for badges
    const winners = useMemo(() => {
        let cheapest: string | null = null;
        let fastest: string | null = null;

        if (mode === 'estimate' && enrichedEstimates) {
            const filtered = maxBudget != null
                ? enrichedEstimates.estimates.filter(e => e.monthlyCost.median / requestsPerMonth <= maxBudget)
                : enrichedEstimates.estimates;
            if (filtered.length > 0) {
                cheapest = filtered.reduce((best, e) =>
                    e.monthlyCost.median < best.monthlyCost.median ? e : best
                ).modelId;
            }
        } else if (mode === 'sample' && sampleResult?.results?.length) {
            const results = sampleResult.results;
            // Cheapest: filter by latency constraint, pick lowest cost
            const forCheapest = maxLatencyMs != null
                ? results.filter(r => r.latencyMs <= maxLatencyMs)
                : results;
            if (forCheapest.length > 0) {
                cheapest = forCheapest.reduce((best, r) =>
                    r.actualCost < best.actualCost ? r : best
                ).modelId;
            }
            // Fastest: filter by budget constraint, pick lowest latency
            const forFastest = maxBudget != null
                ? results.filter(r => r.actualCost <= maxBudget)
                : results;
            if (forFastest.length > 0) {
                fastest = forFastest.reduce((best, r) =>
                    r.latencyMs < best.latencyMs ? r : best
                ).modelId;
            }
        }

        return { cheapest, fastest };
    }, [mode, enrichedEstimates, sampleResult, maxLatencyMs, maxBudget, requestsPerMonth]);

    const anyCachingSupported = selectedModels.some(m => !!m.cachedInputPrice);
    const anyBatchSupported = selectedModels.some(m => !!m.batchDiscount);

    const handleModelToggle = (model: ModelConfig) => {
        setSelectedModels(prev => {
            if (prev.find(m => m.id === model.id)) {
                return prev.filter(m => m.id !== model.id);
            }
            if (prev.length >= 5) return prev;
            return [...prev, model];
        });
    };

    const handleCompare = async () => {
        if (!prompt.trim() || selectedModels.length === 0) return;
        setIsLoading(true);
        setEstimateResult(null);
        setSampleResult(null);

        try {
            if (mode === 'estimate') {
                const response = await fetch('/api/estimate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        modelIds: selectedModels.map(m => m.id),
                    }),
                });
                const data = await response.json();
                if (data.success && data.data) {
                    const rawEstimates = data.data.estimates ?? data.data.results ?? [];
                    const estimates = Array.isArray(rawEstimates)
                        ? rawEstimates.filter((item): item is PriceEstimateV2 => (
                            item &&
                            typeof item === 'object' &&
                            'modelId' in item &&
                            'total' in item &&
                            !('error' in item)
                        ))
                        : [];

                    setEstimateResult({
                        estimates,
                        cheapest: typeof data.data.cheapest === 'string' ? data.data.cheapest : '',
                    });
                    setCalcCount(prev => {
                        const next = prev + 1;
                        localStorage.setItem('trim_calc_count', String(next));
                        return next;
                    });
                    ph?.capture('calculation_completed', {
                        mode: 'estimate',
                        model_count: estimates.length,
                        model_ids: estimates.map(e => e.modelId),
                        providers: [...new Set(estimates.map(e => e.provider))],
                    });
                    if (selectedModels.length >= 2) {
                        ph?.capture('comparison_made', {
                            mode: 'estimate',
                            model_ids: selectedModels.map(m => m.id),
                        });
                    }
                }
            } else {
                // Sample mode - reload API keys from session storage before making the call
                const STORAGE_PREFIX = 'trim_api_key_';
                const providers: ProviderType[] = ['openai', 'anthropic', 'google', 'mistral', 'cohere', 'deepseek', 'xai', 'alibaba', 'moonshot', 'zhipu'];
                const freshApiKeys: Partial<Record<ProviderType, string>> = {};

                providers.forEach(p => {
                    if (typeof window !== 'undefined') {
                        const keyName = `${STORAGE_PREFIX}${p}`;
                        // Prioritize session value to avoid stale local key overriding recent updates.
                        const savedKey = (sessionStorage.getItem(keyName) || localStorage.getItem(keyName) || '').trim();
                        if (savedKey) freshApiKeys[p] = savedKey;
                    }
                });

                const response = await fetch('/api/sample', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        modelIds: selectedModels.map(m => m.id),
                        apiKeys: freshApiKeys,
                    }),
                });
                const data = await response.json();
                if (data.success && data.data) {
                    setSampleResult(data.data);
                    setCalcCount(prev => {
                        const next = prev + 1;
                        localStorage.setItem('trim_calc_count', String(next));
                        return next;
                    });
                    const successfulResults = (data.data.results ?? []).filter(
                        (r: SampleResultV2) => r.actualUsage.inputTokens > 0 || r.actualUsage.outputTokens > 0
                    );
                    if (successfulResults.length > 0) {
                        ph?.capture('calculation_completed', {
                            mode: 'sample',
                            model_count: successfulResults.length,
                            model_ids: successfulResults.map((r: SampleResultV2) => r.modelId),
                            providers: [...new Set(successfulResults.map((r: SampleResultV2) => r.provider))],
                        });
                        if (selectedModels.length >= 2) {
                            ph?.capture('comparison_made', {
                                mode: 'sample',
                                model_ids: selectedModels.map(m => m.id),
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
        <div className="min-h-screen bg-background font-sans text-foreground">
            <Header />

            <div className="flex h-[calc(100vh-60px)] gap-6">

                {/* LEFT COLUMN - Static provider list */}
                <div className="shrink-0 flex flex-col h-full py-10 pl-2 min-w-[500px]">
                    <div className="flex-grow bg-background border border-foreground/20 rounded-lg overflow-hidden flex flex-col shadow-sm">
                        <div className="bg-foreground text-background px-4 py-3 font-bold uppercase text-sm text-left">
                            Models
                        </div>
                        <div className="px-3 py-2 overflow-y-auto h-full">
                            {providerEntries.map((provider) => {
                                const isExpanded = expandedProvider === provider;
                                const categories = modelsByProvider[provider];
                                const modelCount = Object.values(categories).reduce((sum, arr) => sum + arr.length, 0);
                                const selectedCount = visibleModels.filter(m => m.provider === provider && selectedModels.find(s => s.id === m.id)).length;

                                const allProviderModels = Object.values(categories).flat();
                                const providerUpdatedAt = allProviderModels.reduce((latest, m) =>
                                    m.priceUpdatedAt > latest ? m.priceUpdatedAt : latest, '');
                                const providerDateShort = providerUpdatedAt
                                    ? providerUpdatedAt.split('-').reverse().join('.')
                                    : '';

                                return (
                                    <div key={provider} className="mb-1">
                                        <button
                                            onClick={() => setExpandedProvider(isExpanded ? null : provider)}
                                            className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-foreground/5 transition-colors text-left"
                                        >
                                            <span className="text-[0.82rem] font-bold text-foreground/80">
                                                {isExpanded ? '▼' : '▶'} {PROVIDER_LABELS[provider]}
                                            </span>
                                            <span className="flex items-center gap-2 text-[0.65rem] text-foreground/40">
                                                {providerDateShort && <span>{providerDateShort}</span>}
                                                <span>
                                                    {selectedCount > 0 && <span className="text-foreground font-bold mr-1">{selectedCount}/</span>}
                                                    {modelCount}
                                                </span>
                                            </span>
                                        </button>
                                        {isExpanded && (
                                            <div className="pl-3 pb-2">
                                                {/* Price column header */}
                                                <div className="flex items-center px-2 py-0.5 mb-1 text-[0.7rem] text-foreground/25 uppercase tracking-wide whitespace-nowrap">
                                                    <span className="flex-1">Model</span>
                                                    <span className="flex items-center font-mono">
                                                        <span className="inline-block w-[62px] text-right">In/1M</span>
                                                        <span className="inline-block w-[14px] text-center">·</span>
                                                        <span className="inline-block w-[62px] text-right">Cache/1M</span>
                                                        <span className="inline-block w-[14px] text-center">·</span>
                                                        <span className="inline-block w-[62px] text-right">Out/1M</span>
                                                    </span>
                                                </div>
                                                {CATEGORY_ORDER.map((category) => {
                                                    const models = categories[category];
                                                    if (!models || models.length === 0) return null;
                                                    const showCategoryLabel = Object.keys(categories).length > 1;
                                                    return (
                                                        <div key={category} className="mb-2">
                                                            {showCategoryLabel && (
                                                                <div className="text-[0.65rem] text-foreground/40 uppercase font-bold mt-1 mb-1 px-2">
                                                                    {CATEGORY_LABELS[category]}
                                                                </div>
                                                            )}
                                                            {[...models].sort((a, b) => a.name.localeCompare(b.name)).map(model => (
                                                                <div
                                                                    key={model.id}
                                                                    onClick={() => handleModelToggle(model)}
                                                                    className={`
                                                                        group flex items-center py-1 px-2 rounded cursor-pointer transition-colors whitespace-nowrap
                                                                        ${selectedModels.find(m => m.id === model.id)
                                                                            ? 'font-bold text-foreground bg-foreground/10'
                                                                            : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'}
                                                                    `}
                                                                >
                                                                    <span className="flex-1 text-[0.9rem]">{model.name}</span>
                                                                    <span className="flex items-center text-[0.8rem] font-mono text-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                                        <span className="inline-block w-[62px] text-right" title="Input per 1M tokens">{fmtPrice(model.inputPrice)}</span>
                                                                        <span className="inline-block w-[14px] text-center text-foreground/20">·</span>
                                                                        <span className="inline-block w-[62px] text-right" title="Cached input per 1M tokens">{fmtPrice(model.cachedInputPrice)}</span>
                                                                        <span className="inline-block w-[14px] text-center text-foreground/20">·</span>
                                                                        <span className="inline-block w-[62px] text-right" title="Output per 1M tokens">{fmtPrice(model.outputPrice)}</span>
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex-1 min-w-0 flex flex-col py-10 pr-10 max-w-[960px]">

                    {/* Selected Tags */}
                    <div className="text-[0.8rem] text-foreground mb-[10px] font-bold flex gap-[10px] min-h-[24px]">
                        {selectedModels.map(model => (
                            <span key={model.id} className="bg-foreground/5 border border-foreground/10 px-3 py-[4px] rounded-full flex items-center gap-2">
                                {model.name}
                                <button
                                    onClick={() => handleModelToggle(model)}
                                    className="hover:text-red-500 opacity-50 hover:opacity-100"
                                >×</button>
                            </span>
                        ))}
                    </div>

                    {/* Prompt Area */}
                    <PromptInput
                        value={prompt}
                        onChange={setPrompt}
                        onSubmit={handleCompare}
                        isLoading={isLoading}
                    />

                    {/* Mode Toggle + Requests/Month */}
                    <div className="mb-4 flex items-center gap-4">
                        <ModeToggle value={mode} onChange={(newMode) => {
                            ph?.capture('mode_switched', { from: mode, to: newMode });
                            setMode(newMode);
                        }} />
                        <div className="flex items-center gap-2 text-sm">
                            <label htmlFor="requests-per-month" className="text-foreground/60 whitespace-nowrap">
                                Requests/month:
                            </label>
                            <input
                                id="requests-per-month"
                                type="number"
                                min={1}
                                value={requestsPerMonth}
                                onChange={(e) => setRequestsPerMonth(Math.max(1, parseInt(e.target.value) || 1))}
                                onBlur={(e) => ph?.capture('requests_month_filled', { value: parseInt(e.target.value) || 1 })}
                                className="w-[100px] bg-background border border-foreground/20 rounded px-2 py-1 text-foreground text-sm"
                            />
                        </div>
                    </div>

                    {/* Progressive Form (estimate mode) */}
                    {mode === 'estimate' && (
                        <div className="mb-4 space-y-2">
                            {/* Level 2: Refine calculation */}
                            <button
                                onClick={() => {
                                    setRefineOpen(prev => {
                                        if (!prev) ph?.capture('refine_opened');
                                        return !prev;
                                    });
                                }}
                                className="text-[0.8rem] text-foreground/50 hover:text-foreground/80 transition-colors"
                            >
                                {refineOpen ? '▼' : '▶'} Refine calculation
                            </button>
                            {refineOpen && (
                                <div className="pl-4 space-y-3 pb-2 border-l-2 border-foreground/10">
                                    <RatioSelector
                                        ratio={outputRatio}
                                        customValue={customRatio}
                                        onChange={(r, cv) => { setOutputRatio(r); if (cv !== undefined) setCustomRatio(cv); }}
                                    />
                                    <PrioritySelector value={priority} onChange={setPriority} />

                                    {/* Level 3: Advanced settings */}
                                    <button
                                        onClick={() => setAdvancedOpen(prev => !prev)}
                                        className="text-[0.75rem] text-foreground/40 hover:text-foreground/70 transition-colors"
                                    >
                                        {advancedOpen ? '▼' : '▶'} Advanced settings
                                    </button>
                                    {advancedOpen && (
                                        <div className="pl-4 border-l-2 border-foreground/10">
                                            <AdvancedSettings
                                                cachingEnabled={cachingEnabled}
                                                cacheHitRate={cacheHitRate}
                                                batchEnabled={batchEnabled}
                                                onCachingChange={setCachingEnabled}
                                                onCacheHitRateChange={setCacheHitRate}
                                                onBatchChange={setBatchEnabled}
                                                anyCachingSupported={anyCachingSupported}
                                                anyBatchSupported={anyBatchSupported}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'sample' && !isSignedIn && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="text-sm font-semibold text-red-400 mb-1">
                                Sign in required for Sample mode
                            </div>
                            <div className="text-xs text-foreground/50">
                                Sample mode makes real API calls and requires authentication. Please sign in to use it.
                            </div>
                        </div>
                    )}

                    {mode === 'sample' && isSignedIn && (
                        <div className="mb-4 p-4 bg-foreground/5 border border-foreground/10 rounded-lg">
                            <div className="text-sm font-semibold text-foreground/80 mb-1">
                                Sample Mode Active
                            </div>
                            <div className="text-xs text-foreground/50">
                                Using API keys from your session. Manage them in <Link href="/api-keys" className="underline hover:text-foreground">API Keys</Link> page.
                            </div>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="flex justify-end items-center gap-3 mb-[30px]">
                        <button
                            onClick={handleCompare}
                            disabled={isLoading || selectedModels.length === 0 || (mode === 'sample' && !isSignedIn)}
                            className="bg-red-500 text-white border-none px-[48px] py-[12px] rounded-full font-bold uppercase shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading ? 'Processing...' : mode === 'estimate' ? 'ESTIMATE' : 'SAMPLE'}
                        </button>
                    </div>

                    {/* Export Buttons */}
                    {((mode === 'estimate' && enrichedEstimates && enrichedEstimates.estimates.length > 0) ||
                      (mode === 'sample' && sampleResult && sampleResult.results && sampleResult.results.some(r => r.actualUsage.inputTokens > 0 || r.actualUsage.outputTokens > 0))) && (
                        <div className="flex justify-end mb-2">
                            <PlaygroundExportButtons
                                mode={mode}
                                estimates={enrichedEstimates?.estimates ?? null}
                                sampleResults={sampleResult?.results ?? null}
                                requestsPerMonth={requestsPerMonth}
                                resultsRef={resultsRef}
                                prompt={prompt}
                                winners={winners}
                            />
                        </div>
                    )}

                    {/* Constraint inputs for winner badges */}
                    {((mode === 'estimate' && enrichedEstimates && enrichedEstimates.estimates.length > 0) ||
                      (mode === 'sample' && sampleResult?.results?.some(r => r.actualUsage.inputTokens > 0 || r.actualUsage.outputTokens > 0))) && (
                        <div className="flex items-center gap-6 mb-3">
                            {mode === 'sample' && (
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/50 whitespace-nowrap">
                                        Max latency:
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="—"
                                        value={maxLatencyMs ?? ''}
                                        onChange={(e) => setMaxLatencyMs(e.target.value ? Number(e.target.value) : null)}
                                        className="w-[80px] bg-background border border-foreground/20 rounded px-2 py-1 text-foreground text-xs"
                                    />
                                    <span className="text-xs text-foreground/40">ms</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-foreground/50 whitespace-nowrap">
                                    Max budget:
                                </label>
                                <span className="text-xs text-foreground/40">$</span>
                                <input
                                    type="number"
                                    min={0}
                                    step="0.001"
                                    placeholder="—"
                                    value={maxBudget ?? ''}
                                    onChange={(e) => setMaxBudget(e.target.value ? Number(e.target.value) : null)}
                                    className="w-[80px] bg-background border border-foreground/20 rounded px-2 py-1 text-foreground text-xs"
                                />
                                <span className="text-xs text-foreground/40">/req</span>
                            </div>
                        </div>
                    )}

                    {/* Pro CTA banner — appears after 3rd calculation */}
                    {calcCount >= 3 && !ctaDismissed && (
                        <div className="mb-4 flex items-center justify-between gap-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                            <div className="text-sm text-foreground/80">
                                <span className="font-bold text-foreground">Unlock comparison history</span>
                                {' — '}join the Pro waitlist and be first to know when it launches.
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <Link
                                    href="/pro?utm_source=playground&utm_medium=cta_banner"
                                    className="text-xs font-bold uppercase tracking-wider bg-red-500 text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Join Waitlist →
                                </Link>
                                <button
                                    onClick={() => {
                                        setCtaDismissed(true);
                                        localStorage.setItem('trim_pro_cta_dismissed', 'true');
                                    }}
                                    className="text-foreground/30 hover:text-foreground/60 transition-colors text-lg leading-none"
                                    aria-label="Dismiss"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Cards Container */}
                    <div ref={resultsRef} className="flex gap-[20px] mt-[10px] overflow-x-auto pb-2">
                        {/* Estimate mode: show estimate cards */}
                        {mode === 'estimate' && enrichedEstimates && enrichedEstimates.estimates.length > 0 ? (
                            enrichedEstimates.estimates.map((estimate) => (
                                <EstimateCard
                                    key={estimate.modelId}
                                    estimate={estimate}
                                    isCheapest={estimate.modelId === winners.cheapest}
                                    requestsPerMonth={requestsPerMonth}
                                />
                            ))
                        ) : mode === 'sample' && sampleResult && sampleResult.results && sampleResult.results.length > 0 ? (
                            /* Sample mode: show response cards */
                            sampleResult.results.map((result, idx) => (
                                <ResponseCard
                                    key={idx}
                                    result={result}
                                    requestsPerMonth={requestsPerMonth}
                                    badges={[
                                        ...(result.modelId === winners.cheapest ? ['cheapest' as const] : []),
                                        ...(result.modelId === winners.fastest ? ['fastest' as const] : []),
                                    ]}
                                />
                            ))
                        ) : (
                            /* No results: show selected model cards or placeholders */
                            selectedModels.length > 0 ? (
                                selectedModels.map((model, idx) => (
                                    <ModelCard key={model.id} model={model} isFeatured={idx === 1} />
                                ))
                            ) : (
                                // Placeholder cards if nothing selected, just to match the visual
                                [visibleModels[0], visibleModels[1], visibleModels[2]].filter(Boolean).map((model, idx) => (
                                    <ModelCard key={model.id} model={model} isFeatured={idx === 1} />
                                ))
                            )
                        )}
                    </div>

                </div>

            </div>
        </div>

        <ExitIntentPopup hasCalculated={!!(enrichedEstimates || sampleResult)} />
        </>
    );
}
