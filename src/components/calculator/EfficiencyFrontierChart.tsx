import type { WorkflowEstimate } from '@/lib/workflows/types';

const PATTERN_COLORS: Record<string, string> = {
    single: '#3b82f6',
    router: '#8b5cf6',
    pipeline: '#f59e0b',
    parallel: '#10b981',
};

type ScoredEstimate = WorkflowEstimate & { normalizedScore: number };

interface Props {
    estimates: ScoredEstimate[];
    recommendedId?: string;
}

const W = 420;
const H = 220;
const PAD = { top: 20, right: 20, bottom: 44, left: 52 };
const IW = W - PAD.left - PAD.right;
const IH = H - PAD.top - PAD.bottom;

function shortCost(v: number): string {
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    if (v >= 1) return `$${v.toFixed(0)}`;
    if (v >= 0.01) return `$${v.toFixed(2)}`;
    if (v >= 0.001) return `$${v.toFixed(3)}`;
    return `$${v.toExponential(1)}`;
}

export function EfficiencyFrontierChart({ estimates, recommendedId }: Props) {
    if (estimates.length === 0) return null;

    const costs = estimates.map(e => e.totalCostPerMonth);
    const rates = estimates.map(e => e.successRate * 100);

    const rawCostRange = Math.max(...costs) - Math.min(...costs);
    const rawRateRange = Math.max(...rates) - Math.min(...rates);

    // Add padding so single points aren't stuck at edges
    const costPad = rawCostRange > 0 ? rawCostRange * 0.2 : Math.max(...costs) * 0.3 || 1;
    const ratePad = rawRateRange > 0 ? rawRateRange * 0.2 : 2;

    const cMin = Math.min(...costs) - costPad;
    const cMax = Math.max(...costs) + costPad;
    const rMin = Math.max(0, Math.min(...rates) - ratePad);
    const rMax = Math.min(100, Math.max(...rates) + ratePad);

    function xPos(cost: number) {
        return PAD.left + ((cost - cMin) / (cMax - cMin)) * IW;
    }
    function yPos(rate: number) {
        return PAD.top + (1 - (rate - rMin) / (rMax - rMin)) * IH;
    }

    const xTicks = 4;
    const yTicks = 4;

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            style={{ maxWidth: W }}
            className="overflow-visible"
        >
            {/* X grid lines + labels */}
            {Array.from({ length: xTicks + 1 }, (_, i) => {
                const x = PAD.left + (i / xTicks) * IW;
                const cost = cMin + (i / xTicks) * (cMax - cMin);
                return (
                    <g key={`xg${i}`}>
                        <line
                            x1={x} y1={PAD.top}
                            x2={x} y2={PAD.top + IH}
                            stroke="currentColor" strokeOpacity={0.07} strokeDasharray="3 3"
                        />
                        <text
                            x={x} y={H - 6}
                            textAnchor="middle" fontSize={8} fill="currentColor" fillOpacity={0.3}
                        >
                            {shortCost(cost)}
                        </text>
                    </g>
                );
            })}

            {/* Y grid lines + labels */}
            {Array.from({ length: yTicks + 1 }, (_, i) => {
                const y = PAD.top + (i / yTicks) * IH;
                const rate = rMax - (i / yTicks) * (rMax - rMin);
                return (
                    <g key={`yg${i}`}>
                        <line
                            x1={PAD.left} y1={y}
                            x2={PAD.left + IW} y2={y}
                            stroke="currentColor" strokeOpacity={0.07} strokeDasharray="3 3"
                        />
                        <text
                            x={PAD.left - 5} y={y + 3}
                            textAnchor="end" fontSize={8} fill="currentColor" fillOpacity={0.3}
                        >
                            {rate.toFixed(0)}%
                        </text>
                    </g>
                );
            })}

            {/* Axis border lines */}
            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + IH} stroke="currentColor" strokeOpacity={0.12} />
            <line x1={PAD.left} y1={PAD.top + IH} x2={PAD.left + IW} y2={PAD.top + IH} stroke="currentColor" strokeOpacity={0.12} />

            {/* Axis titles */}
            <text x={W / 2} y={H - 1} textAnchor="middle" fontSize={8} fill="currentColor" fillOpacity={0.3}>
                Cost / month
            </text>
            <text
                x={11} y={PAD.top + IH / 2}
                textAnchor="middle" fontSize={8} fill="currentColor" fillOpacity={0.3}
                transform={`rotate(-90, 11, ${PAD.top + IH / 2})`}
            >
                Success %
            </text>

            {/* Data points */}
            {estimates.map(est => {
                const cx = xPos(est.totalCostPerMonth);
                const cy = yPos(est.successRate * 100);
                const isRec = est.templateId === recommendedId;
                const color = PATTERN_COLORS[est.architecturePattern] ?? '#888';

                return (
                    <g key={est.templateId}>
                        {isRec && (
                            <circle cx={cx} cy={cy} r={16} fill={color} opacity={0.12} />
                        )}
                        <circle
                            cx={cx} cy={cy}
                            r={isRec ? 7 : 5}
                            fill={color}
                            opacity={isRec ? 1 : 0.55}
                        />
                        <text
                            x={cx} y={cy - (isRec ? 13 : 10)}
                            textAnchor="middle" fontSize={9}
                            fill="currentColor"
                            fillOpacity={isRec ? 0.85 : 0.45}
                            fontWeight={isRec ? 'bold' : 'normal'}
                        >
                            {est.templateName}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}
