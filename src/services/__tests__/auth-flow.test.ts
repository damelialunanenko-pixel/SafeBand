import { requiredRoute, type SessionSnapshot } from '../auth-flow';

const signedIn = (over: Partial<Extract<SessionSnapshot, { status: 'signedIn' }>> = {}): SessionSnapshot => ({
  status: 'signedIn', emailVerified: true, profile: { profileComplete: true }, ...over,
});

describe('requiredRoute', () => {
  it('waits while auth is loading', () => {
    expect(requiredRoute({ status: 'loading' }, 'home')).toBeNull();
  });
  it('keeps signed-out users on public screens', () => {
    expect(requiredRoute({ status: 'signedOut' }, '')).toBeNull();
    expect(requiredRoute({ status: 'signedOut' }, 'register')).toBeNull();
    expect(requiredRoute({ status: 'signedOut' }, 'privacy')).toBeNull();
    expect(requiredRoute({ status: 'signedOut' }, 'home')).toBe('/');
  });
  it('blocks the app until the email is verified', () => {
    const s = signedIn({ emailVerified: false });
    expect(requiredRoute(s, 'home')).toBe('/verify-email');
    expect(requiredRoute(s, 'register')).toBe('/verify-email');
    expect(requiredRoute(s, 'verify-email')).toBeNull();
    expect(requiredRoute(s, 'privacy')).toBeNull();
  });
  it('waits for the profile', () => {
    expect(requiredRoute(signedIn({ profile: 'loading' }), 'home')).toBeNull();
  });
  it('goes straight from email confirmation to the caregiver profile', () => {
    const s = signedIn({ profile: {} });
    expect(requiredRoute(s, 'verify-email')).toBe('/guardian-profile');
    expect(requiredRoute(s, 'home')).toBe('/guardian-profile');
  });
  it('no longer knows the security-question screens', () => {
    expect(requiredRoute(signedIn(), 'security-setup')).toBeNull();
    expect(requiredRoute(signedIn({ profile: {} }), 'security-check')).toBe('/guardian-profile');
  });
  it('requires the caregiver profile', () => {
    const s = signedIn({ profile: { profileComplete: false } });
    expect(requiredRoute(s, 'home')).toBe('/guardian-profile');
    expect(requiredRoute(s, 'guardian-profile')).toBeNull();
  });
  it('sends a fully set-up user from onboarding screens to home', () => {
    expect(requiredRoute(signedIn(), '')).toBe('/home');
    expect(requiredRoute(signedIn(), 'verify-email')).toBe('/home');
    expect(requiredRoute(signedIn(), 'home')).toBeNull();
    expect(requiredRoute(signedIn(), 'ward')).toBeNull();
    expect(requiredRoute(signedIn(), 'guardian-profile')).toBeNull();
  });
});
