/**
 * Decides where the AuthGuard must send the user. Pure function, see __tests__/auth-flow.test.ts.
 *
 * Order of gates for a signed-in user:
 *   email verified → security questions set → this device trusted → caregiver profile filled → app.
 */
export type ProfileFlags = { securityQuestionsSet?: boolean; profileComplete?: boolean };

export type SessionSnapshot =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; emailVerified: boolean; profile: ProfileFlags | 'loading'; trustedDevice: boolean | 'loading' };

/** Routes available without signing in. `''` is the start screen (src/app/index.tsx). */
export const PUBLIC_ROUTES = ['', 'auth', 'register', 'privacy'];
/** Routes that make no sense once the account is fully set up. */
const ONBOARDING_ONLY = ['', 'auth', 'register', 'verify-email', 'security-setup', 'security-check'];

const allow = (segment: string, allowed: string[], fallback: string) => (allowed.includes(segment) ? null : fallback);

/** Returns the path to redirect to, or `null` to stay on `segment` (first path segment, `''` for `/`). */
export function requiredRoute(session: SessionSnapshot, segment: string): string | null {
  if (session.status === 'loading') return null;
  if (session.status === 'signedOut') return allow(segment, PUBLIC_ROUTES, '/');
  if (!session.emailVerified) return allow(segment, ['verify-email', 'privacy'], '/verify-email');
  if (session.profile === 'loading' || session.trustedDevice === 'loading') return null;
  if (!session.profile.securityQuestionsSet) return allow(segment, ['security-setup', 'privacy'], '/security-setup');
  if (!session.trustedDevice) return allow(segment, ['security-check'], '/security-check');
  if (!session.profile.profileComplete) return allow(segment, ['guardian-profile', 'privacy'], '/guardian-profile');
  return ONBOARDING_ONLY.includes(segment) ? '/home' : null;
}
