import { describe, it, expect } from 'vitest';
import { isCheckinRegistration, isSponsorRegistration } from './typeGuards';
import { CheckinRegistration, SponsorRegistration } from '../types/api';

describe('typeGuards', () => {
  describe('isCheckinRegistration', () => {
    it('should return true for CheckinRegistration with type property', () => {
      const checkinReg: CheckinRegistration = {
        id: 123,
        name: 'John Doe',
        company: 'Acme Corp',
        token: 'abc123',
        type: 'Speaker',
        highlight: [],
        additional: [],
      };

      expect(isCheckinRegistration(checkinReg)).toBe(true);
    });

    it('should return false for SponsorRegistration without type property', () => {
      const sponsorReg: SponsorRegistration = {
        name: 'Jane Smith',
        company: 'Tech Inc',
        token: 'def456',
        email: 'jane@example.com',
        country: 'US',
        note: '',
        highlight: [],
      };

      expect(isCheckinRegistration(sponsorReg)).toBe(false);
    });

    it('should handle CheckinRegistration with all optional fields', () => {
      const checkinReg: CheckinRegistration = {
        id: 456,
        name: 'Alice Johnson',
        token: 'ghi789',
        type: 'Attendee',
        tshirt: 'L',
        partition: 'A',
        photoconsent: 'yes',
        policyconfirmed: 'yes',
        checkinmessage: 'Welcome!',
        highlight: ['name'],
        additional: ['Field 1', 'Field 2'],
        already: {
          title: 'Already Checked In',
          body: 'You checked in at 10:00 AM',
        },
      };

      expect(isCheckinRegistration(checkinReg)).toBe(true);
    });

    it('should narrow type correctly in TypeScript', () => {
      const reg: CheckinRegistration | SponsorRegistration = {
        id: 789,
        name: 'Bob Williams',
        company: null,
        token: 'jkl012',
        type: 'Volunteer',
        highlight: [],
        additional: [],
      };

      if (isCheckinRegistration(reg)) {
        // This should compile because TypeScript knows it's CheckinRegistration
        expect(reg.id).toBe(789);
        expect(reg.type).toBe('Volunteer');
      } else {
        // This branch shouldn't execute
        expect.fail('Should have been identified as CheckinRegistration');
      }
    });
  });

  describe('isSponsorRegistration', () => {
    it('should return true for SponsorRegistration without type property', () => {
      const sponsorReg: SponsorRegistration = {
        name: 'Sarah Connor',
        company: 'Cyberdyne',
        token: 'mno345',
        email: 'sarah@example.com',
        country: 'UK',
        note: 'Interested in product demo',
        highlight: [],
      };

      expect(isSponsorRegistration(sponsorReg)).toBe(true);
    });

    it('should return false for CheckinRegistration with type property', () => {
      const checkinReg: CheckinRegistration = {
        id: 999,
        name: 'Kyle Reese',
        token: 'pqr678',
        type: 'Speaker',
        highlight: [],
        additional: [],
      };

      expect(isSponsorRegistration(checkinReg)).toBe(false);
    });

    it('should handle SponsorRegistration with minimal fields', () => {
      const sponsorReg: SponsorRegistration = {
        name: 'Minimal Sponsor',
        token: 'stu901',
        note: '',
        highlight: [],
      };

      expect(isSponsorRegistration(sponsorReg)).toBe(true);
    });

    it('should narrow type correctly in TypeScript', () => {
      const reg: CheckinRegistration | SponsorRegistration = {
        name: 'Emma Watson',
        company: 'Magic Corp',
        token: 'vwx234',
        email: 'emma@example.com',
        country: 'FR',
        note: 'Looking for partnerships',
        highlight: [],
      };

      if (isSponsorRegistration(reg)) {
        // This should compile because TypeScript knows it's SponsorRegistration
        expect(reg.email).toBe('emma@example.com');
        expect(reg.note).toBe('Looking for partnerships');
      } else {
        // This branch shouldn't execute
        expect.fail('Should have been identified as SponsorRegistration');
      }
    });
  });

  describe('type guards are mutually exclusive', () => {
    it('should never return true for both guards on same object', () => {
      const checkinReg: CheckinRegistration = {
        id: 111,
        name: 'Test User',
        token: 'test123',
        type: 'Attendee',
        highlight: [],
        additional: [],
      };

      expect(isCheckinRegistration(checkinReg)).toBe(true);
      expect(isSponsorRegistration(checkinReg)).toBe(false);

      const sponsorReg: SponsorRegistration = {
        name: 'Test Sponsor',
        token: 'test456',
        note: '',
        highlight: [],
      };

      expect(isCheckinRegistration(sponsorReg)).toBe(false);
      expect(isSponsorRegistration(sponsorReg)).toBe(true);
    });
  });
});
