import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { BaseProvider } from './base';
import { CompletionRequest, CompletionResponse, ProviderType } from '@/types';
import { getModelById, calculateCost } from '@/lib/config';

export class GoogleProvider extends BaseProvider {
    private client: GoogleGenerativeAI;
    private readonly apiBaseUrls = [
        'https://generativelanguage.googleapis.com/v1beta',
        'https://generativelanguage.googleapis.com/v1',
    ];
    private readonly videoPollIntervalMs = 2000;

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
            if ((modelConfig.modality ?? 'text') === 'video') {
                return await this.completeVideo(request, modelConfig, startTime);
            }

            if (this.isImagenModel(request.model)) {
                return await this.completeImagenPredict(request, modelConfig, startTime);
            }
            if (this.shouldPreferInteractions(request.model)) {
                try {
                    return await this.completeViaInteractions(request, modelConfig, startTime);
                } catch {
                    // Fall back to generateContent flow for compatibility.
                }
            }
            return await this.completeGenerateContent(request, modelConfig, startTime);
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

    private shouldPreferInteractions(modelId: string): boolean {
        const id = modelId.toLowerCase();
        return id === 'gemini-2.5-pro';
    }

    private async completeImagenPredict(
        request: CompletionRequest,
        modelConfig: NonNullable<ReturnType<typeof getModelById>>,
        startTime: number
    ): Promise<CompletionResponse> {
        let lastError: string | undefined;
        for (const baseUrl of this.apiBaseUrls) {
            const response = await this.withTimeout(
                fetch(`${baseUrl}/models/${encodeURIComponent(request.model)}:predict`, {
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
                const parsedError = await this.parseGoogleErrorResponse(response);
                lastError = parsedError.message;
                if (this.shouldTryNextApiVersion(parsedError.statusCode, parsedError.message, request.model)) {
                    continue;
                }
                throw new Error(parsedError.message);
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
        throw new Error(lastError || 'Imagen request failed on all Google API versions');
    }

    private async completeGenerateContent(
        request: CompletionRequest,
        modelConfig: NonNullable<ReturnType<typeof getModelById>>,
        startTime: number
    ): Promise<CompletionResponse> {
        const generationConfig = this.getGenerationConfig(request, modelConfig);
        let lastError: string | undefined;
        for (const baseUrl of this.apiBaseUrls) {
            let response = await this.requestGenerateContent(baseUrl, request.model, request.prompt, generationConfig);

            if (!response.ok) {
                let parsedError = await this.parseGoogleErrorResponse(response);
                lastError = parsedError.message;

                if (this.shouldRetryWithMinimalPayload(parsedError.message)) {
                    const minimalResponse = await this.requestGenerateContent(baseUrl, request.model, request.prompt, undefined, true);
                    if (minimalResponse.ok) {
                        response = minimalResponse;
                    } else {
                        parsedError = await this.parseGoogleErrorResponse(minimalResponse);
                        lastError = parsedError.message;
                    }
                }

                if (response.ok) {
                    // Proceed to normal parsing below.
                } else {
                if (this.shouldFallbackToStreamGenerate(parsedError.statusCode, parsedError.message, request.model)) {
                    try {
                        return await this.completeViaStreamGenerate(request, modelConfig, startTime, baseUrl);
                    } catch (streamError) {
                        const streamMessage = streamError instanceof Error ? streamError.message : String(streamError);
                        lastError = streamMessage;
                    }
                }
                if (this.shouldTryNextApiVersion(parsedError.statusCode, parsedError.message, request.model)) {
                    continue;
                }
                throw new Error(parsedError.message);
                }
            }

            const data = await response.json();
            const output = this.extractGenerateContentOutput(data);
            const usage = this.extractUsageMetadata(data);

            const inputTokens = usage.promptTokenCount ?? this.estimateTokens(request.prompt);
            const outputTokens = usage.candidatesTokenCount ?? (output.text ? this.estimateTokens(output.text) : 0);
            const costs = calculateCost(inputTokens, outputTokens, modelConfig);

            return {
                provider: this.providerType,
                model: request.model,
                content: output.text || output.imageDataUrl || '',
                media: output.imageDataUrl
                    ? {
                        type: 'image',
                        url: output.imageDataUrl,
                        status: 'completed',
                    }
                    : undefined,
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
        throw new Error(lastError || 'Google generateContent failed on all API versions');
    }

    private async completeVideo(
        request: CompletionRequest,
        modelConfig: NonNullable<ReturnType<typeof getModelById>>,
        startTime: number
    ): Promise<CompletionResponse> {
        let lastError: string | undefined;

        for (const baseUrl of this.apiBaseUrls) {
            try {
                const started = await this.startVideoGeneration(baseUrl, request.model, request.prompt);
                const immediate = this.extractGeneratedVideo(started.payload);
                if (immediate) {
                    const totalCost = immediate.durationSeconds && modelConfig.pricePerSecond
                        ? immediate.durationSeconds * modelConfig.pricePerSecond
                        : 0;
                    return {
                        provider: this.providerType,
                        model: request.model,
                        content: immediate.url || `Video completed (${request.model})`,
                        media: {
                            type: 'video',
                            url: immediate.url || '',
                            durationSeconds: immediate.durationSeconds,
                            status: 'completed',
                            requestId: started.operationName || undefined,
                        },
                        inputTokens: 0,
                        outputTokens: 0,
                        totalTokens: 0,
                        inputCost: 0,
                        outputCost: totalCost,
                        totalCost,
                        durationMs: Date.now() - startTime,
                        finishReason: 'complete',
                    };
                }

                if (!started.operationName) {
                    throw new Error('Google video generation did not return operation id');
                }

                return await this.pollVideoOperation(
                    baseUrl,
                    request.model,
                    started.operationName,
                    modelConfig,
                    startTime
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                lastError = message;
                const statusCode = this.getStatusCodeFromError(error) ?? 500;
                if (this.shouldTryNextApiVersion(statusCode, message, request.model)) {
                    continue;
                }
                throw error;
            }
        }

        throw new Error(lastError || 'Google video generation failed on all API versions');
    }

    private async startVideoGeneration(
        baseUrl: string,
        modelId: string,
        prompt: string
    ): Promise<{ operationName: string | null; payload: unknown }> {
        const modelCandidates = this.getVideoModelCandidates(modelId);
        let preferredError: { message: string; statusCode: number; status: string } | null = null;

        for (const candidateModel of modelCandidates) {
            const attempts = this.buildVideoStartAttempts(baseUrl, candidateModel, prompt);
            for (const attempt of attempts) {
                const response = await this.withTimeout(
                    fetch(attempt.endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': this.apiKey,
                        },
                        body: JSON.stringify(attempt.payload),
                    })
                );

                if (!response.ok) {
                    const parsedError = await this.parseGoogleErrorResponse(response);
                    preferredError = this.preferGoogleError(preferredError, parsedError);
                    continue;
                }

                const data = await response.json();
                const operationName = this.extractOperationName(data);
                return { operationName, payload: data };
            }
        }

        if (preferredError) {
            const isVeoModel = modelId.toLowerCase().startsWith('veo-');
            if (isVeoModel && preferredError.statusCode === 404) {
                throw this.createGoogleApiError(
                    `Veo model ${modelId} is unavailable for this API key/project. ` +
                    'Veo models require Gemini API paid tier access (billing enabled) and supported region availability.',
                    preferredError.statusCode,
                    preferredError.status
                );
            }
            throw this.createGoogleApiError(preferredError.message, preferredError.statusCode, preferredError.status);
        }

        throw new Error('Google video request failed');
    }

    private buildVideoStartAttempts(
        baseUrl: string,
        modelId: string,
        prompt: string
    ): Array<{ endpoint: string; payload: unknown }> {
        const predictLongRunningEndpoint = `${baseUrl}/models/${encodeURIComponent(modelId)}:predictLongRunning`;
        return [
            {
                endpoint: predictLongRunningEndpoint,
                payload: {
                    instances: [{ prompt }],
                    parameters: {
                        aspectRatio: '16:9',
                    },
                },
            },
            {
                endpoint: predictLongRunningEndpoint,
                payload: {
                    instances: [{ prompt }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: '16:9',
                    },
                },
            },
            {
                endpoint: predictLongRunningEndpoint,
                payload: {
                    instances: [{ prompt: { text: prompt } }],
                    parameters: {
                        aspectRatio: '16:9',
                    },
                },
            },
            {
                endpoint: predictLongRunningEndpoint,
                payload: {
                    instances: [{ prompt }],
                },
            },
        ];
    }

    private preferGoogleError(
        current: { message: string; statusCode: number; status: string } | null,
        next: { message: string; statusCode: number; status: string }
    ): { message: string; statusCode: number; status: string } {
        if (!current) return next;
        if (current.statusCode === 404 && next.statusCode !== 404) return next;
        return current;
    }

    private getVideoModelCandidates(modelId: string): string[] {
        const aliases: Record<string, string[]> = {
            'veo-3.0-generate-001': ['veo-3-generate-001', 'veo-3.0-generate-preview', 'veo-3-generate-preview'],
            'veo-3.0-fast-generate-001': ['veo-3-fast-generate-001', 'veo-3.0-fast-generate-preview', 'veo-3-fast-generate-preview'],
            'veo-2.0-generate-001': ['veo-2-generate-001', 'veo-2.0-generate-preview', 'veo-2-generate-preview'],
            'veo-3.1-generate-preview': ['veo-3.1-generate-001', 'veo-3-generate-preview'],
            'veo-3.1-fast-generate-preview': ['veo-3.1-fast-generate-001', 'veo-3-fast-generate-preview'],
        };

        const candidates = [modelId, ...(aliases[modelId] || [])];
        return [...new Set(candidates)];
    }

    private createGoogleApiError(message: string, statusCode: number, status: string): Error {
        const error = new Error(message) as Error & { statusCode?: number; status?: string };
        error.statusCode = statusCode;
        error.status = status;
        return error;
    }

    private getStatusCodeFromError(error: unknown): number | undefined {
        if (!error || typeof error !== 'object') return undefined;
        const record = error as Record<string, unknown>;
        return typeof record.statusCode === 'number' ? record.statusCode : undefined;
    }

    private resolveOperationPath(baseUrl: string, operationName: string): string {
        if (/^https?:\/\//i.test(operationName)) {
            return operationName;
        }

        const trimmed = operationName.trim();
        const base = new URL(baseUrl);
        const versionPath = base.pathname.replace(/\/+$/, '');

        if (trimmed.startsWith('/')) {
            return `${base.origin}${trimmed}`;
        }

        if (trimmed.startsWith('operations/')) {
            return `${base.origin}${versionPath}/${trimmed}`;
        }

        if (trimmed.startsWith('v1/') || trimmed.startsWith('v1beta/')) {
            return `${base.origin}/${trimmed}`;
        }

        if (trimmed.startsWith('projects/')) {
            return `${base.origin}${versionPath}/${trimmed}`;
        }

        return `${base.origin}${versionPath}/operations/${trimmed}`;
    }

    private isOperationDone(data: unknown): boolean {
        if (!data || typeof data !== 'object') return false;
        const record = data as Record<string, unknown>;
        if (typeof record.done === 'boolean') return record.done;
        const status = typeof record.status === 'string' ? record.status.toUpperCase() : '';
        return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED' || status === 'DONE';
    }

    private async pollVideoOperation(
        baseUrl: string,
        modelId: string,
        operationName: string,
        modelConfig: NonNullable<ReturnType<typeof getModelById>>,
        startTime: number
    ): Promise<CompletionResponse> {
        const maxWaitMs = Math.min(Math.max(this.timeout, 30000), 55000);
        const deadline = Date.now() + maxWaitMs;
        const opPath = this.resolveOperationPath(baseUrl, operationName);

        while (Date.now() < deadline) {
            const response = await this.withTimeout(
                fetch(opPath, {
                    method: 'GET',
                    headers: {
                        'x-goog-api-key': this.apiKey,
                    },
                }),
                Math.min(this.timeout, 10000)
            );

            if (!response.ok) {
                const parsedError = await this.parseGoogleErrorResponse(response);
                throw new Error(parsedError.message);
            }

            const data = await response.json();
            const done = this.isOperationDone(data);
            const opError = this.extractOperationError(data);
            if (opError) {
                throw new Error(opError);
            }

            if (done) {
                const generated = this.extractGeneratedVideo(data);
                const totalCost = generated?.durationSeconds && modelConfig.pricePerSecond
                    ? generated.durationSeconds * modelConfig.pricePerSecond
                    : 0;

                return {
                    provider: this.providerType,
                    model: modelId,
                    content: generated?.url || `Video completed (${modelId})`,
                    media: {
                        type: 'video',
                        url: generated?.url || '',
                        durationSeconds: generated?.durationSeconds,
                        status: 'completed',
                        requestId: operationName,
                    },
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0,
                    inputCost: 0,
                    outputCost: totalCost,
                    totalCost,
                    durationMs: Date.now() - startTime,
                    finishReason: 'complete',
                };
            }

            await this.sleep(this.videoPollIntervalMs);
        }

        return {
            provider: this.providerType,
            model: modelId,
            content: `Video generation in progress (${operationName})`,
            media: {
                type: 'video',
                url: '',
                status: 'pending',
                requestId: operationName,
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

    private async completeViaInteractions(
        request: CompletionRequest,
        modelConfig: NonNullable<ReturnType<typeof getModelById>>,
        startTime: number
    ): Promise<CompletionResponse> {
        const response = await this.withTimeout(
            fetch(`${this.apiBaseUrls[0]}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey,
                },
                body: JSON.stringify({
                    model: request.model,
                    input: request.prompt,
                    store: false,
                }),
            })
        );

        if (!response.ok) {
            const parsedError = await this.parseGoogleErrorResponse(response);
            throw new Error(parsedError.message);
        }

        const data = await response.json();
        const output = this.extractInteractionOutput(data);
        const usage = this.extractUsageMetadata(data);

        const inputTokens = usage.promptTokenCount ?? this.estimateTokens(request.prompt);
        const outputTokens = usage.candidatesTokenCount ?? (output.text ? this.estimateTokens(output.text) : 0);
        const costs = calculateCost(inputTokens, outputTokens, modelConfig);

        return {
            provider: this.providerType,
            model: request.model,
            content: output.text || output.imageDataUrl || '',
            media: output.imageDataUrl
                ? {
                    type: 'image',
                    url: output.imageDataUrl,
                    status: 'completed',
                }
                : undefined,
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

    private async parseGoogleErrorResponse(response: globalThis.Response): Promise<{ message: string; statusCode: number; status: string }> {
        const raw = await response.text();
        let message = `HTTP ${response.status}: ${response.statusText}`;
        let status = '';
        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            const errorObj = parsed.error && typeof parsed.error === 'object'
                ? (parsed.error as Record<string, unknown>)
                : undefined;
            const code = typeof errorObj?.status === 'string'
                ? errorObj.status
                : (typeof errorObj?.code === 'number' ? String(errorObj.code) : '');
            status = code;
            const detail = typeof errorObj?.message === 'string'
                ? errorObj.message
                : (typeof parsed.message === 'string' ? parsed.message : message);
            message = code ? `${code}: ${detail}` : detail;
        } catch {
            if (raw) message = raw;
        }
        return { message, statusCode: response.status, status };
    }

    private shouldFallbackToStreamGenerate(statusCode: number, message: string, modelId: string): boolean {
        const text = String(message).toLowerCase();
        const id = modelId.toLowerCase();
        if (id.includes('imagen-')) return false;
        return (
            statusCode >= 500 ||
            text.includes("reading 'includes'") ||
            text.includes('internal') ||
            text.includes('unavailable') ||
            text.includes('overloaded')
        );
    }

    private shouldTryNextApiVersion(statusCode: number, message: string, modelId: string): boolean {
        const text = String(message).toLowerCase();
        const id = modelId.toLowerCase();
        if (id.includes('imagen-')) return statusCode >= 500 || text.includes('internal') || text.includes('not found');
        return (
            statusCode >= 500 ||
            text.includes("reading 'includes'") ||
            text.includes('internal') ||
            text.includes('not found') ||
            text.includes('model') && text.includes('not') && text.includes('supported')
        );
    }

    private shouldRetryWithMinimalPayload(message: string): boolean {
        const text = String(message).toLowerCase();
        return text.includes("reading 'includes'") || text.includes('internal');
    }

    private async requestGenerateContent(
        baseUrl: string,
        model: string,
        prompt: string,
        generationConfig?: { maxOutputTokens: number },
        minimalPayload = false
    ): Promise<globalThis.Response> {
        const body = minimalPayload
            ? {
                contents: [{ parts: [{ text: prompt }] }],
            }
            : {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                ...(generationConfig ? { generationConfig } : {}),
            };

        return this.withTimeout(
            fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey,
                },
                body: JSON.stringify(body),
            })
        );
    }

    private async completeViaStreamGenerate(
        request: CompletionRequest,
        modelConfig: NonNullable<ReturnType<typeof getModelById>>,
        startTime: number,
        baseUrl: string
    ): Promise<CompletionResponse> {
        const generationConfig = this.getGenerationConfig(request, modelConfig);
        const response = await this.withTimeout(
            fetch(`${baseUrl}/models/${encodeURIComponent(request.model)}:streamGenerateContent?alt=sse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey,
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: request.prompt }] }],
                    ...(generationConfig ? { generationConfig } : {}),
                }),
            })
        );

        if (!response.ok) {
            const parsedError = await this.parseGoogleErrorResponse(response);
            throw new Error(parsedError.message);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Google stream response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let imageDataUrl: string | undefined;
        let promptTokenCount: number | undefined;
        let candidatesTokenCount: number | undefined;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                const payload = line.slice(5).trim();
                if (!payload) continue;
                if (payload === '[DONE]') continue;

                let parsed: unknown;
                try {
                    parsed = JSON.parse(payload);
                } catch {
                    continue;
                }

                const output = this.extractGenerateContentOutput(parsed);
                if (output.text) fullText += output.text;
                if (output.imageDataUrl) imageDataUrl = output.imageDataUrl;

                const usage = this.extractUsageMetadata(parsed);
                if (typeof usage.promptTokenCount === 'number') promptTokenCount = usage.promptTokenCount;
                if (typeof usage.candidatesTokenCount === 'number') candidatesTokenCount = usage.candidatesTokenCount;
            }
        }

        const inputTokens = promptTokenCount ?? this.estimateTokens(request.prompt);
        const outputTokens = candidatesTokenCount ?? (fullText ? this.estimateTokens(fullText) : 0);
        const costs = calculateCost(inputTokens, outputTokens, modelConfig);

        return {
            provider: this.providerType,
            model: request.model,
            content: fullText || imageDataUrl || '',
            media: imageDataUrl
                ? {
                    type: 'image',
                    url: imageDataUrl,
                    status: 'completed',
                }
                : undefined,
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

    private extractGenerateContentOutput(data: unknown): { text: string; imageDataUrl?: string } {
        if (!data || typeof data !== 'object') {
            return { text: '' };
        }

        const record = data as Record<string, unknown>;
        const candidates = Array.isArray(record.candidates) ? record.candidates : [];
        if (candidates.length === 0 || !candidates[0] || typeof candidates[0] !== 'object') {
            return { text: '' };
        }

        const candidate = candidates[0] as Record<string, unknown>;
        const content = candidate.content && typeof candidate.content === 'object'
            ? (candidate.content as Record<string, unknown>)
            : undefined;
        const parts = content && Array.isArray(content.parts) ? content.parts : [];

        const textParts: string[] = [];
        for (const part of parts) {
            if (!part || typeof part !== 'object') continue;
            const recordPart = part as Record<string, unknown>;
            if (typeof recordPart.text === 'string') {
                textParts.push(recordPart.text);
            }
            const inlineData = recordPart.inlineData && typeof recordPart.inlineData === 'object'
                ? (recordPart.inlineData as Record<string, unknown>)
                : undefined;
            const mimeType = typeof inlineData?.mimeType === 'string' ? inlineData.mimeType : '';
            const data64 = typeof inlineData?.data === 'string' ? inlineData.data : '';
            if (mimeType.startsWith('image/') && data64) {
                return { text: textParts.join('\n').trim(), imageDataUrl: `data:${mimeType};base64,${data64}` };
            }
        }

        return { text: textParts.join('\n').trim() };
    }

    private extractUsageMetadata(data: unknown): { promptTokenCount?: number; candidatesTokenCount?: number } {
        if (!data || typeof data !== 'object') {
            return {};
        }

        const record = data as Record<string, unknown>;
        const usage = record.usageMetadata && typeof record.usageMetadata === 'object'
            ? (record.usageMetadata as Record<string, unknown>)
            : undefined;
        if (usage) {
            const promptTokenCount = typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : undefined;
            const candidatesTokenCount = typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : undefined;
            if (promptTokenCount !== undefined || candidatesTokenCount !== undefined) {
                return { promptTokenCount, candidatesTokenCount };
            }
        }

        // Interactions API usage uses a different naming convention.
        const interactionUsage = record.usage && typeof record.usage === 'object'
            ? (record.usage as Record<string, unknown>)
            : undefined;
        if (!interactionUsage) return {};

        const promptTokenCount = typeof interactionUsage.input_tokens === 'number'
            ? interactionUsage.input_tokens
            : (typeof interactionUsage.promptTokenCount === 'number' ? interactionUsage.promptTokenCount : undefined);
        const candidatesTokenCount = typeof interactionUsage.output_tokens === 'number'
            ? interactionUsage.output_tokens
            : (typeof interactionUsage.candidatesTokenCount === 'number' ? interactionUsage.candidatesTokenCount : undefined);

        return { promptTokenCount, candidatesTokenCount };
    }

    private extractInteractionOutput(data: unknown): { text: string; imageDataUrl?: string } {
        if (!data || typeof data !== 'object') {
            return { text: '' };
        }

        const record = data as Record<string, unknown>;
        const outputs = Array.isArray(record.outputs) ? record.outputs : [];
        if (outputs.length === 0) {
            return { text: '' };
        }

        const textParts: string[] = [];
        for (const output of outputs) {
            if (!output || typeof output !== 'object') continue;
            const item = output as Record<string, unknown>;
            if (item.type === 'text' && typeof item.text === 'string') {
                textParts.push(item.text);
                continue;
            }
            if (item.type === 'image' && typeof item.data === 'string') {
                const mimeType = typeof item.mime_type === 'string' ? item.mime_type : 'image/png';
                return { text: textParts.join('\n').trim(), imageDataUrl: `data:${mimeType};base64,${item.data}` };
            }
        }

        return { text: textParts.join('\n').trim() };
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

    private extractOperationName(data: unknown): string | null {
        if (!data || typeof data !== 'object') return null;
        const record = data as Record<string, unknown>;
        if (typeof record.name === 'string' && record.name) return record.name;
        if (typeof record.operationName === 'string' && record.operationName) return record.operationName;
        const operation = record.operation && typeof record.operation === 'object'
            ? (record.operation as Record<string, unknown>)
            : undefined;
        return typeof operation?.name === 'string' ? operation.name : null;
    }

    private extractOperationError(data: unknown): string | null {
        if (!data || typeof data !== 'object') return null;
        const record = data as Record<string, unknown>;
        const errorObj = record.error && typeof record.error === 'object'
            ? (record.error as Record<string, unknown>)
            : undefined;
        if (errorObj) {
            if (typeof errorObj.message === 'string') return errorObj.message;
            if (typeof errorObj.code === 'string') return errorObj.code;
            if (typeof errorObj.code === 'number') return `Operation failed: ${errorObj.code}`;
            return 'Operation failed';
        }

        const status = typeof record.status === 'string' ? record.status.toUpperCase() : '';
        if (status === 'FAILED' || status === 'CANCELLED') {
            return `Operation ${status.toLowerCase()}`;
        }

        return null;
    }

    private extractGeneratedVideo(data: unknown): { url: string; durationSeconds?: number } | null {
        if (!data || typeof data !== 'object') return null;
        const root = data as Record<string, unknown>;

        const candidates: unknown[] = [];
        candidates.push(root);
        if (root.response && typeof root.response === 'object') candidates.push(root.response);
        if (root.result && typeof root.result === 'object') candidates.push(root.result);

        for (const candidate of candidates) {
            if (!candidate || typeof candidate !== 'object') continue;
            const record = candidate as Record<string, unknown>;

            // REST predictLongRunning response shape:
            // response.generateVideoResponse.generatedSamples[0].video.uri
            const generateVideoResponse = record.generateVideoResponse && typeof record.generateVideoResponse === 'object'
                ? (record.generateVideoResponse as Record<string, unknown>)
                : undefined;
            const generatedSamples = generateVideoResponse && Array.isArray(generateVideoResponse.generatedSamples)
                ? generateVideoResponse.generatedSamples
                : [];
            if (generatedSamples.length > 0 && generatedSamples[0] && typeof generatedSamples[0] === 'object') {
                const sampleVideo = (generatedSamples[0] as Record<string, unknown>).video;
                const parsed = this.extractVideoFromRecord(sampleVideo);
                if (parsed) return parsed;
            }

            const generatedVideos = Array.isArray(record.generatedVideos) ? record.generatedVideos : [];
            if (generatedVideos.length > 0) {
                const first = generatedVideos[0];
                if (first && typeof first === 'object') {
                    const video = (first as Record<string, unknown>).video;
                    const parsed = this.extractVideoFromRecord(video);
                    if (parsed) return parsed;
                }
            }

            const videos = Array.isArray(record.videos) ? record.videos : [];
            if (videos.length > 0) {
                const parsed = this.extractVideoFromRecord(videos[0]);
                if (parsed) return parsed;
            }

            const direct = this.extractVideoFromRecord(record.video);
            if (direct) return direct;
        }

        return null;
    }

    private extractVideoFromRecord(value: unknown): { url: string; durationSeconds?: number } | null {
        if (!value || typeof value !== 'object') return null;
        const record = value as Record<string, unknown>;
        const url = typeof record.uri === 'string'
            ? record.uri
            : (typeof record.url === 'string' ? record.url : '');
        if (!url) return null;

        const metadata = record.videoMetadata && typeof record.videoMetadata === 'object'
            ? (record.videoMetadata as Record<string, unknown>)
            : undefined;
        const durationRaw = metadata?.videoDuration;
        const durationSeconds = this.parseDurationSeconds(durationRaw);
        return { url, durationSeconds: durationSeconds || undefined };
    }

    private parseDurationSeconds(value: unknown): number | null {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value !== 'string') return null;
        const trimmed = value.trim().toLowerCase();
        const secondsMatch = trimmed.match(/^(\d+(?:\.\d+)?)s$/);
        if (secondsMatch) {
            const parsed = Number(secondsMatch[1]);
            return Number.isFinite(parsed) ? parsed : null;
        }
        const numeric = Number(trimmed);
        return Number.isFinite(numeric) ? numeric : null;
    }

    private async sleep(ms: number): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
}
