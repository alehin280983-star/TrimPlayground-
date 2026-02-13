import { BaseProvider } from './base';
import { CompletionRequest, CompletionResponse, ProviderType } from '@/types';
import { getModelById, calculateCost } from '@/lib/config';

export class AlibabaProvider extends BaseProvider {
    private readonly baseUrls: string[];
    private readonly workspace?: string;

    constructor(apiKey?: string, timeout?: number) {
        super(apiKey || process.env.ALIBABA_API_KEY || '', timeout);
        this.workspace = process.env.ALIBABA_WORKSPACE?.trim() || undefined;

        const configuredBaseUrl = process.env.ALIBABA_BASE_URL?.trim();
        const defaults = [
            'https://dashscope.aliyuncs.com/api/v1',
            'https://dashscope-intl.aliyuncs.com/api/v1',
            'https://dashscope-us.aliyuncs.com/api/v1',
        ];

        // Keep order stable and remove duplicates.
        this.baseUrls = [...new Set([configuredBaseUrl, ...defaults].filter(Boolean) as string[])];
    }

    get providerType(): ProviderType {
        return 'alibaba';
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const startTime = Date.now();
        const model = getModelById(request.model);

        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

        let lastError: unknown;

        for (const baseUrl of this.baseUrls) {
            try {
                const response = await this.withTimeout(
                    fetch(`${baseUrl}/services/aigc/text-generation/generation`, {
                        method: 'POST',
                        headers: this.buildHeaders(),
                        body: JSON.stringify({
                            model: request.model,
                            input: {
                                messages: [{ role: 'user', content: request.prompt }],
                            },
                            parameters: {
                                max_tokens: request.maxTokens || model.maxOutputTokens,
                                temperature: 0.7,
                            },
                        }),
                    })
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const message = errorData.message || errorData.code || `HTTP ${response.status}: ${response.statusText}`;

                    // DashScope keys are region-bound; retry on auth-like failures on another endpoint.
                    if (this.isAuthLikeError(response.status, message) && baseUrl !== this.baseUrls[this.baseUrls.length - 1]) {
                        lastError = new Error(`${message} (endpoint: ${baseUrl})`);
                        continue;
                    }

                    throw new Error(message);
                }

                const data = await response.json();
                const inputTokens = data.usage?.input_tokens || 0;
                const outputTokens = data.usage?.output_tokens || 0;
                const content = data.output?.text || data.output?.choices?.[0]?.message?.content || '';
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
                    finishReason: data.output?.finish_reason === 'stop' ? 'complete' : 'length',
                };
            } catch (error) {
                lastError = error;
                const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
                const shouldTryNext =
                    baseUrl !== this.baseUrls[this.baseUrls.length - 1] &&
                    (message.includes('invalid api key') ||
                        message.includes('unauthorized') ||
                        message.includes('forbidden') ||
                        message.includes('401') ||
                        message.includes('403'));

                if (shouldTryNext) continue;
                throw this.parseError(error, request.model);
            }
        }

        throw this.parseError(lastError, request.model);
    }

    async *streamComplete(
        request: CompletionRequest
    ): AsyncGenerator<{ content: string; done: boolean; usage?: { inputTokens: number; outputTokens: number } }> {
        const model = getModelById(request.model);

        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

        try {
            const response = await fetch(`${this.baseUrls[0]}/services/aigc/text-generation/generation`, {
                method: 'POST',
                headers: this.buildHeaders({ 'X-DashScope-SSE': 'enable' }),
                body: JSON.stringify({
                    model: request.model,
                    input: {
                        messages: [{ role: 'user', content: request.prompt }],
                    },
                    parameters: {
                        max_tokens: request.maxTokens || model.maxOutputTokens,
                        temperature: 0.7,
                        incremental_output: true,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let usage: { inputTokens: number; outputTokens: number } | undefined;

            if (!reader) {
                throw new Error('Response body is not readable');
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const data = line.slice(5).trim();
                        if (!data) continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.output?.text || '';
                            const isDone = parsed.output?.finish_reason === 'stop';

                            if (parsed.usage) {
                                usage = {
                                    inputTokens: parsed.usage.input_tokens || 0,
                                    outputTokens: parsed.usage.output_tokens || 0,
                                };
                            }

                            yield {
                                content,
                                done: isDone,
                                usage: isDone ? usage : undefined,
                            };

                            if (isDone) break;
                        } catch (e) {
                            console.error('Failed to parse SSE data:', e);
                        }
                    }
                }
            }
        } catch (error) {
            throw this.parseError(error, request.model);
        }
    }

    async countTokens(text: string): Promise<number> {
        // Qwen uses similar tokenization to other models
        // Rough estimate: ~4 chars per token for English, ~2 for Chinese
        return Math.ceil(text.length / 3);
    }

    private buildHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
        };

        if (this.workspace) {
            headers['X-DashScope-WorkSpace'] = this.workspace;
        }

        return {
            ...headers,
            ...(extraHeaders || {}),
        };
    }

    private isAuthLikeError(status: number, message: string): boolean {
        const normalized = String(message).toLowerCase();
        return (
            status === 401 ||
            status === 403 ||
            normalized.includes('invalid api key') ||
            normalized.includes('unauthorized') ||
            normalized.includes('forbidden')
        );
    }
}
