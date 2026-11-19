import { requiredRoute, type SessionSnapshot } from '../auth-flow';

const signedIn = (over: Partial<Extract<SessionSnapshot, { status: 'signedIn' }>> = {}): SessionSnapshot => ({
  status: 'signedIn', emailVerified: true, profile: { securityQuestionsSet: true, profileComplete: true }, trustedDevice: true, ...over,
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
  it('waits for the profile and device flag', () => {
    expect(requiredRoute(signedIn({ profile: 'loading' }), 'home')).toBeNull();
    expect(requiredRoute(signedIn({ trustedDevice: 'loading' }), 'home')).toBeNull();
  });
  it('asks to set security questions first', () => {
    const s = signedIn({ profile: { securityQuestionsSet: false }, trustedDevice: false });
    expect(requiredRoute(s, 'home')).toBe('/security-setup');
    expect(requiredRoute(s, 'security-setup')).toBeNull();
  });
  it('checks security answers on a new device', () => {
    const s = signedIn({ trustedDevice: false });
    expect(requiredRoute(s, 'home')).toBe('/security-check');
    expect(requiredRoute(s, 'guardian-profile')).toBe('/security-check');
    expect(requiredRoute(s, 'security-check')).toBeNull();
  });
  it('requires the caregiver profile', () => {
    const s = signedIn({ profile: { securityQuestionsSet: true, profileComplete: false } });
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
