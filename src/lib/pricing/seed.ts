import { getAllModels } from '@/lib/config';
import { getDb, schema } from '@/db';
import { eq, and } from 'drizzle-orm';

// Fallback source URL when model has no priceSourceUrl
const FALLBACK_SOURCE =
    'https://github.com/alehin280983-star/TrimPlayground-/blob/main/src/lib/config/models.ts';

export interface SeedResult {
    upserted: number;
    skipped: number;
    errors: string[];
}

// Reads all models from models.ts and writes pricing_snapshot records to DB.
// prices in models.ts are per 1K tokens — snapshot stores per 1M, so we multiply by 1000.
export async function seedPricingSnapshots(): Promise<SeedResult> {
    const db = getDb();
    const models = getAllModels().filter(m => (m.modality ?? 'text') === 'text');

    let upserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const model of models) {
        try {
            if (!model.priceUpdatedAt) {
                skipped++;
                continue;
            }

            const fetchedAt = new Date(model.priceUpdatedAt);
            const sourceUrl = model.priceSourceUrl ?? FALLBACK_SOURCE;

            // prices.ts is per 1K → snapshot is per 1M
            const priceInput = String((model.inputPrice * 1000).toFixed(10));
            const priceOutput = String((model.outputPrice * 1000).toFixed(10));
            const priceCached = model.cachedInputPrice != null
                ? String((model.cachedInputPrice * 1000).toFixed(10))
                : null;

            const existing = await db.query.pricingSnapshot.findFirst({
                where: and(
                    eq(schema.pricingSnapshot.provider, model.provider),
                    eq(schema.pricingSnapshot.model, model.id)
                ),
            });

            if (existing) {
                const existingDate = new Date(existing.fetchedAt);
                if (existingDate < fetchedAt) {
                    // Newer prices — mark old as stale, insert new snapshot
                    await db
                        .update(schema.pricingSnapshot)
                        .set({ status: 'stale', validUntil: fetchedAt })
                        .where(eq(schema.pricingSnapshot.id, existing.id));

                    await db.insert(schema.pricingSnapshot).values({
                        provider: model.provider,
                        model: model.id,
                        priceInput,
                        priceOutput,
                        priceCached,
                        sourceUrl,
                        fetchedAt,
                        status: 'manual',
                    });
                    upserted++;
                } else {
                    skipped++;
                }
            } else {
                await db.insert(schema.pricingSnapshot).values({
                    provider: model.provider,
                    model: model.id,
                    priceInput,
                    priceOutput,
                    priceCached,
                    sourceUrl,
                    fetchedAt,
                    status: 'manual',
                });
                upserted++;
            }
        } catch (err) {
            errors.push(`${model.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    return { upserted, skipped, errors };
}
