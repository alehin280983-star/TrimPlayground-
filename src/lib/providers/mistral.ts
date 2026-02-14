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
            content: unknown;
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
            content?: unknown;
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
    private readonly retryCount = 2;
    private readonly retryDelayMs = 400;

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
            const response = await this.requestChatCompletion(
                request.model,
                request.prompt,
                request.maxTokens || model.maxOutputTokens
            );

            const data: MistralChatResponse = await response.json();
            const inputTokens = data.usage.prompt_tokens;
            const outputTokens = data.usage.completion_tokens;
            const content = this.extractContentText(data.choices[0]?.message?.content);
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
                throw new Error(await this.readErrorMessage(response));
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
                            const content = this.extractContentText(chunk.choices[0]?.delta?.content);

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

    private extractContentText(content: unknown): string {
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            return content
                .map(item => this.extractContentText(item))
                .filter(Boolean)
                .join('\n')
                .trim();
        }
        if (content && typeof content === 'object') {
            const record = content as Record<string, unknown>;
            if (typeof record.text === 'string') return record.text;
            if (typeof record.content === 'string') return record.content;
            if (typeof record.value === 'string') return record.value;
            return '';
        }
        return '';
    }

    private async requestChatCompletion(model: string, prompt: string, maxTokens: number): Promise<Response> {
        let lastError = '';

        for (let attempt = 0; attempt <= this.retryCount; attempt += 1) {
            const response = await this.withTimeout(
                fetch(`${this.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: maxTokens,
                    }),
                })
            );

            if (response.ok) return response;

            const errorMessage = await this.readErrorMessage(response);
            lastError = errorMessage;
            const retryable = this.isRetryableStatus(response.status, errorMessage);
            if (!retryable || attempt === this.retryCount) {
                throw new Error(errorMessage);
            }

            await this.sleep(this.retryDelayMs * Math.pow(2, attempt));
        }

        throw new Error(lastError || 'Mistral request failed');
    }

    private isRetryableStatus(status: number, message: string): boolean {
        const text = message.toLowerCase();
        return (
            status === 429 ||
            status === 503 ||
            status === 529 ||
            text.includes('service unavailable') ||
            text.includes('temporarily unavailable') ||
            text.includes('overloaded')
        );
    }

    private async readErrorMessage(response: Response): Promise<string> {
        const fallback = `HTTP ${response.status}: ${response.statusText}`;
        const raw = await response.text();
        if (!raw) return fallback;

        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            if (typeof parsed.message === 'string') return parsed.message;
            const errorObj = parsed.error && typeof parsed.error === 'object'
                ? (parsed.error as Record<string, unknown>)
                : undefined;
            if (typeof errorObj?.message === 'string') return errorObj.message;
            return fallback;
        } catch {
            return raw;
        }
    }

    private async sleep(ms: number): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
}
