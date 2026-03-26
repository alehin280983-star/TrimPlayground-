import { z } from 'zod';

export const TaskClassSchema = z.enum([
    'chat',
    'rag',
    'json_extract',
    'coding',
    'agentic',
    'research',
]);

export type TaskClass = z.infer<typeof TaskClassSchema>;

export const TASK_CLASS_LABELS: Record<TaskClass, string> = {
    chat: 'Chat / Conversation',
    rag: 'RAG / Retrieval',
    json_extract: 'JSON Extraction',
    coding: 'Coding',
    agentic: 'Agentic Workflow',
    research: 'Research',
};
