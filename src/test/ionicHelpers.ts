/**
 * Test helpers for Ionic components
 * Provides utilities to properly trigger Ionic-specific events in tests
 */

import { act } from '@testing-library/react';

/**
 * Simulate IonInput change event
 * IonInput uses onIonInput with CustomEvent containing detail.value
 */
export async function ionInputChange(element: Element, value: string) {
  await act(async () => {
    // First update the native input value
    const input = element.querySelector('input');
    if (input) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, value);
      }
    }

    // Then dispatch the Ionic event that React listens to
    const ionInputEvent = new CustomEvent('ionInput', {
      detail: { value },
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(ionInputEvent);

    // Also trigger native input event
    if (input) {
      const inputEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(inputEvent);
    }
  });
}

/**
 * Simulate IonButton click event
 */
export function ionButtonClick(element: Element) {
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
  });

  element.dispatchEvent(clickEvent);
}
