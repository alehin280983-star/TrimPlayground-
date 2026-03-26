export type PricingSnapshotStatus = 'verified' | 'stale' | 'manual';

export interface PricingSnapshot {
    id: string;
    provider: string;
    model: string;
    priceInput: number;    // per 1M input tokens, USD
    priceOutput: number;   // per 1M output tokens, USD
    priceCached?: number;  // per 1M cached input tokens, USD
    priceTool?: number;    // per tool call if billed separately
    sourceUrl: string;
    fetchedAt: Date;
    status: PricingSnapshotStatus;
    validUntil?: Date;
}

export interface PricingLookupResult {
    snapshot: PricingSnapshot;
    isStale: boolean;
}
