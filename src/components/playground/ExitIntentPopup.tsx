'use client';

import { useEffect, useState } from 'react';
import { usePostHog } from 'posthog-js/react';

const OPTIONS = [
    'Не нашёл нужную модель',
    'Непонятно как пользоваться',
    'Просто смотрел',
];

interface ExitIntentPopupProps {
    hasCalculated: boolean;
}

export function ExitIntentPopup({ hasCalculated }: ExitIntentPopupProps) {
    const ph = usePostHog();
    const [visible, setVisible] = useState(false);
    const [selected, setSelected] = useState('');
    const [custom, setCustom] = useState('');
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (hasCalculated) return;
        if (sessionStorage.getItem('trim_exit_intent_shown')) return;

        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0) {
                setVisible(true);
                sessionStorage.setItem('trim_exit_intent_shown', 'true');
            }
        };

        document.addEventListener('mouseleave', handleMouseLeave);
        return () => document.removeEventListener('mouseleave', handleMouseLeave);
    }, [hasCalculated]);

    const handleSubmit = () => {
        const reason = selected || custom.trim();
        if (!reason) return;
        ph?.capture('exit_intent_feedback', {
            reason: selected || 'custom',
            custom_text: selected ? undefined : custom.trim(),
        });
        setSubmitted(true);
    };

    const handleDismiss = () => {
        ph?.capture('exit_intent_dismissed');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-foreground/20 rounded-xl p-8 max-w-[420px] w-full shadow-2xl">
                {submitted ? (
                    <div className="text-center py-4">
                        <div className="text-3xl mb-3">🙏</div>
                        <h2 className="font-bold text-lg mb-2">Спасибо за фидбек!</h2>
                        <p className="text-foreground/50 text-sm mb-6">Это помогает нам стать лучше.</p>
                        <button
                            onClick={() => setVisible(false)}
                            className="text-sm font-bold uppercase tracking-wider underline text-foreground/50 hover:text-foreground transition-colors"
                        >
                            Закрыть
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="font-bold text-lg mb-1">Подождите!</h2>
                        <p className="text-foreground/60 text-sm mb-6">Что помешало сделать расчёт?</p>

                        <div className="space-y-2 mb-5">
                            {OPTIONS.map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => { setSelected(opt); setCustom(''); }}
                                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                                        selected === opt
                                            ? 'border-foreground bg-foreground/10 font-medium text-foreground'
                                            : 'border-foreground/15 text-foreground/70 hover:border-foreground/30 hover:text-foreground'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                            <input
                                type="text"
                                placeholder="Другое..."
                                value={custom}
                                onChange={e => { setCustom(e.target.value); setSelected(''); }}
                                className="w-full bg-background border border-foreground/15 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40 transition-colors"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={!selected && !custom.trim()}
                                className="flex-1 bg-foreground text-background font-bold text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Отправить
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2.5 text-sm text-foreground/40 hover:text-foreground/60 transition-colors"
                            >
                                Закрыть
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
