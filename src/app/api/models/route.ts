import { NextRequest, NextResponse } from 'next/server';
import { getAllModels, getFreeTierModels, providers, getModelById } from '@/lib/config';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const tier = searchParams.get('tier') || 'free';
    const providerId = searchParams.get('provider');

    try {
        let models = tier === 'pro' ? getAllModels() : getFreeTierModels();

        // Filter by provider if specified
        if (providerId) {
            models = models.filter(m => m.provider === providerId);
        }

        // Get provider metadata
        const providersData = providers.map(p => ({
            id: p.id,
            name: p.name,
            logo: p.logo,
            streamSupported: p.streamSupported,
            tokenCountingSupported: p.tokenCountingSupported,
            modelsCount: p.models.filter(m =>
                tier === 'pro' || m.freeTierAvailable
            ).length,
        }));

        return NextResponse.json({
            success: true,
            data: {
                models: models.map(m => ({
                    id: m.id,
                    name: m.name,
                    provider: m.provider,
                    inputPrice: m.inputPrice,
                    outputPrice: m.outputPrice,
                    maxTokens: m.maxTokens,
                    maxOutputTokens: m.maxOutputTokens,
                    freeTierAvailable: m.freeTierAvailable,
                    description: m.description,
                    priceUpdatedAt: m.priceUpdatedAt,
                    speedRating: m.speedRating,
                    qualityRating: m.qualityRating,
                })),
                providers: providersData,
                tier,
            },
        });
    } catch (error) {
        console.error('Error fetching models:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch models',
                },
            },
            { status: 500 }
        );
    }
}

// Get single model by ID
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { modelId } = body;

        if (!modelId) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'MISSING_MODEL_ID',
                        message: 'Model ID is required',
                    },
                },
                { status: 400 }
            );
        }

        const model = getModelById(modelId);

        if (!model) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'MODEL_NOT_FOUND',
                        message: `Model ${modelId} not found`,
                    },
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: model,
        });
    } catch (error) {
        console.error('Error fetching model:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch model',
                },
            },
            { status: 500 }
        );
    }
}
