import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Delay execution for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Replace variables in a template string
 * Supports {{variable_name}} syntax
 */
export function interpolateVariables(
    template: string,
    variables: Record<string, string>
): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return variables[varName] ?? match;
    });
}

/**
 * Extract variable names from a template
 */
export function extractVariables(template: string): string[] {
    const matches = template.match(/\{\{(\w+)\}\}/g) ?? [];
    return [...new Set(matches.map(m => m.slice(2, -2)))];
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDate(date);
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
}

/**
 * Detect if text contains code blocks
 */
export function containsCode(text: string): boolean {
    return /```[\s\S]*?```|`[^`]+`/.test(text);
}

/**
 * Parse code blocks from text
 */
export function parseCodeBlocks(text: string): Array<{ language: string; code: string }> {
    const blocks: Array<{ language: string; code: string }> = [];
    const regex = /```(\w*)\n?([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        blocks.push({
            language: match[1] || 'text',
            code: match[2].trim(),
        });
    }

    return blocks;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
    try {
        return JSON.parse(json) as T;
    } catch {
        return fallback;
    }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: Parameters<T>) => void>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => { inThrottle = false; }, limit);
        }
    };
}
