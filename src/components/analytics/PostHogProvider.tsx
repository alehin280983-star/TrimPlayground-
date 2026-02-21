'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

// Initialize once on client
if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        capture_pageview: true,       // automatic page_view events
        capture_pageleave: true,      // helps with session duration
        person_profiles: 'identified_only',
    });
}

// Sync Clerk identity → PostHog so D7 retention works per-user
function ClerkIdentitySync() {
    const { user, isLoaded } = useUser();
    const ph = usePostHog();

    useEffect(() => {
        if (!isLoaded || !ph) return;
        if (user) {
            ph.identify(user.id, {
                email: user.primaryEmailAddress?.emailAddress,
                name: user.fullName ?? undefined,
                createdAt: user.createdAt?.toISOString(),
            });
        } else {
            // anonymous — posthog assigns its own distinct_id
            ph.reset(false);
        }
    }, [user, isLoaded, ph]);

    return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
    return (
        <PHProvider client={posthog}>
            <ClerkIdentitySync />
            {children}
        </PHProvider>
    );
}
