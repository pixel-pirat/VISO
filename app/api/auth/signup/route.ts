/**
 * This route is intentionally left empty.
 *
 * Sign-up (and all other auth operations) are handled by the better-auth
 * catch-all route at /api/auth/[...all]/route.ts.
 *
 * The client calls authClient.signUp.email() which posts to
 * /api/auth/sign-up/email — served by that handler.
 *
 * If you ever need to extend sign-up behaviour (e.g. post-registration
 * webhooks), do it via a better-auth hook in lib/auth.ts, not here.
 */

export {};
