/**
 * Conference URL parser and validator
 * Parses deep link URLs from pgeu-system backend
 */

import {
  Conference,
  ParsedConferenceUrl,
  URL_PATTERNS,
  ScanningMode,
} from '../types/conference';

/**
 * Validates if a domain is present (accepts any domain to support new servers)
 */
export function isValidDomain(domain: string): boolean {
  // Accept any non-empty domain to support dynamically spinning up new servers
  return domain.length > 0;
}

/**
 * Parses a conference URL and extracts configuration
 *
 * Supported formats:
 * - Check-in: https://{domain}/events/{event}/checkin/{token}/
 * - Field Check-in: https://{domain}/events/{event}/checkin/{token}/f{fieldId}/
 * - Sponsor Scanning: https://{domain}/events/sponsor/scanning/{token}/
 *
 * @param url - The deep link URL to parse
 * @returns Parsed conference configuration or null if invalid
 */
export function parseConferenceUrl(url: string): ParsedConferenceUrl | null {
  // Normalize URL (add trailing slash if missing)
  const normalizedUrl = url.endsWith('/') ? url : `${url}/`;

  // Try field check-in pattern first (most specific)
  const fieldMatch = normalizedUrl.match(URL_PATTERNS.fieldCheckin);
  if (fieldMatch) {
    const [, domain, eventSlug, token, fieldIdStr] = fieldMatch;

    if (!isValidDomain(domain)) {
      return null;
    }

    // Parse as number if it's all digits, otherwise keep as string
    const fieldId = /^\d+$/.test(fieldIdStr) ? parseInt(fieldIdStr, 10) : fieldIdStr;

    return {
      baseUrl: `https://${domain}`,
      eventSlug,
      token,
      mode: 'field',
      fieldId,
    };
  }

  // Try regular check-in pattern
  const checkinMatch = normalizedUrl.match(URL_PATTERNS.checkin);
  if (checkinMatch) {
    const [, domain, eventSlug, token] = checkinMatch;

    if (!isValidDomain(domain)) {
      return null;
    }

    return {
      baseUrl: `https://${domain}`,
      eventSlug,
      token,
      mode: 'checkin',
      fieldId: null,
    };
  }

  // Try sponsor scanning pattern
  const sponsorMatch = normalizedUrl.match(URL_PATTERNS.sponsor);
  if (sponsorMatch) {
    const [, domain, token] = sponsorMatch;

    if (!isValidDomain(domain)) {
      return null;
    }

    return {
      baseUrl: `https://${domain}`,
      eventSlug: null,
      token,
      mode: 'sponsor',
      fieldId: null,
    };
  }

  return null;
}

/**
 * Generates a unique conference ID from its configuration
 */
export function generateConferenceId(parsed: ParsedConferenceUrl): string {
  const parts = [
    parsed.baseUrl.replace(/^https?:\/\//, ''),
    parsed.eventSlug || 'sponsor',
    parsed.mode,
    parsed.fieldId !== null ? String(parsed.fieldId) : '',
    parsed.token.substring(0, 8), // Use first 8 chars of token for uniqueness
  ];

  return parts.filter(Boolean).join('_');
}

/**
 * Generates a human-readable conference name
 */
export function generateConferenceName(parsed: ParsedConferenceUrl): string {
  if (parsed.mode === 'sponsor') {
    return 'Sponsor Scanning';
  }

  // For both field and regular check-in, just show the event name
  return parsed.eventSlug || 'Event';
}

/**
 * Creates a Conference object from a parsed URL
 */
export function createConferenceFromUrl(url: string, displayName?: string): Conference | null {
  const parsed = parseConferenceUrl(url);

  if (!parsed) {
    return null;
  }

  const now = Date.now();

  return {
    id: generateConferenceId(parsed),
    name: generateConferenceName(parsed),
    displayName,
    baseUrl: parsed.baseUrl,
    eventSlug: parsed.eventSlug,
    token: parsed.token,
    mode: parsed.mode,
    fieldId: parsed.fieldId,
    addedAt: now,
    lastUsedAt: now,
  };
}

/**
 * Validates a conference token format (40 or 64 hex characters)
 */
export function isValidToken(token: string): boolean {
  return /^[a-f0-9]{40,64}$/.test(token);
}

/**
 * Validates a complete conference configuration
 */
export function validateConference(conference: Conference): boolean {
  // Check required fields
  if (!conference.id || !conference.name || !conference.baseUrl || !conference.token) {
    return false;
  }

  // Validate token format
  if (!isValidToken(conference.token)) {
    return false;
  }

  // Validate mode
  const validModes: ScanningMode[] = ['checkin', 'sponsor', 'field'];
  if (!validModes.includes(conference.mode)) {
    return false;
  }

  // Field check-in must have a field ID
  if (conference.mode === 'field') {
    if (conference.fieldId === null) {
      return false;
    }
    // If numeric, must be >= 1
    if (typeof conference.fieldId === 'number' && conference.fieldId < 1) {
      return false;
    }
    // If string, must not be empty
    if (typeof conference.fieldId === 'string' && conference.fieldId.length === 0) {
      return false;
    }
  }

  // Check-in and field modes must have an event slug
  if ((conference.mode === 'checkin' || conference.mode === 'field') && !conference.eventSlug) {
    return false;
  }

  return true;
}
