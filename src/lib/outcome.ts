import { z } from 'zod';

export const OutcomeSourceSchema = z.enum(['auto', 'judge', 'user']);
export type OutcomeSource = z.infer<typeof OutcomeSourceSchema>;

export interface OutcomeLabel {
    accepted: boolean;
    outcomeSource: OutcomeSource;
    reason?: string;
}

// Auto-labeling: pass if schema validation / assertions pass
export function autoLabel(valid: boolean, reason?: string): OutcomeLabel {
    return { accepted: valid, outcomeSource: 'auto', reason };
}

// User-labeling: explicit confirmation
export function userLabel(accepted: boolean, reason?: string): OutcomeLabel {
    return { accepted, outcomeSource: 'user', reason };
}
