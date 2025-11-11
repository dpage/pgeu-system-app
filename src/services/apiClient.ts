/**
 * API Client Service for pgeu-system backend
 * Handles all HTTP communication with conference scanner APIs
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import type {
  StatusResponse,
  LookupResponse,
  SearchResponse,
  StoreResponse,
  StatsResponse,
  ApiError,
  ApiRequestOptions,
  StoreRequestBody,
} from '../types/api';

/**
 * API Client for pgeu-system backend
 */
export class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  /**
   * Create a new API client
   * @param baseUrl - Conference base URL (e.g., https://postgresql.eu/events/pgconf2024/checkin/abc123.../)
   */
  constructor(baseUrl: string) {
    // Ensure baseUrl ends with /
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // Default 10s timeout
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PGConfScanner/2.0.0',
      },
    });

    // Configure retry logic
    axiosRetry(this.client, {
      retries: 2,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on network errors and 5xx server errors
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status !== undefined && error.response.status >= 500)
        );
      },
      shouldResetTimeout: true,
    });
  }

  /**
   * Get conference status
   * @param options - Request options
   * @returns Status response
   */
  async getStatus(options?: ApiRequestOptions): Promise<StatusResponse> {
    try {
      const response = await this.client.get<StatusResponse>('api/status/', {
        timeout: options?.timeout || 5000,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Lookup attendee by QR code token
   * @param qrCode - Scanned QR code content (full URL or token)
   * @param options - Request options
   * @returns Lookup response with attendee details
   */
  async lookupAttendee(qrCode: string, options?: ApiRequestOptions): Promise<LookupResponse> {
    try {
      const response = await this.client.get<LookupResponse>('api/lookup/', {
        params: { lookup: qrCode },
        timeout: options?.timeout || 10000,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Search for attendees by name/email (check-in mode only)
   * @param query - Search query
   * @param options - Request options
   * @returns Search response with matching attendees
   */
  async searchAttendees(query: string, options?: ApiRequestOptions): Promise<SearchResponse> {
    try {
      const response = await this.client.get<SearchResponse>('api/search/', {
        params: { search: query },
        timeout: options?.timeout || 10000,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Store check-in or badge scan
   * @param body - Store request body
   * @param options - Request options
   * @returns Store response
   */
  async store(body: StoreRequestBody, options?: ApiRequestOptions): Promise<StoreResponse> {
    try {
      // Convert body to URLSearchParams for x-www-form-urlencoded
      const params = new URLSearchParams();
      params.append('token', body.token);
      if (body.note !== undefined) {
        params.append('note', body.note);
      }

      const response = await this.client.post<StoreResponse>('api/store/', params, {
        timeout: options?.timeout || 15000,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get check-in statistics (admin only)
   * @param options - Request options
   * @returns Statistics response
   */
  async getStats(options?: ApiRequestOptions): Promise<StatsResponse> {
    try {
      const response = await this.client.get<StatsResponse>('api/stats/', {
        timeout: options?.timeout || 20000,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle axios errors and convert to ApiError
   * @param error - Axios error
   * @returns ApiError
   */
  private handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network error or timeout
      if (!axiosError.response) {
        if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
          return {
            type: 'timeout',
            message: 'Request timed out. Check your connection and try again.',
            details: axiosError.message,
          };
        }
        return {
          type: 'network_error',
          message: 'No internet connection. Please check your network.',
          details: axiosError.message,
        };
      }

      // HTTP error responses
      const status = axiosError.response.status;
      const responseData = axiosError.response.data;

      // Extract error message from response body if available
      let serverMessage: string | undefined;
      if (typeof responseData === 'string') {
        serverMessage = responseData;
      } else if (responseData && typeof responseData === 'object' && 'message' in responseData) {
        serverMessage = String(responseData.message);
      }

      switch (status) {
        case 404:
          return {
            type: 'not_found',
            message: serverMessage || 'Attendee not found for this conference',
            statusCode: status,
          };
        case 403:
          return {
            type: 'forbidden',
            message: serverMessage || 'Access denied. Please check your conference registration.',
            statusCode: status,
          };
        case 412:
          return {
            type: 'precondition_failed',
            message: serverMessage || 'Operation cannot be completed',
            statusCode: status,
          };
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            type: 'server_error',
            message: 'Server error. Please try again or contact support.',
            statusCode: status,
          };
        default:
          return {
            type: 'unknown',
            message: serverMessage || `Request failed with status ${status}`,
            statusCode: status,
          };
      }
    }

    // Non-axios error
    return {
      type: 'unknown',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Create an API client for a conference
 * @param apiUrl - Conference API URL
 * @returns API client instance
 */
export function createApiClient(apiUrl: string): ApiClient {
  return new ApiClient(apiUrl);
}
