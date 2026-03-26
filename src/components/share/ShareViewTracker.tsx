'use client';

import { useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';

interface Props {
    shareId: string;
    mode: 'estimate' | 'sample';
    modelCount: number;
}

export function ShareViewTracker({ shareId, mode, modelCount }: Props) {
    const ph = usePostHog();

    useEffect(() => {
        ph?.capture('share_viewed', { share_id: shareId, mode, model_count: modelCount });
    }, [ph, shareId, mode, modelCount]);

    return null;
}
