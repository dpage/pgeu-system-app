/**
 * Minimal Scanner Test Page
 * Bare-bones implementation to test ML Kit barcode scanning
 */

import { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonText,
} from '@ionic/react';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

const ScannerTestPage: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready to scan');
  const [result, setResult] = useState<string>('');

  const handleScan = async () => {
    console.log('[TEST] Starting scan...');
    setStatus('Preparing...');

    try {
      // Check support
      const supported = await BarcodeScanner.isSupported();
      console.log('[TEST] Supported:', supported);
      setStatus(`Supported: ${supported.supported}`);

      if (!supported.supported) {
        setStatus('ERROR: Scanner not supported');
        return;
      }

      // Check permissions
      const permStatus = await BarcodeScanner.checkPermissions();
      console.log('[TEST] Permission status:', permStatus);
      setStatus(`Permission: ${permStatus.camera}`);

      if (permStatus.camera !== 'granted') {
        const permResult = await BarcodeScanner.requestPermissions();
        console.log('[TEST] Permission request result:', permResult);
        if (permResult.camera !== 'granted') {
          setStatus('ERROR: Camera permission denied');
          return;
        }
      }

      // Hide the WebView to show camera
      setStatus('Scanning... (hiding UI)');
      document.body.classList.add('barcode-scanner-active');
      console.log('[TEST] Added barcode-scanner-active class');

      // Start scan
      console.log('[TEST] Calling BarcodeScanner.scan()');
      const scanResult = await BarcodeScanner.scan();
      console.log('[TEST] Scan result:', scanResult);

      // Restore UI
      document.body.classList.remove('barcode-scanner-active');
      console.log('[TEST] Removed barcode-scanner-active class');

      if (scanResult.barcodes && scanResult.barcodes.length > 0) {
        const code = scanResult.barcodes[0].rawValue;
        setResult(code);
        setStatus('SUCCESS: Scanned code');
        console.log('[TEST] Scanned code:', code);
      } else {
        setStatus('No barcode detected');
        console.log('[TEST] No barcodes in result');
      }
    } catch (error) {
      // Restore UI on error
      document.body.classList.remove('barcode-scanner-active');
      const errorMsg = error instanceof Error ? error.message : String(error);
      setStatus(`ERROR: ${errorMsg}`);
      console.error('[TEST] Error:', error);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Scanner Test</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <h2>Minimal Scanner Test</h2>

          <IonButton
            expand="block"
            size="large"
            onClick={handleScan}
            style={{ marginTop: '20px' }}
          >
            Start Scan
          </IonButton>

          <div style={{ marginTop: '40px' }}>
            <IonText>
              <p><strong>Status:</strong></p>
              <p>{status}</p>
            </IonText>
          </div>

          {result && (
            <div style={{ marginTop: '20px', padding: '20px', background: '#e0e0e0' }}>
              <IonText>
                <p><strong>Scanned Code:</strong></p>
                <p style={{ wordBreak: 'break-all' }}>{result}</p>
              </IonText>
            </div>
          )}

          <div style={{ marginTop: '40px', fontSize: '12px' }}>
            <IonText color="medium">
              <p>Check browser console for detailed logs</p>
            </IonText>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ScannerTestPage;
