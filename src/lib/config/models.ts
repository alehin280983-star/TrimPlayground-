import { ModelConfig, ProviderConfig } from '@/types';

// OpenAI Models (Strictly from User List)
const openaiModels: ModelConfig[] = [
    {
        id: 'gpt-5.1',
        name: 'GPT-5.1',
        provider: 'openai',
        inputPrice: 0.00125,
        outputPrice: 0.01,
        cachedInputPrice: 0.000125,
        maxTokens: 400000,
        maxOutputTokens: 128000,
        freeTierAvailable: false,
        description: 'Flagship model for coding and agentic tasks',
        speedRating: 4,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'gpt-5.2',
        name: 'GPT-5.2',
        provider: 'openai',
        inputPrice: 0.00175,
        outputPrice: 0.014,
        cachedInputPrice: 0.000175,
        maxTokens: 400000,
        maxOutputTokens: 128000,
        freeTierAvailable: false,
        description: 'Next generation flagship model',
        speedRating: 4,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'gpt-5',
        name: 'GPT-5',
        provider: 'openai',
        inputPrice: 0.00125,
        outputPrice: 0.01,
        cachedInputPrice: 0.000125,
        maxTokens: 400000,
        maxOutputTokens: 128000,
        freeTierAvailable: false,
        description: 'Previous flagship reasoning model',
        speedRating: 4,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'gpt-5-pro',
        name: 'GPT-5 Pro',
        provider: 'openai',
        inputPrice: 0.015,
        outputPrice: 0.12,
        maxTokens: 400000,
        maxOutputTokens: 272000,
        freeTierAvailable: false,
        description: 'High-precision GPT-5 variant',
        speedRating: 2,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'gpt-5.2-pro',
        name: 'GPT-5.2 Pro',
        provider: 'openai',
        inputPrice: 0.021,
        outputPrice: 0.168,
        maxTokens: 400000,
        maxOutputTokens: 128000,
        freeTierAvailable: false,
        description: 'Massive reasoning model (Responses API only)',
        speedRating: 3,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'gpt-5-nano',
        name: 'GPT-5 Nano',
        provider: 'openai',
        inputPrice: 0.00005,
        outputPrice: 0.0004,
        cachedInputPrice: 0.000005,
        maxTokens: 400000,
        maxOutputTokens: 128000,
        freeTierAvailable: true,
        description: 'Fastest and cheapest GPT-5 variant',
        speedRating: 5,
        qualityRating: 3,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'gpt-5-mini',
        name: 'GPT-5 Mini',
        provider: 'openai',
        inputPrice: 0.00025,
        outputPrice: 0.002,
        cachedInputPrice: 0.000025,
        maxTokens: 400000,
        maxOutputTokens: 128000,
        freeTierAvailable: true,
        description: 'Efficient next-gen model',
        speedRating: 5,
        qualityRating: 4,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'gpt-5.2-chat-latest',
        name: 'GPT-5.2 Chat Latest',
        provider: 'openai',
        inputPrice: 0.00175,
        outputPrice: 0.014,
        cachedInputPrice: 0.000175,
        maxTokens: 128000,
        maxOutputTokens: 16384,
        freeTierAvailable: false,
        description: 'GPT-5.2 snapshot currently used in ChatGPT',
        speedRating: 4,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'chat',
    },
    {
        id: 'gpt-5.1-chat-latest',
        name: 'GPT-5.1 Chat Latest',
        provider: 'openai',
        inputPrice: 0.00125,
        outputPrice: 0.01,
        cachedInputPrice: 0.000125,
        maxTokens: 128000,
        maxOutputTokens: 16384,
        freeTierAvailable: false,
        description: 'Chat-tuned alias for GPT-5.1',
        speedRating: 4,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'chat',
    },
    {
        id: 'gpt-5-chat-latest',
        name: 'GPT-5 Chat Latest',
        provider: 'openai',
        inputPrice: 0.00125,
        outputPrice: 0.01,
        cachedInputPrice: 0.000125,
        maxTokens: 128000,
        maxOutputTokens: 16384,
        freeTierAvailable: false,
        description: 'Chat-tuned alias for GPT-5',
        speedRating: 4,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'chat',
    },
    {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        provider: 'openai',
        inputPrice: 0.002,
        outputPrice: 0.008,
        cachedInputPrice: 0.0005,
        maxTokens: 1047576,
        maxOutputTokens: 32768,
        freeTierAvailable: false,
        description: 'Updated GPT-4 generation',
        speedRating: 4,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'chat',
    },
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        inputPrice: 0.0025,
        outputPrice: 0.01,
        cachedInputPrice: 0.00125,
        maxTokens: 128000,
        maxOutputTokens: 16384,
        freeTierAvailable: false,
        description: 'Omni flagship model',
        speedRating: 4,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'chat',
    },
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        inputPrice: 0.00015,
        outputPrice: 0.0006,
        cachedInputPrice: 0.000075,
        maxTokens: 128000,
        maxOutputTokens: 16384,
        freeTierAvailable: true,
        description: 'Efficient GPT-4o variant',
        speedRating: 5,
        qualityRating: 4,
        modality: 'text',
        apiEndpoint: 'chat',
    },
    {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        provider: 'openai',
        inputPrice: 0.0004,
        outputPrice: 0.0016,
        cachedInputPrice: 0.0001,
        maxTokens: 1047576,
        maxOutputTokens: 32768,
        freeTierAvailable: true,
        description: 'Updated Mini model',
        speedRating: 5,
        qualityRating: 4,
        modality: 'text',
        apiEndpoint: 'chat',
    },
    {
        id: 'gpt-4.1-nano',
        name: 'GPT-4.1 Nano',
        provider: 'openai',
        inputPrice: 0.0001,
        outputPrice: 0.0004,
        cachedInputPrice: 0.000025,
        maxTokens: 1047576,
        maxOutputTokens: 32768,
        freeTierAvailable: true,
        description: 'Ultra-efficient nano model',
        speedRating: 5,
        qualityRating: 3,
        modality: 'text',
        apiEndpoint: 'chat',
    },
    {
        id: 'o3-pro',
        name: 'o3-pro',
        provider: 'openai',
        inputPrice: 0.02,
        outputPrice: 0.08,
        maxTokens: 200000,
        maxOutputTokens: 100000,
        freeTierAvailable: false,
        description: 'High-precision reasoning model',
        speedRating: 2,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'o3',
        name: 'o3',
        provider: 'openai',
        inputPrice: 0.002,
        outputPrice: 0.008,
        cachedInputPrice: 0.0005,
        maxTokens: 200000,
        maxOutputTokens: 100000,
        freeTierAvailable: false,
        description: 'General reasoning model',
        speedRating: 3,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'o3-mini',
        name: 'o3-mini',
        provider: 'openai',
        inputPrice: 0.0011,
        outputPrice: 0.0044,
        cachedInputPrice: 0.00055,
        maxTokens: 200000,
        maxOutputTokens: 100000,
        freeTierAvailable: true,
        description: 'Compact reasoning model',
        speedRating: 4,
        qualityRating: 4,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'o1-pro',
        name: 'o1-pro',
        provider: 'openai',
        inputPrice: 0.15,
        outputPrice: 0.6,
        maxTokens: 200000,
        maxOutputTokens: 100000,
        freeTierAvailable: false,
        description: 'Maximum-depth reasoning model',
        speedRating: 1,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'o1',
        name: 'o1',
        provider: 'openai',
        inputPrice: 0.015,
        outputPrice: 0.06,
        cachedInputPrice: 0.0075,
        maxTokens: 200000,
        maxOutputTokens: 100000,
        freeTierAvailable: false,
        description: 'Full o-series reasoning model',
        speedRating: 2,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'o3-deep-research',
        name: 'o3 Deep Research',
        provider: 'openai',
        inputPrice: 0.01,
        outputPrice: 0.04,
        cachedInputPrice: 0.0025,
        maxTokens: 200000,
        maxOutputTokens: 100000,
        freeTierAvailable: false,
        description: 'Reasoning model tuned for deep research',
        speedRating: 2,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'o4-mini-deep-research',
        name: 'o4-mini Deep Research',
        provider: 'openai',
        inputPrice: 0.002,
        outputPrice: 0.008,
        cachedInputPrice: 0.0005,
        maxTokens: 200000,
        maxOutputTokens: 100000,
        freeTierAvailable: false,
        description: 'Fast deep-research reasoning model',
        speedRating: 3,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'o4-mini',
        name: 'o4-mini',
        provider: 'openai',
        inputPrice: 0.0011,
        outputPrice: 0.0044,
        cachedInputPrice: 0.000275,
        maxTokens: 200000,
        maxOutputTokens: 100000,
        freeTierAvailable: false,
        description: 'Reasoning mini model',
        speedRating: 3,
        qualityRating: 5,
        modality: 'text',
        apiEndpoint: 'responses',
    },
    {
        id: 'gpt-realtime',
        name: 'GPT Realtime',
        provider: 'openai',
        inputPrice: 0.004,
        outputPrice: 0.016,
        cachedInputPrice: 0.0004,
        maxTokens: 32000,
        maxOutputTokens: 4096,
        freeTierAvailable: false,
        description: 'Low latency realtime model',
        speedRating: 5,
        qualityRating: 4,
        modality: 'text',
        apiEndpoint: 'chat',
    },
    {
        id: 'gpt-realtime-mini',
        name: 'GPT Realtime Mini',
        provider: 'openai',
        inputPrice: 0.0006,
        outputPrice: 0.0024,
        cachedInputPrice: 0.00006,
        maxTokens: 32000,
        maxOutputTokens: 4096,
        freeTierAvailable: true,
        description: 'Efficient realtime model',
        speedRating: 5,
        qualityRating: 4,
        modality: 'text',
        apiEndpoint: 'chat',
    },
    {
        id: 'gpt-image-1-5',
        name: 'GPT Image 1.5',
        provider: 'openai',
        inputPrice: 0.005,
        outputPrice: 0.010,
        cachedInputPrice: 0.00125,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'High fidelity image generation',
        speedRating: 3,
        qualityRating: 5,
        modality: 'image',
        apiEndpoint: 'images',
    },
    {
        id: 'gpt-image-1',
        name: 'GPT Image 1',
        provider: 'openai',
        inputPrice: 0.005,
        outputPrice: 0,
        cachedInputPrice: 0.00125,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Standard image generation',
        speedRating: 3,
        qualityRating: 4,
        modality: 'image',
        apiEndpoint: 'images',
    },
    {
        id: 'gpt-image-1-mini',
        name: 'GPT Image 1 Mini',
        provider: 'openai',
        inputPrice: 0.002,
        outputPrice: 0,
        cachedInputPrice: 0.0002,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: true,
        description: 'Fast image generation',
        speedRating: 5,
        qualityRating: 3,
        modality: 'image',
        apiEndpoint: 'images',
    },
    {
        id: 'sora-2',
        name: 'Sora 2',
        provider: 'openai',
        inputPrice: 0,
        outputPrice: 0,
        pricePerSecond: 0.1,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Advanced video generation',
        speedRating: 2,
        qualityRating: 5,
        modality: 'video',
        apiEndpoint: 'video',
    },
    {
        id: 'sora-2-pro',
        name: 'Sora 2 Pro',
        provider: 'openai',
        inputPrice: 0,
        outputPrice: 0,
        pricePerSecond: 0.3,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Professional video generation',
        speedRating: 1,
        qualityRating: 5,
        modality: 'video',
        apiEndpoint: 'video',
    },
    {
        id: 'sora-2-pro-high-res',
        name: 'Sora 2 Pro (High Res)',
        provider: 'openai',
        inputPrice: 0,
        outputPrice: 0,
        pricePerSecond: 0.5,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'High resolution commercial video',
        speedRating: 1,
        qualityRating: 5,
        modality: 'video',
        apiEndpoint: 'video',
    }
];

// Anthropic Models (Official API - Updated 2026-02-06)
const anthropicModels: ModelConfig[] = [
    // Latest Models (Claude 4.x - if available)
    {
        id: 'claude-opus-4-5',
        name: 'Claude Opus 4.5',
        provider: 'anthropic',
        inputPrice: 0.005, // $5.00 / 1M
        outputPrice: 0.025, // $25.00 / 1M
        cachedInputPrice: 0.00625,
        maxTokens: 200000,
        maxOutputTokens: 64000,
        freeTierAvailable: false,
        description: 'Premium model combining maximum intelligence with practical performance',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        inputPrice: 0.003, // $3.00 / 1M
        outputPrice: 0.015, // $15.00 / 1M
        cachedInputPrice: 0.0003,
        maxTokens: 200000,
        maxOutputTokens: 64000,
        freeTierAvailable: false,
        description: 'Smart model for complex agents and coding',
        speedRating: 4,
        qualityRating: 5,
    },
    {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        provider: 'anthropic',
        inputPrice: 0.001, // $1.00 / 1M
        outputPrice: 0.005, // $5.00 / 1M
        cachedInputPrice: 0.0001,
        maxTokens: 200000,
        maxOutputTokens: 64000,
        freeTierAvailable: true,
        description: 'Fastest model with near-frontier intelligence',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        provider: 'anthropic',
        inputPrice: 0.015,
        outputPrice: 0.075,
        cachedInputPrice: 0.0015,
        maxTokens: 200000,
        maxOutputTokens: 32000,
        freeTierAvailable: false,
        description: 'Original Claude 4 Opus model',
        speedRating: 2,
        qualityRating: 5,
    },
    {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        inputPrice: 0.003,
        outputPrice: 0.015,
        cachedInputPrice: 0.0003,
        maxTokens: 200000,
        maxOutputTokens: 64000,
        freeTierAvailable: false,
        description: 'Balanced model from original Claude 4 release',
        speedRating: 4,
        qualityRating: 5,
    },
    // Claude 3 Legacy Models
    {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        inputPrice: 0.00025, // $0.25 / 1M
        outputPrice: 0.00125, // $1.25 / 1M
        cachedInputPrice: 0.00003, // Cache read $0.03 / 1M
        maxTokens: 200000,
        maxOutputTokens: 4096,
        freeTierAvailable: true,
        description: 'Most affordable legacy model',
        speedRating: 5,
        qualityRating: 3,
    }
];

// Google Models (Synced with https://ai.google.dev/gemini-api/docs/pricing, 2026-02-02)
const googleModels: ModelConfig[] = [
    // Gemini 3
    {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3 Pro Preview',
        provider: 'google',
        inputPrice: 0.002, // $2.00 / 1M
        outputPrice: 0.01, // $10.00 / 1M
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Latest top-tier Gemini model',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash Preview',
        provider: 'google',
        inputPrice: 0.0004, // $0.40 / 1M
        outputPrice: 0.0015, // $1.50 / 1M
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Fast Gemini 3 preview model',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'gemini-3-pro-image-preview',
        name: 'Gemini 3 Pro Image Preview',
        provider: 'google',
        inputPrice: 0.24, // up to $0.24 per generated image (4K)
        outputPrice: 0,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Gemini 3 image generation (size-based image pricing)',
        speedRating: 3,
        qualityRating: 5,
        modality: 'image',
    },

    // Gemini 2.5
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'google',
        inputPrice: 0.00125, // $1.25 / 1M (<= 200K tokens)
        outputPrice: 0.01, // $10.00 / 1M (<= 200K tokens)
        cachedInputPrice: 0.000125, // $0.125 / 1M cache hit (<= 200K tokens)
        pricingTiers: [
            { range: '<=200K tokens', inputPrice: 0.00125, outputPrice: 0.01 },
            { range: '>200K tokens', inputPrice: 0.0025, outputPrice: 0.015 },
        ],
        maxTokens: 2000000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Flagship multimodal model with long-context tiered pricing',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        inputPrice: 0.0003, // $0.30 / 1M (text/image/video input)
        outputPrice: 0.0025, // $2.50 / 1M (text output)
        cachedInputPrice: 0.00003, // $0.03 / 1M cache hit
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'High-throughput multimodal model (audio priced separately)',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'gemini-2.5-flash-preview-09-2025',
        name: 'Gemini 2.5 Flash Preview (09-2025)',
        provider: 'google',
        inputPrice: 0.00015, // $0.15 / 1M
        outputPrice: 0.0035, // $3.50 / 1M
        cachedInputPrice: 0.000015, // $0.015 / 1M cache hit
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Previous 2.5 Flash preview pricing tier',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        provider: 'google',
        inputPrice: 0.0001, // $0.10 / 1M
        outputPrice: 0.0004, // $0.40 / 1M
        cachedInputPrice: 0.00001, // $0.01 / 1M cache hit
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Most cost-effective Gemini 2.5 model',
        speedRating: 5,
        qualityRating: 3,
    },
    {
        id: 'gemini-2.5-flash-lite-preview-09-2025',
        name: 'Gemini 2.5 Flash Lite Preview (09-2025)',
        provider: 'google',
        inputPrice: 0.000075, // $0.075 / 1M
        outputPrice: 0.0003, // $0.30 / 1M
        cachedInputPrice: 0.0000075, // $0.0075 / 1M cache hit
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Preview variant of 2.5 Flash Lite',
        speedRating: 5,
        qualityRating: 3,
    },
    {
        id: 'gemini-2.5-flash-native-audio-preview-12-2025',
        name: 'Gemini 2.5 Flash Native Audio Preview',
        provider: 'google',
        inputPrice: 0.0005, // $0.50 / 1M text input (audio input is higher)
        outputPrice: 0.002, // $2.00 / 1M text output (audio output is higher)
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Native audio model (separate text/audio token pricing)',
        speedRating: 4,
        qualityRating: 4,
        modality: 'audio',
    },
    {
        id: 'gemini-2.5-flash-image',
        name: 'Gemini 2.5 Flash Image',
        provider: 'google',
        inputPrice: 0.0003, // $0.30 / 1M input tokens
        outputPrice: 0.0025, // $2.50 / 1M text output tokens (image tokens priced separately)
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Image generation/editing model (image output token pricing differs)',
        speedRating: 4,
        qualityRating: 4,
        modality: 'image',
    },
    {
        id: 'gemini-2.5-flash-preview-tts',
        name: 'Gemini 2.5 Flash Preview TTS',
        provider: 'google',
        inputPrice: 0.0005, // $0.50 / 1M input tokens
        outputPrice: 0.01, // $10.00 / 1M audio output tokens
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Text-to-speech preview model',
        speedRating: 5,
        qualityRating: 4,
        modality: 'audio',
    },
    {
        id: 'gemini-2.5-pro-preview-tts',
        name: 'Gemini 2.5 Pro Preview TTS',
        provider: 'google',
        inputPrice: 0.001, // $1.00 / 1M input tokens
        outputPrice: 0.02, // $20.00 / 1M audio output tokens
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Higher quality text-to-speech preview model',
        speedRating: 3,
        qualityRating: 5,
        modality: 'audio',
    },

    // Gemini 2.0
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        inputPrice: 0.0001, // $0.10 / 1M
        outputPrice: 0.0004, // $0.40 / 1M
        cachedInputPrice: 0.000025, // $0.025 / 1M cache hit
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'General-purpose Gemini 2.0 Flash model',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash Lite',
        provider: 'google',
        inputPrice: 0.000075, // $0.075 / 1M
        outputPrice: 0.0003, // $0.30 / 1M
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Lightweight Gemini 2.0 model',
        speedRating: 5,
        qualityRating: 3,
    },

    // Imagen
    {
        id: 'imagen-4.0-generate-001',
        name: 'Imagen 4',
        provider: 'google',
        inputPrice: 0.04, // $0.04 per image
        outputPrice: 0,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Imagen 4 image generation',
        speedRating: 3,
        qualityRating: 4,
        modality: 'image',
    },
    {
        id: 'imagen-4.0-ultra-generate-001',
        name: 'Imagen 4 Ultra',
        provider: 'google',
        inputPrice: 0.06, // $0.06 per image
        outputPrice: 0,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Highest fidelity Imagen 4 model',
        speedRating: 2,
        qualityRating: 5,
        modality: 'image',
    },
    {
        id: 'imagen-4.0-fast-generate-001',
        name: 'Imagen 4 Fast',
        provider: 'google',
        inputPrice: 0.02, // $0.02 per image
        outputPrice: 0,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Fastest Imagen 4 variant',
        speedRating: 5,
        qualityRating: 3,
        modality: 'image',
    },

    // Veo
    {
        id: 'veo-3.1-generate-preview',
        name: 'Veo 3.1 Generate Preview',
        provider: 'google',
        inputPrice: 0,
        outputPrice: 0,
        pricePerSecond: 0.40, // 720p/1080p; 4K is priced higher
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Veo 3.1 video generation',
        speedRating: 3,
        qualityRating: 5,
        modality: 'video',
    },
    {
        id: 'veo-3.1-fast-generate-preview',
        name: 'Veo 3.1 Fast Generate Preview',
        provider: 'google',
        inputPrice: 0,
        outputPrice: 0,
        pricePerSecond: 0.15, // 720p/1080p; 4K is priced higher
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Lower-cost Veo 3.1 generation',
        speedRating: 5,
        qualityRating: 4,
        modality: 'video',
    },
    {
        id: 'veo-3.0-generate-001',
        name: 'Veo 3.0 Generate',
        provider: 'google',
        inputPrice: 0,
        outputPrice: 0,
        pricePerSecond: 0.75,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Veo 3.0 video generation model',
        speedRating: 3,
        qualityRating: 5,
        modality: 'video',
    },
    {
        id: 'veo-3.0-fast-generate-001',
        name: 'Veo 3.0 Fast Generate',
        provider: 'google',
        inputPrice: 0,
        outputPrice: 0,
        pricePerSecond: 0.40,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Faster lower-cost Veo 3.0 variant',
        speedRating: 5,
        qualityRating: 4,
        modality: 'video',
    },
    {
        id: 'veo-2.0-generate-001',
        name: 'Veo 2.0 Generate',
        provider: 'google',
        inputPrice: 0,
        outputPrice: 0,
        pricePerSecond: 0.35,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Veo 2.0 legacy video model',
        speedRating: 4,
        qualityRating: 4,
        modality: 'video',
    },

    // Embeddings
    {
        id: 'gemini-embedding-001',
        name: 'Gemini Embedding 001',
        provider: 'google',
        inputPrice: 0.00015, // $0.15 / 1M
        outputPrice: 0,
        maxTokens: 2048,
        maxOutputTokens: 0,
        freeTierAvailable: true,
        description: 'Current Gemini embedding model',
        speedRating: 5,
        qualityRating: 4,
        modality: 'embedding',
    },

    // Specialized models
    {
        id: 'gemini-robotics-er-1.5-preview',
        name: 'Gemini Robotics ER 1.5 Preview',
        provider: 'google',
        inputPrice: 0.0005, // $0.50 / 1M
        outputPrice: 0.003, // $3.00 / 1M
        maxTokens: 32000,
        maxOutputTokens: 4096,
        freeTierAvailable: false,
        description: 'Embodied reasoning model for robotics',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'gemini-2.5-computer-use-preview-10-2025',
        name: 'Gemini 2.5 Computer Use Preview',
        provider: 'google',
        inputPrice: 0.0005, // $0.50 / 1M
        outputPrice: 0.003, // $3.00 / 1M
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Computer-use optimized model preview',
        speedRating: 3,
        qualityRating: 4,
    },

];

// DeepSeek Models (Official API Pricing - 2026)
const deepseekModels: ModelConfig[] = [
    {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat (V3.2)',
        provider: 'deepseek',
        inputPrice: 0.00027, // $0.27 / 1M tokens (cache miss)
        outputPrice: 0.00110, // $1.10 / 1M tokens
        cachedInputPrice: 0.00007, // $0.07 / 1M tokens (cache hit)
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'DeepSeek-V3.2 Non-thinking Mode',
        speedRating: 4,
        qualityRating: 5,
    },
    {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner (R1)',
        provider: 'deepseek',
        inputPrice: 0.00055, // $0.55 / 1M tokens (cache miss)
        outputPrice: 0.00219, // $2.19 / 1M tokens
        cachedInputPrice: 0.00014, // $0.14 / 1M tokens (cache hit)
        maxTokens: 128000,
        maxOutputTokens: 64000,
        freeTierAvailable: true,
        description: 'DeepSeek-V3.2 Thinking Mode',
        speedRating: 3,
        qualityRating: 5,
    }
];

// Mistral Models (From User List)
const mistralModels: ModelConfig[] = [
    {
        id: 'mistral-large-latest',
        name: 'Mistral Large 3.1',
        provider: 'mistral',
        inputPrice: 0.0005, // $0.50 / 1M
        outputPrice: 0.0015, // $1.50 / 1M
        maxTokens: 256000,
        maxOutputTokens: 32000,
        freeTierAvailable: false,
        description: 'Top-tier Mistral model for complex reasoning',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'mistral-medium-latest',
        name: 'Mistral Medium 3.1',
        provider: 'mistral',
        inputPrice: 0.0004, // $0.40 / 1M
        outputPrice: 0.002, // $2.00 / 1M
        maxTokens: 128000,
        maxOutputTokens: 32000,
        freeTierAvailable: false,
        description: 'Complex reasoning, math skills, coding',
        speedRating: 4,
        qualityRating: 5,
    },
    {
        id: 'mistral-small-latest',
        name: 'Mistral Small 3.2',
        provider: 'mistral',
        inputPrice: 0.0001, // $0.10 / 1M
        outputPrice: 0.0003, // $0.30 / 1M
        maxTokens: 128000,
        maxOutputTokens: 32000,
        freeTierAvailable: true,
        description: 'Multimodal model, visual support',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'ministral-14b-latest',
        name: 'Ministral 3B 14B',
        provider: 'mistral',
        inputPrice: 0.0002, // $0.20 / 1M
        outputPrice: 0.0002, // $0.20 / 1M
        maxTokens: 256000,
        maxOutputTokens: 32000,
        freeTierAvailable: true,
        description: 'Efficient compact model for budget workloads',
        speedRating: 4,
        qualityRating: 4,
    },
    {
        id: 'ministral-8b-latest',
        name: 'Ministral 3B 8B',
        provider: 'mistral',
        inputPrice: 0.00015, // $0.15 / 1M
        outputPrice: 0.00015, // $0.15 / 1M
        maxTokens: 256000,
        maxOutputTokens: 32000,
        freeTierAvailable: true,
        description: 'Balanced mini model for general tasks',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'ministral-3b-latest',
        name: 'Ministral 3B 3B',
        provider: 'mistral',
        inputPrice: 0.0001, // $0.10 / 1M
        outputPrice: 0.0001, // $0.10 / 1M
        maxTokens: 256000,
        maxOutputTokens: 32000,
        freeTierAvailable: true,
        description: 'Smallest and cheapest Ministral model',
        speedRating: 5,
        qualityRating: 3,
    },
    {
        id: 'magistral-medium-latest',
        name: 'Magistral Medium 1.2',
        provider: 'mistral',
        inputPrice: 0.002, // $2.00 / 1M
        outputPrice: 0.005, // $5.00 / 1M
        maxTokens: 128000,
        maxOutputTokens: 32000,
        freeTierAvailable: false,
        description: 'Reasoning-focused Magistral model',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'magistral-small-latest',
        name: 'Magistral Small 1.2',
        provider: 'mistral',
        inputPrice: 0.0005, // $0.50 / 1M
        outputPrice: 0.0015, // $1.50 / 1M
        maxTokens: 128000,
        maxOutputTokens: 32000,
        freeTierAvailable: false,
        description: 'Lower-cost reasoning model',
        speedRating: 4,
        qualityRating: 4,
    },
    {
        id: 'codestral-latest',
        name: 'Codestral',
        provider: 'mistral',
        inputPrice: 0.0003, // $0.30 / 1M
        outputPrice: 0.0009, // $0.90 / 1M
        maxTokens: 128000,
        maxOutputTokens: 32000,
        freeTierAvailable: true,
        description: 'Specialized for code generation',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'mistral-nemo',
        name: 'Mistral Nemo',
        provider: 'mistral',
        inputPrice: 0.00015, // $0.15 / 1M
        outputPrice: 0.00015, // $0.15 / 1M
        maxTokens: 128000,
        maxOutputTokens: 32000,
        freeTierAvailable: true,
        description: 'Legacy Nemo model',
        speedRating: 4,
        qualityRating: 4,
    },
    {
        id: 'devstral-small-latest',
        name: 'Devstral Small 2',
        provider: 'mistral',
        inputPrice: 0.0001, // $0.10 / 1M
        outputPrice: 0.0003, // $0.30 / 1M
        maxTokens: 256000,
        maxOutputTokens: 32000,
        freeTierAvailable: true,
        description: 'Developer-focused model for fast iteration',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'devstral-medium-2507',
        name: 'Devstral Medium 1.0',
        provider: 'mistral',
        inputPrice: 0.0004, // $0.40 / 1M
        outputPrice: 0.002, // $2.00 / 1M
        maxTokens: 128000,
        maxOutputTokens: 32000,
        freeTierAvailable: false,
        description: 'Higher-quality developer-focused model',
        speedRating: 4,
        qualityRating: 5,
    },
    {
        id: 'mistral-ocr-latest',
        name: 'Mistral OCR 3',
        provider: 'mistral',
        inputPrice: 0,
        outputPrice: 0,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Optical Character Recognition ($1/$3 per 1000 pages)',
        speedRating: 3,
        qualityRating: 5,
    }
];

// xAI Models
const xaiModels: ModelConfig[] = [
    {
        id: 'grok-4-1-fast',
        name: 'Grok 4.1 Fast',
        provider: 'xai',
        inputPrice: 0.0002, // $0.20 / 1M
        outputPrice: 0.0005, // $0.50 / 1M
        maxTokens: 256000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Legacy fast variant for general tasks',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'grok-4-1-fast-reasoning',
        name: 'Grok 4.1 Fast Reasoning',
        provider: 'xai',
        inputPrice: 0.0002, // $0.20 / 1M
        outputPrice: 0.0005, // $0.50 / 1M
        maxTokens: 2000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Reasoning-enabled fast model with 2M context',
        speedRating: 4,
        qualityRating: 5,
    },
    {
        id: 'grok-4-1-fast-non-reasoning',
        name: 'Grok 4.1 Fast Non-Reasoning',
        provider: 'xai',
        inputPrice: 0.0002, // $0.20 / 1M
        outputPrice: 0.0005, // $0.50 / 1M
        maxTokens: 2000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Fast non-reasoning model for low-latency chat',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'grok-code-fast-1',
        name: 'Grok Code Fast 1',
        provider: 'xai',
        inputPrice: 0.0002, // $0.20 / 1M
        outputPrice: 0.0015, // $1.50 / 1M
        maxTokens: 256000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Fast coding-focused model',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'grok-4-fast-reasoning',
        name: 'Grok 4 Fast Reasoning',
        provider: 'xai',
        inputPrice: 0.0002, // $0.20 / 1M
        outputPrice: 0.0005, // $0.50 / 1M
        maxTokens: 2000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Fast Grok 4 variant with reasoning',
        speedRating: 4,
        qualityRating: 5,
    },
    {
        id: 'grok-4-fast-non-reasoning',
        name: 'Grok 4 Fast Non-Reasoning',
        provider: 'xai',
        inputPrice: 0.0002, // $0.20 / 1M
        outputPrice: 0.0005, // $0.50 / 1M
        maxTokens: 2000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Fast Grok 4 non-reasoning variant',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'grok-4-0709',
        name: 'Grok 4 0709',
        provider: 'xai',
        inputPrice: 0.003, // $3.00 / 1M
        outputPrice: 0.015, // $15.00 / 1M
        maxTokens: 256000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Higher-quality Grok 4 snapshot',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'grok-3',
        name: 'Grok 3',
        provider: 'xai',
        inputPrice: 0.003, // $3.00 / 1M
        outputPrice: 0.015, // $15.00 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Flagship general purpose model',
        speedRating: 4,
        qualityRating: 5,
    },
    {
        id: 'grok-3-mini',
        name: 'Grok 3 Mini',
        provider: 'xai',
        inputPrice: 0.0003, // $0.30 / 1M
        outputPrice: 0.0005, // $0.50 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Lightweight model for simple tasks',
        speedRating: 5,
        qualityRating: 3,
    },
    {
        id: 'grok-2-vision-1212',
        name: 'Grok 2 Vision 1212',
        provider: 'xai',
        inputPrice: 0.002, // $2.00 / 1M
        outputPrice: 0.01, // $10.00 / 1M
        maxTokens: 32768,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Vision-capable Grok 2 model',
        speedRating: 3,
        qualityRating: 4,
    },
    {
        id: 'grok-imagine-image-pro',
        name: 'Grok Imagine Image Pro',
        provider: 'xai',
        inputPrice: 0.07, // $0.07 / image
        outputPrice: 0,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'High-quality image generation',
        speedRating: 3,
        qualityRating: 5,
        modality: 'image',
        apiEndpoint: 'images',
    },
    {
        id: 'grok-imagine-image',
        name: 'Grok Imagine Image',
        provider: 'xai',
        inputPrice: 0.02, // $0.02 / image
        outputPrice: 0,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Standard image generation',
        speedRating: 4,
        qualityRating: 4,
        modality: 'image',
        apiEndpoint: 'images',
    },
    {
        id: 'grok-2-image-1212',
        name: 'Grok 2 Image 1212',
        provider: 'xai',
        inputPrice: 0.07, // $0.07 / image
        outputPrice: 0,
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Image generation model (legacy)',
        speedRating: 3,
        qualityRating: 4,
        modality: 'image',
        apiEndpoint: 'images',
    },
    {
        id: 'grok-imagine-video',
        name: 'Grok Imagine Video',
        provider: 'xai',
        inputPrice: 0,
        outputPrice: 0,
        pricePerSecond: 0.05, // $0.05 / second
        maxTokens: 0,
        maxOutputTokens: 0,
        freeTierAvailable: false,
        description: 'Video generation model',
        speedRating: 3,
        qualityRating: 4,
        modality: 'video',
        apiEndpoint: 'video',
    }
];

// Cohere Models
const cohereModels: ModelConfig[] = [
    {
        id: 'command-r-plus',
        name: 'Command R+',
        provider: 'cohere',
        inputPrice: 0.003, // $3.00 / 1M
        outputPrice: 0.015, // $15.00 / 1M
        maxTokens: 128000,
        maxOutputTokens: 4096,
        freeTierAvailable: false,
        description: 'Enterprise model optimized for RAG',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'command-r',
        name: 'Command R',
        provider: 'cohere',
        inputPrice: 0.0005, // $0.50 / 1M
        outputPrice: 0.0015, // $1.50 / 1M
        maxTokens: 128000,
        maxOutputTokens: 4096,
        freeTierAvailable: true,
        description: 'Versatile mid-range model',
        speedRating: 4,
        qualityRating: 4,
    }
];

// Alibaba (Qwen) Models
const qwenModels: ModelConfig[] = [
    {
        id: 'qwen3-max',
        name: 'Qwen3 Max',
        provider: 'alibaba',
        inputPrice: 0.000359, // $0.359 / 1M (0-32K tier)
        outputPrice: 0.001434, // $1.434 / 1M
        maxTokens: 252000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Flagship Qwen model with tiered context pricing',
        speedRating: 3,
        qualityRating: 5,
        pricingTiers: [
            { range: '0-32K', inputPrice: 0.000359, outputPrice: 0.001434 },
            { range: '32K-128K', inputPrice: 0.000574, outputPrice: 0.002294 },
            { range: '128K-252K', inputPrice: 0.001004, outputPrice: 0.004014 },
        ],
    },
    {
        id: 'qwen-max',
        name: 'Qwen Max',
        provider: 'alibaba',
        inputPrice: 0.000345, // $0.345 / 1M
        outputPrice: 0.001377, // $1.377 / 1M
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Legacy flagship Qwen model',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'qwen-plus',
        name: 'Qwen Plus',
        provider: 'alibaba',
        inputPrice: 0.0004, // $0.4 / 1M (0-256K tier)
        outputPrice: 0.0012, // $1.2 / 1M
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Large context balanced model',
        speedRating: 4,
        qualityRating: 5,
        pricingTiers: [
            { range: '0-256K', inputPrice: 0.0004, outputPrice: 0.0012 },
            { range: '256K-1M', inputPrice: 0.0012, outputPrice: 0.0036 },
        ],
    },
    {
        id: 'qwen-plus-us',
        name: 'Qwen Plus (US)',
        provider: 'alibaba',
        inputPrice: 0.0004,
        outputPrice: 0.0012,
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'US Region specialized Qwen Plus',
        speedRating: 4,
        qualityRating: 5,
        pricingTiers: [
            { range: '0-256K', inputPrice: 0.0004, outputPrice: 0.0012 },
            { range: '256K-1M', inputPrice: 0.0012, outputPrice: 0.0036 },
        ],
    },
    {
        id: 'qwen-flash',
        name: 'Qwen Flash',
        provider: 'alibaba',
        inputPrice: 0.00005, // $0.05 / 1M (0-256K tier)
        outputPrice: 0.0004, // $0.4 / 1M
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: true,
        description: 'Ultra-fast high-value model',
        speedRating: 5,
        qualityRating: 4,
        pricingTiers: [
            { range: '0-256K', inputPrice: 0.00005, outputPrice: 0.0004 },
            { range: '256K-1M', inputPrice: 0.00025, outputPrice: 0.0020 },
        ],
    },
    {
        id: 'qwen-turbo',
        name: 'Qwen Turbo',
        provider: 'alibaba',
        inputPrice: 0.000044, // $0.044 / 1M
        outputPrice: 0.000087, // $0.087 / 1M
        maxTokens: 1000000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Low-cost high-speed Qwen model',
        speedRating: 5,
        qualityRating: 3,
    },
    {
        id: 'qwq-plus',
        name: 'QwQ Plus',
        provider: 'alibaba',
        inputPrice: 0.000230, // $0.230 / 1M
        outputPrice: 0.000574, // $0.574 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Reasoning-focused QwQ model',
        speedRating: 2,
        qualityRating: 5,
    },
    {
        id: 'qwen-long-latest',
        name: 'Qwen Long Latest',
        provider: 'alibaba',
        inputPrice: 0.000072, // $0.072 / 1M
        outputPrice: 0.000287, // $0.287 / 1M
        maxTokens: 10000000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Long-context Qwen model',
        speedRating: 3,
        qualityRating: 4,
    },
    {
        id: 'qwen-deep-research',
        name: 'Qwen Deep Research',
        provider: 'alibaba',
        inputPrice: 0.007742, // $7.742 / 1M
        outputPrice: 0.023367, // $23.367 / 1M
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Premium deep-reasoning research model',
        speedRating: 1,
        qualityRating: 5,
    },
    {
        id: 'qwen3-omni-flash',
        name: 'Qwen3 Omni Flash',
        provider: 'alibaba',
        inputPrice: 0.000258, // $0.258 / 1M
        outputPrice: 0.000989, // $0.989 / 1M
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Multimodal Omni model for text, image, and audio',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'qwen-omni-turbo',
        name: 'Qwen Omni Turbo',
        provider: 'alibaba',
        inputPrice: 0.000058, // $0.058 / 1M
        outputPrice: 0.000230, // $0.230 / 1M
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Cost-efficient multimodal Omni model',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'qwen3-omni-flash-realtime',
        name: 'Qwen3 Omni Flash Realtime',
        provider: 'alibaba',
        inputPrice: 0.000315, // $0.315 / 1M
        outputPrice: 0.001190, // $1.190 / 1M
        maxTokens: 32768,
        maxOutputTokens: 4096,
        freeTierAvailable: false,
        description: 'Realtime low-latency multimodal model',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'qwen-omni-turbo-realtime',
        name: 'Qwen Omni Turbo Realtime',
        provider: 'alibaba',
        inputPrice: 0.000230, // $0.230 / 1M
        outputPrice: 0.000918, // $0.918 / 1M
        maxTokens: 32768,
        maxOutputTokens: 4096,
        freeTierAvailable: false,
        description: 'Realtime omni model optimized for voice interactions',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'qvq-max',
        name: 'QVQ Max',
        provider: 'alibaba',
        inputPrice: 0.001147, // $1.147 / 1M
        outputPrice: 0.004588, // $4.588 / 1M
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Top-tier visual reasoning model',
        speedRating: 2,
        qualityRating: 5,
    },
    {
        id: 'qvq-plus',
        name: 'QVQ Plus',
        provider: 'alibaba',
        inputPrice: 0.000287, // $0.287 / 1M
        outputPrice: 0.000717, // $0.717 / 1M
        maxTokens: 128000,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Balanced visual reasoning model',
        speedRating: 3,
        qualityRating: 4,
    },
    {
        id: 'qwen3-vl-plus',
        name: 'Qwen3 VL Plus',
        provider: 'alibaba',
        inputPrice: 0.000143, // $0.143 / 1M
        outputPrice: 0.001434, // $1.434 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Qwen3 vision-language model (plus tier)',
        speedRating: 4,
        qualityRating: 5,
    },
    {
        id: 'qwen3-vl-flash',
        name: 'Qwen3 VL Flash',
        provider: 'alibaba',
        inputPrice: 0.000022, // $0.022 / 1M
        outputPrice: 0.000215, // $0.215 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Fast and cost-effective Qwen3 vision-language model',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'qwen-vl-max',
        name: 'Qwen VL Max',
        provider: 'alibaba',
        inputPrice: 0.000230, // $0.230 / 1M
        outputPrice: 0.000574, // $0.574 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Legacy flagship vision-language model',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'qwen-vl-plus',
        name: 'Qwen VL Plus',
        provider: 'alibaba',
        inputPrice: 0.000115, // $0.115 / 1M
        outputPrice: 0.000287, // $0.287 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Balanced vision-language model',
        speedRating: 4,
        qualityRating: 4,
    },
    {
        id: 'qwen-vl-ocr',
        name: 'Qwen VL OCR',
        provider: 'alibaba',
        inputPrice: 0.000717, // $0.717 / 1M
        outputPrice: 0.000717, // $0.717 / 1M
        maxTokens: 32768,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'OCR-specialized vision-language model',
        speedRating: 4,
        qualityRating: 4,
    },
    {
        id: 'qwen-math-plus',
        name: 'Qwen Math Plus',
        provider: 'alibaba',
        inputPrice: 0.000574, // $0.574 / 1M
        outputPrice: 0.001721, // $1.721 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Math-specialized model with stronger reasoning',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'qwen-math-turbo',
        name: 'Qwen Math Turbo',
        provider: 'alibaba',
        inputPrice: 0.000287, // $0.287 / 1M
        outputPrice: 0.000861, // $0.861 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Fast math-focused model',
        speedRating: 4,
        qualityRating: 4,
    },
    {
        id: 'qwen3-coder-plus',
        name: 'Qwen3 Coder Plus',
        provider: 'alibaba',
        inputPrice: 0.000574, // $0.574 / 1M
        outputPrice: 0.002294, // $2.294 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Qwen3 coding model with higher reasoning quality',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'qwen3-coder-flash',
        name: 'Qwen3 Coder Flash',
        provider: 'alibaba',
        inputPrice: 0.000144, // $0.144 / 1M
        outputPrice: 0.000574, // $0.574 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Fast and affordable Qwen3 coding model',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'qwen-coder-plus',
        name: 'Qwen Coder Plus',
        provider: 'alibaba',
        inputPrice: 0.000502, // $0.502 / 1M
        outputPrice: 0.001004, // $1.004 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Legacy coder model with balanced quality and cost',
        speedRating: 4,
        qualityRating: 4,
    },
    {
        id: 'qwen-coder-turbo',
        name: 'Qwen Coder Turbo',
        provider: 'alibaba',
        inputPrice: 0.000287, // $0.287 / 1M
        outputPrice: 0.000861, // $0.861 / 1M
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Low-latency coder model',
        speedRating: 5,
        qualityRating: 4,
    },
    {
        id: 'qwen-mt-plus',
        name: 'Qwen MT Plus',
        provider: 'alibaba',
        inputPrice: 0.000259, // $0.259 / 1M
        outputPrice: 0.000775, // $0.775 / 1M
        maxTokens: 32768,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Higher-quality machine translation model',
        speedRating: 4,
        qualityRating: 4,
    },
    {
        id: 'qwen-mt-flash',
        name: 'Qwen MT Flash',
        provider: 'alibaba',
        inputPrice: 0.000101, // $0.101 / 1M
        outputPrice: 0.000280, // $0.280 / 1M
        maxTokens: 32768,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Fast machine translation model',
        speedRating: 5,
        qualityRating: 3,
    },
    {
        id: 'qwen-mt-lite',
        name: 'Qwen MT Lite',
        provider: 'alibaba',
        inputPrice: 0.000086, // $0.086 / 1M
        outputPrice: 0.000229, // $0.229 / 1M
        maxTokens: 32768,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Entry-level machine translation model',
        speedRating: 5,
        qualityRating: 3,
    },
    {
        id: 'qwen-mt-turbo',
        name: 'Qwen MT Turbo',
        provider: 'alibaba',
        inputPrice: 0.000101, // $0.101 / 1M
        outputPrice: 0.000280, // $0.280 / 1M
        maxTokens: 32768,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Low-latency machine translation model',
        speedRating: 5,
        qualityRating: 3,
    },
    {
        id: 'qwen-doc-turbo',
        name: 'Qwen Doc Turbo',
        provider: 'alibaba',
        inputPrice: 0.000087, // $0.087 / 1M
        outputPrice: 0.000144, // $0.144 / 1M
        maxTokens: 32768,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Document understanding and extraction model',
        speedRating: 5,
        qualityRating: 4,
    },
];

// Moonshot / Kimi Models
// Prices are in USD per 1K tokens (consistent with the rest of this file).
const moonshotModels: ModelConfig[] = [
    {
        id: 'kimi-k2.5',
        name: 'Kimi K2.5',
        provider: 'moonshot',
        inputPrice: 0.000548,
        outputPrice: 0.002877,
        cachedInputPrice: 0.0000959,
        maxTokens: 262144,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Flagship Kimi K2.5 model',
        speedRating: 4,
        qualityRating: 5,
    },
    {
        id: 'kimi-k2-0905-preview',
        name: 'Kimi K2 (09-05 Preview)',
        provider: 'moonshot',
        inputPrice: 0.000548,
        outputPrice: 0.002192,
        cachedInputPrice: 0.000137,
        maxTokens: 262144,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Kimi K2 preview (September 2025)',
        speedRating: 4,
        qualityRating: 5,
    },
    {
        id: 'kimi-k2-0711-preview',
        name: 'Kimi K2 (07-11 Preview)',
        provider: 'moonshot',
        inputPrice: 0.000548,
        outputPrice: 0.002192,
        cachedInputPrice: 0.000137,
        maxTokens: 131072,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Kimi K2 preview (July 2025)',
        speedRating: 4,
        qualityRating: 4,
    },
    {
        id: 'kimi-k2-turbo-preview',
        name: 'Kimi K2 Turbo Preview',
        provider: 'moonshot',
        inputPrice: 0.001096,
        outputPrice: 0.007946,
        cachedInputPrice: 0.000137,
        maxTokens: 262144,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'High-speed Kimi K2 variant',
        speedRating: 5,
        qualityRating: 5,
    },
    {
        id: 'kimi-k2-thinking',
        name: 'Kimi K2 Thinking',
        provider: 'moonshot',
        inputPrice: 0.000548,
        outputPrice: 0.002192,
        cachedInputPrice: 0.000137,
        maxTokens: 262144,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Deep reasoning and agentic tasks model',
        speedRating: 3,
        qualityRating: 5,
    },
    {
        id: 'kimi-k2-thinking-turbo',
        name: 'Kimi K2 Thinking Turbo',
        provider: 'moonshot',
        inputPrice: 0.001096,
        outputPrice: 0.007946,
        cachedInputPrice: 0.000137,
        maxTokens: 262144,
        maxOutputTokens: 8192,
        freeTierAvailable: false,
        description: 'Fast deep reasoning model',
        speedRating: 4,
        qualityRating: 5,
    },
    {
        id: 'moonshot-v1-8k',
        name: 'Moonshot V1 8K',
        provider: 'moonshot',
        inputPrice: 0.000274,
        outputPrice: 0.00137,
        maxTokens: 8192,
        maxOutputTokens: 4096,
        freeTierAvailable: false,
        description: 'Standard model with 8K context',
        speedRating: 4,
        qualityRating: 3,
    },
    {
        id: 'moonshot-v1-32k',
        name: 'Moonshot V1 32K',
        provider: 'moonshot',
        inputPrice: 0.000685,
        outputPrice: 0.00274,
        maxTokens: 32768,
        maxOutputTokens: 4096,
        freeTierAvailable: false,
        description: 'Standard model with 32K context',
        speedRating: 4,
        qualityRating: 3,
    },
    {
        id: 'moonshot-v1-128k',
        name: 'Moonshot V1 128K',
        provider: 'moonshot',
        inputPrice: 0.00137,
        outputPrice: 0.00411,
        maxTokens: 131072,
        maxOutputTokens: 4096,
        freeTierAvailable: false,
        description: 'Standard model with 128K context',
        speedRating: 3,
        qualityRating: 4,
    },
    {
        id: 'moonshot-v1-8k-vision-preview',
        name: 'Moonshot V1 8K Vision',
        provider: 'moonshot',
        inputPrice: 0.000274,
        outputPrice: 0.00137,
        maxTokens: 8192,
        maxOutputTokens: 4096,
        freeTierAvailable: false,
        description: 'Vision model with 8K context',
        speedRating: 4,
        qualityRating: 3,
        modality: 'image',
    },
    {
        id: 'moonshot-v1-32k-vision-preview',
        name: 'Moonshot V1 32K Vision',
        provider: 'moonshot',
        inputPrice: 0.000685,
        outputPrice: 0.00274,
        maxTokens: 32768,
        maxOutputTokens: 4096,
        freeTierAvailable: false,
        description: 'Vision model with 32K context',
        speedRating: 4,
        qualityRating: 3,
        modality: 'image',
    },
    {
        id: 'moonshot-v1-128k-vision-preview',
        name: 'Moonshot V1 128K Vision',
        provider: 'moonshot',
        inputPrice: 0.00137,
        outputPrice: 0.00411,
        maxTokens: 131072,
        maxOutputTokens: 4096,
        freeTierAvailable: false,
        description: 'Vision model with 128K context',
        speedRating: 3,
        qualityRating: 4,
        modality: 'image',
    },
];

// Provider configurations
export const providers: ProviderConfig[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        logo: '/icons/openai.svg',
        models: openaiModels,
        streamSupported: true,
        tokenCountingSupported: true,
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        logo: '/icons/anthropic.svg',
        models: anthropicModels,
        streamSupported: true,
        tokenCountingSupported: true,
    },
    {
        id: 'google',
        name: 'Google',
        logo: '/icons/google.svg',
        models: googleModels,
        streamSupported: true,
        tokenCountingSupported: false,
    },
    {
        id: 'xai',
        name: 'xAI',
        logo: '/icons/xai.svg',
        models: xaiModels,
        streamSupported: false,
        tokenCountingSupported: false,
    },
    {
        id: 'alibaba',
        name: 'Alibaba Cloud',
        logo: '/icons/alibaba.svg',
        models: qwenModels,
        streamSupported: false,
        tokenCountingSupported: false,
    },
    {
        id: 'cohere',
        name: 'Cohere',
        logo: '/icons/cohere.svg',
        models: cohereModels,
        streamSupported: false,
        tokenCountingSupported: false,
    },
    {
        id: 'mistral',
        name: 'Mistral',
        logo: '/icons/mistral.svg',
        models: mistralModels,
        streamSupported: true,
        tokenCountingSupported: true,
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        logo: '/icons/deepseek.svg',
        models: deepseekModels,
        streamSupported: false,
        tokenCountingSupported: false,
    },
    {
        id: 'moonshot',
        name: 'Moonshot',
        logo: '/icons/moonshot.svg',
        models: moonshotModels,
        streamSupported: false,
        tokenCountingSupported: false,
    },
];

// Helper functions
export function getAllModels(): ModelConfig[] {
    return providers.flatMap(p => p.models);
}

export function getModelById(modelId: string): ModelConfig | undefined {
    return getAllModels().find(m => m.id === modelId);
}

export function getProviderById(providerId: string): ProviderConfig | undefined {
    return providers.find(p => p.id === providerId);
}

export function getFreeTierModels(): ModelConfig[] {
    return getAllModels().filter(m => m.freeTierAvailable);
}

export function getPaidOnlyModels(): ModelConfig[] {
    return getAllModels().filter(m => !m.freeTierAvailable);
}

export function getModelsByProvider(providerId: string): ModelConfig[] {
    const provider = getProviderById(providerId);
    return provider?.models ?? [];
}

export function calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: ModelConfig
): { inputCost: number; outputCost: number; totalCost: number } {
    let inputPrice = model.inputPrice;
    let outputPrice = model.outputPrice;

    // Handle Tiered Pricing (e.g. Qwen)
    if (model.pricingTiers && model.pricingTiers.length > 0) {
        // Find appropriate tier based on context length (input + output)
        const totalContext = inputTokens; // Tiers usually refer to input context length
        for (const tier of model.pricingTiers) {
            const [minStr, maxStr] = tier.range.split('-');
            const min = parseInt(minStr.replace('K', '000').replace('M', '000000'));
            const max = maxStr.includes('K')
                ? parseInt(maxStr.replace('K', '000'))
                : (maxStr.includes('M') ? parseInt(maxStr.replace('M', '000000')) : Infinity);

            if (totalContext >= min && totalContext <= max) {
                inputPrice = tier.inputPrice;
                outputPrice = tier.outputPrice;
                break;
            }
        }
    }

    const inputCost = (inputTokens / 1000) * inputPrice;
    const outputCost = (outputTokens / 1000) * outputPrice;
    return {
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
    };
}

export function formatCost(cost: number): string {
    if (cost < 0.01) {
        return `$${cost.toFixed(6)}`;
    }
    if (cost < 1) {
        return `$${cost.toFixed(4)}`;
    }
    return `$${cost.toFixed(2)}`;
}
