/**
 * Conference state management using Zustand
 * Provides reactive state layer on top of storage service
 */

import { create } from 'zustand';
import { Conference } from '../types/conference';
import { storageService } from '../services/storage';
import { createConferenceFromUrl, parseConferenceUrl } from '../utils/conferenceParser';
import { buildApiUrl } from '../utils/apiUrlBuilder';
import { createApiClient } from '../services/apiClient';
import { TIMEOUTS } from '../constants/app';

interface ConferenceState {
  // State
  conferences: Conference[];
  activeConferenceId: string | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  get activeConference(): Conference | null;

  // Actions
  initialize: () => Promise<void>;
  addConferenceFromUrl: (url: string) => Promise<boolean>;
  deleteConference: (id: string) => Promise<void>;
  setActiveConference: (id: string | null) => Promise<void>;
  updateConference: (id: string, updates: Partial<Omit<Conference, 'id'>>) => Promise<void>;
  refreshConferences: () => Promise<void>;
  clearError: () => void;
}

/**
 * Conference store using Zustand
 */
export const useConferenceStore = create<ConferenceState>((set, get) => ({
  // Initial state
  conferences: [],
  activeConferenceId: null,
  isLoading: false,
  error: null,

  // Computed getter
  get activeConference() {
    const state = get();
    if (!state.activeConferenceId) {
      return null;
    }
    return state.conferences.find(c => c.id === state.activeConferenceId) || null;
  },

  /**
   * Initialize store by loading data from storage
   */
  initialize: async () => {
    set({ isLoading: true, error: null });

    try {
      const [conferences, activeConferenceId] = await Promise.all([
        storageService.getConferences(),
        storageService.getActiveConferenceId(),
      ]);

      set({
        conferences,
        activeConferenceId,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load conferences',
        isLoading: false,
      });
    }
  },

  /**
   * Add a new conference from a URL
   * @returns true if added successfully, false if duplicate or invalid
   */
  addConferenceFromUrl: async (url: string) => {
    set({ error: null });

    try {
      // Parse the URL first to validate it
      const parsed = parseConferenceUrl(url);

      if (!parsed) {
        set({ error: 'Invalid conference URL format' });
        return false;
      }

      // Build API URL from parsed configuration
      const apiUrl = buildApiUrl(parsed);

      // Fetch friendly name from API
      let displayName: string | undefined;
      try {
        const apiClient = createApiClient(apiUrl);
        const status = await apiClient.getStatus({ timeout: TIMEOUTS.API_DEFAULT });
        displayName = status.confname;
        console.log('[ConferenceStore] Fetched conference name from API:', displayName);
      } catch (error) {
        console.warn('[ConferenceStore] Failed to fetch conference name, continuing without it:', error);
        // Continue without displayName - we'll use the generated name
      }

      // Create conference with the fetched displayName
      const conference = createConferenceFromUrl(url, displayName);

      if (!conference) {
        set({ error: 'Invalid conference URL format' });
        return false;
      }

      const saved = await storageService.saveConference(conference);

      if (!saved) {
        set({ error: 'Conference already exists' });
        return false;
      }

      // Refresh conferences from storage
      const conferences = await storageService.getConferences();
      set({ conferences });

      // If this is the first conference, set it as active
      if (conferences.length === 1) {
        await get().setActiveConference(conference.id);
      }

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add conference',
      });
      return false;
    }
  },

  /**
   * Delete a conference
   */
  deleteConference: async (id: string) => {
    set({ error: null });

    try {
      const deleted = await storageService.deleteConference(id);

      if (!deleted) {
        set({ error: 'Conference not found' });
        return;
      }

      // Refresh conferences from storage
      const conferences = await storageService.getConferences();
      const activeConferenceId = await storageService.getActiveConferenceId();

      set({ conferences, activeConferenceId });

      // If we deleted the last conference, clear active
      if (conferences.length === 0) {
        set({ activeConferenceId: null });
      } else if (activeConferenceId === null && conferences.length > 0) {
        // If there's no active conference but we have conferences, activate the most recent
        const mostRecent = conferences.reduce((latest, conf) =>
          conf.lastUsedAt > latest.lastUsedAt ? conf : latest
        );
        await get().setActiveConference(mostRecent.id);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete conference',
      });
    }
  },

  /**
   * Set the active conference
   */
  setActiveConference: async (id: string | null) => {
    set({ error: null });

    try {
      await storageService.setActiveConferenceId(id);

      // Refresh state from storage
      const conferences = await storageService.getConferences();
      set({ activeConferenceId: id, conferences });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to set active conference',
      });
    }
  },

  /**
   * Update a conference
   */
  updateConference: async (id: string, updates: Partial<Omit<Conference, 'id'>>) => {
    set({ error: null });

    try {
      const updated = await storageService.updateConference(id, updates);

      if (!updated) {
        set({ error: 'Conference not found' });
        return;
      }

      // Refresh conferences from storage
      const conferences = await storageService.getConferences();
      set({ conferences });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update conference',
      });
    }
  },

  /**
   * Refresh conferences from storage
   */
  refreshConferences: async () => {
    set({ isLoading: true, error: null });

    try {
      const [conferences, activeConferenceId] = await Promise.all([
        storageService.getConferences(),
        storageService.getActiveConferenceId(),
      ]);

      set({
        conferences,
        activeConferenceId,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to refresh conferences',
        isLoading: false,
      });
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },
}));
