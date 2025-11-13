/**
 * Conference type definitions for PGConf Scanner
 * Based on pgeu-system backend URLs and token formats
 */

/**
 * Scanning mode types supported by the application
 */
export type ScanningMode = 'checkin' | 'sponsor' | 'field';

/**
 * Conference configuration stored in the app
 */
export interface Conference {
  /** Unique identifier (generated from URL + token) */
  id: string;

  /** Display name of the conference */
  name: string;

  /** Friendly display name from API (e.g., 'PGConf EU 2025') */
  displayName?: string;

  /** Base URL (e.g., https://postgresql.eu) */
  baseUrl: string;

  /** Event slug (e.g., 'pgconfeu2024') */
  eventSlug: string | null;

  /** Access token (40-character hex string) */
  token: string;

  /** Scanning mode */
  mode: ScanningMode;

  /** Field ID for field check-in mode (numeric or named like 'tshirt') */
  fieldId: string | number | null;

  /** Timestamp when added */
  addedAt: number;

  /** Timestamp of last use */
  lastUsedAt: number;
}

/**
 * Parsed conference URL result
 */
export interface ParsedConferenceUrl {
  baseUrl: string;
  eventSlug: string | null;
  token: string;
  mode: ScanningMode;
  fieldId: string | number | null;
}

/**
 * Valid domain patterns for pgeu-system instances
 */
export const VALID_DOMAINS = [
  'postgresql.eu',
  'postgresql.us',
  'pgevents.ca',
  'pgday.uk',
  'localhost',
  '127.0.0.1',
] as const;

/**
 * Conference URL patterns:
 *
 * Check-in:
 * https://{domain}/events/{event}/checkin/{token}/
 *
 * Field Check-in:
 * https://{domain}/events/{event}/checkin/{token}/f{fieldId}/ (fieldId can be numeric or named)
 *
 * Sponsor Scanning:
 * https://{domain}/events/sponsor/scanning/{token}/
 */
export const URL_PATTERNS = {
  checkin: /^https?:\/\/([^/]+)\/events\/([^/]+)\/checkin\/([a-f0-9]{40,64})\/$/,
  fieldCheckin: /^https?:\/\/([^/]+)\/events\/([^/]+)\/checkin\/([a-f0-9]{40,64})\/f([a-z0-9]+)\/$/,
  sponsor: /^https?:\/\/([^/]+)\/events\/sponsor\/scanning\/([a-f0-9]{40,64})\/$/,
} as const;
