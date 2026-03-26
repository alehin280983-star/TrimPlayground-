import { NextRequest, NextResponse } from 'next/server';
import { WORKFLOW_TEMPLATES } from '@/lib/workflows';
import { TaskClassSchema } from '@/lib/taxonomy';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const taskClass = request.nextUrl.searchParams.get('taskClass');

    let templates = WORKFLOW_TEMPLATES;
    if (taskClass) {
        const parsed = TaskClassSchema.safeParse(taskClass);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid taskClass' },
                { status: 400 }
            );
        }
        templates = templates.filter(t => t.taskClasses.includes(parsed.data));
    }

    return NextResponse.json({ success: true, data: templates });
}
