import { BaseProvider } from './base';
import { CompletionRequest, CompletionResponse, ProviderType } from '@/types';
import { getModelById, calculateCost } from '@/lib/config';

interface MistralChatResponse {
    id: string;
    object: string;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

interface MistralStreamChunk {
    id: string;
    object: string;
    model: string;
    choices: Array<{
        index: number;
        delta: {
            role?: string;
            content?: string;
        };
        finish_reason: string | null;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class MistralProvider extends BaseProvider {
    private baseUrl = 'https://api.mistral.ai/v1';

    constructor(apiKey?: string, timeout?: number) {
        super(apiKey || process.env.MISTRAL_API_KEY || '', timeout);
    }

    get providerType(): ProviderType {
        return 'mistral';
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const startTime = Date.now();
        const model = getModelById(request.model);

        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

        try {
            const response = await this.withTimeout(
                fetch(`${this.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: request.model,
                        messages: [{ role: 'user', content: request.prompt }],
                        max_tokens: request.maxTokens || model.maxOutputTokens,
                    }),
                })
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            const data: MistralChatResponse = await response.json();
            const inputTokens = data.usage.prompt_tokens;
            const outputTokens = data.usage.completion_tokens;
            const content = data.choices[0]?.message?.content || '';
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
                finishReason: data.choices[0]?.finish_reason === 'stop' ? 'complete' : 'length',
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
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: request.model,
                    messages: [{ role: 'user', content: request.prompt }],
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
            let inputTokens = 0;
            let outputTokens = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            yield { content: '', done: true, usage: { inputTokens, outputTokens } };
                            return;
                        }

                        try {
                            const chunk: MistralStreamChunk = JSON.parse(data);
                            const content = chunk.choices[0]?.delta?.content || '';

                            if (chunk.usage) {
                                inputTokens = chunk.usage.prompt_tokens;
                                outputTokens = chunk.usage.completion_tokens;
                            }

                            if (content) {
                                yield { content, done: false };
                            }

                            if (chunk.choices[0]?.finish_reason) {
                                yield { content: '', done: true, usage: { inputTokens, outputTokens } };
                            }
                        } catch {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        } catch (error) {
            throw this.parseError(error, request.model);
        }
    }

    async countTokens(text: string): Promise<number> {
        // Mistral doesn't have a native token counting API, use estimation
        return Math.ceil((text.length / 4) * 1.2);
    }
}
