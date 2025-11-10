import { describe, it, expect } from 'vitest';
import {
  parseConferenceUrl,
  isValidDomain,
  isValidToken,
  generateConferenceId,
  generateConferenceName,
  createConferenceFromUrl,
  validateConference,
} from './conferenceParser';
import type { Conference, ParsedConferenceUrl } from '../types/conference';

describe('conferenceParser', () => {
  describe('isValidDomain', () => {
    it('should accept non-empty domain', () => {
      expect(isValidDomain('postgresql.eu')).toBe(true);
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('localhost')).toBe(true);
    });

    it('should reject empty domain', () => {
      expect(isValidDomain('')).toBe(false);
    });
  });

  describe('isValidToken', () => {
    it('should accept 40 character hex token', () => {
      expect(isValidToken('a'.repeat(40))).toBe(true);
      expect(isValidToken('1234567890abcdef'.repeat(2) + '12345678')).toBe(true);
    });

    it('should accept 64 character hex token', () => {
      expect(isValidToken('a'.repeat(64))).toBe(true);
    });

    it('should reject tokens with invalid length', () => {
      expect(isValidToken('a'.repeat(39))).toBe(false);
      expect(isValidToken('a'.repeat(65))).toBe(false);
    });

    it('should reject tokens with invalid characters', () => {
      expect(isValidToken('z'.repeat(40))).toBe(false); // 'z' is not hex
      expect(isValidToken('g'.repeat(40))).toBe(false); // 'g' is not hex
      expect(isValidToken('A'.repeat(40))).toBe(false); // uppercase not allowed
      expect(isValidToken('!'.repeat(40))).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidToken('')).toBe(false);
    });
  });

  describe('parseConferenceUrl - Check-in Mode', () => {
    const validToken = 'a'.repeat(40);

    it('should parse valid check-in URL', () => {
      const url = `https://postgresql.eu/events/pgconfeu2024/checkin/${validToken}/`;
      const result = parseConferenceUrl(url);

      expect(result).toEqual({
        baseUrl: 'https://postgresql.eu',
        eventSlug: 'pgconfeu2024',
        token: validToken,
        mode: 'checkin',
        fieldId: null,
      });
    });

    it('should parse check-in URL without trailing slash', () => {
      const url = `https://postgresql.eu/events/pgconfeu2024/checkin/${validToken}`;
      const result = parseConferenceUrl(url);

      expect(result).not.toBeNull();
      expect(result?.mode).toBe('checkin');
    });

    it('should parse check-in URL with http protocol', () => {
      const url = `http://localhost/events/test/checkin/${validToken}/`;
      const result = parseConferenceUrl(url);

      expect(result).toEqual({
        baseUrl: 'https://localhost',
        eventSlug: 'test',
        token: validToken,
        mode: 'checkin',
        fieldId: null,
      });
    });

    it('should reject invalid check-in URL patterns', () => {
      expect(parseConferenceUrl('https://postgresql.eu/invalid/path/')).toBeNull();
      expect(parseConferenceUrl('https://postgresql.eu/events/checkin/')).toBeNull();
      expect(parseConferenceUrl('not-a-url')).toBeNull();
      expect(parseConferenceUrl('')).toBeNull();
    });

    it('should reject check-in URL with invalid token', () => {
      const shortToken = 'a'.repeat(39);
      const url = `https://postgresql.eu/events/test/checkin/${shortToken}/`;
      expect(parseConferenceUrl(url)).toBeNull();
    });
  });

  describe('parseConferenceUrl - Field Check-in Mode', () => {
    const validToken = 'b'.repeat(40);

    it('should parse field check-in URL with numeric field ID', () => {
      const url = `https://postgresql.us/events/pgconfus2024/checkin/${validToken}/f123/`;
      const result = parseConferenceUrl(url);

      expect(result).toEqual({
        baseUrl: 'https://postgresql.us',
        eventSlug: 'pgconfus2024',
        token: validToken,
        mode: 'field',
        fieldId: 123,
      });
    });

    it('should parse field check-in URL with named field ID', () => {
      const url = `https://postgresql.us/events/pgconfus2024/checkin/${validToken}/ftshirt/`;
      const result = parseConferenceUrl(url);

      expect(result).toEqual({
        baseUrl: 'https://postgresql.us',
        eventSlug: 'pgconfus2024',
        token: validToken,
        mode: 'field',
        fieldId: 'tshirt',
      });
    });

    it('should prioritize field check-in pattern over regular check-in', () => {
      const url = `https://postgresql.eu/events/test/checkin/${validToken}/f1/`;
      const result = parseConferenceUrl(url);

      expect(result?.mode).toBe('field');
      expect(result?.fieldId).toBe(1);
    });

    it('should reject field check-in URL with invalid field ID', () => {
      // Field ID with uppercase letters
      const url = `https://postgresql.eu/events/test/checkin/${validToken}/fTSHIRT/`;
      expect(parseConferenceUrl(url)).toBeNull();
    });
  });

  describe('parseConferenceUrl - Sponsor Mode', () => {
    const validToken = 'c'.repeat(40);

    it('should parse valid sponsor scanning URL', () => {
      const url = `https://pgevents.ca/events/sponsor/scanning/${validToken}/`;
      const result = parseConferenceUrl(url);

      expect(result).toEqual({
        baseUrl: 'https://pgevents.ca',
        eventSlug: null,
        token: validToken,
        mode: 'sponsor',
        fieldId: null,
      });
    });

    it('should parse sponsor URL without trailing slash', () => {
      const url = `https://pgevents.ca/events/sponsor/scanning/${validToken}`;
      const result = parseConferenceUrl(url);

      expect(result).not.toBeNull();
      expect(result?.mode).toBe('sponsor');
    });
  });

  describe('generateConferenceId', () => {
    it('should generate unique ID for check-in conference', () => {
      const parsed: ParsedConferenceUrl = {
        baseUrl: 'https://postgresql.eu',
        eventSlug: 'pgconfeu2024',
        token: 'a'.repeat(40),
        mode: 'checkin',
        fieldId: null,
      };

      const id = generateConferenceId(parsed);

      expect(id).toContain('postgresql.eu');
      expect(id).toContain('pgconfeu2024');
      expect(id).toContain('checkin');
      expect(id).toContain('aaaaaaaa'); // First 8 chars of token
    });

    it('should generate unique ID for field check-in', () => {
      const parsed: ParsedConferenceUrl = {
        baseUrl: 'https://postgresql.eu',
        eventSlug: 'pgconfeu2024',
        token: 'b'.repeat(40),
        mode: 'field',
        fieldId: 123,
      };

      const id = generateConferenceId(parsed);

      expect(id).toContain('123');
      expect(id).toContain('field');
    });

    it('should generate unique ID for sponsor mode', () => {
      const parsed: ParsedConferenceUrl = {
        baseUrl: 'https://postgresql.eu',
        eventSlug: null,
        token: 'c'.repeat(40),
        mode: 'sponsor',
        fieldId: null,
      };

      const id = generateConferenceId(parsed);

      expect(id).toContain('sponsor');
      expect(id).toContain('cccccccc'); // First 8 chars of token
    });

    it('should generate different IDs for different conferences', () => {
      const parsed1: ParsedConferenceUrl = {
        baseUrl: 'https://postgresql.eu',
        eventSlug: 'conf1',
        token: 'a'.repeat(40),
        mode: 'checkin',
        fieldId: null,
      };

      const parsed2: ParsedConferenceUrl = {
        baseUrl: 'https://postgresql.eu',
        eventSlug: 'conf2',
        token: 'a'.repeat(40),
        mode: 'checkin',
        fieldId: null,
      };

      expect(generateConferenceId(parsed1)).not.toBe(generateConferenceId(parsed2));
    });
  });

  describe('generateConferenceName', () => {
    it('should return "Sponsor Scanning" for sponsor mode', () => {
      const parsed: ParsedConferenceUrl = {
        baseUrl: 'https://postgresql.eu',
        eventSlug: null,
        token: 'a'.repeat(40),
        mode: 'sponsor',
        fieldId: null,
      };

      expect(generateConferenceName(parsed)).toBe('Sponsor Scanning');
    });

    it('should return event slug for check-in mode', () => {
      const parsed: ParsedConferenceUrl = {
        baseUrl: 'https://postgresql.eu',
        eventSlug: 'pgconfeu2024',
        token: 'a'.repeat(40),
        mode: 'checkin',
        fieldId: null,
      };

      expect(generateConferenceName(parsed)).toBe('pgconfeu2024');
    });

    it('should return event slug for field check-in mode', () => {
      const parsed: ParsedConferenceUrl = {
        baseUrl: 'https://postgresql.eu',
        eventSlug: 'pgconfeu2024',
        token: 'a'.repeat(40),
        mode: 'field',
        fieldId: 1,
      };

      expect(generateConferenceName(parsed)).toBe('pgconfeu2024');
    });

    it('should return "Event" if eventSlug is null', () => {
      const parsed: ParsedConferenceUrl = {
        baseUrl: 'https://postgresql.eu',
        eventSlug: null,
        token: 'a'.repeat(40),
        mode: 'checkin',
        fieldId: null,
      };

      expect(generateConferenceName(parsed)).toBe('Event');
    });
  });

  describe('createConferenceFromUrl', () => {
    it('should create valid Conference object from check-in URL', () => {
      const url = `https://postgresql.eu/events/pgconfeu2024/checkin/${'a'.repeat(40)}/`;
      const conference = createConferenceFromUrl(url);

      expect(conference).not.toBeNull();
      expect(conference?.name).toBe('pgconfeu2024');
      expect(conference?.mode).toBe('checkin');
      expect(conference?.baseUrl).toBe('https://postgresql.eu');
      expect(conference?.addedAt).toBeGreaterThan(0);
      expect(conference?.lastUsedAt).toBe(conference?.addedAt);
    });

    it('should return null for invalid URL', () => {
      expect(createConferenceFromUrl('invalid-url')).toBeNull();
      expect(createConferenceFromUrl('')).toBeNull();
    });

    it('should create conference with field ID', () => {
      const url = `https://postgresql.eu/events/test/checkin/${'a'.repeat(40)}/f5/`;
      const conference = createConferenceFromUrl(url);

      expect(conference?.fieldId).toBe(5);
      expect(conference?.mode).toBe('field');
    });
  });

  describe('validateConference', () => {
    const validConference: Conference = {
      id: 'test-id',
      name: 'Test Conference',
      baseUrl: 'https://postgresql.eu',
      eventSlug: 'test',
      token: 'a'.repeat(40),
      mode: 'checkin',
      fieldId: null,
      addedAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    it('should validate correct conference', () => {
      expect(validateConference(validConference)).toBe(true);
    });

    it('should reject conference with missing required fields', () => {
      expect(validateConference({ ...validConference, id: '' })).toBe(false);
      expect(validateConference({ ...validConference, name: '' })).toBe(false);
      expect(validateConference({ ...validConference, baseUrl: '' })).toBe(false);
      expect(validateConference({ ...validConference, token: '' })).toBe(false);
    });

    it('should reject conference with invalid token', () => {
      const shortToken = { ...validConference, token: 'too-short' };
      expect(validateConference(shortToken)).toBe(false);

      const invalidChars = { ...validConference, token: 'Z'.repeat(40) };
      expect(validateConference(invalidChars)).toBe(false);
    });

    it('should reject conference with invalid mode', () => {
      const invalidMode = { ...validConference, mode: 'invalid' as any };
      expect(validateConference(invalidMode)).toBe(false);
    });

    it('should validate field check-in with numeric field ID', () => {
      const fieldConf = { ...validConference, mode: 'field' as const, fieldId: 5 };
      expect(validateConference(fieldConf)).toBe(true);
    });

    it('should validate field check-in with string field ID', () => {
      const fieldConf = { ...validConference, mode: 'field' as const, fieldId: 'tshirt' };
      expect(validateConference(fieldConf)).toBe(true);
    });

    it('should reject field check-in without field ID', () => {
      const fieldConf = { ...validConference, mode: 'field' as const, fieldId: null };
      expect(validateConference(fieldConf)).toBe(false);
    });

    it('should reject field check-in with invalid numeric field ID', () => {
      const fieldConf = { ...validConference, mode: 'field' as const, fieldId: 0 };
      expect(validateConference(fieldConf)).toBe(false);

      const negativeConf = { ...validConference, mode: 'field' as const, fieldId: -1 };
      expect(validateConference(negativeConf)).toBe(false);
    });

    it('should reject field check-in with empty string field ID', () => {
      const fieldConf = { ...validConference, mode: 'field' as const, fieldId: '' };
      expect(validateConference(fieldConf)).toBe(false);
    });

    it('should reject check-in without event slug', () => {
      const noSlug = { ...validConference, eventSlug: null };
      expect(validateConference(noSlug)).toBe(false);
    });

    it('should reject field check-in without event slug', () => {
      const noSlug = { ...validConference, mode: 'field' as const, fieldId: 1, eventSlug: null };
      expect(validateConference(noSlug)).toBe(false);
    });

    it('should validate sponsor mode without event slug', () => {
      const sponsor = { ...validConference, mode: 'sponsor' as const, eventSlug: null };
      expect(validateConference(sponsor)).toBe(true);
    });
  });
});
