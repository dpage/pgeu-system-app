/**
 * Modal Hook
 * Custom hook for managing modal open/close state
 */

import { useState, useCallback } from 'react';

export interface UseModalReturn {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Function to open the modal */
  open: () => void;
  /** Function to close the modal */
  close: () => void;
  /** Function to toggle the modal state */
  toggle: () => void;
}

/**
 * Hook for managing modal state with convenient open/close/toggle functions
 * @param initialState - Initial open state (default: false)
 * @returns Object with isOpen state and control functions
 */
export function useModal(initialState = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
