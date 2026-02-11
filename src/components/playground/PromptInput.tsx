'use client';

import { useState, useCallback, useEffect } from 'react';
import { countTokensSync } from '@/lib/tokens';

// Helper for number formatting
const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
};

interface PromptInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
    maxLength?: number;
    placeholder?: string;
}

export default function PromptInput({
    value,
    onChange,
    onSubmit,
    isLoading,
    maxLength = 10000,
    placeholder = 'Enter your prompt for comparison...',
}: PromptInputProps) {

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isLoading) {
                e.preventDefault();
                onSubmit();
            }
        },
        [onSubmit, isLoading]
    );

    return (
        <textarea
            id="prompt-input"
            name="prompt"
            aria-label="Prompt input for AI model comparison"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full h-[100px] p-[15px] border border-foreground/20 rounded-lg text-base resize-none mb-[15px] font-inherit focus:outline-none focus:border-foreground/40 focus:bg-foreground/5 transition-all bg-background text-foreground"
        />
    );
}
