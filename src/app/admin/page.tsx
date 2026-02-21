import { auth } from '@clerk/nextjs/server';
import { redis } from '@/lib/rate-limit';
import Link from 'next/link';

// Protect with ADMIN_USER_ID env var — set this to your Clerk user ID
async function isAdmin(): Promise<boolean> {
    const adminId = process.env.ADMIN_USER_ID;
    if (!adminId) return false;
    const { userId } = await auth();
    return userId === adminId;
}

interface StatRow {
    member: string;
    score: number;
}

interface WaitlistEntry {
    email: string;
    wtp: string | null;
    createdAt: string;
}

async function getStats() {
    // ZRANGE ... REV WITHSCORES → sorted set, highest score first
    const [modelsRaw, providersRaw, modesRaw, uniqueActivated, sharesTotal, uniqueSharers, waitlistEntries] = await Promise.all([
        redis.zrange('stats:models', 0, -1, { rev: true, withScores: true }),
        redis.zrange('stats:providers', 0, -1, { rev: true, withScores: true }),
        redis.zrange('stats:modes', 0, -1, { rev: true, withScores: true }),
        redis.scard('stats:activated:users'),   // unique users who ran a calculation
        redis.get('stats:shares:total'),         // total share button clicks
        redis.scard('stats:shares:users'),       // unique users who shared
        redis.lrange('waitlist:entries', 0, -1), // all waitlist entries
    ]);

    // Upstash returns flat array: [member, score, member, score, ...]
    const parse = (raw: (string | number)[]): StatRow[] => {
        const rows: StatRow[] = [];
        for (let i = 0; i < raw.length; i += 2) {
            rows.push({ member: String(raw[i]), score: Number(raw[i + 1]) });
        }
        return rows;
    };

    const models = parse(modelsRaw as (string | number)[]);
    const providers = parse(providersRaw as (string | number)[]);
    const modes = parse(modesRaw as (string | number)[]);

    const total = modes.reduce((sum, m) => sum + m.score, 0);
    const shares = Number(sharesTotal ?? 0);
    const shareRate = uniqueActivated > 0 ? ((uniqueSharers / uniqueActivated) * 100).toFixed(1) : '—';

    // Parse waitlist entries and compute WTP distribution
    const parsedEntries: WaitlistEntry[] = (waitlistEntries as string[]).map(e => {
        try { return JSON.parse(e) as WaitlistEntry; } catch { return null; }
    }).filter(Boolean) as WaitlistEntry[];

    const wtpCount: Record<string, number> = {};
    for (const entry of parsedEntries) {
        const key = entry.wtp ?? 'Not sure';
        wtpCount[key] = (wtpCount[key] ?? 0) + 1;
    }
    const wtpDistribution = Object.entries(wtpCount)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count }));

    return { models, providers, modes, total, uniqueActivated, shares, uniqueSharers, shareRate, waitlistCount: parsedEntries.length, wtpDistribution };
}

export default async function AdminPage() {
    if (!(await isAdmin())) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">🔒</div>
                    <h1 className="text-xl font-bold mb-2">Access Denied</h1>
                    <p className="text-foreground/50 text-sm mb-4">Admin only</p>
                    <Link href="/playground" className="text-sm underline text-foreground/50 hover:text-foreground">
                        Go to Playground
                    </Link>
                </div>
            </div>
        );
    }

    const { models, providers, modes, total, uniqueActivated, shares, shareRate, waitlistCount, wtpDistribution } = await getStats();
    const maxModelScore = models[0]?.score ?? 1;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            {/* Header */}
            <header className="h-[60px] border-b border-foreground/10 flex items-center justify-between px-8">
                <div className="font-extrabold tracking-widest text-sm uppercase">
                    <span className="text-red-500">TRIM</span> PLAYGROUND
                    <span className="text-foreground/40 ml-3 font-normal">Admin</span>
                </div>
                <Link href="/playground" className="text-xs text-foreground/40 hover:text-foreground transition-colors uppercase tracking-wider">
                    ← Playground
                </Link>
            </header>

            <div className="max-w-[960px] mx-auto p-8 space-y-10">

                {/* Summary row */}
                <div className="grid grid-cols-4 gap-4">
                    <StatBox label="Total Requests" value={total.toLocaleString()} />
                    <StatBox label="Unique Activated" value={uniqueActivated.toLocaleString()} sub="users ran ≥1 calculation" />
                    <StatBox label="Share Rate" value={`${shareRate}%`} sub={`${shares} shares total`} />
                    <StatBox label="Waitlist" value={waitlistCount.toLocaleString()} sub="Pro signups" />
                </div>

                {/* Waitlist WTP distribution */}
                {wtpDistribution.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">Waitlist — WTP Distribution</h2>
                        <div className="flex flex-wrap gap-3">
                            {wtpDistribution.map(({ label, count }) => (
                                <div key={label} className="bg-foreground/5 border border-foreground/10 rounded-lg px-4 py-3 min-w-[120px]">
                                    <div className="text-xs text-foreground/50 mb-1">{label}</div>
                                    <div className="text-xl font-bold tabular-nums">{count}</div>
                                    <div className="text-xs text-foreground/30">{waitlistCount > 0 ? ((count / waitlistCount) * 100).toFixed(0) : 0}%</div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Mode split */}
                <div className="grid grid-cols-2 gap-4">
                    <StatBox label="Estimate" value={`${modes.find(m => m.member === 'estimate')?.score.toLocaleString() ?? 0}`} sub="requests" />
                    <StatBox label="Sample" value={`${modes.find(m => m.member === 'sample')?.score.toLocaleString() ?? 0}`} sub="requests" />
                </div>

                {/* Top Models */}
                <section>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">Top Models</h2>
                    <div className="space-y-2">
                        {models.slice(0, 15).map((row, i) => (
                            <div key={row.member} className="flex items-center gap-3">
                                <span className="text-[0.65rem] text-foreground/30 w-5 text-right">{i + 1}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium">{row.member}</span>
                                        <span className="text-xs text-foreground/50 tabular-nums">{row.score.toLocaleString()}</span>
                                    </div>
                                    <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-foreground/60 rounded-full"
                                            style={{ width: `${(row.score / maxModelScore) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {models.length === 0 && <p className="text-foreground/30 text-sm">No data yet</p>}
                    </div>
                </section>

                {/* Providers */}
                <section>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">Providers</h2>
                    <div className="flex flex-wrap gap-3">
                        {providers.map(row => (
                            <div key={row.member} className="bg-foreground/5 border border-foreground/10 rounded-lg px-4 py-3 min-w-[120px]">
                                <div className="text-xs text-foreground/50 mb-1 capitalize">{row.member}</div>
                                <div className="text-xl font-bold tabular-nums">{row.score.toLocaleString()}</div>
                            </div>
                        ))}
                        {providers.length === 0 && <p className="text-foreground/30 text-sm">No data yet</p>}
                    </div>
                </section>

                {/* Footer */}
                <div className="text-xs text-foreground/20 text-center pt-4 border-t border-foreground/10">
                    Data from Upstash Redis · refreshes on page reload
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-5">
            <div className="text-xs text-foreground/40 uppercase tracking-widest mb-2">{label}</div>
            <div className="text-3xl font-bold tabular-nums">{value}</div>
            {sub && <div className="text-xs text-foreground/30 mt-1">{sub}</div>}
        </div>
    );
}
