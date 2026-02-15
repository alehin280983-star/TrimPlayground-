import { BaseProvider } from './base';
import { CompletionError, CompletionRequest, CompletionResponse, ProviderType } from '@/types';
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
        let preferredError: Error | null = null;
        const generationPath = this.getGenerationPath(model);

        for (const baseUrl of this.baseUrls) {
            try {
                if (this.isStreamingOnlyModel(model)) {
                    return await this.completeViaSSE(request, model, baseUrl, generationPath, startTime);
                }

                const requestBody = this.buildRequestBody(request, model);
                const response = await this.withTimeout(
                    fetch(`${baseUrl}${generationPath}`, {
                        method: 'POST',
                        headers: this.buildHeaders(),
                        body: JSON.stringify(requestBody),
                    })
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const { message, code } = this.extractErrorDetails(errorData, response.status, response.statusText);
                    const endpointError = new Error(`[${response.status}] ${code ? `${code}: ` : ''}${message} (endpoint: ${baseUrl})`);
                    preferredError = this.preferAlibabaError(preferredError, endpointError);

                    if (this.shouldRetryOnAnotherEndpoint(response.status, message, code) && baseUrl !== this.baseUrls[this.baseUrls.length - 1]) {
                        lastError = endpointError;
                        continue;
                    }

                    throw new Error(`[${response.status}] ${code ? `${code}: ` : ''}${message}`);
                }

                const data = await response.json();
                const inputTokens = data.usage?.input_tokens || 0;
                const outputTokens = data.usage?.output_tokens || 0;
                const content = this.extractTextContent(data);
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
                if (error instanceof Error) {
                    preferredError = this.preferAlibabaError(preferredError, error);
                }
                const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
                const shouldTryNext =
                    baseUrl !== this.baseUrls[this.baseUrls.length - 1] &&
                    (message.includes('invalid api key') ||
                        message.includes('unauthorized') ||
                        message.includes('forbidden') ||
                        message.includes('401') ||
                        message.includes('403') ||
                        message.includes('model not exist') ||
                        message.includes('model access denied') ||
                        message.includes('access denied') ||
                        message.includes('no permission'));

                if (shouldTryNext) continue;
                throw this.parseAlibabaError(error, request.model);
            }
        }

        throw this.parseAlibabaError(preferredError ?? lastError, request.model);
    }

    async *streamComplete(
        request: CompletionRequest
    ): AsyncGenerator<{ content: string; done: boolean; usage?: { inputTokens: number; outputTokens: number } }> {
        const model = getModelById(request.model);

        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

        try {
            const response = await fetch(`${this.baseUrls[0]}${this.getGenerationPath(model)}`, {
                method: 'POST',
                headers: this.buildHeaders({ 'X-DashScope-SSE': 'enable' }),
                body: JSON.stringify(this.buildRequestBody(request, model, true)),
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
                            const content = this.extractTextContent(parsed);
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
            throw this.parseAlibabaError(error, request.model);
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

    private shouldRetryOnAnotherEndpoint(status: number, message: string, code: string): boolean {
        const normalizedMessage = String(message).toLowerCase();
        const normalizedCode = String(code).toLowerCase();

        if (this.isAuthLikeError(status, normalizedMessage)) return true;

        // Some DashScope regions respond with "model not exist/access denied" for models
        // that are available on another regional endpoint.
        return (
            normalizedMessage.includes('model not exist') ||
            normalizedMessage.includes('model access denied') ||
            normalizedMessage.includes('access denied') ||
            normalizedMessage.includes('no permission') ||
            normalizedCode.includes('model_not_found') ||
            normalizedCode.includes('modelnotfound') ||
            normalizedCode.includes('accessdenied')
        );
    }

    private extractErrorDetails(
        errorData: unknown,
        status: number,
        statusText: string
    ): { message: string; code: string } {
        const data = errorData && typeof errorData === 'object' ? (errorData as Record<string, unknown>) : {};
        const message = typeof data.message === 'string'
            ? data.message
            : (typeof data.error_msg === 'string' ? data.error_msg : `HTTP ${status}: ${statusText}`);
        const code = typeof data.code === 'string'
            ? data.code
            : (typeof data.error_code === 'string' ? data.error_code : '');

        return { message, code };
    }

    private preferAlibabaError(current: Error | null, next: Error): Error {
        if (!current) return next;

        const currentScore = this.getAlibabaErrorPriority(current.message);
        const nextScore = this.getAlibabaErrorPriority(next.message);
        if (nextScore > currentScore) return next;
        return current;
    }

    private getAlibabaErrorPriority(message: string): number {
        const normalized = message.toLowerCase();
        if (
            normalized.includes('model access denied') ||
            normalized.includes('model not exist') ||
            normalized.includes('model_not_found') ||
            normalized.includes('modelnotfound') ||
            normalized.includes('no permission') ||
            normalized.includes('access denied')
        ) return 4;

        if (normalized.includes('rate limit') || normalized.includes('429')) return 3;

        if (
            normalized.includes('invalid api key') ||
            normalized.includes('unauthorized') ||
            normalized.includes('forbidden') ||
            normalized.includes('401') ||
            normalized.includes('403')
        ) return 1;

        return 2;
    }

    private parseAlibabaError(error: unknown, model: string): CompletionError {
        if (!(error instanceof Error)) {
            return this.parseError(error, model);
        }

        const message = error.message.toLowerCase();

        // For Alibaba, 403/forbidden is often model/workspace/region permission,
        // not API key invalidation. Show a model-access message first.
        if (
            message.includes('model access denied') ||
            message.includes('model not exist') ||
            message.includes('model_not_found') ||
            message.includes('modelnotfound') ||
            message.includes('no permission') ||
            message.includes('workspace') ||
            (message.includes('403') && !message.includes('invalid api key'))
        ) {
            return this.createError(
                model,
                'invalid_request',
                `Model is unavailable for this Alibaba account/region/workspace. ${error.message}`
            );
        }

        return this.parseError(error, model);
    }

    private isStreamingOnlyModel(model: NonNullable<ReturnType<typeof getModelById>>): boolean {
        const id = model.id.toLowerCase();
        return id.includes('qvq');
    }

    private getGenerationPath(model: NonNullable<ReturnType<typeof getModelById>>): string {
        return this.isMultimodalModel(model)
            ? '/services/aigc/multimodal-generation/generation'
            : '/services/aigc/text-generation/generation';
    }

    private isMultimodalModel(model: NonNullable<ReturnType<typeof getModelById>>): boolean {
        if (model.modality === 'image' || model.modality === 'video' || model.modality === 'audio') {
            return true;
        }

        const id = model.id.toLowerCase();
        return (
            id.includes('qvq') ||
            id.includes('qwen-vl') ||
            id.includes('qwen3-vl') ||
            id.includes('omni')
        );
    }

    private buildRequestBody(
        request: CompletionRequest,
        model: NonNullable<ReturnType<typeof getModelById>>,
        streaming = false
    ): Record<string, unknown> {
        const baseParameters: Record<string, unknown> = {
            max_tokens: request.maxTokens || model.maxOutputTokens,
            temperature: 0.7,
        };

        if (streaming) {
            baseParameters.incremental_output = true;
        }

        const multimodal = this.isMultimodalModel(model);
        const content = multimodal ? [{ text: request.prompt }] : request.prompt;

        return {
            model: request.model,
            input: {
                messages: [{ role: 'user', content }],
            },
            parameters: baseParameters,
        };
    }

    private async completeViaSSE(
        request: CompletionRequest,
        model: NonNullable<ReturnType<typeof getModelById>>,
        baseUrl: string,
        generationPath: string,
        startTime: number
    ): Promise<CompletionResponse> {
        const response = await this.withTimeout(
            fetch(`${baseUrl}${generationPath}`, {
                method: 'POST',
                headers: this.buildHeaders({ 'X-DashScope-SSE': 'enable' }),
                body: JSON.stringify(this.buildRequestBody(request, model, true)),
            })
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const { message, code } = this.extractErrorDetails(errorData, response.status, response.statusText);
            throw new Error(`[${response.status}] ${code ? `${code}: ` : ''}${message}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('SSE response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let inputTokens = 0;
        let outputTokens = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                const dataLine = line.slice(5).trim();
                if (!dataLine || dataLine === '[DONE]') continue;

                const parsed = JSON.parse(dataLine) as Record<string, unknown>;
                const piece = this.extractTextContent(parsed);
                if (piece) fullContent += piece;

                const usage = this.getObject(parsed, 'usage');
                if (usage) {
                    const inTokens = usage.input_tokens;
                    const outTokens = usage.output_tokens;
                    if (typeof inTokens === 'number') inputTokens = inTokens;
                    if (typeof outTokens === 'number') outputTokens = outTokens;
                }
            }
        }

        const costs = calculateCost(inputTokens, outputTokens, model);
        return {
            provider: this.providerType,
            model: request.model,
            content: fullContent,
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            inputCost: costs.inputCost,
            outputCost: costs.outputCost,
            totalCost: costs.totalCost,
            durationMs: Date.now() - startTime,
            finishReason: 'complete',
        };
    }

    private extractTextContent(data: unknown): string {
        const output = this.getObject(data, 'output');
        const directText = this.getString(output, 'text');
        if (typeof directText === 'string') return directText;

        const choices = this.getArray(output, 'choices');
        const firstChoice = choices.length > 0 ? choices[0] : undefined;
        const message = this.getObject(firstChoice, 'message');
        const messageContent = message ? message.content : undefined;
        if (typeof messageContent === 'string') return messageContent;

        if (Array.isArray(messageContent)) {
            const textParts = messageContent
                .map(part => this.getString(part, 'text') || '')
                .filter(Boolean);
            return textParts.join('\n');
        }

        return '';
    }

    private getObject(value: unknown, key: string): Record<string, unknown> | undefined {
        if (!value || typeof value !== 'object') return undefined;
        const record = value as Record<string, unknown>;
        const next = record[key];
        if (!next || typeof next !== 'object') return undefined;
        return next as Record<string, unknown>;
    }

    private getString(value: unknown, key: string): string | undefined {
        if (!value || typeof value !== 'object') return undefined;
        const record = value as Record<string, unknown>;
        const candidate = record[key];
        return typeof candidate === 'string' ? candidate : undefined;
    }

    private getArray(value: unknown, key: string): unknown[] {
        if (!value || typeof value !== 'object') return [];
        const record = value as Record<string, unknown>;
        return Array.isArray(record[key]) ? (record[key] as unknown[]) : [];
    }
}
