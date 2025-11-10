/**
 * Add Conference Page
 * Allows users to add a new conference by entering a URL
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
} from '@ionic/react';
import { arrowBack, checkmark } from 'ionicons/icons';
import { useConferenceStore } from '../store/conferenceStore';

const AddConferencePage: React.FC = () => {
  const navigate = useNavigate();
  const { addConferenceFromUrl, error, clearError } = useConferenceStore();
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSubmit = async () => {
    if (!url.trim()) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    const success = await addConferenceFromUrl(url.trim());

    setIsSubmitting(false);

    if (success) {
      // Navigate back to list on success
      navigate('/conferences');
    }
    // On failure, error will be shown via the store's error state
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonButton onClick={handleBack}>
              <IonIcon slot="icon-only" icon={arrowBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>Add Conference</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Conference Setup</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonText color="medium">
              <p>
                Scan the QR code from the pgeu-system backend or paste the deep link URL below.
              </p>
            </IonText>

            <IonList>
              <IonItem>
                <IonLabel position="stacked">Conference URL</IonLabel>
                <IonInput
                  value={url}
                  onIonInput={e => setUrl(e.detail.value || '')}
                  placeholder="https://postgresql.eu/events/..."
                  type="url"
                  clearInput
                  disabled={isSubmitting}
                />
              </IonItem>
            </IonList>

            {error && (
              <div style={{ marginTop: '1rem' }}>
                <IonText color="danger">
                  <p>
                    <strong>Error:</strong> {error}
                  </p>
                </IonText>
              </div>
            )}

            <IonButton
              expand="block"
              onClick={handleSubmit}
              disabled={!url.trim() || isSubmitting}
              style={{ marginTop: '1rem' }}
            >
              <IonIcon slot="start" icon={checkmark} />
              {isSubmitting ? 'Adding...' : 'Add Conference'}
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Supported URL Formats</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonText color="medium">
              <p>
                <strong>Check-in:</strong>
              </p>
              <p style={{ fontSize: '0.9em', fontFamily: 'monospace' }}>
                https://&lt;domain&gt;/events/&lt;event&gt;/checkin/&lt;token&gt;/
              </p>

              <p style={{ marginTop: '1rem' }}>
                <strong>Field Check-in:</strong>
              </p>
              <p style={{ fontSize: '0.9em', fontFamily: 'monospace' }}>
                https://&lt;domain&gt;/events/&lt;event&gt;/checkin/&lt;token&gt;/f&lt;fieldId&gt;/
              </p>

              <p style={{ marginTop: '1rem' }}>
                <strong>Sponsor Scanning:</strong>
              </p>
              <p style={{ fontSize: '0.9em', fontFamily: 'monospace' }}>
                https://&lt;domain&gt;/events/sponsor/scanning/&lt;token&gt;/
              </p>

              <p style={{ marginTop: '1rem' }}>
                <strong>Note:</strong>
              </p>
              <p style={{ fontSize: '0.9em' }}>
                Any domain is supported - the app works with new servers automatically
              </p>
            </IonText>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default AddConferencePage;
