/**
 * Scanner Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { ScannerService } from './scannerService';

// Mock Capacitor ML Kit BarcodeScanner
vi.mock('@capacitor-mlkit/barcode-scanning', () => ({
  BarcodeScanner: {
    scan: vi.fn(),
    isSupported: vi.fn(),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
  },
}));

describe('ScannerService', () => {
  let service: ScannerService;

  beforeEach(() => {
    service = new ScannerService();
    vi.clearAllMocks();
  });

  describe('isSupported', () => {
    it('should return true when scanner is supported', async () => {
      vi.mocked(BarcodeScanner.isSupported).mockResolvedValue({ supported: true });
      const result = await service.isSupported();
      expect(result).toBe(true);
    });

    it('should return false when scanner is not supported', async () => {
      vi.mocked(BarcodeScanner.isSupported).mockResolvedValue({ supported: false });
      const result = await service.isSupported();
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      vi.mocked(BarcodeScanner.isSupported).mockRejectedValue(new Error('Not available'));
      const result = await service.isSupported();
      expect(result).toBe(false);
    });
  });

  describe('checkPermission', () => {
    it('should return granted when permission is granted', async () => {
      vi.mocked(BarcodeScanner.checkPermissions).mockResolvedValue({ camera: 'granted' });
      const result = await service.checkPermission();
      expect(result).toBe('granted');
    });

    it('should return denied when permission is denied', async () => {
      vi.mocked(BarcodeScanner.checkPermissions).mockResolvedValue({ camera: 'denied' });
      const result = await service.checkPermission();
      expect(result).toBe('denied');
    });

    it('should return prompt when permission is prompt', async () => {
      vi.mocked(BarcodeScanner.checkPermissions).mockResolvedValue({ camera: 'prompt' });
      const result = await service.checkPermission();
      expect(result).toBe('prompt');
    });

    it('should return prompt on error', async () => {
      vi.mocked(BarcodeScanner.checkPermissions).mockRejectedValue(new Error('Failed'));
      const result = await service.checkPermission();
      expect(result).toBe('prompt');
    });
  });

  describe('requestPermission', () => {
    it('should return granted when permission is granted', async () => {
      vi.mocked(BarcodeScanner.requestPermissions).mockResolvedValue({ camera: 'granted' });
      const result = await service.requestPermission();
      expect(result).toBe('granted');
    });

    it('should return denied when permission is denied', async () => {
      vi.mocked(BarcodeScanner.requestPermissions).mockResolvedValue({ camera: 'denied' });
      const result = await service.requestPermission();
      expect(result).toBe('denied');
    });

    it('should return denied on error', async () => {
      vi.mocked(BarcodeScanner.requestPermissions).mockRejectedValue(new Error('Failed'));
      const result = await service.requestPermission();
      expect(result).toBe('denied');
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
      vi.mocked(BarcodeScanner.scan).mockResolvedValue({
        barcodes: [
          {
            rawValue: 'ID$abcdef1234567890abcdef1234567890abcdef12$ID',
            displayValue: 'ID$abcdef1234567890abcdef1234567890abcdef12$ID',
            format: 'QR_CODE' as any,
            valueType: 'TEXT' as any,
          },
        ],
      });

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).toHaveBeenCalledTimes(1);
      expect(onScan.mock.calls[0][0].parsedCode.tokenType).toBe('ID');
      expect(onError).not.toHaveBeenCalled();

      cleanup();
    });

    it('should call onScan with valid AT token', async () => {
      vi.mocked(BarcodeScanner.scan).mockResolvedValue({
        barcodes: [
          {
            rawValue: 'AT$abcdef1234567890abcdef1234567890abcdef12$AT',
            displayValue: 'AT$abcdef1234567890abcdef1234567890abcdef12$AT',
            format: 'QR_CODE' as any,
            valueType: 'TEXT' as any,
          },
        ],
      });

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).toHaveBeenCalledTimes(1);
      expect(onScan.mock.calls[0][0].parsedCode.tokenType).toBe('AT');
      expect(onError).not.toHaveBeenCalled();

      cleanup();
    });

    it('should call onScan with test token', async () => {
      vi.mocked(BarcodeScanner.scan).mockResolvedValue({
        barcodes: [
          {
            rawValue: 'ID$TESTTESTTESTTEST$ID',
            displayValue: 'ID$TESTTESTTESTTEST$ID',
            format: 'QR_CODE' as any,
            valueType: 'TEXT' as any,
          },
        ],
      });

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).toHaveBeenCalledTimes(1);
      expect(onScan.mock.calls[0][0].parsedCode.isTestToken).toBe(true);
      expect(onError).not.toHaveBeenCalled();

      cleanup();
    });

    it('should call onError for invalid QR code', async () => {
      vi.mocked(BarcodeScanner.scan).mockResolvedValue({
        barcodes: [
          {
            rawValue: 'INVALID_QR_CODE',
            displayValue: 'INVALID_QR_CODE',
            format: 'QR_CODE' as any,
            valueType: 'TEXT' as any,
          },
        ],
      });

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].type).toBe('invalid_qr_code');

      cleanup();
    });

    it('should call onError when permission denied', async () => {
      vi.mocked(BarcodeScanner.scan).mockRejectedValue(
        new Error('Camera permission denied')
      );

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].type).toBe('permission_denied');

      cleanup();
    });

    it('should not call callbacks when scan returns empty result', async () => {
      vi.mocked(BarcodeScanner.scan).mockResolvedValue({
        barcodes: [],
      });

      const cleanup = await service.startScan(onScan, onError);

      expect(onScan).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();

      cleanup();
    });

    it('should call onError on scanner exception', async () => {
      vi.mocked(BarcodeScanner.scan).mockRejectedValue(
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
      vi.mocked(BarcodeScanner.scan).mockResolvedValue({
        barcodes: [
          {
            rawValue: 'ID$abcdef1234567890abcdef1234567890abcdef12$ID',
            displayValue: 'ID$abcdef1234567890abcdef1234567890abcdef12$ID',
            format: 'QR_CODE' as any,
            valueType: 'TEXT' as any,
          },
        ],
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
    it('should return ready when scanner is supported', async () => {
      vi.mocked(BarcodeScanner.isSupported).mockResolvedValue({ supported: true });
      const result = await service.prepare();
      expect(result.ready).toBe(true);
    });

    it('should return not ready when scanner is not supported', async () => {
      vi.mocked(BarcodeScanner.isSupported).mockResolvedValue({ supported: false });
      const result = await service.prepare();
      expect(result.ready).toBe(false);
      if (!result.ready) {
        expect(result.error.type).toBe('unsupported');
      }
    });
  });

  describe('stopScan', () => {
    it('should complete without error', async () => {
      await expect(service.stopScan()).resolves.toBeUndefined();
    });
  });
});
