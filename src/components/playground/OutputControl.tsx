'use client';

import { useState, useEffect } from 'react';

interface OutputControlProps {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    maxTokens?: number;
}

export default function OutputControl({
    value,
    onChange,
    maxTokens = 4096
}: OutputControlProps) {
    const [isCustom, setIsCustom] = useState(value !== undefined);
    const [localValue, setLocalValue] = useState(value || Math.floor(maxTokens / 2));

    useEffect(() => {
        if (isCustom) {
            onChange(localValue);
        } else {
            onChange(undefined);
        }
    }, [isCustom, localValue, onChange]);

    return (
        <div className="space-y-3 p-4 bg-foreground/5 rounded-lg border border-foreground/10">
            <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground/80">
                    Expected Output Tokens
                </label>
                <button
                    onClick={() => setIsCustom(!isCustom)}
                    className={`
            text-xs font-medium px-3 py-1 rounded-full transition-colors
            ${isCustom
                            ? 'bg-foreground text-background'
                            : 'bg-foreground/10 text-foreground/60 hover:bg-foreground/20'}
          `}
                >
                    {isCustom ? 'Custom' : 'Auto'}
                </button>
            </div>

            {isCustom && (
                <div className="space-y-2">
                    <input
                        type="range"
                        min={100}
                        max={maxTokens}
                        step={100}
                        value={localValue}
                        onChange={(e) => setLocalValue(Number(e.target.value))}
                        className="w-full accent-foreground"
                    />
                    <div className="flex justify-between text-xs text-foreground/40">
                        <span>100</span>
                        <span className="font-bold text-foreground">{localValue.toLocaleString('en-US')} tokens</span>
                        <span>{maxTokens.toLocaleString('en-US')}</span>
                    </div>
                </div>
            )}

            {!isCustom && (
                <p className="text-xs text-foreground/40">
                    Auto: 50% of model&apos;s max output ({Math.floor(maxTokens / 2).toLocaleString('en-US')} tokens)
                </p>
            )}
        </div>
    );
}
