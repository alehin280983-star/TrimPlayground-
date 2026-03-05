'use client';

import { PriceEstimateV2 } from '@/types';
import { EnrichedEstimate } from '@/lib/estimate-calculator';
import { formatCost, formatTokens } from '@/lib/tokens';
import FormulaDisplay from './FormulaDisplay';

interface EstimateCardProps {
    estimate: EnrichedEstimate | PriceEstimateV2;
    isCheapest?: boolean;
    requestsPerMonth?: number;
}

function isEnriched(est: EnrichedEstimate | PriceEstimateV2): est is EnrichedEstimate {
    return 'monthlyCost' in est;
}

export default function EstimateCard({ estimate, isCheapest, requestsPerMonth = 1000 }: EstimateCardProps) {
    const enriched = isEnriched(estimate) ? estimate : null;
    const isFree = estimate.total.median === 0 && estimate.total.max === 0;

    const monthlyCostMedian = enriched
        ? enriched.monthlyCost.median
        : estimate.total.median * requestsPerMonth;

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

    const getPriceStaleness = (priceUpdatedAt: string) => {
        const days = Math.floor((Date.now() - new Date(priceUpdatedAt).getTime()) / 86_400_000);
        if (days < 7) return null;
        if (days < 30) return { days, color: 'text-orange-300', label: `Prices updated ${days}d ago` };
        return { days, color: 'text-red-300', label: `Prices updated ${days}d ago` };
    };

    const staleness = enriched ? getPriceStaleness(enriched.modelConfig.priceUpdatedAt) : null;

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
                {staleness && (
                    <div className={`text-[0.6rem] font-medium mt-1 ${staleness.color}`}>
                        ⚠ {staleness.label}
                    </div>
                )}
                {isCheapest && (
                    <div className="absolute top-2 right-2 bg-white text-green-600 px-2 py-1 rounded text-[0.65rem] font-bold">
                        CHEAPEST
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-[20px] flex-grow">
                {/* Per-request Cost */}
                <div className="text-center mb-4 pb-4 border-b border-foreground/10">
                    <div className="text-[0.7rem] text-foreground/50 uppercase font-bold mb-1">Per Request</div>
                    <div className="text-[1.4rem] font-bold text-foreground mb-1">
                        {formatCost(estimate.total.median)}
                    </div>
                    {isFree ? (
                        <div className="text-[0.7rem] text-green-600 font-medium">
                            This model is free to use
                        </div>
                    ) : (
                        <div className="text-[0.65rem] text-foreground/40">
                            Range: {formatCost(estimate.total.min)} - {formatCost(estimate.total.max)}
                        </div>
                    )}
                </div>

                {/* Monthly Cost */}
                {!isFree && (
                    <div className="text-center mb-4 pb-4 border-b border-foreground/10">
                        <div className="text-[0.7rem] text-foreground/50 uppercase font-bold mb-1">Monthly Cost</div>
                        <div className="text-[1.8rem] font-bold text-foreground">
                            {formatCost(monthlyCostMedian)}
                        </div>
                        <div className="text-[0.65rem] text-foreground/40">
                            at {requestsPerMonth.toLocaleString()} requests/month
                        </div>
                        {/* Batch line */}
                        {enriched && enriched.supportsBatch && enriched.monthlyCost !== enriched.monthlyCost && (
                            <div className="text-[0.7rem] text-green-600 font-medium mt-1">
                                With Batch API: {formatCost(enriched.monthlyCost.median)}
                            </div>
                        )}
                    </div>
                )}

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
                    {/* Caching/Batch notes */}
                    {enriched && !enriched.supportsCaching && (
                        <div className="text-[0.65rem] text-foreground/30 italic">Caching not available</div>
                    )}
                    {enriched && !enriched.supportsBatch && (
                        <div className="text-[0.65rem] text-foreground/30 italic">Batch API not available</div>
                    )}
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
                    <div className="space-y-1 mb-3">
                        {estimate.warnings.map((warning, idx) => (
                            <div key={idx} className="text-[0.65rem] text-amber-700 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded">
                                ℹ {warning}
                            </div>
                        ))}
                    </div>
                )}

                {/* Formula */}
                {enriched && <FormulaDisplay estimate={enriched} />}
            </div>
        </div>
    );
}
