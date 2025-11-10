import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { IonApp, setupIonicReact } from '@ionic/react';
import { MemoryRouter } from 'react-router-dom';

// Initialize Ionic for testing
setupIonicReact({
  mode: 'ios', // Use consistent mode for testing
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  routerProps?: any;
}

/**
 * Custom render function that wraps components with necessary providers
 * for Ionic and React Router
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = '/',
    routerProps = {},
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <MemoryRouter initialEntries={[initialRoute]} {...routerProps}>
        <IonApp>{children}</IonApp>
      </MemoryRouter>
    );
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { renderWithProviders as render };
