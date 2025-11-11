/**
 * API Client Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import { ApiClient, createApiClient } from './apiClient';
import type {
  StatusResponse,
  CheckinLookupResponse,
  SearchResponse,
  CheckinStoreResponse,
  StatsResponse,
} from '../types/api';

// Mock axios
vi.mock('axios');
vi.mock('axios-retry', () => ({
  default: vi.fn(),
  exponentialDelay: vi.fn(),
  isNetworkOrIdempotentRequestError: vi.fn(() => true),
}));

describe('ApiClient', () => {
  let client: ApiClient;
  const baseUrl = 'https://postgresql.eu/events/pgconf2024/checkin/abc123/';

  beforeEach(() => {
    // Setup axios mock
    const mockCreate = vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
    }));
    vi.mocked(axios.create).mockImplementation(mockCreate);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    client = new ApiClient(baseUrl);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should normalize baseUrl to end with /', () => {
      const client1 = new ApiClient('https://example.com/path');
      expect(vi.mocked(axios.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://example.com/path/',
        })
      );

      const client2 = new ApiClient('https://example.com/path/');
      expect(vi.mocked(axios.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://example.com/path/',
        })
      );
    });

    it('should configure axios with correct defaults', () => {
      expect(vi.mocked(axios.create)).toHaveBeenCalledWith({
        baseURL: baseUrl,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'PGConfScanner/2.0.0',
        },
      });
    });
  });

  describe('getStatus', () => {
    it('should fetch status successfully', async () => {
      const mockResponse: StatusResponse = {
        confname: 'PGConf 2024',
        user: 'testuser',
        active: true,
        admin: false,
        activestatus: 'Check-in active',
      };

      const mockClient = (client as any).client;
      mockClient.get.mockResolvedValue({ data: mockResponse });

      const result = await client.getStatus();

      expect(mockClient.get).toHaveBeenCalledWith('api/status/', {
        timeout: 5000,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should use custom timeout when provided', async () => {
      const mockResponse: StatusResponse = {
        confname: 'PGConf 2024',
        user: 'testuser',
        active: true,
        admin: false,
        activestatus: 'Check-in active',
      };

      const mockClient = (client as any).client;
      mockClient.get.mockResolvedValue({ data: mockResponse });

      await client.getStatus({ timeout: 3000 });

      expect(mockClient.get).toHaveBeenCalledWith('api/status/', {
        timeout: 3000,
      });
    });

    it('should handle network errors', async () => {
      const mockClient = (client as any).client;
      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNREFUSED';

      mockClient.get.mockRejectedValue(networkError);

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'network_error',
        message: 'No internet connection. Please check your network.',
      });
    });

    it('should handle timeout errors', async () => {
      const mockClient = (client as any).client;
      const timeoutError = new Error('timeout of 5000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      mockClient.get.mockRejectedValue(timeoutError);

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'timeout',
        message: 'Request timed out. Check your connection and try again.',
      });
    });

    it('should handle 403 forbidden errors', async () => {
      const mockClient = (client as any).client;
      const error = {
        response: {
          status: 403,
          data: 'Invalid token',
        },
      };

      mockClient.get.mockRejectedValue(error);

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'forbidden',
        message: 'Invalid token',
        statusCode: 403,
      });
    });

    it('should handle 500 server errors', async () => {
      const mockClient = (client as any).client;
      const error = {
        response: {
          status: 500,
          data: 'Internal server error',
        },
      };

      mockClient.get.mockRejectedValue(error);

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'server_error',
        message: 'Server error. Please try again or contact support.',
        statusCode: 500,
      });
    });
  });

  describe('lookupAttendee', () => {
    it('should lookup attendee by QR code', async () => {
      const mockResponse: CheckinLookupResponse = {
        reg: {
          id: 123,
          name: 'John Doe',
          type: 'Speaker',
          company: 'ACME Corp',
          tshirt: 'L',
          partition: 'A',
          token: 'def456',
          highlight: [],
          additional: ['Workshop A'],
        },
      };

      const mockClient = (client as any).client;
      mockClient.get.mockResolvedValue({ data: mockResponse });

      const qrCode = 'ID$def456$ID';
      const result = await client.lookupAttendee(qrCode);

      expect(mockClient.get).toHaveBeenCalledWith('api/lookup/', {
        params: { lookup: qrCode },
        timeout: 10000,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle 404 not found errors', async () => {
      const mockClient = (client as any).client;
      const error = {
        response: {
          status: 404,
          data: 'Attendee not found',
        },
      };

      mockClient.get.mockRejectedValue(error);

      await expect(client.lookupAttendee('invalid')).rejects.toMatchObject({
        type: 'not_found',
        message: 'Attendee not found',
        statusCode: 404,
      });
    });

    it('should handle 412 precondition failed errors', async () => {
      const mockClient = (client as any).client;
      const error = {
        response: {
          status: 412,
          data: 'Check-in not open',
        },
      };

      mockClient.get.mockRejectedValue(error);

      await expect(client.lookupAttendee('token')).rejects.toMatchObject({
        type: 'precondition_failed',
        message: 'Check-in not open',
        statusCode: 412,
      });
    });
  });

  describe('searchAttendees', () => {
    it('should search attendees by query', async () => {
      const mockResponse: SearchResponse = {
        regs: [
          {
            id: 123,
            name: 'John Doe',
            type: 'Attendee',
            company: 'ACME Corp',
            tshirt: 'M',
            partition: 'B',
            token: 'xyz789',
            highlight: [],
            additional: [],
          },
        ],
      };

      const mockClient = (client as any).client;
      mockClient.get.mockResolvedValue({ data: mockResponse });

      const result = await client.searchAttendees('John Doe');

      expect(mockClient.get).toHaveBeenCalledWith('api/search/', {
        params: { search: 'John Doe' },
        timeout: 10000,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should return empty array for no matches', async () => {
      const mockResponse: SearchResponse = {
        regs: [],
      };

      const mockClient = (client as any).client;
      mockClient.get.mockResolvedValue({ data: mockResponse });

      const result = await client.searchAttendees('NonExistent');

      expect(result.regs).toHaveLength(0);
    });
  });

  describe('store', () => {
    it('should store check-in without note', async () => {
      const mockResponse: CheckinStoreResponse = {
        reg: {
          id: 123,
          name: 'John Doe',
          type: 'Attendee',
          company: 'ACME Corp',
          tshirt: 'L',
          partition: 'A',
          token: 'abc123',
          highlight: [],
          additional: [],
        },
        message: 'Attendee John Doe checked in successfully',
        showfields: true,
      };

      const mockClient = (client as any).client;
      mockClient.post.mockResolvedValue({ data: mockResponse });

      const result = await client.store({ token: 'abc123' });

      expect(mockClient.post).toHaveBeenCalledWith(
        'api/store/',
        expect.any(URLSearchParams),
        { timeout: 15000 }
      );

      // Verify URLSearchParams content
      const callArgs = mockClient.post.mock.calls[0];
      const params = callArgs[1] as URLSearchParams;
      expect(params.get('token')).toBe('abc123');
      expect(params.get('note')).toBeNull();

      expect(result).toEqual(mockResponse);
    });

    it('should store scan with note', async () => {
      const mockResponse: CheckinStoreResponse = {
        reg: {
          id: 123,
          name: 'John Doe',
          type: 'Attendee',
          company: 'ACME Corp',
          tshirt: 'L',
          partition: 'A',
          token: 'abc123',
          highlight: [],
          additional: [],
        },
        message: 'Scan stored successfully',
        showfields: false,
      };

      const mockClient = (client as any).client;
      mockClient.post.mockResolvedValue({ data: mockResponse });

      await client.store({ token: 'abc123', note: 'Interested in product' });

      const callArgs = mockClient.post.mock.calls[0];
      const params = callArgs[1] as URLSearchParams;
      expect(params.get('token')).toBe('abc123');
      expect(params.get('note')).toBe('Interested in product');
    });

    it('should handle already checked in error', async () => {
      const mockClient = (client as any).client;
      const error = {
        response: {
          status: 412,
          data: 'Already checked in',
        },
      };

      mockClient.post.mockRejectedValue(error);

      await expect(client.store({ token: 'abc123' })).rejects.toMatchObject({
        type: 'precondition_failed',
        message: 'Already checked in',
        statusCode: 412,
      });
    });
  });

  describe('getStats', () => {
    it('should fetch statistics', async () => {
      const mockResponse: StatsResponse = [
        [
          ['Registration Type', 'Checked In', 'Total'],
          [
            ['Speaker', '15', '18'],
            ['Attendee', '120', '200'],
            [null, '135', '218'],
          ],
        ],
      ];

      const mockClient = (client as any).client;
      mockClient.get.mockResolvedValue({ data: mockResponse });

      const result = await client.getStats();

      expect(mockClient.get).toHaveBeenCalledWith('api/stats/', {
        timeout: 20000,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle 403 for non-admin users', async () => {
      const mockClient = (client as any).client;
      const error = {
        response: {
          status: 403,
          data: 'Admin access required',
        },
      };

      mockClient.get.mockRejectedValue(error);

      await expect(client.getStats()).rejects.toMatchObject({
        type: 'forbidden',
        message: 'Admin access required',
        statusCode: 403,
      });
    });
  });

  describe('error handling', () => {
    it('should handle non-axios errors', async () => {
      const mockClient = (client as any).client;
      vi.mocked(axios.isAxiosError).mockReturnValue(false);

      const error = new Error('Unknown error');
      mockClient.get.mockRejectedValue(error);

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'unknown',
        message: 'Unknown error',
      });
    });

    it('should handle errors with object message in response', async () => {
      const mockClient = (client as any).client;
      const error = {
        response: {
          status: 400,
          data: { message: 'Invalid request format' },
        },
      };

      mockClient.get.mockRejectedValue(error);

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'unknown',
        message: 'Invalid request format',
        statusCode: 400,
      });
    });

    it('should provide default messages for status codes without server message', async () => {
      const mockClient = (client as any).client;
      const error = {
        response: {
          status: 404,
          data: {},
        },
      };

      mockClient.get.mockRejectedValue(error);

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'not_found',
        message: 'Attendee not found for this conference',
        statusCode: 404,
      });
    });
  });

  describe('createApiClient', () => {
    it('should create a new API client instance', () => {
      const url = 'https://example.com/api/';
      const newClient = createApiClient(url);

      expect(newClient).toBeInstanceOf(ApiClient);
    });
  });
});
