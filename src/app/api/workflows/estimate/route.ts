import { NextRequest, NextResponse } from 'next/server';
import { getModelById } from '@/lib/config';
import { WORKFLOW_TEMPLATES, estimateWorkflow, normalizeScores, recommend } from '@/lib/workflows';
import { TaskClassSchema } from '@/lib/taxonomy';
import { z } from 'zod';

export const runtime = 'nodejs';

const RequestSchema = z.object({
    modelId: z.string(),
    taskClass: TaskClassSchema,
    inputTokensPerCall: z.number().int().min(1),
    outputTokensPerCall: z.number().int().min(1),
    tasksPerMonth: z.number().int().min(1),
    templateId: z.string().optional(),
});

export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { modelId, taskClass, inputTokensPerCall, outputTokensPerCall, tasksPerMonth, templateId } = parsed.data;

    const model = getModelById(modelId);
    if (!model) {
        return NextResponse.json({ success: false, error: `Model ${modelId} not found` }, { status: 404 });
    }

    const templates = templateId
        ? WORKFLOW_TEMPLATES.filter(t => t.id === templateId)
        : WORKFLOW_TEMPLATES.filter(t => t.taskClasses.includes(taskClass));

    const estimates = templates.map(t =>
        estimateWorkflow(t, model, { inputTokensPerCall, outputTokensPerCall, tasksPerMonth })
    );

    const scored = normalizeScores(estimates);
    const recommended = recommend(estimates);

    return NextResponse.json({
        success: true,
        data: {
            estimates: scored,
            recommendedTemplateId: recommended?.templateId ?? null,
        },
    });
}
