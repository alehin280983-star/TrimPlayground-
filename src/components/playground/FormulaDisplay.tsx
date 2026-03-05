'use client';

import { usePostHog } from 'posthog-js/react';
import { EnrichedEstimate, FormulaPart } from '@/lib/estimate-calculator';

interface FormulaDisplayProps {
    estimate: EnrichedEstimate;
}

export default function FormulaDisplay({ estimate }: FormulaDisplayProps) {
    const ph = usePostHog();
    if (estimate.formulaSteps.length === 0) return null;

    return (
        <details
            className="mt-3 group"
            onToggle={(e) => {
                if ((e.target as HTMLDetailsElement).open) {
                    ph?.capture('formula_opened', { model_id: estimate.modelId });
                }
            }}
        >
            <summary className="text-[0.65rem] text-foreground/40 cursor-pointer hover:text-foreground/60 transition-colors select-none">
                How is this calculated?
            </summary>
            <div className="mt-2 bg-foreground/5 rounded p-3 text-[0.65rem] font-mono text-foreground/60 space-y-1">
                {estimate.formulaSteps.map((step, i) => (
                    <div key={i}>
                        {step.map((part: FormulaPart, j: number) =>
                            part.type === 'price' ? (
                                <span
                                    key={j}
                                    title={`Price verified: ${new Date(part.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
                                    className="underline decoration-dotted cursor-help text-foreground font-semibold"
                                >
                                    {part.text}
                                </span>
                            ) : (
                                <span key={j}>{part.text}</span>
                            )
                        )}
                    </div>
                ))}
            </div>
        </details>
    );
}
