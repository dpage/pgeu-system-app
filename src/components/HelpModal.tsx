/**
 * Help Modal Component
 * Displays context-sensitive help to end users
 */

import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { HelpSection } from '../content/helpContent';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  helpSection: HelpSection;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, helpSection }) => {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{helpSection.title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {helpSection.content.map((paragraph, index) => {
          // Empty paragraphs are used as separators
          if (paragraph === '') {
            return <div key={index} style={{ height: '16px' }} />;
          }

          // Check if this is a bullet point
          if (paragraph.startsWith('•')) {
            return (
              <p key={index} style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '8px' }}>
                {paragraph}
              </p>
            );
          }

          // Regular paragraph
          return (
            <p key={index} style={{ marginTop: '12px', marginBottom: '12px', lineHeight: '1.6' }}>
              {paragraph}
            </p>
          );
        })}
      </IonContent>
    </IonModal>
  );
};

export default HelpModal;
