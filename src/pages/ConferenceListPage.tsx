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
  IonModal,
} from '@ionic/react';
import { add, trash, radio, radioOutline, qrCodeOutline, helpCircleOutline, statsChartOutline, chevronDown, close } from 'ionicons/icons';
import { useConferenceStore } from '../store/conferenceStore';
import { createApiClient } from '../services/apiClient';
import { CheckinRegistration } from '../types/api';
import HelpModal from '../components/HelpModal';
import { helpContent } from '../content/helpContent';

const ConferenceListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);
  const [showConferenceModal, setShowConferenceModal] = useState(false);
  const [hideMainContent, setHideMainContent] = useState(false);
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
  const [searchDebugInfo, setSearchDebugInfo] = useState<string>('');
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

    // Verify we have an active conference before navigating
    const currentState = useConferenceStore.getState();
    if (!currentState.activeConferenceId) {
      console.error('Failed to set active conference - no activeConferenceId');
      return;
    }

    navigate('/scanner');
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

      const debugInfo = `Query: "${trimmedQuery}"\nMode: ${activeConference.mode}\nURL: ${apiUrl}`;
      setSearchDebugInfo(debugInfo);

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

      const resultDebug = `${debugInfo}\nResults: ${searchResponse.regs?.length || 0}`;
      setSearchDebugInfo(resultDebug);

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

      const errorDebug = `Query: "${trimmedQuery}"\nError: ${apiError?.message || 'Unknown error'}\nType: ${apiError?.type || 'unknown'}\nStatus: ${apiError?.statusCode || 'N/A'}`;
      setSearchDebugInfo(errorDebug);

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
      setSearchDebugInfo('');
    }
  };

  const handleAttendeeSelect = async (attendee: CheckinRegistration) => {
    console.log('[ConferenceList] Attendee selected from search:', attendee.name);
    setSearchQuery('');
    setSearchResults([]);

    // Navigate to scanner page with the attendee data
    navigate('/scanner', {
      state: {
        selectedAttendee: attendee
      }
    });
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
                            {searchDebugInfo && (
                              <pre style={{
                                marginTop: '16px',
                                fontSize: '11px',
                                backgroundColor: '#f5f5f5',
                                padding: '8px',
                                borderRadius: '4px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all'
                              }}>
                                {searchDebugInfo}
                              </pre>
                            )}
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

      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        helpSection={helpContent.conferenceList}
      />
    </IonPage>
  );
};

export default ConferenceListPage;
