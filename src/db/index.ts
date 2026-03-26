import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;
let _db: Db | null = null;

// Lazy — only connects when first called. Safe to import without DATABASE_URL.
export function getDb(): Db {
    if (!_db) {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error('DATABASE_URL is not set');
        const client = postgres(url);
        _db = drizzle(client, { schema });
    }
    return _db;
}

// Named export for convenience in routes that know DB is available
export { schema };
