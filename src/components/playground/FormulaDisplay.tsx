'use client';

import { EnrichedEstimate } from '@/lib/estimate-calculator';

interface FormulaDisplayProps {
    estimate: EnrichedEstimate;
}

export default function FormulaDisplay({ estimate }: FormulaDisplayProps) {
    if (estimate.formulaSteps.length === 0) return null;

    return (
        <details className="mt-3 group">
            <summary className="text-[0.65rem] text-foreground/40 cursor-pointer hover:text-foreground/60 transition-colors select-none">
                How is this calculated?
            </summary>
            <div className="mt-2 bg-foreground/5 rounded p-3 text-[0.65rem] font-mono text-foreground/60 space-y-1">
                {estimate.formulaSteps.map((step, i) => (
                    <div key={i}>{step}</div>
                ))}
            </div>
        </details>
    );
}
