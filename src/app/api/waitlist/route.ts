import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { email, wtp } = await req.json();

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json({ success: false, error: 'Valid email required' }, { status: 400 });
        }

        // Dedup — silently succeed if already signed up
        const isNew = await redis.sadd('waitlist:emails', email.toLowerCase().trim());

        if (isNew) {
            // Store full entry with timestamp
            await redis.lpush('waitlist:entries', JSON.stringify({
                email: email.toLowerCase().trim(),
                wtp: wtp ?? null,
                createdAt: new Date().toISOString(),
            }));
        }

        return NextResponse.json({ success: true, isNew: Boolean(isNew) });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
