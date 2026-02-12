import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
    // If it's not a public route, require authentication
    if (!isPublicRoute(request)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        // Skip API routes here, they are matched separately below
        '/((?!api|trpc|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Run for API routes except /api/estimate to avoid Edge middleware size on that endpoint
        '/api/((?!estimate).*)',
        '/trpc(.*)',
    ],
};
