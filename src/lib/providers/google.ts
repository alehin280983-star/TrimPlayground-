import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { BaseProvider } from './base';
import { CompletionRequest, CompletionResponse, ProviderType } from '@/types';
import { getModelById, calculateCost } from '@/lib/config';

export class GoogleProvider extends BaseProvider {
    private client: GoogleGenerativeAI;

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
            const model = this.getModel(request.model);
            const result = await this.withTimeout(
                model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
                    generationConfig: {
                        maxOutputTokens: request.maxTokens || modelConfig.maxOutputTokens,
                    },
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
            const result = await model.generateContentStream({
                contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
                generationConfig: {
                    maxOutputTokens: request.maxTokens || modelConfig.maxOutputTokens,
                },
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
}
