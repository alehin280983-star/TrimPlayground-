import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { redis } from '@/lib/rate-limit';
import { auth } from '@clerk/nextjs/server';

const TTL_SECONDS = 90 * 86400; // 90 days

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();

        // Validate required fields
        if (!payload.mode || !Array.isArray(payload.models) || payload.models.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid payload: mode and non-empty models array required' },
                { status: 400 }
            );
        }

        if (!['estimate', 'sample'].includes(payload.mode)) {
            return NextResponse.json(
                { success: false, error: 'Invalid mode: must be "estimate" or "sample"' },
                { status: 400 }
            );
        }

        const id = nanoid(10);
        await redis.set(`share:${id}`, JSON.stringify(payload), { ex: TTL_SECONDS });

        // Fire-and-forget: count total shares + unique sharers
        const { userId } = await auth();
        const sharerId = userId ?? `ip:${req.headers.get('x-forwarded-for') ?? 'unknown'}`;
        Promise.all([
            redis.incr('stats:shares:total'),
            redis.sadd('stats:shares:users', sharerId),
        ]).catch(() => {});

        return NextResponse.json({ success: true, id });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
