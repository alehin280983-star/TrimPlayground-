'use client';

import { PriceEstimateV2 } from '@/types';
import { formatCost, formatTokens } from '@/lib/tokens';

interface EstimateCardProps {
    estimate: PriceEstimateV2;
    isCheapest?: boolean;
}

export default function EstimateCard({ estimate, isCheapest }: EstimateCardProps) {
    const getConfidenceColor = (confidence: string) => {
        switch (confidence) {
            case 'high': return 'text-green-600';
            case 'medium': return 'text-yellow-600';
            case 'low': return 'text-orange-600';
            default: return 'text-foreground/50';
        }
    };

    const getConfidenceLabel = (confidence: string) => {
        switch (confidence) {
            case 'high': return '~95%';
            case 'medium': return '~85%';
            case 'low': return '~70%';
            default: return 'N/A';
        }
    };

    return (
        <div className={`
            flex-1 flex flex-col shadow-sm rounded-lg overflow-hidden bg-background border transition-transform duration-300 hover:-translate-y-1
            ${isCheapest ? 'border-green-500 ring-2 ring-green-500/20' : 'border-foreground/10'}
        `}>
            {/* Header */}
            <div className={`
                bg-foreground text-background p-[20px] flex flex-col justify-center relative
                ${isCheapest ? 'bg-green-600' : ''}
            `}>
                <div className="text-[1rem] font-bold uppercase tracking-wider">
                    {estimate.modelName}
                </div>
                <div className="text-[0.7rem] opacity-70 mt-1">
                    {estimate.provider}
                </div>
                {isCheapest && (
                    <div className="absolute top-2 right-2 bg-white text-green-600 px-2 py-1 rounded text-[0.65rem] font-bold">
                        CHEAPEST
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-[20px] flex-grow">
                {/* Total Cost Range */}
                <div className="text-center mb-4 pb-4 border-b border-foreground/10">
                    <div className="text-[0.7rem] text-foreground/50 uppercase font-bold mb-1">Estimated Total</div>
                    <div className="text-[1.8rem] font-bold text-foreground mb-1">
                        {formatCost(estimate.total.median)}
                    </div>
                    <div className="text-[0.65rem] text-foreground/40">
                        Range: {formatCost(estimate.total.min)} - {formatCost(estimate.total.max)}
                    </div>
                </div>

                {/* Token Breakdown */}
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center text-[0.75rem]">
                        <span className="text-foreground/60">Input Tokens:</span>
                        <span className="font-semibold text-foreground">{formatTokens(estimate.breakdown.input.tokens)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[0.75rem]">
                        <span className="text-foreground/60">Output Tokens (est.):</span>
                        <span className="font-semibold text-foreground">
                            {typeof estimate.breakdown.output.tokens === 'number'
                                ? formatTokens(estimate.breakdown.output.tokens)
                                : formatTokens(estimate.breakdown.output.tokens.median)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[0.75rem]">
                        <span className="text-foreground/60">Input Cost:</span>
                        <span className="font-semibold text-foreground">{formatCost(estimate.breakdown.input.cost)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[0.75rem]">
                        <span className="text-foreground/60">Output Cost (est.):</span>
                        <span className="font-semibold text-foreground">
                            {typeof estimate.breakdown.output.cost === 'number'
                                ? formatCost(estimate.breakdown.output.cost)
                                : formatCost(estimate.breakdown.output.cost.median)}
                        </span>
                    </div>
                </div>

                {/* Confidence */}
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-foreground/10">
                    <span className="text-[0.7rem] text-foreground/60 uppercase font-bold">Confidence:</span>
                    <span className={`text-[0.75rem] font-bold uppercase ${getConfidenceColor(estimate.confidence)}`}>
                        {estimate.confidence} {getConfidenceLabel(estimate.confidence)}
                    </span>
                </div>

                {/* Warnings */}
                {estimate.warnings && estimate.warnings.length > 0 && (
                    <div className="space-y-1">
                        {estimate.warnings.map((warning, idx) => (
                            <div key={idx} className="text-[0.65rem] text-orange-600 bg-orange-50 dark:bg-orange-900/10 px-2 py-1 rounded">
                                ⚠️ {warning}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
