'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Header } from '@/components/layout';
import { ModelCard, PromptInput, ResponseCard, EstimateCard, ModeToggle, OutputControl, APIKeyInput } from '@/components/playground';
import { ModelConfig, SampleResultV2, PriceEstimateV2, CalculationMode, ProviderType } from '@/types';
import { getAllModels, formatCost } from '@/lib/config';

export default function PlaygroundPage() {
    const { isSignedIn, isLoaded } = useUser();
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
    const [apiKeys, setApiKeys] = useState<Partial<Record<ProviderType, string>>>({});

    // Load API keys from session storage on mount
    useEffect(() => {
        const STORAGE_PREFIX = 'trim_api_key_';
        const providers: ProviderType[] = ['openai', 'anthropic', 'google', 'mistral', 'cohere', 'deepseek', 'xai', 'alibaba'];
        const keys: Partial<Record<ProviderType, string>> = {};

        providers.forEach(p => {
            if (typeof window !== 'undefined') {
                const key = localStorage.getItem(`${STORAGE_PREFIX}${p}`) || sessionStorage.getItem(`${STORAGE_PREFIX}${p}`);
                if (key) keys[p] = key;
            }
        });

        setApiKeys(keys);
    }, []);

    // Debug: Log when sampleResult changes
    useEffect(() => {
        console.log('sampleResult state changed:', sampleResult);
    }, [sampleResult]);

    const allModels = getAllModels();

    // Group models by provider for the sidebar
    const modelsByProvider = allModels.reduce((acc, model) => {
        if (!acc[model.provider]) acc[model.provider] = [];
        acc[model.provider].push(model);
        return acc;
    }, {} as Record<string, ModelConfig[]>);

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
                const providers: ProviderType[] = ['openai', 'anthropic', 'google', 'mistral', 'cohere', 'deepseek', 'xai', 'alibaba'];
                const freshApiKeys: Partial<Record<ProviderType, string>> = {};

                providers.forEach(p => {
                    if (typeof window !== 'undefined') {
                        const keyName = `${STORAGE_PREFIX}${p}`;
                        // Priority: localStorage for auth users, sessionStorage as fallback or for guests
                        const savedKey = localStorage.getItem(keyName) || sessionStorage.getItem(keyName);
                        if (savedKey) freshApiKeys[p] = savedKey;
                    }
                });

                console.log('Sample mode API keys loaded:', Object.keys(freshApiKeys)); // Debug log

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
                console.log('Sample API response:', data); // Debug log
                if (data.success && data.data) {
                    console.log('Setting sample results:', data.data.results?.length, 'results'); // Debug log
                    setSampleResult(data.data);
                } else {
                    console.error('Sample API returned unsuccessful response:', data); // Debug log
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

                {/* LEFT COLUMN */}
                <div className="w-[30%] flex flex-col gap-5 h-full">
                    <div className="flex-grow bg-background border border-foreground/20 rounded-lg overflow-hidden flex flex-col shadow-sm">
                        <div className="bg-foreground text-background p-[15px] font-bold text-center uppercase text-sm">
                            Model Reference
                        </div>
                        <div className="p-[15px] overflow-y-auto h-full">
                            {Object.entries(modelsByProvider).map(([provider, models]) => (
                                <div key={provider} className="mb-6">
                                    <div className="font-bold border-b border-foreground/10 pb-1 mb-2 text-[0.85rem] uppercase opacity-40">
                                        {provider}
                                    </div>
                                    {models.map(model => (
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
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="w-[70%] flex flex-col">

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

                    {/* Mode Toggle */}
                    <div className="mb-4">
                        <ModeToggle value={mode} onChange={setMode} />
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

                    {mode === 'sample' && (
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
                        <button className="bg-transparent border border-foreground/40 text-foreground px-[24px] py-[10px] rounded-full font-semibold hover:bg-foreground/5 transition-colors">
                            ▼ Select Models
                        </button>
                        <button
                            onClick={handleCompare}
                            disabled={isLoading || selectedModels.length === 0}
                            className="bg-red-500 text-white border-none px-[48px] py-[12px] rounded-full font-bold uppercase shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Processing...' : mode === 'estimate' ? 'ESTIMATE' : 'SAMPLE'}
                        </button>
                    </div>

                    {/* Cards Container */}
                    <div className="flex justify-between gap-[20px] mt-[10px]">
                        {/* Estimate mode: show estimate cards */}
                        {mode === 'estimate' && estimateResult && Array.isArray(estimateResult.estimates) ? (
                            estimateResult.estimates.map((estimate) => (
                                <EstimateCard
                                    key={estimate.modelId}
                                    estimate={estimate}
                                    isCheapest={estimate.modelId === estimateResult.cheapest}
                                />
                            ))
                        ) : mode === 'sample' && sampleResult && sampleResult.results ? (
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
                                [allModels[0], allModels[1], allModels[2]].map((model, idx) => (
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
