import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { BaseProvider } from './base';
import { CompletionRequest, CompletionResponse, ProviderType } from '@/types';
import { getModelById, calculateCost } from '@/lib/config';

export class GoogleProvider extends BaseProvider {
    private client: GoogleGenerativeAI;
    private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    constructor(apiKey?: string, timeout?: number) {
        super(apiKey || process.env.GOOGLE_AI_API_KEY || '', timeout);
        this.client = new GoogleGenerativeAI(this.apiKey);
    }

    get providerType(): ProviderType {
        return 'google';
    }

    private getModel(modelId: string): GenerativeModel {
        return this.client.getGenerativeModel({ model: modelId });
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const startTime = Date.now();
        const modelConfig = getModelById(request.model);

        if (!modelConfig) {
            throw new Error(`Model ${request.model} not found`);
        }

        try {
            if (this.isImagenModel(request.model)) {
                return await this.completeImagenPredict(request, modelConfig, startTime);
            }

            const model = this.getModel(request.model);
            const generationConfig = this.getGenerationConfig(request, modelConfig);
            const result = await this.withTimeout(
                model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
                    ...(generationConfig ? { generationConfig } : {}),
                })
            );

            const response = result.response;
            const content = response.text();
            // Parse usage from response
            const inputTokens = response.usageMetadata?.promptTokenCount || this.estimateTokens(request.prompt);
            const outputTokens = response.usageMetadata?.candidatesTokenCount || this.estimateTokens(content);
            const costs = calculateCost(inputTokens, outputTokens, modelConfig);

            return {
                provider: this.providerType,
                model: request.model,
                content,
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                inputCost: costs.inputCost,
                outputCost: costs.outputCost,
                totalCost: costs.totalCost,
                durationMs: Date.now() - startTime,
                finishReason: 'complete',
            };
        } catch (error) {
            throw this.parseError(error, request.model);
        }
    }

    async *streamComplete(
        request: CompletionRequest
    ): AsyncGenerator<{ content: string; done: boolean; usage?: { inputTokens: number; outputTokens: number } }> {
        const modelConfig = getModelById(request.model);

        if (!modelConfig) {
            throw new Error(`Model ${request.model} not found`);
        }

        try {
            const model = this.getModel(request.model);
            const generationConfig = this.getGenerationConfig(request, modelConfig);
            const result = await model.generateContentStream({
                contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
                ...(generationConfig ? { generationConfig } : {}),
            });

            let fullContent = '';
            const inputTokens = this.estimateTokens(request.prompt);


            for await (const chunk of result.stream) {
                const text = chunk.text();
                fullContent += text;

                yield { content: text, done: false };
            }

            // Final response with usage
            const outputTokens = this.estimateTokens(fullContent);
            yield {
                content: '',
                done: true,
                usage: { inputTokens, outputTokens },
            };
        } catch (error) {
            throw this.parseError(error, request.model);
        }
    }

    async countTokens(text: string, model: string): Promise<number> {
        try {
            const genModel = this.getModel(model || 'gemini-1.5-flash');
            const result = await genModel.countTokens(text);
            return result.totalTokens;
        } catch {
            return this.estimateTokens(text);
        }
    }

    private estimateTokens(text: string): number {
        // Rough estimation: 1 token ≈ 4 characters, with 20% safety margin
        return Math.ceil((text.length / 4) * 1.2);
    }

    private getGenerationConfig(
        request: CompletionRequest,
        modelConfig: NonNullable<ReturnType<typeof getModelById>>
    ): { maxOutputTokens: number } | undefined {
        const maxOutputTokens = request.maxTokens ?? modelConfig.maxOutputTokens;
        if (typeof maxOutputTokens === 'number' && maxOutputTokens > 0) {
            return { maxOutputTokens };
        }
        return undefined;
    }

    private isImagenModel(modelId: string): boolean {
        return modelId.toLowerCase().startsWith('imagen-');
    }

    private async completeImagenPredict(
        request: CompletionRequest,
        modelConfig: NonNullable<ReturnType<typeof getModelById>>,
        startTime: number
    ): Promise<CompletionResponse> {
        const response = await this.withTimeout(
            fetch(`${this.baseUrl}/models/${encodeURIComponent(request.model)}:predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey,
                },
                body: JSON.stringify({
                    instances: [{ prompt: request.prompt }],
                    parameters: { sampleCount: 1 },
                }),
            })
        );

        if (!response.ok) {
            const errorText = await response.text();
            let message = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const parsed = JSON.parse(errorText) as Record<string, unknown>;
                const errorObj = parsed.error && typeof parsed.error === 'object'
                    ? (parsed.error as Record<string, unknown>)
                    : undefined;
                if (typeof errorObj?.message === 'string') {
                    message = errorObj.message;
                } else if (typeof parsed.message === 'string') {
                    message = parsed.message;
                }
            } catch {
                if (errorText) message = errorText;
            }
            throw new Error(message);
        }

        const data = await response.json();
        const extracted = this.extractImagePayload(data);
        if (!extracted.base64) {
            throw new Error('Imagen response did not contain image bytes');
        }

        const mimeType = extracted.mimeType || 'image/png';
        const imageUrl = `data:${mimeType};base64,${extracted.base64}`;
        const fixedCost = modelConfig.inputPrice;

        return {
            provider: this.providerType,
            model: request.model,
            content: imageUrl,
            media: {
                type: 'image',
                url: imageUrl,
                status: 'completed',
            },
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            inputCost: fixedCost,
            outputCost: 0,
            totalCost: fixedCost,
            durationMs: Date.now() - startTime,
            finishReason: 'complete',
        };
    }

    private extractImagePayload(data: unknown): { base64: string; mimeType?: string } {
        if (!data || typeof data !== 'object') {
            return { base64: '' };
        }

        const record = data as Record<string, unknown>;
        const generatedImages = Array.isArray(record.generatedImages) ? record.generatedImages : [];
        if (generatedImages.length > 0 && generatedImages[0] && typeof generatedImages[0] === 'object') {
            const first = generatedImages[0] as Record<string, unknown>;
            const image = first.image && typeof first.image === 'object'
                ? (first.image as Record<string, unknown>)
                : undefined;
            const imageBytes = typeof image?.imageBytes === 'string' ? image.imageBytes : '';
            const mimeType = typeof image?.mimeType === 'string' ? image.mimeType : undefined;
            if (imageBytes) {
                return { base64: imageBytes, mimeType };
            }
        }

        const predictions = Array.isArray(record.predictions) ? record.predictions : [];
        if (predictions.length > 0 && predictions[0] && typeof predictions[0] === 'object') {
            const firstPrediction = predictions[0] as Record<string, unknown>;
            const directBytes = typeof firstPrediction.bytesBase64Encoded === 'string' ? firstPrediction.bytesBase64Encoded : '';
            const directMime = typeof firstPrediction.mimeType === 'string' ? firstPrediction.mimeType : undefined;
            if (directBytes) {
                return { base64: directBytes, mimeType: directMime };
            }

            const nestedImage = firstPrediction.image && typeof firstPrediction.image === 'object'
                ? (firstPrediction.image as Record<string, unknown>)
                : undefined;
            const nestedBytes = typeof nestedImage?.bytesBase64Encoded === 'string'
                ? nestedImage.bytesBase64Encoded
                : (typeof nestedImage?.imageBytes === 'string' ? nestedImage.imageBytes : '');
            const nestedMime = typeof nestedImage?.mimeType === 'string' ? nestedImage.mimeType : undefined;
            if (nestedBytes) {
                return { base64: nestedBytes, mimeType: nestedMime };
            }
        }

        return { base64: '' };
    }
}
