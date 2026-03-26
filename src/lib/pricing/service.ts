import { PricingSnapshot, PricingLookupResult } from './types';

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

export class PricingService {
    private snapshots: Map<string, PricingSnapshot>;

    constructor(snapshots: PricingSnapshot[] = []) {
        this.snapshots = new Map(
            snapshots.map(s => [this.key(s.provider, s.model), s])
        );
    }

    private key(provider: string, model: string): string {
        return `${provider}::${model}`;
    }

    get(provider: string, model: string): PricingLookupResult | null {
        const snapshot = this.snapshots.get(this.key(provider, model));
        if (!snapshot) return null;

        const isStale =
            snapshot.status === 'stale' ||
            Date.now() - snapshot.fetchedAt.getTime() > STALE_THRESHOLD_MS;

        return { snapshot, isStale };
    }

    // Calculate cost for a given usage against a snapshot
    calculateCost(
        provider: string,
        model: string,
        inputTokens: number,
        outputTokens: number,
        cachedInputTokens = 0
    ): { inputCost: number; outputCost: number; cachedCost: number; total: number; snapshotId: string } | null {
        const result = this.get(provider, model);
        if (!result) return null;

        const { snapshot } = result;
        const inputCost = (inputTokens / 1_000_000) * snapshot.priceInput;
        const outputCost = (outputTokens / 1_000_000) * snapshot.priceOutput;
        const cachedCost = snapshot.priceCached
            ? (cachedInputTokens / 1_000_000) * snapshot.priceCached
            : 0;

        return {
            inputCost,
            outputCost,
            cachedCost,
            total: inputCost + outputCost + cachedCost,
            snapshotId: snapshot.id,
        };
    }

    upsert(snapshot: PricingSnapshot): void {
        this.snapshots.set(this.key(snapshot.provider, snapshot.model), snapshot);
    }

    markStale(provider: string, model: string): void {
        const snapshot = this.snapshots.get(this.key(provider, model));
        if (snapshot) {
            snapshot.status = 'stale';
        }
    }
}
