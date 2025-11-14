/**
 * Error Message Component
 * Displays error messages with optional dismiss functionality
 */

import React from 'react';
import { IonText, IonCard, IonCardContent, IonButton } from '@ionic/react';

export interface ErrorMessageProps {
  /** The error message to display */
  error: string | null;
  /** Optional callback when the error is dismissed */
  onDismiss?: () => void;
  /** Visual variant for the error message */
  variant?: 'inline' | 'card';
}

/**
 * Displays an error message with optional dismiss button
 * Returns null if no error is provided
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onDismiss,
  variant = 'inline',
}) => {
  if (!error) return null;

  if (variant === 'card') {
    return (
      <IonCard color="danger">
        <IonCardContent>
          <IonText color="light">
            <p style={{ margin: 0 }}>{error}</p>
          </IonText>
          {onDismiss && (
            <IonButton size="small" fill="clear" onClick={onDismiss} style={{ marginTop: '8px' }}>
              Dismiss
            </IonButton>
          )}
        </IonCardContent>
      </IonCard>
    );
  }

  return (
    <div className="ion-padding">
      <IonText color="danger">
        <p>
          <strong>Error:</strong> {error}
        </p>
      </IonText>
      {onDismiss && (
        <IonButton size="small" onClick={onDismiss}>
          Dismiss
        </IonButton>
      )}
    </div>
  );
};
