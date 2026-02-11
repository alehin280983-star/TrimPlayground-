'use client';

import { useState, useEffect } from 'react';
import { ProviderType } from '@/types';
import { useUser } from '@clerk/nextjs';

interface APIKeyInputProps {
    provider: ProviderType;
    onKeyChange: (key: string | null) => void;
}

const STORAGE_PREFIX = 'trim_api_key_';

export default function APIKeyInput({ provider, onKeyChange }: APIKeyInputProps) {
    const { isSignedIn, isLoaded } = useUser();
    const [draftValues, setDraftValues] = useState<Partial<Record<ProviderType, string>>>({});
    const [storageVersion, setStorageVersion] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    const storageKey = `${STORAGE_PREFIX}${provider}`;

    const savedValue = (() => {
        if (!isLoaded || typeof window === 'undefined') return '';
        if (isSignedIn) {
            return localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey) || '';
        }
        return sessionStorage.getItem(storageKey) || '';
    })();

    const draftValue = draftValues[provider];
    const value = draftValue ?? savedValue;
    const isSaved = draftValue === undefined && !!savedValue;

    useEffect(() => {
        if (!isLoaded) return;
        onKeyChange(savedValue || null);
    }, [isLoaded, savedValue, onKeyChange, storageVersion]);


    const handleSave = () => {
        const trimmedValue = value.trim();
        if (trimmedValue) {
            if (typeof window === 'undefined') return;

            if (isSignedIn) {
                localStorage.setItem(storageKey, trimmedValue);
                sessionStorage.removeItem(storageKey);
            } else {
                sessionStorage.setItem(storageKey, trimmedValue);
            }

            setDraftValues(prev => {
                const next = { ...prev };
                delete next[provider];
                return next;
            });
            setStorageVersion(prev => prev + 1);
        }
    };

    const handleClear = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(storageKey);
            localStorage.removeItem(storageKey);
        }

        setDraftValues(prev => {
            const next = { ...prev };
            delete next[provider];
            return next;
        });
        setStorageVersion(prev => prev + 1);
    };

    const providerLabels: Record<ProviderType, string> = {
        openai: 'OpenAI',
        anthropic: 'Anthropic',
        google: 'Google',
        mistral: 'Mistral',
        cohere: 'Cohere',
        deepseek: 'DeepSeek',
        xai: 'xAI',
        alibaba: 'Alibaba',
    };

    const inputId = `api-key-${provider}`;

    if (!isLoaded) return <div className="animate-pulse h-20 bg-foreground/5 rounded-lg" />;

    return (
        <div className="space-y-2">
            <label htmlFor={inputId} className="text-xs font-bold text-foreground/60 uppercase tracking-wide">
                {providerLabels[provider]} API Key
            </label>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        id={inputId}
                        type={isVisible ? 'text' : 'password'}
                        value={value}
                        onChange={(e) => {
                            const nextValue = e.target.value;
                            setDraftValues(prev => {
                                if (nextValue === savedValue) {
                                    const next = { ...prev };
                                    delete next[provider];
                                    return next;
                                }
                                return { ...prev, [provider]: nextValue };
                            });
                        }}
                        placeholder={`Enter ${providerLabels[provider]} API key`}
                        className="w-full p-3 pr-10 border border-foreground/20 rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    />
                    <button
                        type="button"
                        onClick={() => setIsVisible(!isVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
                    >
                        {isVisible ? '👁️' : '👁️‍🗨️'}
                    </button>
                </div>

                {isSaved ? (
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 border border-foreground/20 rounded-lg text-sm font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground hover:border-foreground/40 transition-all active:scale-95"
                    >
                        Clear
                    </button>
                ) : (
                    <button
                        onClick={handleSave}
                        disabled={!value.trim()}
                        className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-bold uppercase tracking-wider disabled:opacity-30 hover:opacity-90 transition-all active:scale-95 shadow-sm"
                    >
                        Save
                    </button>
                )}
            </div>

            {isSaved && (
                <p className="text-xs text-foreground/40 flex items-center gap-1">
                    <span className="text-accent">✓</span>
                    {isSignedIn ? 'Saved permanently in your browser' : 'Saved for this session only'}
                </p>
            )}
        </div>
    );
}
