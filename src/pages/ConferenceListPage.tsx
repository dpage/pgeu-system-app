/**
 * Conference List Page
 * Displays all stored conferences and allows selecting/managing them
 */

import { useNavigate } from 'react-router-dom';
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
  IonFab,
  IonFabButton,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonBadge,
} from '@ionic/react';
import { add, trash, radio, radioOutline } from 'ionicons/icons';
import { useConferenceStore } from '../store/conferenceStore';

const ConferenceListPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    conferences,
    activeConferenceId,
    isLoading,
    error,
    setActiveConference,
    deleteConference,
    clearError,
  } = useConferenceStore();

  const handleAddConference = () => {
    navigate('/conferences/add');
  };

  const handleSelectConference = async (id: string) => {
    await setActiveConference(id);
  };

  const handleDeleteConference = async (id: string) => {
    if (confirm('Are you sure you want to delete this conference?')) {
      await deleteConference(id);
    }
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Conferences</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleAddConference}>
              <IonIcon slot="icon-only" icon={add} />
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
              <h2>No Conferences</h2>
              <p>Add a conference to get started</p>
            </IonText>
            <IonButton onClick={handleAddConference}>
              <IonIcon slot="start" icon={add} />
              Add Conference
            </IonButton>
          </div>
        ) : (
          <IonList>
            {conferences.map(conference => (
              <IonItemSliding key={conference.id}>
                <IonItem
                  button
                  onClick={() => handleSelectConference(conference.id)}
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
                    onClick={() => handleDeleteConference(conference.id)}
                  >
                    <IonIcon slot="icon-only" icon={trash} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleAddConference}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default ConferenceListPage;
