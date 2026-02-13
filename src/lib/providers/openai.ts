import OpenAI from 'openai';
import { encode } from 'gpt-tokenizer';
import { Completion, CompletionCreateParamsNonStreaming } from 'openai/resources/completions';
import {
    ChatCompletion,
    ChatCompletionCreateParamsNonStreaming,
    ChatCompletionCreateParamsStreaming,
} from 'openai/resources/chat/completions/completions';
import { Response, ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses';
import { BaseProvider } from './base';
import { CompletionRequest, CompletionResponse, ModelConfig, ProviderType } from '@/types';
import { getModelById, calculateCost } from '@/lib/config';

export class OpenAIProvider extends BaseProvider {
    private client: OpenAI;

    constructor(apiKey?: string, timeout?: number) {
        super(apiKey || process.env.OPENAI_API_KEY || '', timeout);
        this.client = new OpenAI({
            apiKey: this.apiKey,
            timeout: this.timeout,
        });
    }

    get providerType(): ProviderType {
        return 'openai';
    }

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
        const startTime = Date.now();
        const model = getModelById(request.model);

        if (!model) {
            throw new Error(`Model ${request.model} not found`);
        }

        const modality = model.modality ?? 'text';
        if (modality !== 'text') {
            throw this.parseError(
                new Error(`Model ${request.model} (${modality}) is not supported for text completion`),
                request.model
            );
        }

        try {
            const endpoint = model.apiEndpoint ?? 'chat';
            if (endpoint === 'responses') {
                return await this.completeViaResponses(request, model, startTime);
            }

            if (endpoint === 'completions') {
                return await this.completeViaCompletions(request, model, startTime);
            }

            return await this.completeViaChat(request, model, startTime);
        } catch (error) {
            if (this.shouldFallbackToResponses(error, model)) {
                try {
                    return await this.completeViaResponses(request, model, startTime);
                } catch (fallbackError) {
                    throw this.parseError(fallbackError, request.model);
                }
            }
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
            throw this.parseError(
                new Error(`Model ${request.model} (${modality}) is not supported for text completion`),
                request.model
            );
        }

        const endpoint = model.apiEndpoint ?? 'chat';
        if (endpoint === 'responses' || endpoint === 'completions') {
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
            // Reasoning models (o1, o3, o4 series) and GPT-5 series require max_completion_tokens
            const usesMaxCompletionTokens = /^(o[134]|gpt-5)/.test(request.model);

            const streamParams: ChatCompletionCreateParamsStreaming = {
                model: request.model,
                messages: [{ role: 'user', content: request.prompt }],
                stream: true,
                stream_options: { include_usage: true },
                ...(usesMaxCompletionTokens
                    ? { max_completion_tokens: request.maxTokens || model.maxOutputTokens }
                    : { max_tokens: request.maxTokens || model.maxOutputTokens }),
            };

            const stream = await this.client.chat.completions.create(streamParams);

            let usage: { inputTokens: number; outputTokens: number } | undefined;

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';

                if (chunk.usage) {
                    usage = {
                        inputTokens: chunk.usage.prompt_tokens,
                        outputTokens: chunk.usage.completion_tokens,
                    };
                }

                const done = chunk.choices[0]?.finish_reason !== null;

                yield {
                    content,
                    done,
                    usage: done ? usage : undefined,
                };
            }
        } catch (error) {
            if (this.shouldFallbackToResponses(error, model)) {
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
            throw this.parseError(error, request.model);
        }
    }

    async countTokens(text: string): Promise<number> {
        return this.countTokensSync(text);
    }

    private countTokensSync(text: string): number {
        return encode(text).length;
    }

    private async completeViaChat(
        request: CompletionRequest,
        model: ModelConfig,
        startTime: number
    ): Promise<CompletionResponse> {
        const usesMaxCompletionTokens = /^(o[134]|gpt-5)/.test(request.model);
        const completionParams: ChatCompletionCreateParamsNonStreaming = {
            model: request.model,
            messages: [{ role: 'user', content: request.prompt }],
            ...(usesMaxCompletionTokens
                ? { max_completion_tokens: request.maxTokens || model.maxOutputTokens }
                : { max_tokens: request.maxTokens || model.maxOutputTokens }),
        };

        const response: ChatCompletion = await this.withTimeout(
            this.client.chat.completions.create(completionParams)
        );
        const inputTokens = response.usage?.prompt_tokens || this.countTokensSync(request.prompt);
        const outputTokens = response.usage?.completion_tokens || 0;
        const content = response.choices[0]?.message?.content || '';
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
            finishReason: response.choices[0]?.finish_reason === 'stop' ? 'complete' : 'length',
        };
    }

    private async completeViaResponses(
        request: CompletionRequest,
        model: ModelConfig,
        startTime: number
    ): Promise<CompletionResponse> {
        const requiresResearchTools = request.model.includes('deep-research');

        const responseParams: ResponseCreateParamsNonStreaming = {
            model: request.model,
            input: request.prompt,
            max_output_tokens: request.maxTokens || model.maxOutputTokens,
            ...(requiresResearchTools
                ? {
                    // Deep Research models require at least one tool in Responses API.
                    tools: [{ type: 'web_search_preview' }],
                }
                : {}),
        };

        const response: Response = await this.withTimeout(
            this.client.responses.create(responseParams)
        );

        const usage = response.usage;
        const inputTokens = usage?.input_tokens || this.countTokensSync(request.prompt);
        const outputTokens = usage?.output_tokens || 0;
        const content = response.output_text || '';
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
            finishReason: response.status === 'completed' ? 'complete' : 'length',
        };
    }

    private async completeViaCompletions(
        request: CompletionRequest,
        model: ModelConfig,
        startTime: number
    ): Promise<CompletionResponse> {
        const completionParams: CompletionCreateParamsNonStreaming = {
            model: request.model,
            prompt: request.prompt,
            max_tokens: request.maxTokens || model.maxOutputTokens,
        };

        const response: Completion = await this.withTimeout(
            this.client.completions.create(completionParams)
        );

        const inputTokens = response.usage?.prompt_tokens || this.countTokensSync(request.prompt);
        const outputTokens = response.usage?.completion_tokens || 0;
        const content = response.choices?.[0]?.text || '';
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
            finishReason: response.choices?.[0]?.finish_reason === 'stop' ? 'complete' : 'length',
        };
    }

    private shouldFallbackToResponses(error: unknown, model: ModelConfig): boolean {
        if ((model.apiEndpoint ?? 'chat') !== 'chat') {
            return false;
        }

        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        return (
            message.includes('not a chat model') ||
            message.includes('v1/chat/completions') ||
            message.includes('did you mean to use v1/completions')
        );
    }
}
