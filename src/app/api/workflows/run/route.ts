import { NextRequest, NextResponse } from 'next/server';
import { getTemplate, runWorkflow, estimateWorkflow } from '@/lib/workflows';
import { TaskClassSchema } from '@/lib/taxonomy';
import { getDb, schema } from '@/db';
import { getModelById } from '@/lib/config';
import { eq, and } from 'drizzle-orm';
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
    // Feature flag guard
    if (process.env.FEATURE_WORKFLOWS === 'false') {
        return NextResponse.json({ success: false, error: 'Workflow live runs are disabled' }, { status: 403 });
    }

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

        // Calibration tracking: compare virtual estimate vs actual live result
        const model = getModelById(modelId);
        if (model) {
            const estimate = estimateWorkflow(template, model, {
                inputTokensPerCall: result.steps.reduce((s, r) => s + r.inputTokens, 0) / Math.max(result.steps.length, 1),
                outputTokensPerCall: result.steps.reduce((s, r) => s + r.outputTokens, 0) / Math.max(result.steps.length, 1),
                tasksPerMonth: 1,
            });
            const estimatedCost = estimate.totalCostPerTask;
            const actualCost = result.totalCostUsd;
            const errorPct = estimatedCost > 0
                ? ((actualCost - estimatedCost) / estimatedCost) * 100
                : null;

            // Upsert calibration record (increment sample_count if exists)
            const existing = await db.query.calibrationRecord.findFirst({
                where: and(
                    eq(schema.calibrationRecord.taskClass, taskClass),
                    eq(schema.calibrationRecord.templateId, templateId),
                    eq(schema.calibrationRecord.modelId, modelId)
                ),
            });

            if (existing) {
                const newCount = existing.sampleCount + 1;
                const prevEst = Number(existing.estimatedCostPerTask ?? 0);
                const prevAct = Number(existing.actualCostPerTask ?? 0);
                await db.update(schema.calibrationRecord)
                    .set({
                        estimatedCostPerTask: String((prevEst + estimatedCost) / 2),
                        actualCostPerTask: String((prevAct + actualCost) / 2),
                        errorPct: errorPct !== null ? String(errorPct.toFixed(4)) : existing.errorPct,
                        sampleCount: newCount,
                        calibrationStatus: newCount >= 30 ? 'calibrated' : 'pending',
                        updatedAt: new Date(),
                    })
                    .where(eq(schema.calibrationRecord.id, existing.id));
            } else {
                await db.insert(schema.calibrationRecord).values({
                    taskClass,
                    templateId,
                    modelId,
                    estimatedCostPerTask: String(estimatedCost),
                    actualCostPerTask: String(actualCost),
                    errorPct: errorPct !== null ? String(errorPct.toFixed(4)) : null,
                    sampleCount: 1,
                    calibrationStatus: 'pending',
                });
            }
        }
    } catch {
        // DB not configured or unavailable — run still returned, but not persisted
        return NextResponse.json({ success: true, data: { ...result, persisted: false } });
    }

    return NextResponse.json({ success: true, data: { ...result, persisted: true } });
}
