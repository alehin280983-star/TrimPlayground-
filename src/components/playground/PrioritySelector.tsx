'use client';

import { PriorityMode } from '@/types';

interface PrioritySelectorProps {
    value: PriorityMode;
    onChange: (priority: PriorityMode) => void;
}

const OPTIONS: { value: PriorityMode; label: string }[] = [
    { value: 'cost', label: 'Cost' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'quality', label: 'Quality' },
];

export default function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-[0.75rem] text-foreground/60">Priority:</span>
            <div className="flex gap-1">
                {OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={`
                            px-3 py-1 rounded text-[0.75rem] font-medium transition-colors
                            ${value === opt.value
                                ? 'bg-foreground text-background'
                                : 'bg-foreground/5 text-foreground/60 hover:bg-foreground/10'}
                        `}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
