'use client';

interface AdvancedSettingsProps {
    cachingEnabled: boolean;
    cacheHitRate: number;
    batchEnabled: boolean;
    onCachingChange: (enabled: boolean) => void;
    onCacheHitRateChange: (rate: number) => void;
    onBatchChange: (enabled: boolean) => void;
    anyCachingSupported: boolean;
    anyBatchSupported: boolean;
}

export default function AdvancedSettings({
    cachingEnabled,
    cacheHitRate,
    batchEnabled,
    onCachingChange,
    onCacheHitRateChange,
    onBatchChange,
    anyCachingSupported,
    anyBatchSupported,
}: AdvancedSettingsProps) {
    return (
        <div className="space-y-3">
            {/* Prompt Caching */}
            <div className="flex items-center gap-3">
                <label className={`flex items-center gap-2 text-[0.75rem] ${!anyCachingSupported ? 'opacity-40' : ''}`}>
                    <input
                        type="checkbox"
                        checked={cachingEnabled}
                        onChange={(e) => onCachingChange(e.target.checked)}
                        disabled={!anyCachingSupported}
                        className="rounded"
                    />
                    <span className="text-foreground/80 font-medium">Prompt caching</span>
                </label>
                {!anyCachingSupported && (
                    <span className="text-[0.65rem] text-foreground/40">Not supported by selected models</span>
                )}
                {cachingEnabled && anyCachingSupported && (
                    <div className="flex items-center gap-2">
                        <span className="text-[0.7rem] text-foreground/50">Hit rate:</span>
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={cacheHitRate}
                            onChange={(e) => onCacheHitRateChange(Math.min(100, Math.max(1, parseInt(e.target.value) || 80)))}
                            className="w-[55px] bg-background border border-foreground/20 rounded px-2 py-0.5 text-[0.75rem] text-foreground"
                        />
                        <span className="text-[0.7rem] text-foreground/40">%</span>
                    </div>
                )}
            </div>

            {/* Batch API */}
            <div className="flex items-center gap-3">
                <label className={`flex items-center gap-2 text-[0.75rem] ${!anyBatchSupported ? 'opacity-40' : ''}`}>
                    <input
                        type="checkbox"
                        checked={batchEnabled}
                        onChange={(e) => onBatchChange(e.target.checked)}
                        disabled={!anyBatchSupported}
                        className="rounded"
                    />
                    <span className="text-foreground/80 font-medium">Batch API</span>
                </label>
                {!anyBatchSupported && (
                    <span className="text-[0.65rem] text-foreground/40">Not supported by selected models</span>
                )}
                {anyBatchSupported && (
                    <span className="text-[0.65rem] text-foreground/40">50% discount for non-realtime requests</span>
                )}
            </div>
        </div>
    );
}
