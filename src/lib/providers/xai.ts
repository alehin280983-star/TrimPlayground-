import { BaseProvider } from './base';
import { CompletionRequest, CompletionResponse, ProviderType } from '@/types';
import { getModelById, calculateCost } from '@/lib/config';

export class XAIProvider extends BaseProvider {
    private baseUrl = 'https://api.x.ai/v1';
    private videoPollIntervalMs = 2000;

    constructor(apiKey?: string, timeout?: number) {
        super(apiKey || process.env.XAI_API_KEY || '', timeout);
    }

    get providerType(): ProviderType {
        return 'xai';
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const startTime = Date.now();
        const model = getModelById(request.model);

        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

        const modality = model.modality ?? 'text';

        try {
            if (modality === 'image') {
                return this.completeImage(request, startTime);
            }

            if (modality === 'video') {
                return this.completeVideo(request, startTime);
            }

            return this.completeText(request, startTime);
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

        const modality = model.modality ?? 'text';
        if (modality !== 'text') {
            const response = await this.complete(request);
            yield {
                content: response.content,
                done: true,
                usage: {
                    inputTokens: response.inputTokens,
                    outputTokens: response.outputTokens,
                },
            };
            return;
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
                    temperature: 0.7,
                    stream: true,
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
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';
                            const isDone = Boolean(parsed.choices?.[0]?.finish_reason);

                            if (parsed.usage) {
                                usage = {
                                    inputTokens: parsed.usage.prompt_tokens,
                                    outputTokens: parsed.usage.completion_tokens,
                                };
                            }

                            yield {
                                content,
                                done: isDone,
                                usage: isDone ? usage : undefined,
                            };
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
        // xAI/Grok uses similar tokenization to GPT models
        // Rough estimate: ~4 chars per token for English
        return Math.ceil(text.length / 4);
    }

    private async completeText(request: CompletionRequest, startTime: number): Promise<CompletionResponse> {
        const model = getModelById(request.model);
        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

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
                    temperature: 0.7,
                }),
            })
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const inputTokens = data.usage?.prompt_tokens || 0;
        const outputTokens = data.usage?.completion_tokens || 0;
        const content = data.choices?.[0]?.message?.content || '';
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
            finishReason: data.choices?.[0]?.finish_reason === 'stop' ? 'complete' : 'length',
        };
    }

    private async completeImage(request: CompletionRequest, startTime: number): Promise<CompletionResponse> {
        const model = getModelById(request.model);
        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

        const response = await this.withTimeout(
            fetch(`${this.baseUrl}/images/generations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: request.model,
                    prompt: request.prompt,
                    n: 1,
                    response_format: 'url',
                }),
            })
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const imageUrl = data?.data?.[0]?.url || data?.url || data?.output?.[0]?.url;
        if (!imageUrl) {
            throw new Error('xAI image generation completed but no image URL returned');
        }

        const fixedCost = model.inputPrice;

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

    private async completeVideo(request: CompletionRequest, startTime: number): Promise<CompletionResponse> {
        const model = getModelById(request.model);
        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

        const createResponse = await this.withTimeout(
            fetch(`${this.baseUrl}/videos/generations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: request.model,
                    prompt: request.prompt,
                }),
            })
        );

        if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${createResponse.status}: ${createResponse.statusText}`);
        }

        const createData = await createResponse.json();
        const requestId = createData?.request_id || createData?.id;
        if (!requestId) {
            throw new Error('xAI video generation did not return request_id');
        }

        const maxWaitMs = Math.min(Math.max(this.timeout, 30000), 50000);
        const deadline = Date.now() + maxWaitMs;

        while (Date.now() < deadline) {
            const statusResponse = await this.withTimeout(
                fetch(`${this.baseUrl}/videos/${encodeURIComponent(requestId)}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                }),
                Math.min(this.timeout, 10000)
            );

            if (!statusResponse.ok) {
                const errorData = await statusResponse.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${statusResponse.status}: ${statusResponse.statusText}`);
            }

            const statusData = await statusResponse.json();
            const status = String(statusData?.status || '').toLowerCase();
            const done = Boolean(statusData?.done) || status === 'completed' || status === 'succeeded';
            const errorMessage = statusData?.error?.message || statusData?.error;
            if (errorMessage || status === 'failed' || status === 'error' || status === 'cancelled') {
                throw new Error(String(errorMessage || `xAI video generation failed with status: ${status}`));
            }

            if (done) {
                const videoUrl = statusData?.url || statusData?.video_url || statusData?.video?.url || statusData?.result?.url || statusData?.data?.[0]?.url;
                const durationValue = statusData?.duration_seconds ?? statusData?.duration ?? statusData?.video?.duration ?? statusData?.result?.duration;
                const durationSeconds = typeof durationValue === 'number' ? durationValue : Number(durationValue);
                const hasDuration = Number.isFinite(durationSeconds) && durationSeconds > 0;
                const mediaCost = hasDuration && model.pricePerSecond ? durationSeconds * model.pricePerSecond : 0;

                return {
                    provider: this.providerType,
                    model: request.model,
                    content: videoUrl || `Video ready (request_id: ${requestId})`,
                    media: {
                        type: 'video',
                        url: videoUrl || '',
                        durationSeconds: hasDuration ? durationSeconds : undefined,
                        status: 'completed',
                        requestId: String(requestId),
                    },
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0,
                    inputCost: 0,
                    outputCost: mediaCost,
                    totalCost: mediaCost,
                    durationMs: Date.now() - startTime,
                    finishReason: 'complete',
                };
            }

            await this.sleep(this.videoPollIntervalMs);
        }

        return {
            provider: this.providerType,
            model: request.model,
            content: `Video generation is still in progress (request_id: ${requestId})`,
            media: {
                type: 'video',
                url: '',
                status: 'pending',
                requestId: String(requestId),
            },
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            durationMs: Date.now() - startTime,
            finishReason: 'stopped',
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
