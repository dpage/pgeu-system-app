import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonList,
  IonBadge,
  IonSpinner,
  IonIcon,
  IonSearchbar,
} from '@ionic/react';
import { helpCircleOutline, statsChartOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { useConferenceStore } from '../store/conferenceStore';
import { createApiClient } from '../services/apiClient';
import { CheckinRegistration } from '../types/api';
import HelpModal from '../components/HelpModal';
import { helpContent } from '../content/helpContent';
import '../scanner.css';

interface ScanResult {
  attendee: CheckinRegistration;
  alreadyCheckedIn: boolean;
}

const ScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<string>('Ready to scan');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<CheckinRegistration[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const conferences = useConferenceStore(state => state.conferences);
  const activeConferenceId = useConferenceStore(state => state.activeConferenceId);

  const activeConference = useMemo(
    () => activeConferenceId
      ? conferences.find(c => c.id === activeConferenceId) || null
      : null,
    [conferences, activeConferenceId]
  );

  // Generate scanner title based on mode
  const scannerTitle = useMemo(() => {
    if (!activeConference) return 'Scanner';

    switch (activeConference.mode) {
      case 'checkin':
        return 'Check-In Scanner';
      case 'sponsor':
        return 'Sponsor Scanner';
      case 'field':
        if (activeConference.fieldId) {
          // Capitalize first letter of fieldId
          const fieldName = String(activeConference.fieldId);
          return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} Scanner`;
        }
        return 'Field Scanner';
      default:
        return 'Scanner';
    }
  }, [activeConference]);

  // Handle selected attendee from search
  useEffect(() => {
    const state = location.state as { selectedAttendee?: CheckinRegistration };
    if (state?.selectedAttendee) {
      console.log('[Scanner] Attendee selected from search:', state.selectedAttendee.name);
      setScanResult({
        attendee: state.selectedAttendee,
        alreadyCheckedIn: !!state.selectedAttendee.already,
      });
      setStatus('Attendee found via search');
      // Clear the state to prevent re-triggering on re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Note: Removed auto-scan to allow users to see search option
  // Users can now choose between scanning or searching

  const scan = async () => {
    console.log('[Scanner] scan() called');
    setStatus('Starting scan...');
    setScanResult(null);
    setError(null);
    setLoading(true);

    try {
      // Validate active conference
      if (!activeConference) {
        setError('No active conference selected. Please select a conference first.');
        setStatus('Error');
        setLoading(false);
        return;
      }

      // Check support
      const supported = await BarcodeScanner.isSupported();
      if (!supported.supported) {
        setError('Barcode scanning is not supported on this device');
        setStatus('Error');
        setLoading(false);
        return;
      }

      // Check permissions
      const permStatus = await BarcodeScanner.checkPermissions();
      if (permStatus.camera !== 'granted') {
        const permResult = await BarcodeScanner.requestPermissions();
        if (permResult.camera !== 'granted') {
          setError('Camera permission denied. Please enable camera access in settings.');
          setStatus('Error');
          setLoading(false);
          return;
        }
      }

      // Hide WebView and start scanning immediately
      setStatus('Scanning...');
      document.body.classList.add('barcode-scanner-active');

      // Add barcode listener
      const listener = await BarcodeScanner.addListener('barcodesScanned', async (result) => {
        console.log('[Scanner] Barcode scanned:', result);

        // Stop scanning and remove listener
        await BarcodeScanner.stopScan();
        await listener.remove();
        document.body.classList.remove('barcode-scanner-active');

        if (!result.barcodes || result.barcodes.length === 0) {
          setStatus('No barcode found');
          setLoading(false);
          return;
        }

        const qrCode = result.barcodes[0].rawValue;
        console.log('[Scanner] Scanned QR code:', qrCode);

        // Check for test barcode
        try {
          const scannedUrl = new URL(qrCode);
          const testPath = '/t/id/TESTTESTTESTTEST/';

          if (scannedUrl.pathname === testPath) {
            console.log('[Scanner] Test barcode detected');

            // Validate that the hostname matches the conference baseUrl
            const conferenceUrl = new URL(activeConference.baseUrl);

            if (scannedUrl.hostname === conferenceUrl.hostname) {
              console.log('[Scanner] Test barcode validation successful');
              setStatus('Camera test successful!');
              setError(null);
              setLoading(false);

              // Show success message for a few seconds, then reset
              setTimeout(() => {
                reset();
              }, 3000);
              return;
            } else {
              console.log('[Scanner] Test barcode server mismatch');
              setError(`Test barcode server mismatch. Expected: ${conferenceUrl.hostname}, Got: ${scannedUrl.hostname}`);
              setStatus('Error');
              setLoading(false);
              return;
            }
          }
        } catch (urlError) {
          // Not a valid URL or not a test barcode, continue with normal processing
          console.log('[Scanner] QR code is not a valid URL or not a test barcode');
        }

        setStatus('Looking up attendee...');

        // Lookup attendee via API
        console.log('[Scanner] Active conference:', JSON.stringify({
          id: activeConference.id,
          name: activeConference.name,
          baseUrl: activeConference.baseUrl,
          eventSlug: activeConference.eventSlug,
          mode: activeConference.mode,
          fieldId: activeConference.fieldId,
          token: activeConference.token ? '***' : undefined
        }));

        // Build API URL based on scan mode
        let apiUrl: string;
        if (activeConference.mode === 'sponsor') {
          apiUrl = `${activeConference.baseUrl}/events/sponsor/scanning/${activeConference.token}/`;
        } else if (activeConference.mode === 'field' && activeConference.fieldId) {
          apiUrl = `${activeConference.baseUrl}/events/${activeConference.eventSlug}/checkin/${activeConference.token}/f${activeConference.fieldId}/`;
        } else {
          // Default check-in mode
          apiUrl = `${activeConference.baseUrl}/events/${activeConference.eventSlug}/checkin/${activeConference.token}/`;
        }

        console.log('[Scanner] API URL:', apiUrl);
        const apiClient = createApiClient(apiUrl);

        try {
          console.log('[Scanner] Calling lookupAttendee...');
          const lookupResponse = await apiClient.lookupAttendee(qrCode);
          console.log('[Scanner] Lookup response:', lookupResponse);
          const attendee = 'reg' in lookupResponse ? (lookupResponse.reg as CheckinRegistration) : null;

          if (!attendee) {
            console.error('[Scanner] No attendee in response');
            setError('Invalid response from server');
            setStatus('Error');
            setLoading(false);
            return;
          }

          console.log('[Scanner] Attendee found:', attendee.name);
          setScanResult({
            attendee,
            alreadyCheckedIn: !!attendee.already,
          });
          setStatus('Attendee found');
          setLoading(false);
        } catch (apiError: any) {
          console.error('[Scanner] API error (full):', JSON.stringify(apiError, null, 2));
          console.error('[Scanner] API error message:', apiError.message);
          console.error('[Scanner] API error type:', apiError.type);
          console.error('[Scanner] API error details:', apiError.details);
          setError(apiError.message || 'Failed to lookup attendee');
          setStatus('Error');
          setLoading(false);
        }
      });

      // Start scanning
      await BarcodeScanner.startScan();
    } catch (error) {
      document.body.classList.remove('barcode-scanner-active');
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Scanner] Scan error:', msg);
      setError(`Scan failed: ${msg}`);
      setStatus('Error');
      setLoading(false);
    }
  };

  const checkIn = async () => {
    if (!scanResult || !activeConference) return;

    setCheckingIn(true);
    setError(null);

    try {
      // Build API URL based on scan mode
      let apiUrl: string;
      if (activeConference.mode === 'sponsor') {
        apiUrl = `${activeConference.baseUrl}/events/sponsor/scanning/${activeConference.token}/`;
      } else if (activeConference.mode === 'field' && activeConference.fieldId) {
        apiUrl = `${activeConference.baseUrl}/events/${activeConference.eventSlug}/checkin/${activeConference.token}/f${activeConference.fieldId}/`;
      } else {
        // Default check-in mode
        apiUrl = `${activeConference.baseUrl}/events/${activeConference.eventSlug}/checkin/${activeConference.token}/`;
      }

      const apiClient = createApiClient(apiUrl);

      await apiClient.store({ token: scanResult.attendee.token });

      setScanResult({
        ...scanResult,
        alreadyCheckedIn: true,
      });
      setStatus('Successfully checked in!');
    } catch (apiError: any) {
      console.error('[Scanner] Check-in error:', apiError);
      setError(apiError.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const reset = () => {
    setScanResult(null);
    setError(null);
    setStatus('Ready to scan');
    setSearchQuery('');
    setSearchResults([]);
  };

  // Search for attendees by name
  const performSearch = async (query: string) => {
    if (!activeConference || !query || query.trim().length === 0) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      // Build API URL
      let apiUrl: string;
      if (activeConference.mode === 'sponsor') {
        apiUrl = `${activeConference.baseUrl}/events/sponsor/scanning/${activeConference.token}/`;
      } else if (activeConference.mode === 'field' && activeConference.fieldId) {
        apiUrl = `${activeConference.baseUrl}/events/${activeConference.eventSlug}/checkin/${activeConference.token}/f${activeConference.fieldId}/`;
      } else {
        apiUrl = `${activeConference.baseUrl}/events/${activeConference.eventSlug}/checkin/${activeConference.token}/`;
      }

      const apiClient = createApiClient(apiUrl);
      const searchResponse = await apiClient.searchAttendees(query.trim());
      setSearchResults(searchResponse.regs || []);
    } catch (apiError: any) {
      console.error('[Scanner] Search error:', apiError);
      setSearchResults([]);
      // Don't show error for search, just return empty results
    } finally {
      setSearching(false);
    }
  };

  // Handle search input with debouncing
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search API calls
    if (value.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  };

  // Handle attendee selection from search results
  const handleAttendeeSelect = (attendee: CheckinRegistration) => {
    console.log('[Scanner] Attendee selected from search:', attendee.name);

    // Clear search
    setSearchQuery('');
    setSearchResults([]);

    // Show attendee details as if scanned
    setScanResult({
      attendee,
      alreadyCheckedIn: !!attendee.already,
    });
    setStatus('Attendee found via search');
  };

  // Helper function to highlight matching text
  const highlightMatch = (text: string, query: string): JSX.Element => {
    if (!query || query.trim().length === 0) {
      return <span>{text}</span>;
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      return <span>{text}</span>;
    }

    const before = text.substring(0, index);
    const match = text.substring(index, index + lowerQuery.length);
    const after = text.substring(index + lowerQuery.length);

    return (
      <span>
        {before}
        <strong>{match}</strong>
        {highlightMatch(after, '')}
      </span>
    );
  };

  const cancelScan = async () => {
    console.log('[Scanner] Cancel button clicked');
    try {
      // Stop scanning
      await BarcodeScanner.stopScan();
      console.log('[Scanner] Scanner stopped');

      // Remove active class
      document.body.classList.remove('barcode-scanner-active');

      // Reset state
      setLoading(false);
      setStatus('Scan cancelled');
      setError(null);

      // Navigate back to previous page
      navigate(-1);
    } catch (error) {
      console.error('[Scanner] Error canceling scan:', error);
      // Even if there's an error, still try to navigate back
      document.body.classList.remove('barcode-scanner-active');
      setLoading(false);
      navigate(-1);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/conferences" />
          </IonButtons>
          <IonTitle>{scannerTitle}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => navigate('/stats')}>
              <IonIcon slot="icon-only" icon={statsChartOutline} />
            </IonButton>
            <IonButton onClick={() => setShowHelp(true)}>
              <IonIcon slot="icon-only" icon={helpCircleOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Status and Action Buttons */}
        <div className="ion-text-center" style={{ marginTop: '20px' }}>
          {!scanResult ? (
            <>
              <IonButton expand="block" size="large" onClick={scan} disabled={loading}>
                {loading ? (
                  <>
                    <IonSpinner name="crescent" style={{ marginRight: '10px' }} />
                    {status}
                  </>
                ) : (
                  'Start Scan'
                )}
              </IonButton>
              <div style={{ marginTop: '20px' }}>
                <IonText color="medium">
                  <p>{status}</p>
                </IonText>
                {activeConference && (
                  <IonText color="medium">
                    <p style={{ fontSize: '14px' }}>Conference: {activeConference.name}</p>
                  </IonText>
                )}
              </div>
            </>
          ) : (
            <IonButton expand="block" onClick={reset}>
              Scan Another Attendee
            </IonButton>
          )}
        </div>

        {/* Search Bar - only show when not scanning and no result */}
        {!scanResult && !loading && (
          <div style={{ marginTop: '30px' }}>
            <IonSearchbar
              value={searchQuery}
              onIonInput={(e) => handleSearchChange(e.detail.value || '')}
              placeholder="Search by name..."
              debounce={0}
              disabled={!activeConference}
            />

            {/* Search Results Dropdown */}
            {searchQuery.trim().length > 0 && (
              <IonCard style={{ marginTop: '0', maxHeight: '400px', overflow: 'auto' }}>
                {searching && (
                  <IonCardContent style={{ textAlign: 'center', padding: '20px' }}>
                    <IonSpinner />
                    <IonText color="medium">
                      <p>Searching...</p>
                    </IonText>
                  </IonCardContent>
                )}

                {!searching && searchResults.length === 0 && (
                  <IonCardContent style={{ textAlign: 'center', padding: '20px' }}>
                    <IonText color="medium">
                      <p>No attendees found</p>
                    </IonText>
                  </IonCardContent>
                )}

                {!searching && searchResults.length > 0 && (
                  <IonList>
                    {searchResults.map((attendee, idx) => (
                      <IonItem
                        key={idx}
                        button
                        onClick={() => handleAttendeeSelect(attendee)}
                        detail={false}
                      >
                        <IonLabel>
                          <h2>{highlightMatch(attendee.name, searchQuery)}</h2>
                          {attendee.company && (
                            <p>{highlightMatch(attendee.company, searchQuery)}</p>
                          )}
                          {attendee.type && (
                            <IonText color="medium">
                              <p style={{ fontSize: '12px' }}>{attendee.type}</p>
                            </IonText>
                          )}
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </IonCard>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <IonCard color="danger" style={{ marginTop: '20px' }}>
            <IonCardContent>
              <IonText color="light">
                <p style={{ margin: 0 }}>{error}</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        )}

        {/* Attendee Information */}
        {scanResult && (
          <div style={{ marginTop: '20px' }}>
            {/* Already Checked In Warning */}
            {scanResult.alreadyCheckedIn && scanResult.attendee.already && (
              <IonCard color="warning">
                <IonCardHeader>
                  <IonCardTitle>{scanResult.attendee.already.title}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonText>
                    <p>{scanResult.attendee.already.body}</p>
                  </IonText>
                </IonCardContent>
              </IonCard>
            )}

            {/* Attendee Details Card */}
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>{scanResult.attendee.name}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  {scanResult.attendee.company && (
                    <IonItem>
                      <IonLabel>
                        <strong>Company:</strong> {scanResult.attendee.company}
                      </IonLabel>
                    </IonItem>
                  )}
                  <IonItem>
                    <IonLabel>
                      <strong>Type:</strong> {scanResult.attendee.type}
                    </IonLabel>
                  </IonItem>
                  {scanResult.attendee.tshirt && (
                    <IonItem>
                      <IonLabel>
                        <strong>T-Shirt:</strong> {scanResult.attendee.tshirt}
                      </IonLabel>
                    </IonItem>
                  )}
                  {scanResult.attendee.partition && (
                    <IonItem>
                      <IonLabel>
                        <strong>Partition:</strong> {scanResult.attendee.partition}
                      </IonLabel>
                    </IonItem>
                  )}
                  {scanResult.attendee.photoconsent && (
                    <IonItem>
                      <IonLabel>
                        <strong>Photo Consent:</strong> {scanResult.attendee.photoconsent}
                      </IonLabel>
                    </IonItem>
                  )}
                  {scanResult.attendee.policyconfirmed && (
                    <IonItem>
                      <IonLabel>
                        <strong>Policy Confirmed:</strong> {scanResult.attendee.policyconfirmed}
                      </IonLabel>
                    </IonItem>
                  )}
                </IonList>

                {/* Highlight Badges */}
                {scanResult.attendee.highlight && scanResult.attendee.highlight.length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    {scanResult.attendee.highlight.map((hl, idx) => (
                      <IonBadge key={idx} color="primary" style={{ marginRight: '5px', marginBottom: '5px' }}>
                        {hl}
                      </IonBadge>
                    ))}
                  </div>
                )}

                {/* Additional Information */}
                {scanResult.attendee.additional && scanResult.attendee.additional.length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <IonText color="medium">
                      <p><strong>Additional Info:</strong></p>
                    </IonText>
                    {scanResult.attendee.additional.map((info, idx) => (
                      <IonText key={idx}>
                        <p style={{ marginTop: '5px', fontSize: '14px' }}>{info}</p>
                      </IonText>
                    ))}
                  </div>
                )}

                {/* Check-in Message */}
                {scanResult.attendee.checkinmessage && (
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
                    <IonText>
                      <p style={{ margin: 0 }}>{scanResult.attendee.checkinmessage}</p>
                    </IonText>
                  </div>
                )}
              </IonCardContent>
            </IonCard>

            {/* Check-In Button */}
            {!scanResult.alreadyCheckedIn && (
              <IonButton
                expand="block"
                size="large"
                color="success"
                onClick={checkIn}
                disabled={checkingIn}
                style={{ marginTop: '20px' }}
              >
                {checkingIn ? (
                  <>
                    <IonSpinner name="crescent" style={{ marginRight: '10px' }} />
                    Checking In...
                  </>
                ) : (
                  'Check In Attendee'
                )}
              </IonButton>
            )}
          </div>
        )}
      </IonContent>

      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        helpSection={helpContent.scanning}
      />

      {/* Scanner Overlay with Focus Box */}
      <div className="scanner-overlay barcode-scanner-modal">
        <button className="scanner-cancel-button" onClick={cancelScan}>
          Cancel
        </button>
        <div className="scanner-focus-box">
          <div className="scanner-focus-corner top-left"></div>
          <div className="scanner-focus-corner top-right"></div>
          <div className="scanner-focus-corner bottom-left"></div>
          <div className="scanner-focus-corner bottom-right"></div>
          <div className="scanner-scan-line"></div>
          <div className="scanner-instruction">
            Position QR code within frame
          </div>
        </div>
      </div>
    </IonPage>
  );
};

export default ScannerPage;
