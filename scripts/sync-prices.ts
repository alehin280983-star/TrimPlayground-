/**
 * Sync pricing snapshots from models.ts → DB.
 *
 * Usage:
 *   npm run sync-prices
 *
 * Requires DATABASE_URL in environment.
 * Run this every time you update prices in src/lib/config/models.ts.
 */

// Load .env.local before anything else
import { config } from 'dotenv';
config({ path: '.env.local' });

import { seedPricingSnapshots } from '../src/lib/pricing/seed';

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('Error: DATABASE_URL is not set. Add it to .env.local');
        process.exit(1);
    }

    console.log('Syncing pricing snapshots from models.ts → database...\n');

    const result = await seedPricingSnapshots();

    console.log(`✓ Upserted: ${result.upserted}`);
    console.log(`  Skipped (already up to date): ${result.skipped}`);

    if (result.errors.length > 0) {
        console.error('\nErrors:');
        result.errors.forEach(e => console.error('  ✗', e));
        process.exit(1);
    }

    console.log('\nDone.');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
