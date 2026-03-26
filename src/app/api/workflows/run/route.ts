import { NextRequest, NextResponse } from 'next/server';
import { getTemplate, runWorkflow } from '@/lib/workflows';
import { TaskClassSchema } from '@/lib/taxonomy';
import { getDb, schema } from '@/db';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RequestSchema = z.object({
    templateId: z.string(),
    modelId: z.string(),
    apiKey: z.string().min(1),
    prompt: z.string().min(1),
    taskClass: TaskClassSchema,
});

export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // §6.6: Production live mode without persistence is not allowed.
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
        return NextResponse.json(
            { success: false, error: 'Persistence required in production mode. Set DATABASE_URL.' },
            { status: 503 }
        );
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { templateId, modelId, apiKey, prompt, taskClass } = parsed.data;

    const template = getTemplate(templateId);
    if (!template) {
        return NextResponse.json({ success: false, error: `Template ${templateId} not found` }, { status: 404 });
    }

    let result;
    try {
        result = await runWorkflow(template, { prompt, modelId, apiKey, taskClass });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Workflow run failed';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }

    // Persist to DB if available (graceful degradation)
    try {
        const db = getDb();
        await db.insert(schema.workflowRun).values({
            runId: result.runId,
            workflowId: templateId,
            mode: 'live',
            taskClass,
            architecturePattern: template.architecturePattern,
        });

        for (const step of result.steps) {
            await db.insert(schema.stepLog).values({
                runId: result.runId,
                agentId: step.agentId,
                provider: step.provider,
                model: step.model,
                startedAt: step.startedAt,
                completedAt: step.completedAt,
                inputTokens: step.inputTokens,
                outputTokens: step.outputTokens,
                cachedInputTokens: step.cachedInputTokens,
                reasoningTokens: step.reasoningTokens,
                success: step.success,
                retryCount: step.retryCount,
                fallbackUsed: false,
                humanReviewRequired: false,
                accepted: step.success,
                outcomeSource: 'auto',
            });
        }
    } catch {
        // DB not configured or unavailable — run still returned, but not persisted
        return NextResponse.json({ success: true, data: { ...result, persisted: false } });
    }

    return NextResponse.json({ success: true, data: { ...result, persisted: true } });
}
