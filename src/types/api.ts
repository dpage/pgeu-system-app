/**
 * API type definitions for pgeu-system backend
 * Based on backend-scanner-api-analysis.md
 */

/**
 * Base conference status response
 */
interface BaseStatusResponse {
  confname: string;
  active: boolean;
  admin: boolean;
}

/**
 * Check-in mode status response
 */
export interface CheckinStatusResponse extends BaseStatusResponse {
  user: string;
  activestatus: string;
}

/**
 * Field check-in mode status response
 */
export interface FieldStatusResponse extends CheckinStatusResponse {
  fieldname: string;
}

/**
 * Sponsor scanning mode status response
 */
export interface SponsorStatusResponse extends BaseStatusResponse {
  scanner: string;
  name: string;
  sponsorname: string;
  activestatus: string;
}

/**
 * Union type for all status responses
 */
export type StatusResponse = CheckinStatusResponse | FieldStatusResponse | SponsorStatusResponse;

/**
 * Already checked in information
 */
export interface AlreadyCheckedIn {
  title: string;
  body: string;
}

/**
 * Base registration information
 */
interface BaseRegistration {
  name: string;
  company?: string | null;
  token: string;
  highlight: string[];
}

/**
 * Check-in registration details
 */
export interface CheckinRegistration extends BaseRegistration {
  id: number;
  type: string;
  tshirt?: string | null;
  partition?: string | null;
  photoconsent?: string | null;
  policyconfirmed?: string | null;
  checkinmessage?: string | null;
  additional: string[];
  already?: AlreadyCheckedIn;
}

/**
 * Sponsor/field scanning registration details
 */
export interface SponsorRegistration extends BaseRegistration {
  email?: string;
  country?: string;
  note: string;
}

/**
 * Lookup response for check-in mode
 */
export interface CheckinLookupResponse {
  reg: CheckinRegistration;
}

/**
 * Lookup response for sponsor/field mode
 */
export interface SponsorLookupResponse {
  reg: SponsorRegistration;
}

/**
 * Union type for lookup responses
 */
export type LookupResponse = CheckinLookupResponse | SponsorLookupResponse;

/**
 * Search response (check-in only)
 */
export interface SearchResponse {
  regs: CheckinRegistration[];
}

/**
 * Store response for check-in
 */
export interface CheckinStoreResponse {
  reg: CheckinRegistration;
  message: string;
  showfields: boolean;
}

/**
 * Store response for sponsor/field scanning
 */
export interface SponsorStoreResponse {
  reg: SponsorRegistration;
  message: string;
  showfields: boolean;
}

/**
 * Union type for store responses
 */
export type StoreResponse = CheckinStoreResponse | SponsorStoreResponse;

/**
 * Statistics table row
 */
export type StatRow = (string | null)[];

/**
 * Statistics table group [headers, rows]
 */
export type StatGroup = [StatRow, StatRow[]];

/**
 * Statistics response (admin only)
 */
export type StatsResponse = StatGroup[];

/**
 * API error types
 */
export type ApiErrorType =
  | 'network_error'
  | 'timeout'
  | 'not_found'
  | 'forbidden'
  | 'precondition_failed'
  | 'server_error'
  | 'invalid_response'
  | 'unknown';

/**
 * API error
 */
export interface ApiError {
  type: ApiErrorType;
  message: string;
  statusCode?: number;
  details?: string;
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
}

/**
 * Store request body
 */
export interface StoreRequestBody {
  token: string;
  note?: string;
}
