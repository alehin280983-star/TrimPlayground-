import { BaseProvider } from './base';
import { CompletionRequest, CompletionResponse, ProviderType } from '@/types';
import { getModelById, calculateCost } from '@/lib/config';

interface CohereChatResponse {
    text: string;
    generation_id: string;
    finish_reason: string;
    meta: {
        api_version: {
            version: string;
        };
        billed_units: {
            input_tokens: number;
            output_tokens: number;
        };
        tokens: {
            input_tokens: number;
            output_tokens: number;
        };
    };
}

interface CohereStreamEvent {
    event_type: string;
    text?: string;
    response?: CohereChatResponse;
}

export class CohereProvider extends BaseProvider {
    private baseUrl = 'https://api.cohere.ai/v1';

    constructor(apiKey?: string, timeout?: number) {
        super(apiKey || process.env.COHERE_API_KEY || '', timeout);
    }

    get providerType(): ProviderType {
        return 'cohere';
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const startTime = Date.now();
        const model = getModelById(request.model);

        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

        try {
            const response = await this.withTimeout(
                fetch(`${this.baseUrl}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: request.model,
                        message: request.prompt,
                        max_tokens: request.maxTokens || model.maxOutputTokens,
                    }),
                })
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            const data: CohereChatResponse = await response.json();
            const inputTokens = data.meta?.tokens?.input_tokens || data.meta?.billed_units?.input_tokens || 0;
            const outputTokens = data.meta?.tokens?.output_tokens || data.meta?.billed_units?.output_tokens || 0;
            const costs = calculateCost(inputTokens, outputTokens, model);

            return {
                provider: this.providerType,
                model: request.model,
                content: data.text,
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                inputCost: costs.inputCost,
                outputCost: costs.outputCost,
                totalCost: costs.totalCost,
                durationMs: Date.now() - startTime,
                finishReason: data.finish_reason === 'COMPLETE' ? 'complete' : 'length',
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
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: request.model,
                    message: request.prompt,
                    max_tokens: request.maxTokens || model.maxOutputTokens,
                    stream: true,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;

                    try {
                        const event: CohereStreamEvent = JSON.parse(line);

                        if (event.event_type === 'text-generation' && event.text) {
                            yield { content: event.text, done: false };
                        }

                        if (event.event_type === 'stream-end' && event.response) {
                            const inputTokens = event.response.meta?.tokens?.input_tokens || 0;
                            const outputTokens = event.response.meta?.tokens?.output_tokens || 0;
                            yield { content: '', done: true, usage: { inputTokens, outputTokens } };
                        }
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        } catch (error) {
            throw this.parseError(error, request.model);
        }
    }

    async countTokens(text: string): Promise<number> {
        // Cohere doesn't have a native token counting API, use estimation
        return Math.ceil((text.length / 4) * 1.2);
    }
}
