'use client';

import { CalculationMode } from '@/types';

interface ModeToggleProps {
    value: CalculationMode;
    onChange: (mode: CalculationMode) => void;
}

export default function ModeToggle({ value, onChange }: ModeToggleProps) {
    return (
        <div className="flex bg-foreground/5 rounded-full p-1 border border-foreground/10">
            <button
                onClick={() => onChange('estimate')}
                className={`
          px-6 py-2 rounded-full text-sm font-semibold transition-all
          ${value === 'estimate'
                        ? 'bg-foreground text-background'
                        : 'text-foreground/60 hover:text-foreground'}
        `}
            >
                Estimate
            </button>
            <button
                onClick={() => onChange('sample')}
                className={`
          px-6 py-2 rounded-full text-sm font-semibold transition-all
          ${value === 'sample'
                        ? 'bg-red-500 text-white'
                        : 'text-foreground/60 hover:text-foreground'}
        `}
            >
                Sample
            </button>
        </div>
    );
}
