/**
 * Stats Page
 * Displays statistics for the active conference (admin only)
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonText,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { helpCircleOutline, refreshCircle, close } from 'ionicons/icons';
import { useConferenceStore } from '../store/conferenceStore';
import { createApiClient } from '../services/apiClient';
import { StatsResponse } from '../types/api';
import HelpModal from '../components/HelpModal';
import { helpContent } from '../content/helpContent';

const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const conferences = useConferenceStore(state => state.conferences);
  const activeConferenceId = useConferenceStore(state => state.activeConferenceId);

  const activeConference = useMemo(
    () => activeConferenceId
      ? conferences.find(c => c.id === activeConferenceId) || null
      : null,
    [conferences, activeConferenceId]
  );

  const loadStats = async () => {
    if (!activeConference) {
      setError('No active conference selected');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Stats] Active conference:', {
        mode: activeConference.mode,
        baseUrl: activeConference.baseUrl,
        eventSlug: activeConference.eventSlug,
        token: activeConference.token ? `${activeConference.token.substring(0, 10)}...` : 'missing',
        fieldId: activeConference.fieldId,
      });

      // Build API URL based on conference mode
      let apiUrl: string;
      if (activeConference.mode === 'sponsor') {
        apiUrl = `${activeConference.baseUrl}/events/sponsor/scanning/${activeConference.token}/`;
      } else if (activeConference.mode === 'field' && activeConference.fieldId) {
        apiUrl = `${activeConference.baseUrl}/events/${activeConference.eventSlug}/checkin/${activeConference.token}/f${activeConference.fieldId}/`;
      } else {
        // Default checkin mode
        apiUrl = `${activeConference.baseUrl}/events/${activeConference.eventSlug}/checkin/${activeConference.token}/`;
      }

      console.log('[Stats] Constructed API URL:', apiUrl);

      const apiClient = createApiClient(apiUrl);
      const statsData = await apiClient.getStats();
      console.log('[Stats] Successfully loaded stats');
      setStats(statsData);
    } catch (err: any) {
      console.error('[Stats] Error loading stats:', err);

      // Provide more user-friendly error message for common cases
      if (err.type === 'not_found') {
        setError('Statistics are only available to superusers. Please log in with an admin account to view statistics.');
      } else {
        setError(err.message || 'Failed to load statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [activeConference]);

  const handleRefresh = async (event: CustomEvent) => {
    await loadStats();
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonButton onClick={() => navigate('/conferences')}>
              <IonIcon slot="icon-only" icon={close} />
            </IonButton>
          </IonButtons>
          <IonTitle>Statistics</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowHelp(true)}>
              <IonIcon slot="icon-only" icon={helpCircleOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon={refreshCircle}
            refreshingSpinner="crescent"
          />
        </IonRefresher>

        {loading && (
          <div className="ion-text-center" style={{ marginTop: '50px' }}>
            <IonSpinner />
            <p>Loading statistics...</p>
          </div>
        )}

        {error && (
          <IonCard color="danger">
            <IonCardContent>
              <IonText color="light">
                <p style={{ margin: 0 }}>{error}</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        )}

        {!loading && !error && stats && stats.length === 0 && (
          <div className="ion-text-center" style={{ marginTop: '50px' }}>
            <IonText color="medium">
              <p>No statistics available</p>
            </IonText>
          </div>
        )}

        {!loading && !error && stats && stats.length > 0 && (
          <div>
            {stats.map((group, groupIndex) => {
              const [headers, rows] = group;

              return (
                <IonCard key={groupIndex}>
                  <IonCardHeader>
                    <IonCardTitle>
                      {headers && headers.length > 0 && headers[0] ? headers[0] : `Statistics ${groupIndex + 1}`}
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {headers.map((header, idx) => (
                              <th
                                key={idx}
                                style={{
                                  textAlign: 'left',
                                  padding: '8px',
                                  borderBottom: '2px solid #ddd',
                                  fontWeight: 'bold',
                                }}
                              >
                                {header || ''}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              {row.map((cell, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  style={{
                                    padding: '8px',
                                    borderBottom: '1px solid #eee',
                                  }}
                                >
                                  {cell || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </IonCardContent>
                </IonCard>
              );
            })}
          </div>
        )}
      </IonContent>

      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        helpSection={helpContent.stats}
      />
    </IonPage>
  );
};

export default StatsPage;
