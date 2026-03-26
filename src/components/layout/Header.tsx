'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';

export default function Header() {
    const { isLoaded, isSignedIn } = useAuth();

    return (
        <header className="h-[64px] bg-background flex items-center justify-between px-8 text-foreground shadow-sm sticky top-0 z-50 border-b border-foreground/10">
            {/* Logo */}
            <div className="flex items-center gap-10">
                <Link href="/" className="font-extrabold text-[1.2rem] tracking-[0.1em] text-logo">
                    <span className="text-red-500">TRIM</span> <span className="text-logo border-b-2 border-accent">PLAYGROUND</span>
                </Link>

                <nav className="flex gap-6">
                    <Link href="/playground" className="text-sm font-bold uppercase tracking-wider hover:text-accent transition-colors">
                        Playground
                    </Link>
{isLoaded && isSignedIn && (
                        <Link href="/api-keys" className="text-sm font-bold uppercase tracking-wider hover:text-accent transition-colors">
                            API Keys
                        </Link>
                    )}
                </nav>
            </div>

            {/* Auth Panel */}
            <div className="flex items-center gap-4">
                <ThemeToggle />

                {isLoaded && !isSignedIn && (
                    <div className="flex items-center gap-2">
                        <SignInButton mode="modal">
                            <button className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-md hover:bg-foreground/5 transition-colors">
                                Sign In
                            </button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <button className="bg-foreground text-background text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-md hover:opacity-90 transition-all">
                                Sign Up
                            </button>
                        </SignUpButton>
                    </div>
                )}

                {isLoaded && isSignedIn && (
                    <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                            elements: {
                                avatarBox: "h-8 w-8 rounded-full border border-foreground/10"
                            }
                        }}
                    />
                )}
            </div>
        </header>
    );
}

