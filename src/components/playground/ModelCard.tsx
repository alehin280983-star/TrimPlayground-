'use client';

import { ModelConfig } from '@/types';

interface ModelCardProps {
    model: ModelConfig;
    isFeatured?: boolean;
}

export default function ModelCard({ model, isFeatured }: ModelCardProps) {
    return (
        <div className={`
      flex-1 flex flex-col shadow-sm rounded-lg overflow-hidden transition-transform duration-300 hover:-translate-y-1 bg-background border border-foreground/10
      ${isFeatured ? 'ring-2 ring-foreground/20' : ''}
    `}>
            {/* Header */}
            <div className={`
        bg-foreground text-background p-[25px] text-center flex flex-col items-center justify-center h-[80px]
        ${isFeatured ? 'opacity-90' : ''}
      `}>
                <div className="text-[1.1rem] font-extrabold uppercase tracking-wider mb-[5px]">
                    {model.name}
                </div>
                <div className="text-[0.8rem] opacity-70 font-semibold uppercase">
                    {model.provider}
                </div>
            </div>

            {/* Body */}
            <div className="p-[20px] bg-background flex-grow flex flex-col justify-center border-t border-foreground/10">
                <div className="flex justify-between gap-2 border-b border-dashed border-foreground/10 pb-4 mb-4 relative">
                    {model.pricePerSecond ? (
                        <div className="w-full text-center">
                            <div className="text-[0.7rem] text-foreground/50 uppercase font-bold mb-1 tracking-wide">Cost</div>
                            <div className="text-[1.2rem] font-bold text-foreground">${model.pricePerSecond}</div>
                            <div className="text-[0.6rem] text-foreground/40">/ second</div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 text-center border-r border-foreground/10 pr-2">
                                <div className="text-[0.7rem] text-foreground/50 uppercase font-bold mb-1 tracking-wide">
                                    {model.pricingTiers ? 'From Input' : 'Input'}
                                </div>
                                <div className="text-[1.1rem] font-bold text-foreground">
                                    {model.pricingTiers ? 'From ' : ''}${model.inputPrice}
                                </div>
                                <div className="text-[0.6rem] text-foreground/40">/ 1K tokens</div>
                            </div>

                            <div className="flex-1 text-center pl-2">
                                <div className="text-[0.7rem] text-foreground/50 uppercase font-bold mb-1 tracking-wide">
                                    {model.pricingTiers ? 'From Output' : 'Output'}
                                </div>
                                <div className="text-[1.1rem] font-bold text-foreground">
                                    {model.pricingTiers ? 'From ' : ''}${model.outputPrice}
                                </div>
                                <div className="text-[0.6rem] text-foreground/40">/ 1K tokens</div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Info */}
                <div className="text-center text-[0.75rem] text-foreground/60 font-medium pt-1 flex items-center justify-center gap-1">
                    <span>
                        {model.maxTokens > 0
                            ? `Context: ${(model.maxTokens / 1000).toFixed(0)}k`
                            : (model.pricePerSecond ? 'Video Generation' : 'Image Generation')
                        }
                    </span>
                    {/* Price source tooltip */}
                    <span className="group relative inline-flex items-center">
                        <span className="text-[0.65rem] text-foreground/30 cursor-default select-none">?</span>
                        <span className="
                            pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[200px]
                            bg-foreground text-background text-[0.65rem] rounded px-2 py-1.5 leading-relaxed
                            opacity-0 group-hover:opacity-100 transition-opacity z-10 text-center
                        ">
                            Verified {model.priceUpdatedAt.split('-').reverse().join('.')}
                            {model.priceSourceUrl && (
                                <> · <a
                                    href={model.priceSourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline pointer-events-auto"
                                    onClick={e => e.stopPropagation()}
                                >source</a></>
                            )}
                        </span>
                    </span>
                </div>
            </div>
        </div>
    );
}
