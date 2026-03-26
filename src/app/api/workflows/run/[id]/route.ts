import { NextRequest, NextResponse } from 'next/server';
import { getDb, schema } from '@/db';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const db = getDb();
        const run = await db.query.workflowRun.findFirst({
            where: eq(schema.workflowRun.runId, id),
        });

        if (!run) {
            return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 });
        }

        const steps = await db.query.stepLog.findMany({
            where: eq(schema.stepLog.runId, id),
        });

        return NextResponse.json({ success: true, data: { run, steps } });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'DB unavailable';
        return NextResponse.json({ success: false, error: message }, { status: 503 });
    }
}
