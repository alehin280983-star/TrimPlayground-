import { CompletionRequest, CompletionResponse, CompletionError, ProviderType } from '@/types';

/**
 * Abstract base class for AI provider integrations.
 * All providers must implement the complete and streamComplete methods.
 */
export abstract class BaseProvider {
    protected readonly apiKey: string;
    protected readonly timeout: number;

    constructor(apiKey: string, timeout: number = 30000) {
        this.apiKey = apiKey;
        this.timeout = timeout;
    }

    /**
     * Get the provider type identifier
     */
    abstract get providerType(): ProviderType;

    /**
     * Execute a non-streaming completion request
     */
    abstract complete(request: CompletionRequest): Promise<CompletionResponse>;

    /**
     * Execute a streaming completion request
     * Yields partial content as it arrives
     */
    abstract streamComplete(
        request: CompletionRequest
    ): AsyncGenerator<{ content: string; done: boolean; usage?: { inputTokens: number; outputTokens: number } }, void, unknown>;

    /**
     * Count tokens for a given text (if supported by provider)
     */
    abstract countTokens(text: string, model: string): Promise<number>;

    /**
     * Check if the provider is properly configured
     */
    isConfigured(): boolean {
        return !!this.apiKey && this.apiKey.length > 0;
    }

    /**
     * Create a standardized error response
     */
    protected createError(
        model: string,
        type: CompletionError['error']['type'],
        message: string,
        retryAfter?: number
    ): CompletionError {
        return {
            provider: this.providerType,
            model,
            error: {
                type,
                message,
                retryAfter,
            },
        };
    }

    /**
     * Parse error from provider API response
     */
    protected parseError(error: unknown, model: string): CompletionError {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('timeout') || message.includes('timed out')) {
                return this.createError(model, 'timeout', 'Request timed out. Please try again.');
            }

            if (message.includes('rate limit') || message.includes('429')) {
                return this.createError(model, 'rate_limit', 'API rate limit exceeded. Try again later.', 60);
            }

            if (message.includes('authentication') || message.includes('401') || message.includes('invalid api key')) {
                return this.createError(model, 'authentication', 'Invalid API key. Please contact support.');
            }

            if (message.includes('invalid') || message.includes('400')) {
                return this.createError(model, 'invalid_request', `Invalid request: ${error.message}`);
            }

            return this.createError(model, 'server_error', `${this.providerType} API error: ${error.message}`);
        }

        return this.createError(model, 'server_error', 'An unexpected error occurred');
    }

    /**
     * Execute request with timeout protection
     */
    protected async withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number = this.timeout
    ): Promise<T> {
        return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
            ),
        ]);
    }
}
