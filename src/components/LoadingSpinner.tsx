/**
 * Loading Spinner Component
 * Displays a loading spinner with optional message
 */

import React from 'react';
import { IonSpinner } from '@ionic/react';

export interface LoadingSpinnerProps {
  /** Optional message to display below the spinner */
  message?: string;
  /** Size of the spinner */
  size?: 'small' | 'default' | 'large';
  /** Whether to center the spinner vertically */
  centered?: boolean;
}

/**
 * Displays a loading spinner with an optional message
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'default',
  centered = true,
}) => {
  const spinnerStyle = size === 'large' ? { width: '56px', height: '56px' } : undefined;
  const containerStyle = centered ? { marginTop: '50%' } : undefined;

  return (
    <div className={centered ? 'ion-text-center' : ''} style={containerStyle}>
      <IonSpinner style={spinnerStyle} />
      {message && <p style={{ marginTop: '16px' }}>{message}</p>}
    </div>
  );
};
