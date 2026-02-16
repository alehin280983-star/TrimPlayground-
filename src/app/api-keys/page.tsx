'use client';

import { Header } from '@/components/layout';
import { APIKeyInput } from '@/components/playground';
import { ProviderType } from '@/types';
import { useRouter } from 'next/navigation';

export default function APIKeysPage() {
    const router = useRouter();

    const providers: ProviderType[] = [
        'openai',
        'anthropic',
        'google',
        'mistral',
        'cohere',
        'deepseek',
        'xai',
        'alibaba',
        'moonshot',
        'zhipu'
    ];

    return (
        <div className="min-h-screen bg-background font-sans text-foreground">
            <Header />

            <main className="max-w-[800px] mx-auto p-10">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2 uppercase">API Key Management</h1>
                    <p className="text-foreground/60 mb-6">Configure your API keys once. They are stored safely in your browser session.</p>

                    <div className="inline-block bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-sm text-foreground/80 max-w-[600px] text-left">
                        ⚠️ <strong>Важно:</strong> Ваш API ключ хранится только в вашем браузере
                        и используется для прямых запросов к провайдеру.
                        Не используйте этот сайт на общедоступных компьютерах.
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-foreground/5 p-8 rounded-2xl border border-foreground/10">
                    {providers.map(provider => (
                        <APIKeyInput
                            key={provider}
                            provider={provider}
                            onKeyChange={() => { }} // We don't need immediate state update here as it's saved in sessionStorage
                        />
                    ))}
                </div>

                <div className="mt-12 flex justify-center">
                    <button
                        onClick={() => router.push('/playground')}
                        className="bg-foreground text-background border-none px-12 py-4 rounded-full font-bold uppercase shadow-xl hover:scale-[1.05] active:scale-95 transition-all text-lg"
                    >
                        Загрузить
                    </button>
                </div>
            </main>
        </div>
    );
}
