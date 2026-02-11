import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base';
import { CompletionRequest, CompletionResponse, ProviderType } from '@/types';
import { getModelById, calculateCost } from '@/lib/config';

export class AnthropicProvider extends BaseProvider {
    private client: Anthropic;

    constructor(apiKey?: string, timeout?: number) {
        super(apiKey || process.env.ANTHROPIC_API_KEY || '', timeout);
        this.client = new Anthropic({
            apiKey: this.apiKey,
            timeout: this.timeout,
        });
    }

    get providerType(): ProviderType {
        return 'anthropic';
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const startTime = Date.now();
        const model = getModelById(request.model);

        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

        try {
            const response = await this.withTimeout(
                this.client.messages.create({
                    model: request.model,
                    max_tokens: request.maxTokens || model.maxOutputTokens,
                    messages: [{ role: 'user', content: request.prompt }],
                })
            );

            const inputTokens = response.usage.input_tokens;
            const outputTokens = response.usage.output_tokens;
            const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
            const costs = calculateCost(inputTokens, outputTokens, model);

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
                finishReason: response.stop_reason === 'end_turn' ? 'complete' : 'length',
            };
        } catch (error) {
            throw this.parseError(error, request.model);
        }
    }

    async *streamComplete(
        request: CompletionRequest
    ): AsyncGenerator<{ content: string; done: boolean; usage?: { inputTokens: number; outputTokens: number } }> {
        const model = getModelById(request.model);

        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

        try {
            const stream = await this.client.messages.stream({
                model: request.model,
                max_tokens: request.maxTokens || model.maxOutputTokens,
                messages: [{ role: 'user', content: request.prompt }],
            });

            let inputTokens = 0;
            let outputTokens = 0;

            for await (const event of stream) {
                if (event.type === 'message_start') {
                    inputTokens = event.message.usage.input_tokens;
                }

                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    yield { content: event.delta.text, done: false };
                }

                if (event.type === 'message_delta') {
                    outputTokens = event.usage.output_tokens;
                    yield {
                        content: '',
                        done: true,
                        usage: { inputTokens, outputTokens },
                    };
                }
            }
        } catch (error) {
            throw this.parseError(error, request.model);
        }
    }

    async countTokens(text: string, model: string): Promise<number> {
        try {
            const result = await this.client.messages.countTokens({
                model: model || 'claude-3-5-sonnet-20241022',
                messages: [{ role: 'user', content: text }],
            });
            return result.input_tokens;
        } catch {
            // Fallback to estimation if API fails
            return Math.ceil(text.length / 4);
        }
    }
}
