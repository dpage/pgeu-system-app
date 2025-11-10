/**
 * Storage service for managing conference data persistence
 * Uses Capacitor Preferences for secure local storage
 */

import { Preferences } from '@capacitor/preferences';
import { Conference } from '../types/conference';
import { validateConference } from '../utils/conferenceParser';

const CONFERENCES_KEY = 'conferences';
const ACTIVE_CONFERENCE_KEY = 'activeConferenceId';

/**
 * Storage service for conference data
 */
export class StorageService {
  /**
   * Get all conferences from storage
   */
  async getConferences(): Promise<Conference[]> {
    try {
      const result = await Preferences.get({ key: CONFERENCES_KEY });

      if (!result.value) {
        return [];
      }

      const conferences = JSON.parse(result.value) as Conference[];

      // Validate each conference
      return conferences.filter(conf => validateConference(conf));
    } catch (error) {
      console.error('Failed to load conferences:', error);
      return [];
    }
  }

  /**
   * Save a new conference
   * @param conference - Conference to save
   * @returns true if saved successfully, false if duplicate
   */
  async saveConference(conference: Conference): Promise<boolean> {
    if (!validateConference(conference)) {
      throw new Error('Invalid conference data');
    }

    const conferences = await this.getConferences();

    // Check for duplicate
    if (conferences.some(c => c.id === conference.id)) {
      return false;
    }

    conferences.push(conference);
    await this.saveConferences(conferences);
    return true;
  }

  /**
   * Update an existing conference
   * @param id - Conference ID
   * @param updates - Partial conference data to update
   * @returns true if updated successfully, false if not found
   */
  async updateConference(
    id: string,
    updates: Partial<Omit<Conference, 'id'>>
  ): Promise<boolean> {
    const conferences = await this.getConferences();
    const index = conferences.findIndex(c => c.id === id);

    if (index === -1) {
      return false;
    }

    const updated = { ...conferences[index], ...updates };

    if (!validateConference(updated)) {
      throw new Error('Updated conference data is invalid');
    }

    conferences[index] = updated;
    await this.saveConferences(conferences);
    return true;
  }

  /**
   * Delete a conference
   * @param id - Conference ID to delete
   * @returns true if deleted, false if not found
   */
  async deleteConference(id: string): Promise<boolean> {
    const conferences = await this.getConferences();
    const filtered = conferences.filter(c => c.id !== id);

    if (filtered.length === conferences.length) {
      return false; // Not found
    }

    await this.saveConferences(filtered);

    // If we deleted the active conference, clear it
    const activeId = await this.getActiveConferenceId();
    if (activeId === id) {
      await this.setActiveConferenceId(null);
    }

    return true;
  }

  /**
   * Get a specific conference by ID
   */
  async getConference(id: string): Promise<Conference | null> {
    const conferences = await this.getConferences();
    return conferences.find(c => c.id === id) || null;
  }

  /**
   * Update the lastUsedAt timestamp for a conference
   */
  async touchConference(id: string): Promise<boolean> {
    return this.updateConference(id, { lastUsedAt: Date.now() });
  }

  /**
   * Get the active (currently selected) conference ID
   */
  async getActiveConferenceId(): Promise<string | null> {
    try {
      const result = await Preferences.get({ key: ACTIVE_CONFERENCE_KEY });
      return result.value;
    } catch (error) {
      console.error('Failed to load active conference ID:', error);
      return null;
    }
  }

  /**
   * Set the active conference ID
   */
  async setActiveConferenceId(id: string | null): Promise<void> {
    try {
      if (id === null) {
        await Preferences.remove({ key: ACTIVE_CONFERENCE_KEY });
      } else {
        await Preferences.set({ key: ACTIVE_CONFERENCE_KEY, value: id });
        // Update lastUsedAt when setting as active
        await this.touchConference(id);
      }
    } catch (error) {
      console.error('Failed to save active conference ID:', error);
      throw error;
    }
  }

  /**
   * Get the active conference object
   */
  async getActiveConference(): Promise<Conference | null> {
    const id = await this.getActiveConferenceId();
    if (!id) {
      return null;
    }
    return this.getConference(id);
  }

  /**
   * Clear all stored data (useful for testing/reset)
   */
  async clear(): Promise<void> {
    await Preferences.remove({ key: CONFERENCES_KEY });
    await Preferences.remove({ key: ACTIVE_CONFERENCE_KEY });
  }

  /**
   * Private helper to save the conferences array
   */
  private async saveConferences(conferences: Conference[]): Promise<void> {
    try {
      const value = JSON.stringify(conferences);
      await Preferences.set({ key: CONFERENCES_KEY, value });
    } catch (error) {
      console.error('Failed to save conferences:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
