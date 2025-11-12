/**
 * Conference List Page
 * Displays all stored conferences and allows selecting/managing them
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonButtons,
  IonIcon,
  IonText,
  IonSpinner,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonBadge,
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonModal,
} from '@ionic/react';
import { add, trash, radio, radioOutline, qrCodeOutline, helpCircleOutline, statsChartOutline, chevronDown, close, checkmarkCircle, closeCircle, stopCircle } from 'ionicons/icons';
import { useConferenceStore } from '../store/conferenceStore';
import { createApiClient } from '../services/apiClient';
import { CheckinRegistration } from '../types/api';
import HelpModal from '../components/HelpModal';
import { helpContent } from '../content/helpContent';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

const ConferenceListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);
  const [showConferenceModal, setShowConferenceModal] = useState(false);
  const [hideMainContent, setHideMainContent] = useState(false);

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<CheckinRegistration | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  const {
    conferences,
    activeConferenceId,
    isLoading,
    error,
    setActiveConference,
    deleteConference,
    clearError,
  } = useConferenceStore();

  // Check if we should open the modal based on navigation state
  useEffect(() => {
    const state = location.state as { openModal?: boolean };
    console.log('[ConferenceList] Navigation state:', state);

    if (state?.openModal) {
      console.log('[ConferenceList] Opening modal from navigation state');
      // Hide main content immediately to prevent flash
      setHideMainContent(true);
      // Use setTimeout to allow navigation transition to complete before opening modal
      setTimeout(() => {
        setShowConferenceModal(true);
      }, 100);
      // Clear the state to prevent re-opening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<CheckinRegistration[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddConference = () => {
    navigate('/conferences/add');
  };

  const handleStats = () => {
    navigate('/stats');
  };

  const handleScan = async () => {
    // If there's no active conference and only one conference, activate it first
    if (!activeConferenceId && conferences.length === 1) {
      await setActiveConference(conferences[0].id);
    }

    // Verify we have an active conference before scanning
    const currentState = useConferenceStore.getState();
    if (!currentState.activeConferenceId) {
      console.error('Failed to set active conference - no activeConferenceId');
      return;
    }

    // Start scanning directly
    startScan();
  };

  const startScan = async () => {
    const activeConf = conferences.find(c => c.id === activeConferenceId);
    if (!activeConf) {
      setScanError('No active conference selected');
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      // Check support
      const supported = await BarcodeScanner.isSupported();
      if (!supported.supported) {
        setScanError('Barcode scanning is not supported on this device');
        setIsScanning(false);
        return;
      }

      // Check permissions
      const permStatus = await BarcodeScanner.checkPermissions();
      if (permStatus.camera !== 'granted') {
        const permResult = await BarcodeScanner.requestPermissions();
        if (permResult.camera !== 'granted') {
          setScanError('Camera permission denied. Please enable camera access in settings.');
          setIsScanning(false);
          return;
        }
      }

      // Hide WebView and start scanning
      document.body.classList.add('barcode-scanner-active');

      // Add barcode listener
      const listener = await BarcodeScanner.addListener('barcodesScanned', async (result) => {
        console.log('[Scanner] Barcode scanned:', result);

        // Stop scanning and remove listener
        await BarcodeScanner.stopScan();
        await listener.remove();
        document.body.classList.remove('barcode-scanner-active');

        if (!result.barcodes || result.barcodes.length === 0) {
          setScanError('No barcode found');
          setIsScanning(false);
          return;
        }

        const qrCode = result.barcodes[0].rawValue;
        console.log('[Scanner] Scanned QR code:', qrCode);

        // Build API URL based on scan mode
        let apiUrl: string;
        if (activeConf.mode === 'sponsor') {
          apiUrl = `${activeConf.baseUrl}/events/sponsor/scanning/${activeConf.token}/`;
        } else if (activeConf.mode === 'field' && activeConf.fieldId) {
          apiUrl = `${activeConf.baseUrl}/events/${activeConf.eventSlug}/checkin/${activeConf.token}/f${activeConf.fieldId}/`;
        } else {
          apiUrl = `${activeConf.baseUrl}/events/${activeConf.eventSlug}/checkin/${activeConf.token}/`;
        }

        const apiClient = createApiClient(apiUrl);

        try {
          const lookupResponse = await apiClient.lookupAttendee(qrCode);
          const attendee = 'reg' in lookupResponse ? (lookupResponse.reg as CheckinRegistration) : null;

          if (!attendee) {
            setScanError('Invalid response from server');
            setIsScanning(false);
            return;
          }

          console.log('[Scanner] Attendee found:', attendee.name);
          setScanResult(attendee);
          setAlreadyCheckedIn(!!attendee.already);
          setIsScanning(false);
        } catch (apiError: any) {
          console.error('[Scanner] API error:', apiError);
          setScanError(apiError.message || 'Failed to lookup attendee');
          setIsScanning(false);
        }
      });

      // Start scanning
      await BarcodeScanner.startScan();
    } catch (error) {
      document.body.classList.remove('barcode-scanner-active');
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Scanner] Scan error:', msg);
      setScanError(`Scan failed: ${msg}`);
      setIsScanning(false);
    }
  };

  const checkIn = async () => {
    if (!scanResult) return;

    const activeConf = conferences.find(c => c.id === activeConferenceId);
    if (!activeConf) return;

    setCheckingIn(true);
    setScanError(null);

    try {
      let apiUrl: string;
      if (activeConf.mode === 'sponsor') {
        apiUrl = `${activeConf.baseUrl}/events/sponsor/scanning/${activeConf.token}/`;
      } else if (activeConf.mode === 'field' && activeConf.fieldId) {
        apiUrl = `${activeConf.baseUrl}/events/${activeConf.eventSlug}/checkin/${activeConf.token}/f${activeConf.fieldId}/`;
      } else {
        apiUrl = `${activeConf.baseUrl}/events/${activeConf.eventSlug}/checkin/${activeConf.token}/`;
      }

      const apiClient = createApiClient(apiUrl);
      await apiClient.store({ token: scanResult.token });
      setAlreadyCheckedIn(true);
    } catch (apiError: any) {
      console.error('[Scanner] Check-in error:', apiError);
      setScanError(apiError.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setScanError(null);
    setAlreadyCheckedIn(false);
  };

  const cancelScan = async () => {
    console.log('[Scanner] Cancelling scan');
    try {
      await BarcodeScanner.stopScan();
      document.body.classList.remove('barcode-scanner-active');
      setIsScanning(false);
      setScanError(null);
    } catch (error) {
      console.error('[Scanner] Error cancelling scan:', error);
    }
  };

  // Search functionality
  const performSearch = async (query: string) => {
    if (!activeConferenceId || !query || query.trim().length === 0) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const activeConference = conferences.find(c => c.id === activeConferenceId);
    if (!activeConference) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const trimmedQuery = query.trim();

    try {
      // Build API URL based on conference mode
      let apiUrl: string;
      if (activeConference.mode === 'sponsor') {
        apiUrl = `${activeConference.baseUrl}/events/sponsor/scanning/${activeConference.token}/`;
      } else if (activeConference.mode === 'field' && activeConference.fieldId) {
        apiUrl = `${activeConference.baseUrl}/events/${activeConference.eventSlug}/checkin/${activeConference.token}/f${activeConference.fieldId}/`;
      } else {
        apiUrl = `${activeConference.baseUrl}/events/${activeConference.eventSlug}/checkin/${activeConference.token}/`;
      }

      console.log('[ConferenceList] Performing search:', {
        query: trimmedQuery,
        apiUrl,
        mode: activeConference.mode,
        eventSlug: activeConference.eventSlug,
      });

      const apiClient = createApiClient(apiUrl);
      const searchResponse = await apiClient.searchAttendees(trimmedQuery);

      console.log('[ConferenceList] Search response:', {
        query: trimmedQuery,
        resultCount: searchResponse.regs?.length || 0,
        results: searchResponse.regs?.map(r => ({ id: r.id, name: r.name })) || [],
      });

      // Set results (with longer debounce, race conditions are less likely)
      setSearchResults(searchResponse.regs || []);
    } catch (apiError: any) {
      console.error('[ConferenceList] Search error:', {
        query: trimmedQuery,
        error: apiError,
        errorType: apiError?.type,
        errorMessage: apiError?.message,
        statusCode: apiError?.statusCode,
      });

      // Clear results on error
      setSearchResults([]);
    } finally {
      // Always stop the searching spinner, even if query has changed
      setSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 800);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  };

  const handleAttendeeSelect = async (attendee: CheckinRegistration) => {
    console.log('[ConferenceList] Attendee selected from search:', attendee.name);
    setSearchQuery('');
    setSearchResults([]);

    // Show attendee in scan result modal
    setScanResult(attendee);
    setAlreadyCheckedIn(!!attendee.already);
  };

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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getDisplayName = (conference: any): string => {
    if (conference.mode === 'sponsor') {
      return 'Sponsor Scanning';
    }
    // For both field and regular check-in, just show the event name
    return conference.eventSlug || 'Event';
  };

  const getModeLabel = (mode: string, fieldId?: string | number | null): string => {
    switch (mode) {
      case 'checkin':
        return 'check-in';
      case 'sponsor':
        return 'sponsor-scan';
      case 'field':
        return fieldId ? String(fieldId) : 'field-scan';
      default:
        return mode;
    }
  };

  const activeConference = conferences.find(c => c.id === activeConferenceId);

  const handleConferenceSelect = async (id: string) => {
    await setActiveConference(id);
    setShowConferenceModal(false);
    setHideMainContent(false);
  };

  const handleConferenceDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this conference?')) {
      await deleteConference(id);
    }
  };

  return (
    <IonPage>
      <IonHeader style={{ visibility: hideMainContent ? 'hidden' : 'visible' }}>
        <IonToolbar color="primary">
          <IonTitle>Conference Scanner</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleStats}>
              <IonIcon slot="icon-only" icon={statsChartOutline} />
            </IonButton>
            <IonButton onClick={() => setShowHelp(true)}>
              <IonIcon slot="icon-only" icon={helpCircleOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {error && (
          <div className="ion-padding">
            <IonText color="danger">
              <p>{error}</p>
            </IonText>
            <IonButton size="small" onClick={clearError}>
              Dismiss
            </IonButton>
          </div>
        )}

        {isLoading ? (
          <div className="ion-padding ion-text-center">
            <IonSpinner />
            <p>Loading conferences...</p>
          </div>
        ) : conferences.length === 0 ? (
          <div className="ion-padding ion-text-center" style={{ marginTop: '50%' }}>
            <IonText color="medium">
              <h2>No Conference Scans</h2>
              <p>Add a conference scan to get started</p>
            </IonText>
            <IonButton onClick={handleAddConference}>
              <IonIcon slot="start" icon={add} />
              Add Conference Scan
            </IonButton>
          </div>
        ) : (
          <>
            {/* Scan Button - Shown when conferences exist */}
            <div className="ion-padding" style={{ visibility: hideMainContent ? 'hidden' : 'visible' }}>
              <IonButton
                expand="block"
                size="large"
                onClick={handleScan}
                color="success"
                disabled={!activeConferenceId && conferences.length !== 1}
              >
                <IonIcon slot="start" icon={qrCodeOutline} />
                {activeConferenceId
                  ? 'Start Scanning'
                  : conferences.length === 1
                  ? 'Select & Scan'
                  : 'Select a Conference to Scan'}
              </IonButton>

              {/* Search Bar - Only available for check-in mode */}
              {activeConferenceId && activeConference?.mode === 'checkin' && (
                <div style={{ marginTop: '16px' }}>
                  <IonSearchbar
                    value={searchQuery}
                    onIonInput={(e) => handleSearchChange(e.detail.value || '')}
                    placeholder="Search attendees by name..."
                    debounce={0}
                    showClearButton="focus"
                  />

                  {/* Search Results Dropdown */}
                  {searchQuery.trim().length > 0 && (
                    <IonCard style={{ marginTop: '8px', marginBottom: '0' }}>
                      <IonCardContent style={{ padding: '0' }}>
                        {searching ? (
                          <div style={{ padding: '16px', textAlign: 'center' }}>
                            <IonSpinner />
                            <p style={{ marginTop: '8px', color: '#666' }}>Searching...</p>
                          </div>
                        ) : searchResults.length > 0 ? (
                          <IonList style={{ padding: '0' }}>
                            {searchResults.map((attendee) => (
                              <IonItem
                                key={attendee.id}
                                button
                                onClick={() => handleAttendeeSelect(attendee)}
                                detail={false}
                              >
                                <IonLabel>
                                  <h2>{highlightMatch(attendee.name, searchQuery)}</h2>
                                  {attendee.company && (
                                    <p>
                                      <IonText color="medium">
                                        {highlightMatch(attendee.company, searchQuery)}
                                      </IonText>
                                    </p>
                                  )}
                                </IonLabel>
                              </IonItem>
                            ))}
                          </IonList>
                        ) : (
                          <div style={{ padding: '16px' }}>
                            <IonText color="medium">
                              <p style={{ margin: 0, textAlign: 'center' }}>No results found</p>
                            </IonText>
                          </div>
                        )}
                      </IonCardContent>
                    </IonCard>
                  )}
                </div>
              )}
            </div>

            {/* Conference Selector at Bottom */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'var(--ion-background-color, #fff)',
              borderTop: '1px solid var(--ion-border-color, #ddd)',
              zIndex: 10
            }}>
              <IonButton
                expand="full"
                fill="clear"
                onClick={() => setShowConferenceModal(true)}
                style={{ margin: 0, height: '60px' }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0 16px'
                }}>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    {activeConference ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: '16px' }}>
                          {getDisplayName(activeConference)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                          {getModeLabel(activeConference.mode, activeConference.fieldId)}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '16px', color: 'var(--ion-color-medium)' }}>
                        Select Conference
                      </div>
                    )}
                  </div>
                  <IonIcon icon={chevronDown} />
                </div>
              </IonButton>
            </div>
          </>
        )}
      </IonContent>

      {/* Conference Selection Modal */}
      <IonModal isOpen={showConferenceModal} onDidDismiss={() => {
        setShowConferenceModal(false);
        setHideMainContent(false);
      }}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Select Conference</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowConferenceModal(false)}>
                <IonIcon slot="icon-only" icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            {conferences.map(conference => (
              <IonItemSliding key={conference.id}>
                <IonItem
                  button
                  onClick={() => handleConferenceSelect(conference.id)}
                  detail={false}
                >
                  <IonIcon
                    slot="start"
                    icon={conference.id === activeConferenceId ? radio : radioOutline}
                    color={conference.id === activeConferenceId ? 'primary' : 'medium'}
                  />
                  <IonLabel>
                    <h2>{getDisplayName(conference)}</h2>
                    <p>
                      <IonText color="medium">
                        <small>Added: {formatDate(conference.addedAt)}</small>
                      </IonText>
                    </p>
                  </IonLabel>
                  <IonBadge slot="end" color="primary">
                    {getModeLabel(conference.mode, conference.fieldId)}
                  </IonBadge>
                </IonItem>

                <IonItemOptions side="end">
                  <IonItemOption
                    color="danger"
                    onClick={() => handleConferenceDelete(conference.id)}
                  >
                    <IonIcon slot="icon-only" icon={trash} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}

            {/* Add Conference Option */}
            <IonItem button onClick={handleAddConference} detail={false}>
              <IonIcon slot="start" icon={add} color="primary" />
              <IonLabel color="primary">
                <h2>Add Conference Scan</h2>
              </IonLabel>
            </IonItem>
          </IonList>
        </IonContent>
      </IonModal>

      {/* Scan Result Modal */}
      <IonModal
        isOpen={isScanning || scanResult !== null || scanError !== null}
        onDidDismiss={() => {
          setIsScanning(false);
          setScanResult(null);
          setScanError(null);
          setAlreadyCheckedIn(false);
        }}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>
              {isScanning ? 'Scanning...' : scanResult ? 'Scan Result' : 'Scan Error'}
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => {
                setIsScanning(false);
                setScanResult(null);
                setScanError(null);
                setAlreadyCheckedIn(false);
              }}>
                <IonIcon slot="icon-only" icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {isScanning && (
            <div className="ion-text-center" style={{ marginTop: '50%' }}>
              <IonSpinner style={{ width: '56px', height: '56px' }} />
              <p style={{ marginTop: '16px' }}>Point camera at QR code...</p>
            </div>
          )}

          {scanError && !isScanning && (
            <div className="ion-text-center" style={{ marginTop: '20%' }}>
              <IonIcon
                icon={closeCircle}
                style={{ fontSize: '64px', color: 'var(--ion-color-danger)' }}
              />
              <h2>Error</h2>
              <IonText color="danger">
                <p>{scanError}</p>
              </IonText>
              <IonButton
                expand="block"
                onClick={() => {
                  setScanError(null);
                  startScan();
                }}
                style={{ marginTop: '24px' }}
              >
                Try Again
              </IonButton>
            </div>
          )}

          {scanResult && !isScanning && (
            <div style={{ marginTop: '20px' }}>
              {/* Already Checked In Warning */}
              {alreadyCheckedIn && scanResult.already && (
                <IonCard color="warning">
                  <IonCardHeader>
                    <IonCardTitle>{scanResult.already.title}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonText>
                      <p>{scanResult.already.body}</p>
                    </IonText>
                  </IonCardContent>
                </IonCard>
              )}

              {/* Attendee Details Card */}
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>{scanResult.name}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    {scanResult.company && (
                      <IonItem>
                        <IonLabel>
                          <strong>Company:</strong> {scanResult.company}
                        </IonLabel>
                      </IonItem>
                    )}
                    <IonItem>
                      <IonLabel>
                        <strong>Type:</strong> {scanResult.type}
                      </IonLabel>
                    </IonItem>
                    {scanResult.tshirt && (
                      <IonItem>
                        <IonLabel>
                          <strong>T-Shirt:</strong> {scanResult.tshirt}
                        </IonLabel>
                      </IonItem>
                    )}
                    {scanResult.partition && (
                      <IonItem>
                        <IonLabel>
                          <strong>Partition:</strong> {scanResult.partition}
                        </IonLabel>
                      </IonItem>
                    )}
                    {scanResult.photoconsent && (
                      <IonItem>
                        <IonLabel>
                          <strong>Photo Consent:</strong> {scanResult.photoconsent}
                        </IonLabel>
                      </IonItem>
                    )}
                    {scanResult.policyconfirmed && (
                      <IonItem>
                        <IonLabel>
                          <strong>Policy Confirmed:</strong> {scanResult.policyconfirmed}
                          {scanResult.policyconfirmed.toLowerCase().includes('no') && (
                            <IonIcon
                              icon={stopCircle}
                              color="danger"
                              style={{ marginLeft: '8px', fontSize: '20px', verticalAlign: 'middle' }}
                            />
                          )}
                        </IonLabel>
                      </IonItem>
                    )}
                  </IonList>

                  {/* Highlight Badges */}
                  {scanResult.highlight && scanResult.highlight.length > 0 && (
                    <div style={{ marginTop: '15px' }}>
                      {scanResult.highlight.map((hl, idx) => (
                        <IonBadge key={idx} color="primary" style={{ marginRight: '5px', marginBottom: '5px' }}>
                          {hl}
                        </IonBadge>
                      ))}
                    </div>
                  )}

                  {/* Additional Information */}
                  {scanResult.additional && scanResult.additional.length > 0 && (
                    <div style={{ marginTop: '15px' }}>
                      <IonText color="medium">
                        <p><strong>Additional Info:</strong></p>
                      </IonText>
                      {scanResult.additional.map((info, idx) => (
                        <IonText key={idx}>
                          <p style={{ marginTop: '5px', fontSize: '14px' }}>{info}</p>
                        </IonText>
                      ))}
                    </div>
                  )}

                  {/* Check-in Message */}
                  {scanResult.checkinmessage && (
                    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
                      <IonText>
                        <p style={{ margin: 0 }}>{scanResult.checkinmessage}</p>
                      </IonText>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>

              {/* Check-In Button */}
              {!alreadyCheckedIn && (
                <IonButton
                  expand="block"
                  size="large"
                  color="success"
                  onClick={checkIn}
                  disabled={checkingIn}
                  style={{ marginTop: '20px' }}
                >
                  {checkingIn ? 'Checking In...' : 'Check In'}
                </IonButton>
              )}

              <IonButton
                expand="block"
                fill="outline"
                onClick={() => {
                  resetScan();
                }}
                style={{ marginTop: '16px' }}
              >
                Close
              </IonButton>
            </div>
          )}
        </IonContent>
      </IonModal>

      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        helpSection={helpContent.conferenceList}
      />

      {/* Scanner Overlay - shown when barcode-scanner-active class is added to body */}
      <div className="scanner-overlay">
        <div className="scanner-overlay-background"></div>
        <button className="scanner-cancel-button" onClick={cancelScan}>
          Cancel
        </button>
        <div className="scanner-focus-box">
          <div className="scanner-focus-corner top-left"></div>
          <div className="scanner-focus-corner top-right"></div>
          <div className="scanner-focus-corner bottom-left"></div>
          <div className="scanner-focus-corner bottom-right"></div>
          <div className="scanner-scan-line"></div>
          <div className="scanner-instruction">Point camera at QR code</div>
        </div>
      </div>
    </IonPage>
  );
};

export default ConferenceListPage;
