/**
 * Referral Code Generation & Management
 * Handles unique referral code creation, validation, and recovery
 */

/**
 * Generate a unique referral code
 * Format: 2 letters + 4-5 digits (e.g., AB1234, XY12345)
 * Ensures pronounceability and memorability
 * @returns Generated referral code
 */
export function generateReferralCode(): string {
  // Use consonant-heavy letters for pronounceability
  const letters = 'BCDFGHJKLMNPQRSTVWXYZ';
  const vowels = 'AEIOUY';
  const digits = '0123456789';

  let code = '';

  // Start with consonant
  code += letters[Math.floor(Math.random() * letters.length)];

  // Add a vowel
  code += vowels[Math.floor(Math.random() * vowels.length)];

  // Add 4 random digits
  for (let i = 0; i < 4; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }

  return code.toUpperCase();
}

/**
 * Generate multiple unique referral codes (for batch operations)
 * @param count - Number of codes to generate
 * @returns Array of unique codes
 */
export function generateBatchReferralCodes(count: number): string[] {
  const codes = new Set<string>();

  while (codes.size < count) {
    codes.add(generateReferralCode());
  }

  return Array.from(codes);
}

/**
 * Validate referral code format
 * @param code - Code to validate
 * @returns Whether code is valid
 */
export function isValidReferralCode(code: string): boolean {
  if (!code) return false;

  const sanitized = String(code).toUpperCase().trim();

  // Pattern: 2 letters + 4 digits
  const pattern = /^[A-Z]{2}\d{4}$/;
  return pattern.test(sanitized);
}

/**
 * Sanitize referral code input
 * @param code - Raw input code
 * @returns Sanitized code or null if invalid
 */
export function sanitizeReferralCode(code: string): string | null {
  if (!code) return null;

  const sanitized = String(code).toUpperCase().trim();

  return isValidReferralCode(sanitized) ? sanitized : null;
}

/**
 * Check code entropy (ensure randomness)
 * Simple check for obviously bad patterns
 * @param code - Code to check
 * @returns Whether code has sufficient entropy
 */
export function hasGoodEntropy(code: string): boolean {
  if (!isValidReferralCode(code)) return false;

  // Reject obvious patterns
  const patterns = [
    /(.)\1{2,}/, // Three or more same characters
    /^(AA|EE|II|OO|UU)/, // Double vowels at start
    /(\d)\1{3}/, // Four same digits
  ];

  return !patterns.some((pattern) => pattern.test(code));
}

/**
 * Get code prefix (for branded codes, future feature)
 * @param code - Full referral code
 * @returns Code prefix (first 2 letters)
 */
export function getCodePrefix(code: string): string {
  const sanitized = sanitizeReferralCode(code);
  return sanitized ? sanitized.substring(0, 2) : '';
}

/**
 * Get code numeric suffix
 * @param code - Full referral code
 * @returns Numeric part (last 4 digits)
 */
export function getCodeSuffix(code: string): string {
  const sanitized = sanitizeReferralCode(code);
  return sanitized ? sanitized.substring(2) : '';
}

/**
 * Format code for display (with hyphen)
 * @param code - Raw code
 * @returns Formatted code (e.g., "AB-1234")
 */
export function formatReferralCodeForDisplay(code: string): string {
  const sanitized = sanitizeReferralCode(code);
  if (!sanitized) return '';

  const prefix = getCodePrefix(sanitized);
  const suffix = getCodeSuffix(sanitized);

  return `${prefix}-${suffix}`;
}

/**
 * Parse formatted display code back to standard format
 * @param formattedCode - Code with hyphen (e.g., "AB-1234")
 * @returns Standard code format or null if invalid
 */
export function parseFormattedCode(formattedCode: string): string | null {
  if (!formattedCode) return null;

  const cleaned = formattedCode.replace(/-/g, '').toUpperCase().trim();
  return isValidReferralCode(cleaned) ? cleaned : null;
}

/**
 * Generate test/demo referral codes
 * @returns Object with demo codes
 */
export function generateDemoCodes(): Record<string, string> {
  return {
    bronze: 'BC0001',
    silver: 'SL0002',
    gold: 'GD0003',
    test: 'TE9999',
  };
}

/**
 * Check if code looks like a demo/test code
 * @param code - Code to check
 * @returns Whether code appears to be demo
 */
export function isDemoCode(code: string): boolean {
  const demoPatterns = [/^TE/, /^9999$/, /^0000$/];
  const sanitized = sanitizeReferralCode(code);

  if (!sanitized) return false;

  return demoPatterns.some((pattern) => pattern.test(sanitized));
}

/**
 * Get referral code info
 * @param code - Referral code
 * @returns Info object with code details
 */
export function getReferralCodeInfo(code: string): {
  code: string;
  formatted: string;
  prefix: string;
  suffix: string;
  isValid: boolean;
  hasGoodEntropy: boolean;
  isDemo: boolean;
} {
  const sanitized = sanitizeReferralCode(code);
  const isValid = isValidReferralCode(code);

  return {
    code: sanitized || code,
    formatted: formatReferralCodeForDisplay(code),
    prefix: getCodePrefix(code),
    suffix: getCodeSuffix(code),
    isValid,
    hasGoodEntropy: isValid && hasGoodEntropy(sanitized || code),
    isDemo: isDemoCode(code),
  };
}

/**
 * Recovery function: Generate referral code based on user properties
 * Used when code is lost but user wants to find their code
 * @param email - User email
 * @param userId - User ID
 * @returns Deterministic code based on user info (for recovery purposes)
 */
export function generateRecoveryCode(email: string, userId: string): string {
  // For recovery, we need a deterministic approach based on existing data
  // This would be a hash of user data, but since codes are stored in DB,
  // this is mainly used for recovery workflows
  const suffix = userId.substring(0, 4).replace(/[^0-9]/g, '0') || '0000';
  const prefix = email.substring(0, 2).toUpperCase() || 'XX';

  return `${prefix}${suffix}`;
}
