import { NextRequest, NextResponse } from 'next/server';
import { estimateCost, countTokensSync, formatCost, calculateConfidence, generateWarnings } from '@/lib/tokens';
import { getModelById, getAllModels } from '@/lib/config';
import { PriceRange, PriceEstimateV2 } from '@/types';


export const runtime = 'nodejs';

interface EstimateRequest {
    prompt: string;
    modelIds: string[];
    estimatedOutputTokens?: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: EstimateRequest = await request.json();
        const { prompt, modelIds, estimatedOutputTokens } = body;

        // Validation
        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_PROMPT',
                        message: 'Prompt is required and must be a string',
                    },
                },
                { status: 400 }
            );
        }

        if (!modelIds || !Array.isArray(modelIds) || modelIds.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'INVALID_MODELS',
                        message: 'At least one model ID is required',
                    },
                },
                { status: 400 }
            );
        }

        // Check prompt length
        const MAX_PROMPT_LENGTH = 10000;
        if (prompt.length > MAX_PROMPT_LENGTH) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'PROMPT_TOO_LONG',
                        message: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
                    },
                },
                { status: 400 }
            );
        }

        // Count input tokens
        const inputTokens = countTokensSync(prompt);

        // Generate estimates for each model
        const estimates = modelIds.map(modelId => {
            const model = getModelById(modelId);

            if (!model) {
                return {
                    modelId,
                    error: 'Model not found',
                };
            }

            const isReasoningModel = model.id.includes('o1') || model.id.includes('o3') || model.id.includes('o4');

            // Calculate output token range
            const baseEstimate = estimatedOutputTokens ?? Math.min(
                Math.floor(model.maxOutputTokens * 0.5),
                2000
            );

            const outputRange: PriceRange = {
                min: Math.floor(baseEstimate * 0.5),
                median: baseEstimate,
                max: Math.ceil(baseEstimate * 1.5),
            };

            // Calculate costs
            const inputCost = (inputTokens / 1000) * model.inputPrice;
            const outputCostRange: PriceRange = {
                min: (outputRange.min / 1000) * model.outputPrice,
                median: (outputRange.median / 1000) * model.outputPrice,
                max: (outputRange.max / 1000) * model.outputPrice,
            };

            // Calculate total
            const total: PriceRange = {
                min: inputCost + outputCostRange.min,
                median: inputCost + outputCostRange.median,
                max: inputCost + outputCostRange.max,
            };

            // Confidence and warnings
            const confidence = calculateConfidence(
                'estimate',
                !!estimatedOutputTokens,
                isReasoningModel
            );

            const warnings = generateWarnings(
                'estimate',
                !!estimatedOutputTokens,
                isReasoningModel,
                inputTokens
            );

            const result: PriceEstimateV2 = {
                modelId,
                modelName: model.name,
                provider: model.provider,
                mode: 'estimate',
                breakdown: {
                    input: { tokens: inputTokens, cost: inputCost },
                    output: { tokens: outputRange, cost: outputCostRange },
                },
                total,
                confidence,
                warnings,
                calculatedAt: new Date().toISOString(),
            };

            return result;
        });


        // Calculate totals and find cheapest
        const validEstimates = estimates.filter(e => !('error' in e)) as PriceEstimateV2[];

        let cheapest = '';
        let lowestMedian = Infinity;

        validEstimates.forEach(est => {
            if (est.total.median < lowestMedian) {
                lowestMedian = est.total.median;
                cheapest = est.modelId;
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                results: estimates,
                cheapest,
            },
        });

    } catch (error) {
        console.error('Error estimating cost:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to estimate cost',
                },
            },
            { status: 500 }
        );
    }
}
