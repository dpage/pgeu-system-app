/**
 * Application Constants
 * Centralized configuration values used throughout the app
 */

/**
 * Timeout values in milliseconds
 */
export const TIMEOUTS = {
  /** Debounce delay for search input */
  SEARCH_DEBOUNCE: 800,
  /** Default API request timeout */
  API_DEFAULT: 10000,
  /** API status check timeout */
  API_STATUS: 5000,
  /** API store operation timeout */
  API_STORE: 15000,
  /** API statistics request timeout */
  API_STATS: 20000,
  /** Modal transition delay */
  MODAL_TRANSITION: 100,
  /** Delay before returning to home after successful check-in */
  CHECKIN_SUCCESS_DELAY: 500,
} as const;

/**
 * UI dimension constants in pixels
 */
export const UI_DIMENSIONS = {
  /** Height of the main header bar */
  HEADER_HEIGHT: 56,
  /** Height of the bottom footer/selector */
  FOOTER_HEIGHT: 60,
  /** Height of the subheader section */
  SUBHEADER_HEIGHT: 100,
} as const;

/**
 * API configuration constants
 */
export const API_CONFIG = {
  /** Maximum number of retry attempts for failed requests */
  MAX_RETRIES: 2,
  /** Initial delay before first retry (ms) */
  INITIAL_RETRY_DELAY: 1000,
  /** Maximum delay between retries (ms) */
  MAX_RETRY_DELAY: 5000,
} as const;
