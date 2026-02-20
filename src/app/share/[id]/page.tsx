import Link from 'next/link';
import type { Metadata } from 'next';
import { redis } from '@/lib/rate-limit';
import { formatCost, formatTokens } from '@/lib/tokens';
import ShareCopyButtons from '@/components/share/ShareCopyButtons';

interface SharePayload {
    mode: 'estimate' | 'sample';
    prompt: string;
    requestsPerMonth: number;
    models: ShareModel[];
    winners?: { cheapest: string | null; fastest: string | null };
}

interface ShareModel {
    modelId: string;
    modelName: string;
    provider: string;
    cost: number;
    monthlyCost: number;
    inputTokens: number;
    outputTokens: number;
    latencyMs?: number;
    confidence?: string;
}

async function getShareData(id: string): Promise<SharePayload | null> {
    const raw = await redis.get(`share:${id}`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as SharePayload);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const data = await getShareData(id);
    if (!data) return { title: 'Trim Playground — Link Expired' };

    const modelNames = data.models.map((m) => m.modelName).join(' vs ');
    return {
        title: `Trim Playground — ${modelNames}`,
        description: `${data.mode} comparison: ${modelNames} at ${data.requestsPerMonth} req/mo`,
        openGraph: {
            title: `Trim Playground — ${modelNames}`,
            description: `${data.mode} comparison at ${data.requestsPerMonth} req/mo`,
            type: 'website',
        },
        twitter: { card: 'summary_large_image' },
    };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const data = await getShareData(id);

    if (!data) {
        return (
            <div className="min-h-screen bg-background font-sans text-foreground flex flex-col items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">?</div>
                    <h1 className="text-2xl font-bold mb-2">Link Expired or Not Found</h1>
                    <p className="text-foreground/60 mb-6">
                        This shared result may have expired (links are valid for 90 days) or the URL is incorrect.
                    </p>
                    <Link
                        href="/playground"
                        className="bg-red-500 text-white px-6 py-3 rounded-full font-bold uppercase text-sm hover:opacity-90 transition-opacity"
                    >
                        Go to Playground
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background font-sans text-foreground">
            {/* Header */}
            <header className="h-[64px] bg-background flex items-center justify-between px-8 text-foreground shadow-sm sticky top-0 z-50 border-b border-foreground/10">
                <Link href="/" className="font-extrabold text-[1.2rem] tracking-[0.1em]">
                    <span className="text-red-500">TRIM</span> <span className="border-b-2 border-accent">PLAYGROUND</span>
                    <span className="text-foreground/40 text-sm ml-3 font-normal">Shared Result</span>
                </Link>
                <Link
                    href="/playground"
                    className="text-sm font-bold uppercase tracking-wider hover:text-accent transition-colors"
                >
                    Open Playground
                </Link>
            </header>

            <div className="max-w-[1200px] mx-auto p-8">
                {/* Mode badge + prompt */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`
                            text-xs font-bold uppercase px-3 py-1 rounded-full
                            ${data.mode === 'sample'
                                ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                                : 'bg-foreground/5 text-foreground/70 border border-foreground/20'}
                        `}>
                            {data.mode}
                        </span>
                        <span className="text-sm text-foreground/50">
                            {data.requestsPerMonth?.toLocaleString() ?? '1,000'} requests/month
                        </span>
                    </div>
                    <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-4 text-sm text-foreground/80 whitespace-pre-wrap">
                        {data.prompt || 'No prompt provided'}
                    </div>
                </div>

                {/* Cards */}
                <div className="flex gap-5 flex-wrap">
                    {data.models.map((model) => {
                        const isCheapest = data.winners?.cheapest === model.modelId;
                        const isFastest = data.winners?.fastest === model.modelId;

                        return (
                            <div
                                key={model.modelId}
                                className={`
                                    flex-1 min-w-[280px] flex flex-col shadow-sm rounded-lg overflow-hidden bg-background border
                                    ${isCheapest ? 'border-green-500 ring-2 ring-green-500/20' : 'border-foreground/10'}
                                `}
                            >
                                {/* Card header */}
                                <div className={`
                                    bg-foreground text-background p-5 flex flex-col justify-center relative
                                    ${isCheapest ? 'bg-green-600' : ''}
                                `}>
                                    <div className="text-[1rem] font-bold uppercase tracking-wider">
                                        {model.modelName}
                                    </div>
                                    <div className="text-[0.7rem] opacity-70 mt-1">
                                        {model.provider}
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        {isCheapest && (
                                            <span className="bg-white text-green-600 px-2 py-1 rounded text-[0.65rem] font-bold">
                                                CHEAPEST
                                            </span>
                                        )}
                                        {isFastest && (
                                            <span className="bg-white text-blue-600 px-2 py-1 rounded text-[0.65rem] font-bold">
                                                FASTEST
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Card body */}
                                <div className="p-5 flex-grow">
                                    {/* Per-request cost */}
                                    <div className="text-center mb-4 pb-4 border-b border-foreground/10">
                                        <div className="text-[0.7rem] text-foreground/50 uppercase font-bold mb-1">Per Request</div>
                                        <div className="text-[1.4rem] font-bold text-foreground">
                                            {formatCost(model.cost)}
                                        </div>
                                    </div>

                                    {/* Monthly cost */}
                                    {model.monthlyCost > 0 && (
                                        <div className="text-center mb-4 pb-4 border-b border-foreground/10">
                                            <div className="text-[0.7rem] text-foreground/50 uppercase font-bold mb-1">Monthly Cost</div>
                                            <div className="text-[1.8rem] font-bold text-foreground">
                                                {formatCost(model.monthlyCost)}
                                            </div>
                                            <div className="text-[0.65rem] text-foreground/40">
                                                at {(data.requestsPerMonth ?? 1000).toLocaleString()} requests/month
                                            </div>
                                        </div>
                                    )}

                                    {/* Token breakdown */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between items-center text-[0.75rem]">
                                            <span className="text-foreground/60">Input Tokens:</span>
                                            <span className="font-semibold text-foreground">{formatTokens(model.inputTokens)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[0.75rem]">
                                            <span className="text-foreground/60">Output Tokens:</span>
                                            <span className="font-semibold text-foreground">{formatTokens(model.outputTokens)}</span>
                                        </div>
                                    </div>

                                    {/* Latency (sample mode) */}
                                    {model.latencyMs != null && (
                                        <div className="flex justify-between items-center text-[0.75rem] mb-2">
                                            <span className="text-foreground/60">Latency:</span>
                                            <span className="font-semibold text-foreground">{model.latencyMs}ms</span>
                                        </div>
                                    )}

                                    {/* Confidence */}
                                    {model.confidence && (
                                        <div className="flex justify-between items-center text-[0.75rem]">
                                            <span className="text-foreground/60">Confidence:</span>
                                            <span className={`font-bold uppercase ${
                                                model.confidence === 'high' ? 'text-green-600' :
                                                model.confidence === 'medium' ? 'text-yellow-600' :
                                                'text-orange-600'
                                            }`}>
                                                {model.confidence}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Copy buttons */}
                <div className="mt-6">
                    <ShareCopyButtons data={data} shareId={id} />
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-xs text-foreground/30">
                    Shared via <Link href="/playground" className="underline hover:text-foreground/50">Trim Playground</Link>
                </div>
            </div>
        </div>
    );
}
