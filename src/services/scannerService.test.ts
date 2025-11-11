/**
 * Scanner Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CapacitorBarcodeScanner } from '@capacitor/barcode-scanner';
import { ScannerService } from './scannerService';

// Mock Capacitor BarcodeScanner
vi.mock('@capacitor/barcode-scanner', () => ({
  CapacitorBarcodeScanner: {
    scanBarcode: vi.fn(),
  },
  CapacitorBarcodeScannerTypeHint: {
    QR_CODE: 0,
    ALL: 17,
  },
}));

describe('ScannerService', () => {
  let service: ScannerService;

  beforeEach(() => {
    service = new ScannerService();
    vi.clearAllMocks();
  });

  describe('isSupported', () => {
    it('should return true (plugin handles platform support)', async () => {
      const result = await service.isSupported();
      expect(result).toBe(true);
    });
  });

  describe('checkPermission', () => {
    it('should return prompt (permissions handled by plugin)', async () => {
      const result = await service.checkPermission();
      expect(result).toBe('prompt');
    });
  });

  describe('requestPermission', () => {
    it('should return prompt (permissions handled by plugin)', async () => {
      const result = await service.requestPermission();
      expect(result).toBe('prompt');
    });
  });

  describe('startScan', () => {
    const onScan = vi.fn();
    const onError = vi.fn();

    beforeEach(() => {
      onScan.mockClear();
      onError.mockClear();
    });

    it('should call onScan with valid ID token', async () => {
      vi.mocked(CapacitorBarcodeScanner.scanBarcode).mockResolvedValue({
        ScanResult: 'ID$abcdef1234567890abcdef1234567890abcdef12$ID',
        format: 0, // QR_CODE
      });

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).toHaveBeenCalledTimes(1);
      expect(onScan.mock.calls[0][0].parsedCode.tokenType).toBe('ID');
      expect(onError).not.toHaveBeenCalled();

      cleanup();
    });

    it('should call onScan with valid AT token', async () => {
      vi.mocked(CapacitorBarcodeScanner.scanBarcode).mockResolvedValue({
        ScanResult: 'AT$abcdef1234567890abcdef1234567890abcdef12$AT',
        format: 0,
      });

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).toHaveBeenCalledTimes(1);
      expect(onScan.mock.calls[0][0].parsedCode.tokenType).toBe('AT');
      expect(onError).not.toHaveBeenCalled();

      cleanup();
    });

    it('should call onScan with test token', async () => {
      vi.mocked(CapacitorBarcodeScanner.scanBarcode).mockResolvedValue({
        ScanResult: 'ID$TESTTESTTESTTEST$ID',
        format: 0,
      });

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).toHaveBeenCalledTimes(1);
      expect(onScan.mock.calls[0][0].parsedCode.isTestToken).toBe(true);
      expect(onError).not.toHaveBeenCalled();

      cleanup();
    });

    it('should call onError for invalid QR code', async () => {
      vi.mocked(CapacitorBarcodeScanner.scanBarcode).mockResolvedValue({
        ScanResult: 'INVALID_QR_CODE',
        format: 0,
      });

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].type).toBe('invalid_qr_code');

      cleanup();
    });

    it('should call onError when permission denied', async () => {
      vi.mocked(CapacitorBarcodeScanner.scanBarcode).mockRejectedValue(
        new Error('Camera permission denied')
      );

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].type).toBe('permission_denied');

      cleanup();
    });

    it('should not call callbacks when scan returns empty result', async () => {
      vi.mocked(CapacitorBarcodeScanner.scanBarcode).mockResolvedValue({
        ScanResult: '',
        format: 0,
      });

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();

      cleanup();
    });

    it('should call onError on scanner exception', async () => {
      vi.mocked(CapacitorBarcodeScanner.scanBarcode).mockRejectedValue(
        new Error('Camera failed')
      );

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].type).toBe('unknown');
      expect(onError.mock.calls[0][0].message).toContain('Camera failed');

      cleanup();
    });

    it('should include timestamp in scan result', async () => {
      vi.mocked(CapacitorBarcodeScanner.scanBarcode).mockResolvedValue({
        ScanResult: 'ID$abcdef1234567890abcdef1234567890abcdef12$ID',
        format: 0,
      });

      const beforeTime = Date.now();
      await service.startScan(onScan, onError);
      const afterTime = Date.now();

      expect(onScan).toHaveBeenCalledTimes(1);
      const timestamp = onScan.mock.calls[0][0].timestamp;
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('prepare', () => {
    it('should return ready (plugin handles all checks)', async () => {
      const result = await service.prepare();
      expect(result.ready).toBe(true);
    });
  });

  describe('stopScan', () => {
    it('should complete without error', async () => {
      await expect(service.stopScan()).resolves.toBeUndefined();
    });
  });
});
