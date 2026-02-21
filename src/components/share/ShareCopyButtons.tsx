'use client';

import { useState } from 'react';

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
    return `$${cost.toFixed(2)}`;
}

function buildSlack(data: SharePayload, url: string): string {
    const lines: string[] = [];
    lines.push(`Trim Playground \u2014 ${data.mode} comparison`);
    lines.push(`Prompt: \u201c${data.prompt.length > 120 ? data.prompt.slice(0, 120) + '...' : data.prompt}\u201d`);
    lines.push(`${(data.requestsPerMonth ?? 1000).toLocaleString()} requests/month`);
    lines.push('');

    for (const m of data.models) {
        const badges: string[] = [];
        if (data.winners?.cheapest === m.modelId) badges.push('\u2705 CHEAPEST');
        if (data.winners?.fastest === m.modelId) badges.push('\u26a1 FASTEST');
        const badge = badges.length ? ` ${badges.join(' ')}` : '';
        const latency = m.latencyMs != null ? ` \u2014 ${m.latencyMs}ms` : '';
        lines.push(`${m.modelName} (${m.provider}) \u2014 ${formatCost(m.cost)}/req \u2014 ${formatCost(m.monthlyCost)}/mo${latency}${badge}`);
    }

    lines.push('');
    lines.push(`\u2192 ${url}`);
    return lines.join('\n');
}

function buildMarkdown(data: SharePayload, url: string): string {
    const lines: string[] = [];
    lines.push(`## Trim Playground \u2014 ${data.mode} comparison`);
    lines.push('');

    if (data.mode === 'sample') {
        lines.push('| Model | Provider | $/request | Latency | $/month | |');
        lines.push('|-------|----------|-----------|---------|---------|-|');
        for (const m of data.models) {
            const badges: string[] = [];
            if (data.winners?.cheapest === m.modelId) badges.push('\u2705 Cheapest');
            if (data.winners?.fastest === m.modelId) badges.push('\u26a1 Fastest');
            lines.push(`| ${m.modelName} | ${m.provider} | ${formatCost(m.cost)} | ${m.latencyMs ?? '\u2014'}ms | ${formatCost(m.monthlyCost)} | ${badges.join(' ')} |`);
        }
    } else {
        lines.push('| Model | Provider | $/request | $/month | |');
        lines.push('|-------|----------|-----------|---------|-|');
        for (const m of data.models) {
            const badge = data.winners?.cheapest === m.modelId ? '\u2705 Cheapest' : '';
            lines.push(`| ${m.modelName} | ${m.provider} | ${formatCost(m.cost)} | ${formatCost(m.monthlyCost)} | ${badge} |`);
        }
    }

    lines.push('');
    lines.push(`*${(data.requestsPerMonth ?? 1000).toLocaleString()} requests/month \u00b7 [Open in Playground](${url})*`);
    return lines.join('\n');
}

interface Props {
    data: SharePayload;
    shareId: string;
}

export default function ShareCopyButtons({ data, shareId }: Props) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/share/${shareId}`;
    const slackUrl = `${shareUrl}?utm_source=slack&utm_medium=copy`;
    const mdUrl = `${shareUrl}?utm_source=markdown&utm_medium=copy`;
    const [copied, setCopied] = useState<string | null>(null);

    const copy = async (text: string, label: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    const btnClass = 'text-[0.7rem] font-bold uppercase tracking-wider px-4 py-2 rounded border border-foreground/20 text-foreground/60 hover:text-foreground hover:border-foreground/40 transition-colors cursor-pointer';

    return (
        <div className="flex gap-3 justify-center">
            <button
                className={btnClass}
                onClick={() => copy(buildSlack(data, slackUrl), 'slack')}
            >
                {copied === 'slack' ? 'Copied!' : 'Copy for Slack'}
            </button>
            <button
                className={btnClass}
                onClick={() => copy(buildMarkdown(data, mdUrl), 'md')}
            >
                {copied === 'md' ? 'Copied!' : 'Copy Markdown'}
            </button>
            <button
                className={btnClass}
                onClick={() => copy(JSON.stringify(data, null, 2), 'json')}
            >
                {copied === 'json' ? 'Copied!' : 'Copy JSON'}
            </button>
        </div>
    );
}
