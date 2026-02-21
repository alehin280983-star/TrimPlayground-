'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePostHog } from 'posthog-js/react';

const WTP_OPTIONS = [
    { value: '5', label: '$5 / month' },
    { value: '10', label: '$10 / month' },
    { value: '20', label: '$20 / month' },
    { value: '50', label: '$50 / month' },
    { value: '100+', label: '$100+ / month' },
];

const PRO_FEATURES = [
    'Unlimited calculations',
    'Calculation history & saved comparisons',
    'Team sharing & collaboration',
    'Price change alerts',
    'API access',
    'Priority support',
];

export default function ProPage() {
    const ph = usePostHog();
    const [email, setEmail] = useState('');
    const [wtp, setWtp] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setStatus('loading');

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), wtp: wtp || null }),
            });
            const data = await res.json();

            if (data.success) {
                ph?.capture('pro_waitlist_click', { wtp, email_provided: true });
                setStatus('done');
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            {/* Header */}
            <header className="h-[64px] border-b border-foreground/10 flex items-center justify-between px-8">
                <Link href="/" className="font-extrabold text-[1.2rem] tracking-[0.1em]">
                    <span className="text-red-500">TRIM</span>{' '}
                    <span className="border-b-2 border-foreground">PLAYGROUND</span>
                </Link>
                <Link href="/playground" className="text-xs font-bold uppercase tracking-wider text-foreground/50 hover:text-foreground transition-colors">
                    ← Back to Playground
                </Link>
            </header>

            <div className="max-w-[960px] mx-auto px-8 py-16 grid md:grid-cols-2 gap-16 items-start">

                {/* Left — value prop */}
                <div>
                    <div className="inline-block text-[0.65rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-foreground/10 text-foreground/60 mb-6">
                        Coming Soon
                    </div>
                    <h1 className="text-4xl font-extrabold leading-tight mb-4">
                        Trim Playground<br />
                        <span className="text-red-500">Pro</span>
                    </h1>
                    <p className="text-foreground/60 text-base mb-8 leading-relaxed">
                        Everything you need to make confident AI cost decisions —
                        without surprises on your bill.
                    </p>

                    <ul className="space-y-3 mb-8">
                        {PRO_FEATURES.map(f => (
                            <li key={f} className="flex items-center gap-3 text-sm text-foreground/80">
                                <span className="text-green-500 font-bold">✓</span>
                                {f}
                            </li>
                        ))}
                    </ul>

                    <div className="text-xs text-foreground/30">
                        Free tier stays free forever.
                    </div>
                </div>

                {/* Right — waitlist form */}
                <div className="bg-foreground/5 border border-foreground/10 rounded-xl p-8">
                    {status === 'done' ? (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">🎉</div>
                            <h2 className="text-xl font-bold mb-2">You&apos;re on the list!</h2>
                            <p className="text-foreground/50 text-sm mb-6">
                                We&apos;ll reach out when Pro is ready.
                            </p>
                            <Link
                                href="/playground"
                                className="text-sm font-bold uppercase tracking-wider underline text-foreground/60 hover:text-foreground transition-colors"
                            >
                                Back to Playground
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-lg font-bold mb-1">Join the waitlist</h2>
                            <p className="text-foreground/50 text-sm mb-6">
                                Be first to know when Pro launches. No spam.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full bg-background border border-foreground/20 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/50 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">
                                        How much would you pay? <span className="text-foreground/30 font-normal normal-case">(optional)</span>
                                    </label>
                                    <select
                                        value={wtp}
                                        onChange={e => setWtp(e.target.value)}
                                        className="w-full bg-background border border-foreground/20 rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-foreground/50 transition-colors"
                                    >
                                        <option value="">Not sure yet</option>
                                        {WTP_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {status === 'error' && (
                                    <p className="text-red-500 text-xs">Something went wrong. Please try again.</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={status === 'loading' || !email.trim()}
                                    className="w-full bg-red-500 text-white font-bold uppercase tracking-wider text-sm py-3 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {status === 'loading' ? 'Joining...' : 'Join Waitlist →'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
