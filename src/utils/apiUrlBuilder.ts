/**
 * API URL Builder Utilities
 * Centralizes API URL construction logic for different conference modes
 */

import { Conference, ParsedConferenceUrl } from '../types/conference';
import { ApiClient, createApiClient } from '../services/apiClient';

/**
 * Builds the API URL for a given conference based on its mode
 * @param conference - The conference configuration or parsed URL
 * @returns The complete API URL
 */
export function buildApiUrl(conference: Conference | ParsedConferenceUrl): string {
  const { baseUrl, mode, token, eventSlug, fieldId } = conference;

  if (mode === 'sponsor') {
    return `${baseUrl}/events/sponsor/scanning/${token}/`;
  }

  if (mode === 'field' && fieldId) {
    return `${baseUrl}/events/${eventSlug}/checkin/${token}/f${fieldId}/`;
  }

  // Default: checkin mode
  return `${baseUrl}/events/${eventSlug}/checkin/${token}/`;
}

/**
 * Creates an API client configured for the given conference
 * @param conference - The conference configuration
 * @returns An ApiClient instance
 */
export function createApiClientFromConference(conference: Conference): ApiClient {
  const apiUrl = buildApiUrl(conference);
  return createApiClient(apiUrl);
}
