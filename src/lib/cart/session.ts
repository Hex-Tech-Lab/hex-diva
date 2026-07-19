/**
 * Extract session ID from cookie header
 */
export function extractSessionId(cookieHeader: string): string | null {
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'cart-session-id' && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}
