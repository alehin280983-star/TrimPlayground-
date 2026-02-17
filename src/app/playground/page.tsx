'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Header } from '@/components/layout';
import { ModelCard, PromptInput, ResponseCard, EstimateCard, ModeToggle, OutputControl } from '@/components/playground';
import { ModelConfig, SampleResultV2, PriceEstimateV2, CalculationMode, ProviderType } from '@/types';
import { getAllModels } from '@/lib/config';

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
    const [expectedOutput, setExpectedOutput] = useState<number | undefined>(undefined);
    const [requestsPerMonth, setRequestsPerMonth] = useState(1000);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const allModels = getAllModels();
    const visibleModels = mode === 'sample' ? allModels.filter(isSampleSupportedModel) : allModels;

    useEffect(() => {
        if (mode !== 'sample') return;
        setSelectedModels(prev => prev.filter(isSampleSupportedModel));
    }, [mode]);

    // Group models by Category -> Provider for the sidebar
    const modelsByCategory = visibleModels.reduce((acc, model) => {
        const category = getModelCategory(model);
        if (!acc[category]) acc[category] = {} as Record<ProviderType, ModelConfig[]>;
        if (!acc[category][model.provider]) acc[category][model.provider] = [];
        acc[category][model.provider].push(model);
        return acc;
    }, {} as Record<ModelCategory, Record<ProviderType, ModelConfig[]>>);

    const handleModelToggle = (model: ModelConfig) => {
        setSelectedModels(prev => {
            if (prev.find(m => m.id === model.id)) {
                return prev.filter(m => m.id !== model.id);
            }
            if (prev.length >= 3) return prev; // Limit to 3 for the design
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
                        estimatedOutputTokens: expectedOutput,
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
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background font-sans text-foreground">
            <Header />

            <div className="flex p-10 gap-10 max-w-[1400px] mx-auto box-border h-[calc(100vh-60px)]">

                {/* LEFT COLUMN - Collapsible */}
                {isPanelOpen ? (
                    <div className="w-[30%] flex flex-col gap-5 h-full transition-all duration-300">
                        <div className="flex-grow bg-background border border-foreground/20 rounded-lg overflow-hidden flex flex-col shadow-sm">
                            <div className="bg-foreground text-background p-[15px] font-bold text-center uppercase text-sm flex items-center justify-between">
                                <span>Model Reference</span>
                                <button
                                    onClick={() => setIsPanelOpen(false)}
                                    className="text-background/70 hover:text-background text-lg leading-none"
                                    title="Collapse panel"
                                >
                                    ◀
                                </button>
                            </div>
                            <div className="p-[15px] overflow-y-auto h-full">
                                {CATEGORY_ORDER.map((category) => {
                                    const providersInCategory = modelsByCategory[category];
                                    if (!providersInCategory) return null;

                                    const providerEntries = Object.entries(providersInCategory)
                                        .sort(([a], [b]) => PROVIDER_LABELS[a as ProviderType].localeCompare(PROVIDER_LABELS[b as ProviderType]));

                                    if (providerEntries.length === 0) return null;

                                    return (
                                        <div key={category} className="mb-6">
                                            <div className="font-extrabold border-b border-foreground/20 pb-1 mb-3 text-[0.82rem] uppercase tracking-wide opacity-80">
                                                {CATEGORY_LABELS[category]}
                                            </div>
                                            {providerEntries.map(([provider, models]) => (
                                                <div key={`${category}-${provider}`} className="mb-4">
                                                    <div className="font-bold border-b border-foreground/10 pb-1 mb-2 text-[0.78rem] uppercase opacity-50">
                                                        {PROVIDER_LABELS[provider as ProviderType]}
                                                    </div>
                                                    {[...models].sort((a, b) => a.name.localeCompare(b.name)).map(model => (
                                                        <div
                                                            key={model.id}
                                                            onClick={() => handleModelToggle(model)}
                                                            className={`
                                                                text-[0.85rem] py-1.5 cursor-pointer hover:text-foreground transition-colors
                                                                ${selectedModels.find(m => m.id === model.id) ? 'font-bold text-foreground' : 'text-foreground/60'}
                                                            `}
                                                        >
                                                            {model.name} {selectedModels.find(m => m.id === model.id) && '(Selected)'}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        className="w-[48px] flex flex-col items-center bg-foreground text-background rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-sm h-full"
                        onClick={() => setIsPanelOpen(true)}
                        title="Expand model panel"
                    >
                        <div className="writing-mode-vertical text-xs font-bold uppercase tracking-widest py-4 flex-grow flex items-center"
                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        >
                            Models
                        </div>
                        <div className="pb-3 text-lg">▶</div>
                    </div>
                )}

                {/* RIGHT COLUMN */}
                <div className={`${isPanelOpen ? 'w-[70%]' : 'flex-1'} flex flex-col`}>

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
                        <ModeToggle value={mode} onChange={setMode} />
                        {mode === 'estimate' && (
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
                                    className="w-[100px] bg-background border border-foreground/20 rounded px-2 py-1 text-foreground text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {/* Conditional Controls based on mode */}
                    {mode === 'estimate' && (
                        <div className="mb-4">
                            <OutputControl
                                value={expectedOutput}
                                onChange={setExpectedOutput}
                                maxTokens={selectedModels[0]?.maxOutputTokens || 4096}
                            />
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
                    <div className="flex justify-between items-center mb-[30px]">
                        <button
                            onClick={() => setIsPanelOpen(prev => !prev)}
                            className="bg-transparent border border-foreground/40 text-foreground px-[24px] py-[10px] rounded-full font-semibold hover:bg-foreground/5 transition-colors"
                        >
                            {isPanelOpen ? '◀ Hide Models' : '▶ Select Models'}
                        </button>
                        <button
                            onClick={handleCompare}
                            disabled={isLoading || selectedModels.length === 0 || (mode === 'sample' && !isSignedIn)}
                            className="bg-red-500 text-white border-none px-[48px] py-[12px] rounded-full font-bold uppercase shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading ? 'Processing...' : mode === 'estimate' ? 'ESTIMATE' : 'SAMPLE'}
                        </button>
                    </div>

                    {/* Cards Container */}
                    <div className="flex justify-between gap-[20px] mt-[10px]">
                        {/* Estimate mode: show estimate cards */}
                        {mode === 'estimate' && estimateResult && Array.isArray(estimateResult.estimates) ? (
                            (() => {
                                const cheapestId = estimateResult.estimates.reduce<string | null>((cheapId, est) => {
                                    if (!cheapId) return est.modelId;
                                    const cheapEst = estimateResult.estimates.find(e => e.modelId === cheapId);
                                    if (!cheapEst) return est.modelId;
                                    return est.total.median * requestsPerMonth < cheapEst.total.median * requestsPerMonth
                                        ? est.modelId : cheapId;
                                }, null);
                                return estimateResult.estimates.map((estimate) => (
                                    <EstimateCard
                                        key={estimate.modelId}
                                        estimate={estimate}
                                        isCheapest={estimate.modelId === cheapestId}
                                        requestsPerMonth={requestsPerMonth}
                                    />
                                ));
                            })()
                        ) : mode === 'sample' && sampleResult && sampleResult.results && sampleResult.results.length > 0 ? (
                            /* Sample mode: show response cards */
                            sampleResult.results.map((result, idx) => (
                                <ResponseCard key={idx} result={result} />
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
    );
}
