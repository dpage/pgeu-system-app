/**
 * React hook for deep link handling
 * Integrates deep link service with conference store
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { deepLinkService } from '../services/deepLinkService';
import { useConferenceStore } from '../store/conferenceStore';

export interface UseDeepLinkOptions {
  /**
   * Whether to navigate to conferences page after successful deep link
   * Default: true
   */
  navigateOnSuccess?: boolean;

  /**
   * Whether to check for launch URL on mount
   * Default: true
   */
  checkLaunchUrl?: boolean;
}

/**
 * Hook to handle deep links for conference URLs
 * Automatically sets up listeners and processes URLs
 */
export function useDeepLink(options: UseDeepLinkOptions = {}) {
  const {
    navigateOnSuccess = true,
    checkLaunchUrl = true,
  } = options;

  const navigate = useNavigate();
  const addConferenceFromUrl = useConferenceStore(state => state.addConferenceFromUrl);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    // Handler function for deep links
    const handleDeepLink = async (url: string): Promise<boolean> => {
      try {
        const success = await addConferenceFromUrl(url);

        if (success && navigateOnSuccess) {
          // Navigate to conferences page after successful addition
          navigate('/conferences');
        }

        return success;
      } catch (error) {
        console.error('Error handling deep link:', error);
        return false;
      }
    };

    // Initialize deep link service
    deepLinkService.initialize(handleDeepLink);

    // Check for launch URL if app was opened with one
    if (checkLaunchUrl) {
      deepLinkService.checkLaunchUrl(handleDeepLink).catch(error => {
        console.error('Error checking launch URL:', error);
      });
    }

    // Cleanup on unmount
    return () => {
      deepLinkService.destroy();
      isInitialized.current = false;
    };
  }, [addConferenceFromUrl, navigate, navigateOnSuccess, checkLaunchUrl]);
}
