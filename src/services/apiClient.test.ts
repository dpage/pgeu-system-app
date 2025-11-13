/**
 * API Client Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type {
  StatusResponse,
  CheckinLookupResponse,
  SearchResponse,
  CheckinStoreResponse,
  StatsResponse,
} from '../types/api';

// Import the globally mocked CapacitorHttp from setup.ts
import { CapacitorHttp } from '@capacitor/core';
import { ApiClient, createApiClient } from './apiClient';

// Get references to the mocked functions
const mockRequest = vi.mocked(CapacitorHttp.request);

describe('ApiClient', () => {
  let client: ApiClient;
  const baseUrl = 'https://postgresql.eu/events/pgconf2024/checkin/abc123/';

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ApiClient(baseUrl);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should normalize baseUrl to end with /', () => {
      const client1 = new ApiClient('https://example.com/path');
      expect((client1 as any).baseUrl).toBe('https://example.com/path/');

      const client2 = new ApiClient('https://example.com/path/');
      expect((client2 as any).baseUrl).toBe('https://example.com/path/');
    });

    it('should configure baseUrl correctly', () => {
      expect((client as any).baseUrl).toBe(baseUrl);
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

      mockRequest.mockResolvedValue({
        data: mockResponse,
        status: 200,
        headers: {},
        url: '',
      });

      const result = await client.getStatus();

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

      mockRequest.mockResolvedValue({
        data: mockResponse,
        status: 200,
        headers: {},
        url: '',
      });

      await client.getStatus({ timeout: 3000 });

      expect(mockRequest).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockRequest.mockRejectedValue(networkError);

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'network_error',
      });
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockRequest.mockRejectedValue(timeoutError);

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'timeout',
      });
    });

    it('should handle 403 forbidden errors', async () => {
      mockRequest.mockResolvedValue({
        data: { message: 'Forbidden' },
        status: 403,
        headers: {},
        url: '',
      });

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'forbidden',
      });
    });

    it('should handle 500 server errors', async () => {
      mockRequest.mockResolvedValue({
        data: { message: 'Server error' },
        status: 500,
        headers: {},
        url: '',
      });

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'server_error',
      });
    }, 10000);
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

      mockRequest.mockResolvedValue({
        data: mockResponse,
        status: 200,
        headers: {},
        url: '',
      });

      const qrCode = 'ID$def456$ID';
      const result = await client.lookupAttendee(qrCode);

      expect(result).toEqual(mockResponse);
    });

    it('should handle 404 not found errors', async () => {
      mockRequest.mockResolvedValue({
        data: { message: 'Not found' },
        status: 404,
        headers: {},
        url: '',
      });

      await expect(client.lookupAttendee('invalid')).rejects.toMatchObject({
        type: 'not_found',
      });
    });

    it('should handle 412 precondition failed errors', async () => {
      mockRequest.mockResolvedValue({
        data: { message: 'Check-in not active' },
        status: 412,
        headers: {},
        url: '',
      });

      await expect(client.lookupAttendee('token')).rejects.toMatchObject({
        type: 'precondition_failed',
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

      mockRequest.mockResolvedValue({
        data: mockResponse,
        status: 200,
        headers: {},
        url: '',
      });

      const result = await client.searchAttendees('John Doe');

      expect(result.regs).toHaveLength(1);
    });

    it('should return empty array for no matches', async () => {
      const mockResponse: SearchResponse = {
        regs: [],
      };

      mockRequest.mockResolvedValue({
        data: mockResponse,
        status: 200,
        headers: {},
        url: '',
      });

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

      mockRequest.mockResolvedValue({
        data: mockResponse,
        status: 200,
        headers: {},
        url: '',
      });

      const result = await client.store({ token: 'abc123' });

      expect(mockRequest).toHaveBeenCalled();
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

      mockRequest.mockResolvedValue({
        data: mockResponse,
        status: 200,
        headers: {},
        url: '',
      });

      await client.store({ token: 'abc123', note: 'Interested in product' });

      expect(mockRequest).toHaveBeenCalled();
    });

    it('should handle already checked in error', async () => {
      mockRequest.mockResolvedValue({
        data: { message: 'Already checked in' },
        status: 412,
        headers: {},
        url: '',
      });

      await expect(client.store({ token: 'abc123' })).rejects.toMatchObject({
        type: 'precondition_failed',
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

      mockRequest.mockResolvedValue({
        data: mockResponse,
        status: 200,
        headers: {},
        url: '',
      });

      const result = await client.getStats();

      expect(result).toEqual(mockResponse);
    });

    it('should handle 403 for non-admin users', async () => {
      mockRequest.mockResolvedValue({
        data: { message: 'Admin access required' },
        status: 403,
        headers: {},
        url: '',
      });

      await expect(client.getStats()).rejects.toMatchObject({
        type: 'forbidden',
      });
    });
  });

  describe('error handling', () => {
    it('should handle non-HTTP errors', async () => {
      const error = new Error('Unknown error');
      mockRequest.mockRejectedValue(error);

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'network_error',
      });
    });

    it('should handle errors with object message in response', async () => {
      mockRequest.mockResolvedValue({
        data: { message: 'Custom error message' },
        status: 400,
        headers: {},
        url: '',
      });

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'unknown',
      });
    });

    it('should provide default messages for status codes without server message', async () => {
      mockRequest.mockResolvedValue({
        data: {},
        status: 404,
        headers: {},
        url: '',
      });

      await expect(client.getStatus()).rejects.toMatchObject({
        type: 'not_found',
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
