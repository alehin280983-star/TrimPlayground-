import { NextRequest, NextResponse } from 'next/server';
import { createProvider } from '@/lib/providers';
import { getModelById, calculateCost } from '@/lib/config';
import { CompletionRequest, CompletionResponse, CompletionError, ProviderType } from '@/types';
import { generateId } from '@/lib/utils';

export const runtime = 'edge';
export const maxDuration = 60; // 60 seconds max

interface CompareRequest {
    prompt: string;
    modelIds: string[];
    maxTokens?: number;
}

interface CompareResult {
    id: string;
    prompt: string;
    results: Array<CompletionResponse | CompletionError>;
    successful: number;
    failed: number;
    totalCost: number;
    totalDuration: number;
    createdAt: string;
}

// Timeout wrapper
async function executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
        ),
    ]);
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = generateId();

    try {
        const body: CompareRequest = await request.json();
        const { prompt, modelIds, maxTokens } = body;

        // Validation
        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: 'INVALID_PROMPT', message: 'Prompt is required' },
                },
                { status: 400 }
            );
        }

        if (!modelIds || !Array.isArray(modelIds) || modelIds.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: 'INVALID_MODELS', message: 'At least one model is required' },
                },
                { status: 400 }
            );
        }

        if (modelIds.length > 5) {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: 'TOO_MANY_MODELS', message: 'Maximum 5 models per comparison' },
                },
                { status: 400 }
            );
        }

        // Check prompt length
        if (prompt.length > 10000) {
            return NextResponse.json(
                {
                    success: false,
                    error: { code: 'PROMPT_TOO_LONG', message: 'Prompt exceeds 10,000 characters' },
                },
                { status: 400 }
            );
        }

        const TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '10000');
        const MAX_TOKENS = maxTokens || parseInt(process.env.MAX_TOKENS_PER_REQUEST || '4000');

        // Execute requests in parallel
        const requests = modelIds.map(async (modelId): Promise<CompletionResponse | CompletionError> => {
            const model = getModelById(modelId);

            if (!model) {
                return {
                    provider: 'openai' as ProviderType, // Default, will be overridden
                    model: modelId,
                    error: {
                        type: 'invalid_request',
                        message: `Model ${modelId} not found`,
                    },
                };
            }

            try {
                const provider = createProvider(model.provider);

                if (!provider.isConfigured()) {
                    return {
                        provider: model.provider,
                        model: modelId,
                        error: {
                            type: 'authentication',
                            message: `${model.provider} API key not configured`,
                        },
                    };
                }

                const completionRequest: CompletionRequest = {
                    prompt,
                    model: modelId,
                    provider: model.provider,
                    maxTokens: MAX_TOKENS,
                };

                const response = await executeWithTimeout(
                    provider.complete(completionRequest),
                    TIMEOUT_MS
                );

                return response;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                // Determine error type
                let errorType: CompletionError['error']['type'] = 'server_error';
                let retryAfter: number | undefined;

                if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
                    errorType = 'timeout';
                } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
                    errorType = 'rate_limit';
                    retryAfter = 60;
                } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
                    errorType = 'authentication';
                }

                return {
                    provider: model.provider,
                    model: modelId,
                    error: {
                        type: errorType,
                        message: errorMessage,
                        retryAfter,
                    },
                };
            }
        });

        const results = await Promise.all(requests);

        // Calculate totals
        const successful = results.filter((r): r is CompletionResponse => !('error' in r));
        const failed = results.filter((r): r is CompletionError => 'error' in r);
        const totalCost = successful.reduce((sum, r) => sum + r.totalCost, 0);

        const response: CompareResult = {
            id: requestId,
            prompt,
            results,
            successful: successful.length,
            failed: failed.length,
            totalCost,
            totalDuration: Date.now() - startTime,
            createdAt: new Date().toISOString(),
        };

        return NextResponse.json({
            success: true,
            data: response,
        });
    } catch (error) {
        console.error('Comparison error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to execute comparison',
                },
            },
            { status: 500 }
        );
    }
}
