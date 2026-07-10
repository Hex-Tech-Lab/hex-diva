/**
 * Referral Code Generation & Management
 */

export function generateReferralCode(): string {
  const letters = 'BCDFGHJKLMNPQRSTVWXYZ';
  const vowels = 'AEIOUY';
  const digits = '0123456789';

  let code = '';
  code += letters[Math.floor(Math.random() * letters.length)];
  code += vowels[Math.floor(Math.random() * vowels.length)];
  for (let i = 0; i < 4; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code.toUpperCase();
}

export function isValidReferralCode(code: string): boolean {
  if (!code) return false;
  const sanitized = String(code).toUpperCase().trim();
  const pattern = /^[A-Z]{2}\d{4}$/;
  return pattern.test(sanitized);
}

export function sanitizeReferralCode(code: string): string | null {
  if (!code) return null;
  const sanitized = String(code).toUpperCase().trim();
  return isValidReferralCode(sanitized) ? sanitized : null;
}

export function formatReferralCodeForDisplay(code: string): string {
  const sanitized = sanitizeReferralCode(code);
  if (!sanitized) return '';
  return `${sanitized.substring(0, 2)}-${sanitized.substring(2)}`;
}

export function generateBatchReferralCodes(count: number): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateReferralCode());
  }
  return Array.from(codes);
}
