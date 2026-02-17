'use client';

import { OutputInputRatio } from '@/types';

interface RatioSelectorProps {
    ratio: OutputInputRatio;
    customValue: number;
    onChange: (ratio: OutputInputRatio, customValue?: number) => void;
}

const PRESETS: { value: OutputInputRatio; label: string }[] = [
    { value: '1:1', label: '1:1' },
    { value: '1:2', label: '1:2' },
    { value: '1:4', label: '1:4' },
    { value: 'custom', label: 'Custom' },
];

export default function RatioSelector({ ratio, customValue, onChange }: RatioSelectorProps) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-[0.75rem] text-foreground/60 whitespace-nowrap">Output/Input ratio:</span>
            <div className="flex gap-1">
                {PRESETS.map(p => (
                    <button
                        key={p.value}
                        onClick={() => onChange(p.value, p.value === 'custom' ? customValue : undefined)}
                        className={`
                            px-3 py-1 rounded text-[0.75rem] font-medium transition-colors
                            ${ratio === p.value
                                ? 'bg-foreground text-background'
                                : 'bg-foreground/5 text-foreground/60 hover:bg-foreground/10'}
                        `}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            {ratio === 'custom' && (
                <div className="flex items-center gap-1">
                    <span className="text-[0.75rem] text-foreground/40">1:</span>
                    <input
                        type="number"
                        min={0.1}
                        max={20}
                        step={0.1}
                        value={customValue}
                        onChange={(e) => onChange('custom', Math.max(0.1, parseFloat(e.target.value) || 1))}
                        className="w-[60px] bg-background border border-foreground/20 rounded px-2 py-1 text-[0.75rem] text-foreground"
                    />
                </div>
            )}
        </div>
    );
}
