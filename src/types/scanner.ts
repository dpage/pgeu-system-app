/**
 * Scanner type definitions for QR code scanning
 */

/**
 * QR code token types
 */
export type TokenType = 'ID' | 'AT' | 'UNKNOWN';

/**
 * Scanner state
 */
export type ScannerState = 'stopped' | 'starting' | 'active' | 'paused';

/**
 * Camera permission status
 */
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'limited';

/**
 * Parsed QR code result
 */
export interface ParsedQRCode {
  /** Original raw content */
  rawContent: string;
  /** Token type (ID for check-in, AT for sponsor/field) */
  tokenType: TokenType;
  /** Extracted token value (40-64 hex characters) */
  token: string;
  /** Whether this is a test token */
  isTestToken: boolean;
  /** Format that was matched (simple or URL) */
  format: 'simple' | 'url';
}

/**
 * Scanner error types
 */
export type ScannerErrorType =
  | 'permission_denied'
  | 'camera_unavailable'
  | 'unsupported'
  | 'invalid_qr_code'
  | 'wrong_token_type'
  | 'no_active_conference'
  | 'unknown';

/**
 * Scanner error
 */
export interface ScannerError {
  type: ScannerErrorType;
  message: string;
  details?: string;
}

/**
 * Scan result for successful scans
 */
export interface ScanResult {
  parsedCode: ParsedQRCode;
  timestamp: number;
}

/**
 * Scanner configuration
 */
export interface ScannerConfig {
  /** Enable vibration on successful scan */
  enableVibration?: boolean;
  /** Debounce time for duplicate scans (ms) */
  debounceTime?: number;
  /** Show torch/flashlight toggle */
  showTorchToggle?: boolean;
}
