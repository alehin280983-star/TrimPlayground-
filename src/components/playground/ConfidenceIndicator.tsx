'use client';

import { ConfidenceLevel } from '@/types';

interface ConfidenceIndicatorProps {
    level: ConfidenceLevel;
}

const config: Record<ConfidenceLevel, { label: string; bars: number }> = {
    low: { label: 'Low Confidence', bars: 1 },
    medium: { label: 'Medium Confidence', bars: 2 },
    high: { label: 'High Confidence', bars: 3 },
};

export default function ConfidenceIndicator({ level }: ConfidenceIndicatorProps) {
    const { label, bars } = config[level];

    return (
        <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`
              w-1.5 rounded-full transition-all
              ${i <= bars ? 'bg-foreground' : 'bg-foreground/20'}
            `}
                        style={{ height: `${8 + i * 4}px` }}
                    />
                ))}
            </div>
            <span className="text-xs font-medium text-foreground/60">{label}</span>
        </div>
    );
}
