import {
    pgTable,
    uuid,
    varchar,
    integer,
    boolean,
    timestamp,
    decimal,
    pgEnum,
    text,
} from 'drizzle-orm/pg-core';

export const runModeEnum = pgEnum('run_mode', ['live', 'virtual']);

export const taskClassEnum = pgEnum('task_class', [
    'chat',
    'rag',
    'json_extract',
    'coding',
    'agentic',
    'research',
]);

export const outcomeSourceEnum = pgEnum('outcome_source', ['auto', 'judge', 'user']);

export const pricingStatusEnum = pgEnum('pricing_status', ['verified', 'stale', 'manual']);

export const workflowRun = pgTable('workflow_run', {
    runId: uuid('run_id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id').notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    mode: runModeEnum('mode').notNull(),
    taskClass: taskClassEnum('task_class').notNull(),
    architecturePattern: varchar('architecture_pattern', { length: 128 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const stepLog = pgTable('step_log', {
    stepId: uuid('step_id').primaryKey().defaultRandom(),
    runId: uuid('run_id').notNull().references(() => workflowRun.runId),
    agentId: varchar('agent_id', { length: 128 }).notNull(),
    provider: varchar('provider', { length: 64 }).notNull(),
    model: varchar('model', { length: 128 }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    firstByteAt: timestamp('first_byte_at', { withTimezone: true }),
    firstTokenAt: timestamp('first_token_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    cachedInputTokens: integer('cached_input_tokens'),
    reasoningTokens: integer('reasoning_tokens'),
    toolTokens: integer('tool_tokens'),
    success: boolean('success'),
    retryCount: integer('retry_count').notNull().default(0),
    fallbackUsed: boolean('fallback_used').notNull().default(false),
    humanReviewRequired: boolean('human_review_required').notNull().default(false),
    accepted: boolean('accepted'),
    outcomeSource: outcomeSourceEnum('outcome_source'),
    schemaVersion: integer('schema_version').notNull().default(1),
});

export const pricingSnapshot = pgTable('pricing_snapshot', {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: varchar('provider', { length: 64 }).notNull(),
    model: varchar('model', { length: 128 }).notNull(),
    priceInput: decimal('price_input', { precision: 20, scale: 10 }).notNull(),
    priceOutput: decimal('price_output', { precision: 20, scale: 10 }).notNull(),
    priceCached: decimal('price_cached', { precision: 20, scale: 10 }),
    priceTool: decimal('price_tool', { precision: 20, scale: 10 }),
    sourceUrl: text('source_url').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    status: pricingStatusEnum('status').notNull().default('manual'),
    validUntil: timestamp('valid_until', { withTimezone: true }),
});
