/** Maps Firebase Auth / Functions error codes to localization keys. Never exposes raw messages. */
export function errorKey(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
    case 'auth/invalid-login-credentials':
      return 'errInvalidCredentials';
    case 'auth/too-many-requests':
      return 'errTooManyRequests';
    case 'auth/network-request-failed':
    case 'functions/unavailable':
      return 'errNetwork';
    case 'auth/email-already-in-use':
      return 'errEmailInUse';
    case 'auth/weak-password':
      return 'errPasswordWeak';
    default:
      return 'errUnknown';
  }
}
