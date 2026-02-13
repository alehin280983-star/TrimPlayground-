'use client';

import { SampleResultV2, PriceEstimateV2 } from '@/types';
import { formatCost, formatTokens } from '@/lib/tokens';

interface ResponseCardProps {
    result: SampleResultV2 | PriceEstimateV2;
}

export default function ResponseCard({ result }: ResponseCardProps) {
    const isSample = 'actualCost' in result;
    const isEstimate = !isSample;
    const sampleMedia = isSample ? result.media : undefined;
    const normalizedPreview = isSample
        ? result.responsePreview
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/__(.*?)__/g, '$1')
            .trim()
        : '';

    // For estimate mode, use median values
    const displayCost = isSample
        ? result.actualCost
        : result.total.median;

    const displayTokens = isSample
        ? result.actualUsage.inputTokens + result.actualUsage.outputTokens
        : (typeof result.breakdown.output.tokens === 'number'
            ? result.breakdown.output.tokens
            : result.breakdown.output.tokens.median);

    return (
        <div className="flex-1 flex flex-col shadow-sm rounded-lg overflow-hidden bg-background border border-foreground/10">
            {/* Header */}
            <div className="bg-foreground text-background p-[15px] flex flex-col h-[60px] justify-center">
                <div className="text-[1rem] font-bold uppercase tracking-wider">
                    {result.modelName}
                </div>
                <div className="text-[0.7rem] opacity-70">
                    {`${formatCost(displayCost)} • ${formatTokens(displayTokens)} total tokens`}
                    {isEstimate && ` (est)`}
                </div>
            </div>

            {/* Body */}
            <div className="p-[20px] text-left flex-grow overflow-y-auto max-h-[300px] text-sm text-foreground/80">
                {isSample ? (
                    <>
                        {sampleMedia?.type === 'image' && sampleMedia.url && (
                            <div className="mb-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={sampleMedia.url}
                                    alt={`${result.modelName} output`}
                                    className="w-full max-h-[220px] object-cover rounded border border-foreground/10"
                                    loading="lazy"
                                />
                            </div>
                        )}

                        {sampleMedia?.type === 'video' && sampleMedia.url && (
                            <div className="mb-4">
                                <video
                                    src={sampleMedia.url}
                                    controls
                                    preload="metadata"
                                    className="w-full max-h-[220px] rounded border border-foreground/10 bg-black"
                                />
                            </div>
                        )}

                        <div className="whitespace-pre-wrap leading-relaxed mb-4 break-all">
                            {normalizedPreview || '⚠️ Empty response from model'}
                        </div>

                        {result.warnings.length > 0 && (
                            <div className="mb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                {result.warnings.map((warning, idx) => (
                                    <div key={idx} className="break-words">⚠️ {warning}</div>
                                ))}
                            </div>
                        )}

                        <div className="text-xs text-foreground/50 border-t border-foreground/10 pt-2">
                            <div>Total Cost: {formatCost(result.actualCost)}</div>
                            <div>Latency: {result.latencyMs}ms</div>
                            {sampleMedia?.type === 'video' && sampleMedia.durationSeconds && (
                                <div>Duration: {sampleMedia.durationSeconds.toFixed(1)}s</div>
                            )}
                            {sampleMedia?.type === 'image' && (
                                <div>Mode: Image Generation</div>
                            )}
                            {sampleMedia?.type === 'video' && (
                                <div>Status: {sampleMedia.status || 'unknown'}</div>
                            )}
                            {!sampleMedia && (
                                <>
                                    <div>Input Cost: {formatCost(result.breakdown.input.cost)}</div>
                                    <div>Output Cost: {formatCost(typeof result.breakdown.output.cost === 'number' ? result.breakdown.output.cost : result.breakdown.output.cost.median)}</div>
                                    <div>Input: {formatTokens(result.actualUsage.inputTokens)} tokens</div>
                                    <div>Output: {formatTokens(result.actualUsage.outputTokens)} tokens</div>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-foreground/60 uppercase">
                                Cost Estimate
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                    <div className="text-foreground/50">Min</div>
                                    <div className="font-bold">{formatCost(result.total.min)}</div>
                                </div>
                                <div>
                                    <div className="text-foreground/50">Median</div>
                                    <div className="font-bold">{formatCost(result.total.median)}</div>
                                </div>
                                <div>
                                    <div className="text-foreground/50">Max</div>
                                    <div className="font-bold">{formatCost(result.total.max)}</div>
                                </div>
                            </div>
                        </div>

                        {result.warnings.length > 0 && (
                            <div className="mt-3 text-xs text-yellow-600 dark:text-yellow-500">
                                {result.warnings.map((warning, idx) => (
                                    <div key={idx}>⚠️ {warning}</div>
                                ))}
                            </div>
                        )}

                        <div className="mt-3 text-xs text-foreground/40">
                            Confidence: {result.confidence}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
