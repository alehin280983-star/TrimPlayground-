import { NextRequest, NextResponse } from 'next/server';
import { OpenAIProvider } from '@/lib/providers/openai';
import { AnthropicProvider } from '@/lib/providers/anthropic';
import { GoogleProvider } from '@/lib/providers/google';
import { MistralProvider } from '@/lib/providers/mistral';
import { CohereProvider } from '@/lib/providers/cohere';
import { DeepSeekProvider } from '@/lib/providers/deepseek';
import { XAIProvider } from '@/lib/providers/xai';
import { AlibabaProvider } from '@/lib/providers/alibaba';
import { MoonshotProvider } from '@/lib/providers/moonshot';
import { getModelById } from '@/lib/config/models';
import { ProviderType, SampleResultV2 } from '@/types';
import { BaseProvider } from '@/lib/providers/base';


export const runtime = 'nodejs';
export const maxDuration = 60;

interface SampleRequest {
    prompt: string;
    modelIds: string[];
    apiKeys: Partial<Record<ProviderType, string>>;
}

function normalizePreviewContent(content: unknown): string {
    if (typeof content === 'string') return content;
    if (content == null) return '';
    if (Array.isArray(content)) {
        return content.map(item => normalizePreviewContent(item)).filter(Boolean).join('\n');
    }
    if (typeof content === 'object') {
        const record = content as Record<string, unknown>;
        if (typeof record.text === 'string') return record.text;
        if (typeof record.content === 'string') return record.content;
    }
    try {
        return JSON.stringify(content);
    } catch {
        return String(content);
    }
}

function isSupportedInSampleMode(modelId: string): boolean {
    const id = modelId.toLowerCase();
    // Realtime models are not compatible with the current sample endpoint flow.
    if (id.includes('realtime')) return false;
    // OCR models require file/image input via OCR-specific API flow.
    if (id.includes('ocr')) return false;
    return true;
}

function createProviderWithKey(providerType: ProviderType, apiKey: string): BaseProvider {
    switch (providerType) {
        case 'openai':
            return new OpenAIProvider(apiKey);
        case 'anthropic':
            return new AnthropicProvider(apiKey);
        case 'google':
            return new GoogleProvider(apiKey);
        case 'mistral':
            return new MistralProvider(apiKey);
        case 'cohere':
            return new CohereProvider(apiKey);
        case 'deepseek':
            return new DeepSeekProvider(apiKey);
        case 'xai':
            return new XAIProvider(apiKey, 45000);
        case 'alibaba':
            return new AlibabaProvider(apiKey);
        case 'moonshot':
            return new MoonshotProvider(apiKey);
        default:
            throw new Error(`Provider ${providerType} not supported for sample mode`);
    }
}


export async function POST(request: NextRequest) {
    try {
        const body: SampleRequest = await request.json();
        const { prompt, modelIds, apiKeys } = body;

        // Validation
        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json(
                { success: false, error: { code: 'INVALID_PROMPT', message: 'Prompt is required' } },
                { status: 400 }
            );
        }

        if (!modelIds || modelIds.length === 0) {
            return NextResponse.json(
                { success: false, error: { code: 'INVALID_MODELS', message: 'At least one model required' } },
                { status: 400 }
            );
        }

        const results: SampleResultV2[] = [];
        let cheapest = { modelId: '', cost: Infinity };
        let fastest = { modelId: '', latencyMs: Infinity };

        for (const modelId of modelIds) {
            const model = getModelById(modelId);
            if (!model) continue;

            const modality = model.modality ?? 'text';

            if (!isSupportedInSampleMode(modelId)) {
                const unsupportedReason = modelId.toLowerCase().includes('ocr')
                    ? 'Sample mode does not support OCR models. OCR requires image/document input.'
                    : 'Sample mode does not support realtime models. Use Estimate mode for cost checks.';
                results.push({
                    modelId,
                    modelName: model.name,
                    provider: model.provider,
                    mode: 'sample',
                    breakdown: {
                        input: { tokens: 0, cost: 0 },
                        output: { tokens: 0, cost: 0 },
                    },
                    total: { min: 0, median: 0, max: 0 },
                    confidence: 'low',
                    warnings: [unsupportedReason],
                    calculatedAt: new Date().toISOString(),
                    actualUsage: { inputTokens: 0, outputTokens: 0 },
                    actualCost: 0,
                    responsePreview: `❌ Error: ${unsupportedReason}`,
                    latencyMs: 0,
                });
                continue;
            }

            const apiKey = apiKeys[model.provider];
            if (!apiKey) {
                // Skip models without API key
                continue;
            }

            try {
                const provider = createProviderWithKey(model.provider, apiKey);
                const startTime = Date.now();


                const response = await provider.complete({
                    prompt,
                    model: modelId,
                    provider: model.provider,
                });

                const latencyMs = Date.now() - startTime;

                let inputCost = (response.inputTokens / 1000) * model.inputPrice;
                let outputCost = (response.outputTokens / 1000) * model.outputPrice;
                const warnings: string[] = [];

                if (modality === 'image') {
                    inputCost = response.totalCost > 0 ? response.totalCost : model.inputPrice;
                    outputCost = 0;
                }

                if (modality === 'video') {
                    const durationSeconds = response.media?.durationSeconds;
                    if (typeof durationSeconds === 'number' && durationSeconds > 0 && model.pricePerSecond) {
                        inputCost = 0;
                        outputCost = durationSeconds * model.pricePerSecond;
                    } else {
                        inputCost = 0;
                        outputCost = response.totalCost;
                        warnings.push('Video duration is not final yet; cost may be incomplete.');
                    }
                }

                const totalCost = inputCost + outputCost;
                const contentPreview = normalizePreviewContent(response.content);
                const responsePreview = response.media?.type === 'image'
                    ? `🖼️ ${response.media.url}`
                    : response.media?.type === 'video'
                        ? (response.media.status === 'pending'
                            ? `🎬 Video generation in progress (request_id: ${response.media.requestId})`
                            : `🎬 ${response.media.url || response.content}`)
                        : contentPreview.substring(0, 200);

                const result: SampleResultV2 = {
                    modelId,
                    modelName: model.name,
                    provider: model.provider,
                    mode: 'sample',
                    breakdown: {
                        input: { tokens: response.inputTokens, cost: inputCost },
                        output: { tokens: response.outputTokens, cost: outputCost },
                    },
                    total: {
                        min: totalCost,
                        median: totalCost,
                        max: totalCost
                    },
                    confidence: modality === 'text' ? 'high' : 'medium',
                    warnings,
                    calculatedAt: new Date().toISOString(),
                    actualUsage: {
                        inputTokens: response.inputTokens,
                        outputTokens: response.outputTokens,
                    },
                    actualCost: totalCost,
                    responsePreview,
                    media: response.media,
                    latencyMs,
                };

                results.push(result);

                const costComparable = !(response.media?.type === 'video' && response.media?.status === 'pending');
                if (costComparable && totalCost < cheapest.cost) {
                    cheapest = { modelId, cost: totalCost };
                }
                if (latencyMs < fastest.latencyMs) {
                    fastest = { modelId, latencyMs };
                }

            } catch (error) {
                console.error(`Error sampling ${modelId}:`, error);
                // Extract error message from various error shapes
                let errorMessage = 'Unknown error';
                if (error instanceof Error) {
                    errorMessage = error.message;
                } else if (error && typeof error === 'object' && 'error' in error) {
                    // CompletionError shape from parseError
                    const compError = error as { error: { message: string } };
                    errorMessage = compError.error?.message || 'Unknown error';
                } else if (typeof error === 'string') {
                    errorMessage = error;
                }
                // Add error result so user knows which models failed
                results.push({
                    modelId,
                    modelName: model.name,
                    provider: model.provider,
                    mode: 'sample',
                    breakdown: {
                        input: { tokens: 0, cost: 0 },
                        output: { tokens: 0, cost: 0 },
                    },
                    total: { min: 0, median: 0, max: 0 },
                    confidence: 'low',
                    warnings: [`API Error: ${errorMessage}`],
                    calculatedAt: new Date().toISOString(),
                    actualUsage: { inputTokens: 0, outputTokens: 0 },
                    actualCost: 0,
                    responsePreview: `❌ Error: ${errorMessage}`,
                    latencyMs: 0,
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                results,
                cheapest: cheapest.cost < Infinity ? cheapest : null,
                fastest: fastest.latencyMs < Infinity ? fastest : null,
            },
        });

    } catch {
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sample' } },
            { status: 500 }
        );
    }
}
