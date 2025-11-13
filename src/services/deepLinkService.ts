/**
 * Deep link service for handling conference URLs from app opens
 * Integrates with Capacitor App plugin to process URLs
 */

import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

export interface DeepLinkHandler {
  /**
   * Callback function to handle a deep link URL
   * @param url - The deep link URL to process
   * @returns Promise resolving to true if handled successfully
   */
  (url: string): Promise<boolean>;
}

export interface DeepLinkResult {
  success: boolean;
  url: string;
  error?: string;
}

/**
 * Service for managing deep links
 */
export class DeepLinkService {
  private handler: DeepLinkHandler | null = null;
  private listener: PluginListenerHandle | null = null;

  /**
   * Initialize deep link handling
   * @param handler - Function to call when a deep link is received
   */
  async initialize(handler: DeepLinkHandler): Promise<void> {
    this.handler = handler;

    // Only set up listener on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.warn('Deep linking is only available on native platforms');
      return;
    }

    // Set up listener for app URL opens
    this.listener = await App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
      return await this.handleUrlOpen(event);
    });
  }

  /**
   * Clean up deep link listener
   */
  async destroy(): Promise<void> {
    if (this.listener) {
      await this.listener.remove();
      this.listener = null;
    }
    this.handler = null;
  }

  /**
   * Handle a URL open event
   */
  private async handleUrlOpen(event: URLOpenListenerEvent): Promise<DeepLinkResult> {
    const url = event.url;

    try {
      if (!this.handler) {
        console.error('No deep link handler registered');
        return {
          success: false,
          url,
          error: 'No handler registered',
        };
      }

      const success = await this.handler(url);

      return {
        success,
        url,
      };
    } catch (error) {
      console.error('Error handling deep link:', error);
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if the app was launched with a URL (for initial app launch)
   * @param handler - Function to call if a launch URL is found
   * @returns Promise resolving to the result
   */
  async checkLaunchUrl(handler?: DeepLinkHandler): Promise<DeepLinkResult | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    let launchUrl = '';

    try {
      const result = await App.getLaunchUrl();

      if (!result || !result.url) {
        return null;
      }

      launchUrl = result.url;

      const handlerFn = handler || this.handler;

      if (!handlerFn) {
        console.error('No deep link handler available');
        return {
          success: false,
          url: launchUrl,
          error: 'No handler available',
        };
      }

      const success = await handlerFn(launchUrl);

      return {
        success,
        url: launchUrl,
      };
    } catch (error) {
      console.error('Error checking launch URL:', error);
      return {
        success: false,
        url: launchUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const deepLinkService = new DeepLinkService();
