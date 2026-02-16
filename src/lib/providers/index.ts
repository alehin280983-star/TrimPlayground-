export { BaseProvider } from './base';
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { GoogleProvider } from './google';
export { MistralProvider } from './mistral';
export { CohereProvider } from './cohere';
export { DeepSeekProvider } from './deepseek';
export { XAIProvider } from './xai';
export { AlibabaProvider } from './alibaba';
export { MoonshotProvider } from './moonshot';
export { ZhipuProvider } from './zhipu';

import { ProviderType } from '@/types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { MistralProvider } from './mistral';
import { CohereProvider } from './cohere';
import { DeepSeekProvider } from './deepseek';
import { XAIProvider } from './xai';
import { AlibabaProvider } from './alibaba';
import { MoonshotProvider } from './moonshot';
import { ZhipuProvider } from './zhipu';
import { BaseProvider } from './base';

/**
 * Factory function to create provider instances
 */
export function createProvider(providerType: ProviderType): BaseProvider {
    switch (providerType) {
        case 'openai':
            return new OpenAIProvider();
        case 'anthropic':
            return new AnthropicProvider();
        case 'google':
            return new GoogleProvider();
        case 'mistral':
            return new MistralProvider();
        case 'cohere':
            return new CohereProvider();
        case 'deepseek':
            return new DeepSeekProvider();
        case 'xai':
            return new XAIProvider();
        case 'alibaba':
            return new AlibabaProvider();
        case 'moonshot':
            return new MoonshotProvider();
        case 'zhipu':
            return new ZhipuProvider();
        default:
            throw new Error(`Unknown provider: ${providerType}`);
    }
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): Map<ProviderType, BaseProvider> {
    const providers = new Map<ProviderType, BaseProvider>();

    const openai = new OpenAIProvider();
    if (openai.isConfigured()) providers.set('openai', openai);

    const anthropic = new AnthropicProvider();
    if (anthropic.isConfigured()) providers.set('anthropic', anthropic);

    const google = new GoogleProvider();
    if (google.isConfigured()) providers.set('google', google);

    const mistral = new MistralProvider();
    if (mistral.isConfigured()) providers.set('mistral', mistral);

    const cohere = new CohereProvider();
    if (cohere.isConfigured()) providers.set('cohere', cohere);

    const deepseek = new DeepSeekProvider();
    if (deepseek.isConfigured()) providers.set('deepseek', deepseek);

    const xai = new XAIProvider();
    if (xai.isConfigured()) providers.set('xai', xai);

    const alibaba = new AlibabaProvider();
    if (alibaba.isConfigured()) providers.set('alibaba', alibaba);

    const moonshot = new MoonshotProvider();
    if (moonshot.isConfigured()) providers.set('moonshot', moonshot);

    const zhipu = new ZhipuProvider();
    if (zhipu.isConfigured()) providers.set('zhipu', zhipu);

    return providers;
}
