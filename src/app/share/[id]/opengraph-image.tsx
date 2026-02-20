import { ImageResponse } from 'next/og';
import { Redis } from '@upstash/redis';

export const runtime = 'edge';
export const alt = 'Trim Playground — Cost Comparison';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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

interface SharePayload {
    mode: 'estimate' | 'sample';
    prompt: string;
    requestsPerMonth: number;
    models: ShareModel[];
    winners?: { cheapest: string | null; fastest: string | null };
}

function formatCost(cost: number): string {
    if (cost === 0) return '$0.00';
    if (cost < 0.0001) return '<$0.0001';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    if (cost < 100) return `$${cost.toFixed(2)}`;
    return `$${cost.toFixed(2)}`;
}

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
});

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const raw = await redis.get(`share:${id}`);

    if (!raw) {
        return new ImageResponse(
            (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#41413e',
                        color: '#F4F3EE',
                        fontFamily: 'sans-serif',
                    }}
                >
                    <div style={{ fontSize: 64, marginBottom: 16, display: 'flex' }}>?</div>
                    <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 8, display: 'flex' }}>Link Expired</div>
                    <div style={{ fontSize: 20, opacity: 0.6, display: 'flex' }}>This shared result is no longer available</div>
                </div>
            ),
            { ...size }
        );
    }

    const data: SharePayload = typeof raw === 'string' ? JSON.parse(raw) : (raw as SharePayload);
    // Winner swap: put cheapest model first so it's most prominent
    const sorted = [...data.models].sort((a, b) => {
        if (data.winners?.cheapest === a.modelId) return -1;
        if (data.winners?.cheapest === b.modelId) return 1;
        return 0;
    });
    const displayModels = sorted.slice(0, 3);
    const promptText = data.prompt
        ? data.prompt.length > 100
            ? data.prompt.slice(0, 100) + '...'
            : data.prompt
        : 'No prompt provided';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#41413e',
                    color: '#F4F3EE',
                    fontFamily: 'sans-serif',
                    padding: '48px 56px',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.1em', color: '#C8102E' }}>TRIM</span>
                        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.1em', borderBottom: '3px solid #C8102E' }}>PLAYGROUND</span>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 14,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            padding: '6px 16px',
                            borderRadius: 9999,
                            backgroundColor: data.mode === 'sample' ? 'rgba(59,130,246,0.2)' : 'rgba(244,243,238,0.1)',
                            color: data.mode === 'sample' ? '#93c5fd' : 'rgba(244,243,238,0.7)',
                            border: `1px solid ${data.mode === 'sample' ? 'rgba(59,130,246,0.4)' : 'rgba(244,243,238,0.2)'}`,
                        }}
                    >
                        {data.mode}
                    </div>
                </div>

                {/* Prompt — compact single line */}
                <div
                    style={{
                        display: 'flex',
                        fontSize: 15,
                        color: 'rgba(244,243,238,0.5)',
                        backgroundColor: 'rgba(244,243,238,0.04)',
                        border: '1px solid rgba(244,243,238,0.08)',
                        borderRadius: 8,
                        padding: '10px 16px',
                        marginBottom: 28,
                        overflow: 'hidden',
                    }}
                >
                    &ldquo;{promptText}&rdquo;
                </div>

                {/* Model cards */}
                <div style={{ display: 'flex', gap: 20, flex: 1 }}>
                    {displayModels.map((model) => {
                        const isCheapest = data.winners?.cheapest === model.modelId;
                        const isFastest = data.winners?.fastest === model.modelId;

                        return (
                            <div
                                key={model.modelId}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flex: 1,
                                    backgroundColor: 'rgba(244,243,238,0.06)',
                                    borderRadius: 16,
                                    border: isCheapest
                                        ? '2px solid #22c55e'
                                        : isFastest
                                          ? '2px solid #3b82f6'
                                          : '1px solid rgba(244,243,238,0.12)',
                                    padding: '24px 20px',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Model name */}
                                <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                    {model.modelName}
                                </div>
                                <div style={{ display: 'flex', fontSize: 13, opacity: 0.5, marginBottom: 20 }}>
                                    {model.provider}
                                </div>

                                {/* Per-request cost — large */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 14 }}>
                                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: 4 }}>$ / run</div>
                                    <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em' }}>{formatCost(model.cost)}</div>
                                </div>

                                {/* Monthly cost — large */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: 4 }}>$ / month</div>
                                    <div style={{ display: 'flex', fontSize: 32, fontWeight: 800 }}>{formatCost(model.monthlyCost)}</div>
                                </div>

                                {/* Winner badges */}
                                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', justifyContent: 'center' }}>
                                    {isCheapest && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                padding: '4px 10px',
                                                borderRadius: 6,
                                                backgroundColor: 'rgba(34,197,94,0.15)',
                                                color: '#4ade80',
                                                border: '1px solid rgba(34,197,94,0.3)',
                                            }}
                                        >
                                            CHEAPEST
                                        </div>
                                    )}
                                    {isFastest && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                padding: '4px 10px',
                                                borderRadius: 6,
                                                backgroundColor: 'rgba(59,130,246,0.15)',
                                                color: '#93c5fd',
                                                border: '1px solid rgba(59,130,246,0.3)',
                                            }}
                                        >
                                            FASTEST
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, fontSize: 15, opacity: 0.4 }}>
                    {(data.requestsPerMonth ?? 1000).toLocaleString()} requests/month
                </div>
            </div>
        ),
        { ...size }
    );
}
