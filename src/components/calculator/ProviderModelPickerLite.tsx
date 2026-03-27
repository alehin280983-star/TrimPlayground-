'use client';

import type { ModelConfig, ProviderType } from '@/types';
import { formatCost } from '@/lib/tokens';

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

interface Props {
    label: string;
    value: string;
    onChange: (modelId: string) => void;
    models: ModelConfig[];
}

export function ProviderModelPickerLite({ label, value, onChange, models }: Props) {
    const byProvider = models.reduce((acc, m) => {
        (acc[m.provider] ??= []).push(m);
        return acc;
    }, {} as Record<ProviderType, ModelConfig[]>);

    return (
        <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mb-1">
                {label}
            </div>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-foreground/10 text-xs font-mono text-foreground/80 focus:outline-none focus:ring-1 focus:ring-foreground/30"
            >
                {Object.entries(byProvider).map(([provider, pModels]) => (
                    <optgroup key={provider} label={PROVIDER_LABELS[provider as ProviderType] ?? provider}>
                        {pModels
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.name} · {formatCost(m.inputPrice)}/{formatCost(m.outputPrice)} per 1K
                                </option>
                            ))}
                    </optgroup>
                ))}
            </select>
        </div>
    );
}
