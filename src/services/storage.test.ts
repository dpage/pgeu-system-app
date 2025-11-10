import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { StorageService } from './storage';
import type { Conference } from '../types/conference';

// Mock Capacitor Preferences
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    keys: vi.fn(),
    migrate: vi.fn(),
  },
}));

describe('StorageService', () => {
  let service: StorageService;
  let mockStorage: Record<string, string>;

  const validConference: Conference = {
    id: 'test-conf-1',
    name: 'Test Conference',
    baseUrl: 'https://postgresql.eu',
    eventSlug: 'pgconfeu2024',
    token: 'a'.repeat(40),
    mode: 'checkin',
    fieldId: null,
    addedAt: Date.now(),
    lastUsedAt: Date.now(),
  };

  beforeEach(() => {
    // Reset service and mock storage
    service = new StorageService();
    mockStorage = {};

    // Mock Preferences implementation
    vi.mocked(Preferences.get).mockImplementation(async ({ key }) => {
      return { value: mockStorage[key] || null };
    });

    vi.mocked(Preferences.set).mockImplementation(async ({ key, value }) => {
      mockStorage[key] = value;
    });

    vi.mocked(Preferences.remove).mockImplementation(async ({ key }) => {
      delete mockStorage[key];
    });
  });

  describe('getConferences', () => {
    it('should return empty array when no conferences stored', async () => {
      const conferences = await service.getConferences();
      expect(conferences).toEqual([]);
    });

    it('should return stored conferences', async () => {
      mockStorage['conferences'] = JSON.stringify([validConference]);

      const conferences = await service.getConferences();
      expect(conferences).toHaveLength(1);
      expect(conferences[0]).toEqual(validConference);
    });

    it('should filter out invalid conferences', async () => {
      const invalidConf = { ...validConference, token: 'invalid' };
      mockStorage['conferences'] = JSON.stringify([validConference, invalidConf]);

      const conferences = await service.getConferences();
      expect(conferences).toHaveLength(1);
      expect(conferences[0].id).toBe(validConference.id);
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockStorage['conferences'] = 'invalid-json{';

      const conferences = await service.getConferences();
      expect(conferences).toEqual([]);
    });

    it('should return empty array on storage errors', async () => {
      vi.mocked(Preferences.get).mockRejectedValueOnce(new Error('Storage error'));

      const conferences = await service.getConferences();
      expect(conferences).toEqual([]);
    });
  });

  describe('saveConference', () => {
    it('should save valid conference', async () => {
      const result = await service.saveConference(validConference);

      expect(result).toBe(true);

      const conferences = await service.getConferences();
      expect(conferences).toHaveLength(1);
      expect(conferences[0]).toEqual(validConference);
    });

    it('should reject duplicate conference', async () => {
      await service.saveConference(validConference);

      const result = await service.saveConference(validConference);
      expect(result).toBe(false);

      const conferences = await service.getConferences();
      expect(conferences).toHaveLength(1);
    });

    it('should reject invalid conference', async () => {
      const invalidConf = { ...validConference, token: 'invalid' };

      await expect(service.saveConference(invalidConf)).rejects.toThrow('Invalid conference data');
    });

    it('should save multiple different conferences', async () => {
      const conf2 = { ...validConference, id: 'test-conf-2', name: 'Conference 2' };

      await service.saveConference(validConference);
      await service.saveConference(conf2);

      const conferences = await service.getConferences();
      expect(conferences).toHaveLength(2);
    });
  });

  describe('updateConference', () => {
    beforeEach(async () => {
      await service.saveConference(validConference);
    });

    it('should update existing conference', async () => {
      const result = await service.updateConference(validConference.id, {
        name: 'Updated Name',
      });

      expect(result).toBe(true);

      const conferences = await service.getConferences();
      expect(conferences[0].name).toBe('Updated Name');
    });

    it('should return false for non-existent conference', async () => {
      const result = await service.updateConference('non-existent', {
        name: 'Updated',
      });

      expect(result).toBe(false);
    });

    it('should reject update that makes conference invalid', async () => {
      await expect(
        service.updateConference(validConference.id, {
          token: 'invalid',
        })
      ).rejects.toThrow('Updated conference data is invalid');
    });

    it('should update lastUsedAt', async () => {
      const originalTime = validConference.lastUsedAt;
      const newTime = Date.now() + 10000;

      await service.updateConference(validConference.id, {
        lastUsedAt: newTime,
      });

      const conferences = await service.getConferences();
      expect(conferences[0].lastUsedAt).toBe(newTime);
      expect(conferences[0].lastUsedAt).not.toBe(originalTime);
    });
  });

  describe('deleteConference', () => {
    beforeEach(async () => {
      await service.saveConference(validConference);
    });

    it('should delete existing conference', async () => {
      const result = await service.deleteConference(validConference.id);

      expect(result).toBe(true);

      const conferences = await service.getConferences();
      expect(conferences).toHaveLength(0);
    });

    it('should return false for non-existent conference', async () => {
      const result = await service.deleteConference('non-existent');
      expect(result).toBe(false);
    });

    it('should clear active conference if deleted', async () => {
      await service.setActiveConferenceId(validConference.id);

      await service.deleteConference(validConference.id);

      const activeId = await service.getActiveConferenceId();
      expect(activeId).toBeNull();
    });

    it('should not affect other conferences', async () => {
      const conf2 = { ...validConference, id: 'test-conf-2' };
      await service.saveConference(conf2);

      await service.deleteConference(validConference.id);

      const conferences = await service.getConferences();
      expect(conferences).toHaveLength(1);
      expect(conferences[0].id).toBe(conf2.id);
    });
  });

  describe('getConference', () => {
    beforeEach(async () => {
      await service.saveConference(validConference);
    });

    it('should return conference by ID', async () => {
      const conference = await service.getConference(validConference.id);

      expect(conference).not.toBeNull();
      expect(conference?.id).toBe(validConference.id);
    });

    it('should return null for non-existent ID', async () => {
      const conference = await service.getConference('non-existent');
      expect(conference).toBeNull();
    });
  });

  describe('touchConference', () => {
    beforeEach(async () => {
      await service.saveConference(validConference);
    });

    it('should update lastUsedAt timestamp', async () => {
      const beforeTime = Date.now();
      const result = await service.touchConference(validConference.id);

      expect(result).toBe(true);

      const conferences = await service.getConferences();
      expect(conferences[0].lastUsedAt).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should return false for non-existent conference', async () => {
      const result = await service.touchConference('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getActiveConferenceId', () => {
    it('should return null when no active conference', async () => {
      const id = await service.getActiveConferenceId();
      expect(id).toBeNull();
    });

    it('should return stored active conference ID', async () => {
      mockStorage['activeConferenceId'] = 'test-id';

      const id = await service.getActiveConferenceId();
      expect(id).toBe('test-id');
    });

    it('should handle storage errors gracefully', async () => {
      vi.mocked(Preferences.get).mockRejectedValueOnce(new Error('Storage error'));

      const id = await service.getActiveConferenceId();
      expect(id).toBeNull();
    });
  });

  describe('setActiveConferenceId', () => {
    beforeEach(async () => {
      await service.saveConference(validConference);
    });

    it('should set active conference ID', async () => {
      await service.setActiveConferenceId(validConference.id);

      const id = await service.getActiveConferenceId();
      expect(id).toBe(validConference.id);
    });

    it('should update lastUsedAt when setting active', async () => {
      const beforeTime = Date.now();

      await service.setActiveConferenceId(validConference.id);

      const conferences = await service.getConferences();
      expect(conferences[0].lastUsedAt).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should remove active conference when set to null', async () => {
      await service.setActiveConferenceId(validConference.id);
      await service.setActiveConferenceId(null);

      const id = await service.getActiveConferenceId();
      expect(id).toBeNull();
    });

    it('should propagate storage errors', async () => {
      vi.mocked(Preferences.set).mockRejectedValueOnce(new Error('Storage error'));

      await expect(service.setActiveConferenceId('test-id')).rejects.toThrow('Storage error');
    });
  });

  describe('getActiveConference', () => {
    beforeEach(async () => {
      await service.saveConference(validConference);
    });

    it('should return active conference object', async () => {
      await service.setActiveConferenceId(validConference.id);

      const conference = await service.getActiveConference();
      expect(conference).not.toBeNull();
      expect(conference?.id).toBe(validConference.id);
    });

    it('should return null when no active conference', async () => {
      const conference = await service.getActiveConference();
      expect(conference).toBeNull();
    });

    it('should return null when active conference does not exist', async () => {
      await service.setActiveConferenceId('non-existent');

      const conference = await service.getActiveConference();
      expect(conference).toBeNull();
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await service.saveConference(validConference);
      await service.setActiveConferenceId(validConference.id);
    });

    it('should clear all stored data', async () => {
      await service.clear();

      const conferences = await service.getConferences();
      expect(conferences).toHaveLength(0);

      const activeId = await service.getActiveConferenceId();
      expect(activeId).toBeNull();
    });

    it('should allow saving after clearing', async () => {
      await service.clear();
      await service.saveConference(validConference);

      const conferences = await service.getConferences();
      expect(conferences).toHaveLength(1);
    });
  });
});
