/**
 * QR Code Token Validation Utilities
 * Handles parsing and validation of pgeu-system QR codes
 */

import type { ParsedQRCode, TokenType } from '../types/scanner';
import type { ScanningMode } from '../types/conference';

const TEST_TOKEN = 'TESTTESTTESTTEST';

/**
 * QR code format patterns
 *
 * Simple format:
 * - ID$<token>$ID  (check-in)
 * - AT$<token>$AT  (sponsor/field badge)
 *
 * URL format:
 * - https://{domain}/t/id/{token}/
 * - https://{domain}/t/at/{token}/
 */
const SIMPLE_ID_PATTERN = /^ID\$([a-z0-9]+)\$ID$/i;
const SIMPLE_AT_PATTERN = /^AT\$([a-z0-9]+)\$AT$/i;
const URL_PATTERN = /^https?:\/\/[^/]+\/t\/(id|at)\/([a-z0-9]+)\/$/i;

/**
 * Valid token pattern (40-64 hex characters or TEST token)
 */
const TOKEN_PATTERN = /^([a-f0-9]{40,64}|TESTTESTTESTTEST)$/i;

/**
 * Parse a QR code string into structured format
 *
 * @param rawContent - The scanned QR code content
 * @returns Parsed QR code object or null if invalid
 */
export function parseQRCode(rawContent: string): ParsedQRCode | null {
  if (!rawContent || typeof rawContent !== 'string') {
    return null;
  }

  const trimmed = rawContent.trim();

  // Try simple format first (most common)
  const simpleIdMatch = trimmed.match(SIMPLE_ID_PATTERN);
  if (simpleIdMatch) {
    const token = simpleIdMatch[1];
    if (!TOKEN_PATTERN.test(token)) {
      return null;
    }
    return {
      rawContent: trimmed,
      tokenType: 'ID',
      token: token.toLowerCase(),
      isTestToken: token.toUpperCase() === TEST_TOKEN,
      format: 'simple',
    };
  }

  const simpleAtMatch = trimmed.match(SIMPLE_AT_PATTERN);
  if (simpleAtMatch) {
    const token = simpleAtMatch[1];
    if (!TOKEN_PATTERN.test(token)) {
      return null;
    }
    return {
      rawContent: trimmed,
      tokenType: 'AT',
      token: token.toLowerCase(),
      isTestToken: token.toUpperCase() === TEST_TOKEN,
      format: 'simple',
    };
  }

  // Try URL format
  const urlMatch = trimmed.match(URL_PATTERN);
  if (urlMatch) {
    const tokenType = urlMatch[1].toUpperCase() as TokenType;
    const token = urlMatch[2];
    if (!TOKEN_PATTERN.test(token)) {
      return null;
    }
    return {
      rawContent: trimmed,
      tokenType,
      token: token.toLowerCase(),
      isTestToken: token.toUpperCase() === TEST_TOKEN,
      format: 'url',
    };
  }

  // Not a valid pgeu-system QR code
  return null;
}

/**
 * Get expected token type for a scanning mode
 *
 * @param mode - Conference scanning mode
 * @returns Expected token type
 */
export function getExpectedTokenType(mode: ScanningMode): TokenType {
  switch (mode) {
    case 'checkin':
      return 'ID';
    case 'sponsor':
    case 'field':
      return 'AT';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Validate that a parsed QR code matches the expected token type
 *
 * @param parsedCode - Parsed QR code
 * @param expectedType - Expected token type
 * @returns True if valid, false otherwise
 */
export function validateTokenType(
  parsedCode: ParsedQRCode,
  expectedType: TokenType
): boolean {
  // Test tokens are valid for any mode
  if (parsedCode.isTestToken) {
    return true;
  }

  return parsedCode.tokenType === expectedType;
}

/**
 * Get user-friendly token type name
 *
 * @param tokenType - Token type
 * @returns Display name
 */
export function getTokenTypeName(tokenType: TokenType): string {
  switch (tokenType) {
    case 'ID':
      return 'ticket';
    case 'AT':
      return 'badge';
    default:
      return 'code';
  }
}

/**
 * Get error message for wrong token type
 *
 * @param scannedType - The token type that was scanned
 * @param expectedType - The token type that was expected
 * @returns Error message
 */
export function getWrongTokenTypeMessage(
  scannedType: TokenType,
  expectedType: TokenType
): string {
  const scannedName = getTokenTypeName(scannedType);
  const expectedName = getTokenTypeName(expectedType);

  return `You have scanned a ${scannedName}. For this scanning mode, you must scan the ${expectedName}, not the ${scannedName}.`;
}

/**
 * Validate and parse QR code for a specific scanning mode
 *
 * @param rawContent - Raw QR code content
 * @param mode - Conference scanning mode
 * @returns Object with parsed code or error
 */
export function validateQRCodeForMode(
  rawContent: string,
  mode: ScanningMode
): { valid: true; parsedCode: ParsedQRCode } | { valid: false; error: string } {
  const parsedCode = parseQRCode(rawContent);

  if (!parsedCode) {
    return {
      valid: false,
      error: 'The scanned code is not a valid conference QR code.',
    };
  }

  const expectedType = getExpectedTokenType(mode);

  if (!validateTokenType(parsedCode, expectedType)) {
    return {
      valid: false,
      error: getWrongTokenTypeMessage(parsedCode.tokenType, expectedType),
    };
  }

  return { valid: true, parsedCode };
}
