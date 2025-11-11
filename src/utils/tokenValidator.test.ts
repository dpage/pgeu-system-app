/**
 * Token Validator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseQRCode,
  getExpectedTokenType,
  validateTokenType,
  getTokenTypeName,
  getWrongTokenTypeMessage,
  validateQRCodeForMode,
} from './tokenValidator';

describe('parseQRCode', () => {
  describe('simple ID format', () => {
    it('should parse valid ID token', () => {
      const result = parseQRCode('ID$abcdef1234567890abcdef1234567890abcdef12$ID');

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('ID');
      expect(result?.token).toBe('abcdef1234567890abcdef1234567890abcdef12');
      expect(result?.isTestToken).toBe(false);
      expect(result?.format).toBe('simple');
    });

    it('should parse test ID token', () => {
      const result = parseQRCode('ID$TESTTESTTESTTEST$ID');

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('ID');
      expect(result?.token).toBe('testtesttesttest');
      expect(result?.isTestToken).toBe(true);
      expect(result?.format).toBe('simple');
    });

    it('should handle case insensitive ID wrapper', () => {
      const result = parseQRCode('id$abcdef1234567890abcdef1234567890abcdef12$id');

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('ID');
    });

    it('should reject ID token with invalid characters', () => {
      const result = parseQRCode('ID$INVALID-TOKEN-WITH-DASHES$ID');
      expect(result).toBeNull();
    });

    it('should reject ID token with wrong length', () => {
      const result = parseQRCode('ID$abc$ID');
      expect(result).toBeNull();
    });
  });

  describe('simple AT format', () => {
    it('should parse valid AT token', () => {
      const result = parseQRCode('AT$abcdef1234567890abcdef1234567890abcdef12$AT');

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('AT');
      expect(result?.token).toBe('abcdef1234567890abcdef1234567890abcdef12');
      expect(result?.isTestToken).toBe(false);
      expect(result?.format).toBe('simple');
    });

    it('should parse test AT token', () => {
      const result = parseQRCode('AT$TESTTESTTESTTEST$AT');

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('AT');
      expect(result?.isTestToken).toBe(true);
    });

    it('should handle case insensitive AT wrapper', () => {
      const result = parseQRCode('at$abcdef1234567890abcdef1234567890abcdef12$at');

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('AT');
    });
  });

  describe('URL format', () => {
    it('should parse URL ID token', () => {
      const result = parseQRCode(
        'https://postgresql.eu/t/id/abcdef1234567890abcdef1234567890abcdef12/'
      );

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('ID');
      expect(result?.token).toBe('abcdef1234567890abcdef1234567890abcdef12');
      expect(result?.format).toBe('url');
    });

    it('should parse URL AT token', () => {
      const result = parseQRCode(
        'https://postgresql.eu/t/at/abcdef1234567890abcdef1234567890abcdef12/'
      );

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('AT');
      expect(result?.token).toBe('abcdef1234567890abcdef1234567890abcdef12');
      expect(result?.format).toBe('url');
    });

    it('should handle HTTP (not just HTTPS)', () => {
      const result = parseQRCode(
        'http://localhost/t/id/abcdef1234567890abcdef1234567890abcdef12/'
      );

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('ID');
    });

    it('should handle different domains', () => {
      const result = parseQRCode(
        'https://postgresql.us/t/id/abcdef1234567890abcdef1234567890abcdef12/'
      );

      expect(result).not.toBeNull();
    });

    it('should parse URL test token', () => {
      const result = parseQRCode('https://postgresql.eu/t/id/TESTTESTTESTTEST/');

      expect(result).not.toBeNull();
      expect(result?.isTestToken).toBe(true);
    });

    it('should reject URL without trailing slash', () => {
      const result = parseQRCode(
        'https://postgresql.eu/t/id/abcdef1234567890abcdef1234567890abcdef12'
      );

      expect(result).toBeNull();
    });
  });

  describe('invalid inputs', () => {
    it('should reject null', () => {
      const result = parseQRCode(null as any);
      expect(result).toBeNull();
    });

    it('should reject undefined', () => {
      const result = parseQRCode(undefined as any);
      expect(result).toBeNull();
    });

    it('should reject empty string', () => {
      const result = parseQRCode('');
      expect(result).toBeNull();
    });

    it('should reject random text', () => {
      const result = parseQRCode('This is not a QR code');
      expect(result).toBeNull();
    });

    it('should reject mismatched delimiters', () => {
      const result = parseQRCode('ID$abcdef1234567890abcdef1234567890abcdef12$AT');
      expect(result).toBeNull();
    });

    it('should reject URL with wrong path', () => {
      const result = parseQRCode(
        'https://postgresql.eu/wrong/path/abcdef1234567890abcdef1234567890abcdef12/'
      );
      expect(result).toBeNull();
    });
  });

  describe('whitespace handling', () => {
    it('should trim leading whitespace', () => {
      const result = parseQRCode('  ID$abcdef1234567890abcdef1234567890abcdef12$ID');

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('ID');
    });

    it('should trim trailing whitespace', () => {
      const result = parseQRCode('ID$abcdef1234567890abcdef1234567890abcdef12$ID  ');

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('ID');
    });

    it('should trim both leading and trailing whitespace', () => {
      const result = parseQRCode('  ID$abcdef1234567890abcdef1234567890abcdef12$ID  ');

      expect(result).not.toBeNull();
      expect(result?.tokenType).toBe('ID');
    });
  });
});

describe('getExpectedTokenType', () => {
  it('should return ID for checkin mode', () => {
    expect(getExpectedTokenType('checkin')).toBe('ID');
  });

  it('should return AT for sponsor mode', () => {
    expect(getExpectedTokenType('sponsor')).toBe('AT');
  });

  it('should return AT for field mode', () => {
    expect(getExpectedTokenType('field')).toBe('AT');
  });
});

describe('validateTokenType', () => {
  const idToken = parseQRCode('ID$abcdef1234567890abcdef1234567890abcdef12$ID')!;
  const atToken = parseQRCode('AT$abcdef1234567890abcdef1234567890abcdef12$AT')!;
  const testIdToken = parseQRCode('ID$TESTTESTTESTTEST$ID')!;
  const testAtToken = parseQRCode('AT$TESTTESTTESTTEST$AT')!;

  it('should accept matching ID token', () => {
    expect(validateTokenType(idToken, 'ID')).toBe(true);
  });

  it('should accept matching AT token', () => {
    expect(validateTokenType(atToken, 'AT')).toBe(true);
  });

  it('should reject mismatched ID token', () => {
    expect(validateTokenType(idToken, 'AT')).toBe(false);
  });

  it('should reject mismatched AT token', () => {
    expect(validateTokenType(atToken, 'ID')).toBe(false);
  });

  it('should accept test ID token for any type', () => {
    expect(validateTokenType(testIdToken, 'ID')).toBe(true);
    expect(validateTokenType(testIdToken, 'AT')).toBe(true);
  });

  it('should accept test AT token for any type', () => {
    expect(validateTokenType(testAtToken, 'ID')).toBe(true);
    expect(validateTokenType(testAtToken, 'AT')).toBe(true);
  });
});

describe('getTokenTypeName', () => {
  it('should return "ticket" for ID', () => {
    expect(getTokenTypeName('ID')).toBe('ticket');
  });

  it('should return "badge" for AT', () => {
    expect(getTokenTypeName('AT')).toBe('badge');
  });

  it('should return "code" for UNKNOWN', () => {
    expect(getTokenTypeName('UNKNOWN')).toBe('code');
  });
});

describe('getWrongTokenTypeMessage', () => {
  it('should create message for ID scanned when AT expected', () => {
    const message = getWrongTokenTypeMessage('ID', 'AT');

    expect(message).toContain('ticket');
    expect(message).toContain('badge');
    expect(message).toContain('must scan');
  });

  it('should create message for AT scanned when ID expected', () => {
    const message = getWrongTokenTypeMessage('AT', 'ID');

    expect(message).toContain('badge');
    expect(message).toContain('ticket');
    expect(message).toContain('must scan');
  });
});

describe('validateQRCodeForMode', () => {
  const validIdCode = 'ID$abcdef1234567890abcdef1234567890abcdef12$ID';
  const validAtCode = 'AT$abcdef1234567890abcdef1234567890abcdef12$AT';
  const testCode = 'ID$TESTTESTTESTTEST$ID';
  const invalidCode = 'INVALID_QR_CODE';

  describe('checkin mode', () => {
    it('should accept ID token', () => {
      const result = validateQRCodeForMode(validIdCode, 'checkin');

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsedCode.tokenType).toBe('ID');
      }
    });

    it('should reject AT token', () => {
      const result = validateQRCodeForMode(validAtCode, 'checkin');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('badge');
        expect(result.error).toContain('ticket');
      }
    });

    it('should accept test token', () => {
      const result = validateQRCodeForMode(testCode, 'checkin');

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsedCode.isTestToken).toBe(true);
      }
    });

    it('should reject invalid code', () => {
      const result = validateQRCodeForMode(invalidCode, 'checkin');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('not a valid');
      }
    });
  });

  describe('sponsor mode', () => {
    it('should accept AT token', () => {
      const result = validateQRCodeForMode(validAtCode, 'sponsor');

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsedCode.tokenType).toBe('AT');
      }
    });

    it('should reject ID token', () => {
      const result = validateQRCodeForMode(validIdCode, 'sponsor');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('ticket');
        expect(result.error).toContain('badge');
      }
    });

    it('should accept test token', () => {
      const result = validateQRCodeForMode(testCode, 'sponsor');

      expect(result.valid).toBe(true);
    });
  });

  describe('field mode', () => {
    it('should accept AT token', () => {
      const result = validateQRCodeForMode(validAtCode, 'field');

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.parsedCode.tokenType).toBe('AT');
      }
    });

    it('should reject ID token', () => {
      const result = validateQRCodeForMode(validIdCode, 'field');

      expect(result.valid).toBe(false);
    });

    it('should accept test token', () => {
      const result = validateQRCodeForMode(testCode, 'field');

      expect(result.valid).toBe(true);
    });
  });
});
