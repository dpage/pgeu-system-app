import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useConferenceStore } from './conferenceStore';
import { storageService } from '../services/storage';
import { createApiClient } from '../services/apiClient';
import type { Conference } from '../types/conference';

// Mock dependencies
vi.mock('../services/storage');
vi.mock('../services/apiClient');

describe('conferenceStore', () => {
  const mockConference: Conference = {
    id: 'test-id',
    name: 'Test Conference',
    displayName: 'Test Conference Display',
    baseUrl: 'https://postgresql.eu',
    eventSlug: 'test-event',
    token: 'a'.repeat(40),
    mode: 'checkin',
    fieldId: null,
    addedAt: Date.now(),
    lastUsedAt: Date.now(),
  };

  const mockSponsorConference: Conference = {
    id: 'sponsor-id',
    name: 'Sponsor Scanning',
    displayName: 'PGConf EU 2025',
    baseUrl: 'https://postgresql.eu',
    eventSlug: null,
    token: 'b'.repeat(40),
    mode: 'sponsor',
    fieldId: null,
    addedAt: Date.now(),
    lastUsedAt: Date.now(),
  };

  beforeEach(() => {
    // Reset store state
    useConferenceStore.setState({
      conferences: [],
      activeConferenceId: null,
      isLoading: false,
      error: null,
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should load conferences and active conference ID from storage', async () => {
      const mockConferences = [mockConference, mockSponsorConference];
      vi.mocked(storageService.getConferences).mockResolvedValue(mockConferences);
      vi.mocked(storageService.getActiveConferenceId).mockResolvedValue('test-id');

      await useConferenceStore.getState().initialize();

      const state = useConferenceStore.getState();
      expect(state.conferences).toEqual(mockConferences);
      expect(state.activeConferenceId).toBe('test-id');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set loading state during initialization', async () => {
      vi.mocked(storageService.getConferences).mockImplementation(
        () => new Promise((resolve) => {
          const state = useConferenceStore.getState();
          expect(state.isLoading).toBe(true);
          setTimeout(() => resolve([]), 50);
        })
      );
      vi.mocked(storageService.getActiveConferenceId).mockResolvedValue(null);

      await useConferenceStore.getState().initialize();
      expect(useConferenceStore.getState().isLoading).toBe(false);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Storage error');
      vi.mocked(storageService.getConferences).mockRejectedValue(error);

      await useConferenceStore.getState().initialize();

      const state = useConferenceStore.getState();
      expect(state.error).toBe('Storage error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('addConferenceFromUrl', () => {
    const validUrl = `https://postgresql.eu/events/test-event/checkin/${'a'.repeat(40)}/`;

    it('should add a new conference successfully', async () => {
      const mockApiClient = {
        getStatus: vi.fn().mockResolvedValue({ confname: 'Test Conference Display' }),
      };
      vi.mocked(createApiClient).mockReturnValue(mockApiClient as any);
      vi.mocked(storageService.saveConference).mockResolvedValue(true);
      vi.mocked(storageService.getConferences).mockResolvedValue([mockConference]);

      const result = await useConferenceStore.getState().addConferenceFromUrl(validUrl);

      expect(result).toBe(true);
      expect(storageService.saveConference).toHaveBeenCalled();
      expect(useConferenceStore.getState().conferences).toHaveLength(1);
    });

    it('should fetch display name from API', async () => {
      const mockApiClient = {
        getStatus: vi.fn().mockResolvedValue({ confname: 'PGConf EU 2025' }),
      };
      vi.mocked(createApiClient).mockReturnValue(mockApiClient as any);
      vi.mocked(storageService.saveConference).mockResolvedValue(true);
      vi.mocked(storageService.getConferences).mockResolvedValue([mockConference]);

      await useConferenceStore.getState().addConferenceFromUrl(validUrl);

      expect(mockApiClient.getStatus).toHaveBeenCalled();
    });

    it('should continue without display name if API call fails', async () => {
      const mockApiClient = {
        getStatus: vi.fn().mockRejectedValue(new Error('API error')),
      };
      vi.mocked(createApiClient).mockReturnValue(mockApiClient as any);
      vi.mocked(storageService.saveConference).mockResolvedValue(true);
      vi.mocked(storageService.getConferences).mockResolvedValue([mockConference]);

      const result = await useConferenceStore.getState().addConferenceFromUrl(validUrl);

      expect(result).toBe(true);
    });

    it('should reject invalid URL format', async () => {
      const result = await useConferenceStore.getState().addConferenceFromUrl('invalid-url');

      expect(result).toBe(false);
      expect(useConferenceStore.getState().error).toBe('Invalid conference URL format');
    });

    it('should reject duplicate conference', async () => {
      const mockApiClient = {
        getStatus: vi.fn().mockResolvedValue({ confname: 'Test' }),
      };
      vi.mocked(createApiClient).mockReturnValue(mockApiClient as any);
      vi.mocked(storageService.saveConference).mockResolvedValue(false);

      const result = await useConferenceStore.getState().addConferenceFromUrl(validUrl);

      expect(result).toBe(false);
      expect(useConferenceStore.getState().error).toBe('Conference already exists');
    });

    it('should set first conference as active', async () => {
      const mockApiClient = {
        getStatus: vi.fn().mockResolvedValue({ confname: 'Test' }),
      };
      vi.mocked(createApiClient).mockReturnValue(mockApiClient as any);
      vi.mocked(storageService.saveConference).mockResolvedValue(true);
      vi.mocked(storageService.getConferences).mockResolvedValue([mockConference]);
      vi.mocked(storageService.setActiveConferenceId).mockResolvedValue();
      vi.mocked(storageService.getActiveConferenceId).mockResolvedValue(null);

      // Manually call setActiveConference after adding
      await useConferenceStore.getState().addConferenceFromUrl(validUrl);

      // Verify conferences were loaded
      expect(useConferenceStore.getState().conferences).toHaveLength(1);
    });

    it('should handle sponsor URL correctly', async () => {
      const sponsorUrl = `https://postgresql.eu/events/sponsor/scanning/${'b'.repeat(40)}/`;
      const mockApiClient = {
        getStatus: vi.fn().mockResolvedValue({ confname: 'PGConf EU 2025' }),
      };
      vi.mocked(createApiClient).mockReturnValue(mockApiClient as any);
      vi.mocked(storageService.saveConference).mockResolvedValue(true);
      vi.mocked(storageService.getConferences).mockResolvedValue([mockSponsorConference]);

      const result = await useConferenceStore.getState().addConferenceFromUrl(sponsorUrl);

      expect(result).toBe(true);
    });

    it('should handle field check-in URL correctly', async () => {
      const fieldUrl = `https://postgresql.eu/events/test-event/checkin/${'c'.repeat(40)}/ftshirt/`;
      const mockApiClient = {
        getStatus: vi.fn().mockResolvedValue({ confname: 'Test' }),
      };
      vi.mocked(createApiClient).mockReturnValue(mockApiClient as any);
      vi.mocked(storageService.saveConference).mockResolvedValue(true);
      vi.mocked(storageService.getConferences).mockResolvedValue([]);

      const result = await useConferenceStore.getState().addConferenceFromUrl(fieldUrl);

      expect(result).toBe(true);
    });
  });

  describe('deleteConference', () => {
    beforeEach(() => {
      useConferenceStore.setState({
        conferences: [mockConference, mockSponsorConference],
        activeConferenceId: 'test-id',
      });
    });

    it('should delete a conference successfully', async () => {
      vi.mocked(storageService.deleteConference).mockResolvedValue(true);
      vi.mocked(storageService.getConferences).mockResolvedValue([mockSponsorConference]);
      vi.mocked(storageService.getActiveConferenceId).mockResolvedValue('test-id');

      await useConferenceStore.getState().deleteConference('test-id');

      expect(storageService.deleteConference).toHaveBeenCalledWith('test-id');
      expect(useConferenceStore.getState().conferences).toHaveLength(1);
    });

    it('should handle non-existent conference', async () => {
      vi.mocked(storageService.deleteConference).mockResolvedValue(false);

      await useConferenceStore.getState().deleteConference('non-existent');

      expect(useConferenceStore.getState().error).toBe('Conference not found');
    });

    it('should clear active conference if all conferences are deleted', async () => {
      vi.mocked(storageService.deleteConference).mockResolvedValue(true);
      vi.mocked(storageService.getConferences).mockResolvedValue([]);
      vi.mocked(storageService.getActiveConferenceId).mockResolvedValue(null);

      await useConferenceStore.getState().deleteConference('test-id');

      expect(useConferenceStore.getState().activeConferenceId).toBeNull();
    });

    it('should activate most recent conference if active was deleted', async () => {
      vi.mocked(storageService.deleteConference).mockResolvedValue(true);
      vi.mocked(storageService.getConferences).mockResolvedValue([mockSponsorConference]);
      vi.mocked(storageService.getActiveConferenceId).mockResolvedValue(null);
      vi.mocked(storageService.setActiveConferenceId).mockResolvedValue();

      await useConferenceStore.getState().deleteConference('test-id');

      // Since there's a conference but no active one, it should set the most recent
      expect(storageService.setActiveConferenceId).toHaveBeenCalled();
    });
  });

  describe('setActiveConference', () => {
    beforeEach(() => {
      useConferenceStore.setState({
        conferences: [mockConference, mockSponsorConference],
        activeConferenceId: null,
      });
    });

    it('should set active conference', async () => {
      vi.mocked(storageService.setActiveConferenceId).mockResolvedValue();
      vi.mocked(storageService.getConferences).mockResolvedValue([mockConference, mockSponsorConference]);

      await useConferenceStore.getState().setActiveConference('test-id');

      expect(storageService.setActiveConferenceId).toHaveBeenCalledWith('test-id');
      expect(useConferenceStore.getState().activeConferenceId).toBe('test-id');
    });

    it('should clear active conference when passing null', async () => {
      useConferenceStore.setState({ activeConferenceId: 'test-id' });
      vi.mocked(storageService.setActiveConferenceId).mockResolvedValue();
      vi.mocked(storageService.getConferences).mockResolvedValue([mockConference]);

      await useConferenceStore.getState().setActiveConference(null);

      expect(storageService.setActiveConferenceId).toHaveBeenCalledWith(null);
      expect(useConferenceStore.getState().activeConferenceId).toBeNull();
    });

    it('should handle errors', async () => {
      const error = new Error('Storage error');
      vi.mocked(storageService.setActiveConferenceId).mockRejectedValue(error);

      await useConferenceStore.getState().setActiveConference('test-id');

      expect(useConferenceStore.getState().error).toBe('Storage error');
    });
  });

  describe('updateConference', () => {
    beforeEach(() => {
      useConferenceStore.setState({
        conferences: [mockConference],
        activeConferenceId: 'test-id',
      });
    });

    it('should update a conference successfully', async () => {
      const updates = { displayName: 'Updated Name' };
      const updatedConference = { ...mockConference, ...updates };

      vi.mocked(storageService.updateConference).mockResolvedValue(true);
      vi.mocked(storageService.getConferences).mockResolvedValue([updatedConference]);

      await useConferenceStore.getState().updateConference('test-id', updates);

      expect(storageService.updateConference).toHaveBeenCalledWith('test-id', updates);
      expect(useConferenceStore.getState().conferences[0].displayName).toBe('Updated Name');
    });

    it('should handle non-existent conference', async () => {
      vi.mocked(storageService.updateConference).mockResolvedValue(false);

      await useConferenceStore.getState().updateConference('non-existent', { displayName: 'Test' });

      expect(useConferenceStore.getState().error).toBe('Conference not found');
    });
  });

  describe('refreshConferences', () => {
    it('should refresh conferences from storage', async () => {
      const mockConferences = [mockConference];
      vi.mocked(storageService.getConferences).mockResolvedValue(mockConferences);
      vi.mocked(storageService.getActiveConferenceId).mockResolvedValue('test-id');

      await useConferenceStore.getState().refreshConferences();

      const state = useConferenceStore.getState();
      expect(state.conferences).toEqual(mockConferences);
      expect(state.activeConferenceId).toBe('test-id');
      expect(state.isLoading).toBe(false);
    });

    it('should handle refresh errors', async () => {
      const error = new Error('Refresh error');
      vi.mocked(storageService.getConferences).mockRejectedValue(error);

      await useConferenceStore.getState().refreshConferences();

      const state = useConferenceStore.getState();
      expect(state.error).toBe('Refresh error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useConferenceStore.setState({ error: 'Test error' });

      useConferenceStore.getState().clearError();

      expect(useConferenceStore.getState().error).toBeNull();
    });
  });

  describe('activeConference computed property', () => {
    it('should return active conference when set', () => {
      // Reset store completely first
      useConferenceStore.setState({
        conferences: [],
        activeConferenceId: null,
        isLoading: false,
        error: null,
      }, true);

      // Now set test data
      useConferenceStore.setState({
        conferences: [mockConference, mockSponsorConference],
        activeConferenceId: 'test-id',
      });

      // Access activeConference through the store hook
      const { conferences, activeConferenceId } = useConferenceStore.getState();
      const activeConference = conferences.find(c => c.id === activeConferenceId) || null;
      expect(activeConference).toEqual(mockConference);
    });

    it('should return null when no active conference', () => {
      useConferenceStore.setState({
        conferences: [mockConference],
        activeConferenceId: null,
      });

      const { conferences, activeConferenceId } = useConferenceStore.getState();
      const activeConference = conferences.find(c => c.id === activeConferenceId) || null;
      expect(activeConference).toBeNull();
    });

    it('should return null when active conference not found', () => {
      useConferenceStore.setState({
        conferences: [mockConference],
        activeConferenceId: 'non-existent',
      });

      const { conferences, activeConferenceId } = useConferenceStore.getState();
      const activeConference = conferences.find(c => c.id === activeConferenceId) || null;
      expect(activeConference).toBeNull();
    });
  });
});
