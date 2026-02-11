'use client';

import { PriceRange } from '@/types';

interface RangeDisplayProps {
    range: PriceRange;
    label?: string;
}

function formatPrice(value: number): string {
    if (value < 0.01) return `$${value.toFixed(4)}`;
    if (value < 1) return `$${value.toFixed(3)}`;
    return `$${value.toFixed(2)}`;
}

export default function RangeDisplay({ range, label }: RangeDisplayProps) {
    const { min, median, max } = range;

    // Calculate position of median on the bar (0-100%)
    const medianPosition = max > min
        ? ((median - min) / (max - min)) * 100
        : 50;

    return (
        <div className="space-y-2">
            {label && (
                <div className="text-xs font-bold text-foreground/40 uppercase tracking-wide">
                    {label}
                </div>
            )}

            {/* Visual bar */}
            <div className="relative h-2 bg-foreground/10 rounded-full overflow-hidden">
                <div
                    className="absolute h-full bg-foreground/30 rounded-full"
                    style={{ width: '100%' }}
                />
                <div
                    className="absolute top-0 w-2 h-2 bg-foreground rounded-full transform -translate-x-1/2"
                    style={{ left: `${medianPosition}%` }}
                />
            </div>

            {/* Labels */}
            <div className="flex justify-between text-xs text-foreground/60">
                <span>{formatPrice(min)}</span>
                <span className="font-bold text-foreground">{formatPrice(median)}</span>
                <span>{formatPrice(max)}</span>
            </div>
        </div>
    );
}
