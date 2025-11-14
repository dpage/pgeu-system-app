# Testing Strategy

**Note:** Offline mode has been removed from requirements. All scanning operations require active network connectivity.

## Overview

Comprehensive testing strategy for the conference scanner app covering unit tests, integration tests, and end-to-end tests. Target: >80% code coverage with focus on critical paths.

## Testing Pyramid

```
           /\
          /  \
         / E2E \          10% - End-to-End (Detox)
        /______\
       /        \
      /Integration\       20% - Integration (React Native Testing Library)
     /____________\
    /              \
   /   Unit Tests   \     70% - Unit (Jest)
  /__________________\
```

## Unit Testing (Jest)

### Configuration

**jest.config.js:**
```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-paper|react-native-vector-icons|react-native-gesture-handler|zustand)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.e2e.{ts,tsx}',
    '!src/types/**',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

**jest.setup.js:**
```javascript
import 'react-native-gesture-handler/jestSetup';

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve()),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-config
jest.mock('react-native-config', () => ({
  API_BASE_URL: 'http://localhost:8000',
  ENV: 'test',
}));

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevices: jest.fn(() => ({ back: {} })),
  useFrameProcessor: jest.fn(),
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  })),
  useFocusEffect: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
```

### Unit Test Examples

#### Testing Utilities

**errorHandling.test.ts:**
```typescript
import { normalizeError, handleApiError } from '@/utils/errorHandling';

describe('errorHandling', () => {
  describe('normalizeError', () => {
    it('should normalize network error', () => {
      const error = { message: 'Network Error' };
      const normalized = normalizeError(error);

      expect(normalized.code).toBe('NETWORK_ERROR');
      expect(normalized.message).toBe('No internet connection');
    });

    it('should normalize 404 error', () => {
      const error = {
        response: {
          status: 404,
          data: { detail: 'Not found' },
        },
      };
      const normalized = normalizeError(error);

      expect(normalized.code).toBe('NOT_FOUND');
    });

    it('should normalize validation error', () => {
      const error = {
        response: {
          status: 400,
          data: { field: ['This field is required'] },
        },
      };
      const normalized = normalizeError(error);

      expect(normalized.code).toBe('VALIDATION_ERROR');
      expect(normalized.validationErrors).toBeDefined();
    });
  });

  describe('handleApiError', () => {
    it('should return user-friendly message for network error', () => {
      const message = handleApiError({ code: 'NETWORK_ERROR' });
      expect(message).toBe('No internet connection. Action saved for later.');
    });

    it('should return specific message for already checked in', () => {
      const message = handleApiError({
        code: 'ALREADY_CHECKED_IN',
        metadata: { timestamp: '2024-01-01T10:00:00Z' },
      });
      expect(message).toContain('Already checked in');
    });
  });
});
```

#### Testing Stores (Zustand)

**authStore.test.ts:**
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useAuthStore } from '@/stores/authStore';
import * as secureStorage from '@/services/storage/secureStorage';

jest.mock('@/services/storage/secureStorage');

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should login successfully', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    const mockToken = 'test-token';

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login(mockUser, mockToken);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
    expect(secureStorage.saveToken).toHaveBeenCalledWith(mockToken);
  });

  it('should logout and clear token', async () => {
    const { result } = renderHook(() => useAuthStore());

    // Login first
    await act(async () => {
      await result.current.login({ id: '1' }, 'token');
    });

    // Logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(secureStorage.deleteToken).toHaveBeenCalled();
  });
});
```

#### Testing API Modules

**scanAPI.test.ts:**
```typescript
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { scanAPI } from '@/services/api/modules/scan';

const mock = new MockAdapter(axios);

describe('scanAPI', () => {
  afterEach(() => {
    mock.reset();
  });

  describe('checkin', () => {
    it('should check in attendee successfully', async () => {
      const attendeeId = 'ATT123';
      const responseData = {
        id: '1',
        attendee_id: attendeeId,
        timestamp: '2024-01-01T10:00:00Z',
        status: 'success',
      };

      mock.onPost('/api/checkin/').reply(200, responseData);

      const result = await scanAPI.checkin(attendeeId);

      expect(result).toEqual(responseData);
      expect(mock.history.post[0].data).toContain(attendeeId);
    });

    it('should throw error for already checked in', async () => {
      mock.onPost('/api/checkin/').reply(400, {
        error: 'already_checked_in',
        timestamp: '2024-01-01T09:00:00Z',
      });

      await expect(scanAPI.checkin('ATT123')).rejects.toThrow();
    });

    it('should throw error for network failure', async () => {
      mock.onPost('/api/checkin/').networkError();

      await expect(scanAPI.checkin('ATT123')).rejects.toThrow();
    });
  });
});
```

#### Testing Network Error Handling

**scanAPI.test.ts with retry logic:**
```typescript
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { scanAPI } from '@/services/api/modules/scan';

const mock = new MockAdapter(axios);

describe('scanAPI with network errors', () => {
  afterEach(() => {
    mock.reset();
  });

  it('should retry on network error with exponential backoff', async () => {
    let callCount = 0;

    mock.onPost('/api/checkin/').reply(() => {
      callCount++;
      if (callCount < 3) {
        // Fail first 2 attempts
        return [500, { error: 'Server error' }];
      }
      // Succeed on 3rd attempt
      return [200, { success: true }];
    });

    const result = await scanAPI.checkin('ATT123');

    expect(callCount).toBe(3);
    expect(result.success).toBe(true);
  });

  it('should throw error after max retries exceeded', async () => {
    mock.onPost('/api/checkin/').reply(500, { error: 'Server error' });

    await expect(scanAPI.checkin('ATT123')).rejects.toThrow();
  });
});
```

### Running Unit Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Test specific file
npm test -- errorHandling.test.ts

# Update snapshots
npm test -- -u
```

## Integration Testing (React Native Testing Library)

### Testing Components

**Button.test.tsx:**
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/common/Button';

describe('Button', () => {
  it('should render title', () => {
    const { getByText } = render(
      <Button title="Check In" onPress={() => {}} />
    );

    expect(getByText('Check In')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Check In" onPress={onPress} />
    );

    fireEvent.press(getByText('Check In'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Check In" onPress={onPress} disabled />
    );

    fireEvent.press(getByText('Check In'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    const { getByTestId } = render(
      <Button title="Check In" onPress={() => {}} loading testID="button" />
    );

    // Assuming button shows loading indicator when loading
    expect(getByTestId('button')).toBeTruthy();
  });
});
```

### Testing Screens

**ScannerScreen.test.tsx:**
```typescript
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ScannerScreen } from '@/screens/main/ScannerScreen';
import { useQRScanner } from '@/hooks/useQRScanner';
import { useCheckin } from '@/hooks/api/useCheckin';

jest.mock('@/hooks/useQRScanner');
jest.mock('@/hooks/api/useCheckin');

const renderWithNavigation = (component: React.ReactElement) => {
  return render(
    <NavigationContainer>{component}</NavigationContainer>
  );
};

describe('ScannerScreen', () => {
  const mockStartScanning = jest.fn();
  const mockStopScanning = jest.fn();
  const mockCheckin = jest.fn();

  beforeEach(() => {
    (useQRScanner as jest.Mock).mockReturnValue({
      startScanning: mockStartScanning,
      stopScanning: mockStopScanning,
      scannedCode: null,
      isScanning: false,
    });

    (useCheckin as jest.Mock).mockReturnValue({
      mutate: mockCheckin,
      isLoading: false,
    });
  });

  it('should start scanning on mount', () => {
    renderWithNavigation(<ScannerScreen />);

    expect(mockStartScanning).toHaveBeenCalled();
  });

  it('should stop scanning on unmount', () => {
    const { unmount } = renderWithNavigation(<ScannerScreen />);

    unmount();

    expect(mockStopScanning).toHaveBeenCalled();
  });

  it('should call checkin when QR code scanned', async () => {
    const { rerender } = renderWithNavigation(<ScannerScreen />);

    // Simulate QR code scan
    (useQRScanner as jest.Mock).mockReturnValue({
      startScanning: mockStartScanning,
      stopScanning: mockStopScanning,
      scannedCode: 'ATT123',
      isScanning: true,
    });

    rerender(<ScannerScreen />);

    await waitFor(() => {
      expect(mockCheckin).toHaveBeenCalledWith({
        attendeeId: 'ATT123',
        mode: expect.any(String),
      });
    });
  });
});
```

### Testing Hooks

**useQRScanner.test.ts:**
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useQRScanner } from '@/hooks/useQRScanner';

describe('useQRScanner', () => {
  it('should initialize with isScanning false', () => {
    const { result } = renderHook(() => useQRScanner());

    expect(result.current.isScanning).toBe(false);
    expect(result.current.scannedCode).toBeNull();
  });

  it('should start scanning', () => {
    const { result } = renderHook(() => useQRScanner());

    act(() => {
      result.current.startScanning();
    });

    expect(result.current.isScanning).toBe(true);
  });

  it('should stop scanning', () => {
    const { result } = renderHook(() => useQRScanner());

    act(() => {
      result.current.startScanning();
      result.current.stopScanning();
    });

    expect(result.current.isScanning).toBe(false);
  });

  it('should debounce scans', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useQRScanner());

    act(() => {
      result.current.startScanning();
    });

    // Simulate rapid scans (should debounce)
    act(() => {
      // Mock frame processor detecting code
      // Implementation specific to your scanner
    });

    jest.advanceTimersByTime(500);

    // Should only scan once due to debounce
    expect(result.current.scannedCode).toBeTruthy();

    jest.useRealTimers();
  });
});
```

### Testing with React Query

**useConferences.test.ts:**
```typescript
import { renderHook, waitFor } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConferences } from '@/hooks/api/useConferences';
import * as conferenceAPI from '@/services/api/modules/conference';

jest.mock('@/services/api/modules/conference');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useConferences', () => {
  it('should fetch conferences successfully', async () => {
    const mockConferences = [
      { id: '1', name: 'PGConf EU 2024' },
      { id: '2', name: 'PGConf EU 2025' },
    ];

    (conferenceAPI.fetchConferences as jest.Mock).mockResolvedValue(mockConferences);

    const { result } = renderHook(() => useConferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockConferences);
  });

  it('should handle error', async () => {
    (conferenceAPI.fetchConferences as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useConferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});
```

## End-to-End Testing (Detox)

### Configuration

**.detoxrc.json:**
```json
{
  "testRunner": {
    "args": {
      "$0": "jest",
      "config": "e2e/jest.config.js"
    },
    "jest": {
      "setupTimeout": 120000
    }
  },
  "apps": {
    "ios.debug": {
      "type": "ios.app",
      "binaryPath": "ios/build/Build/Products/Debug-iphonesimulator/PGEUConf.app",
      "build": "xcodebuild -workspace ios/PGEUConf.xcworkspace -scheme PGEUConf -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build"
    },
    "ios.release": {
      "type": "ios.app",
      "binaryPath": "ios/build/Build/Products/Release-iphonesimulator/PGEUConf.app",
      "build": "xcodebuild -workspace ios/PGEUConf.xcworkspace -scheme PGEUConf -configuration Release -sdk iphonesimulator -derivedDataPath ios/build"
    },
    "android.debug": {
      "type": "android.apk",
      "binaryPath": "android/app/build/outputs/apk/debug/app-debug.apk",
      "build": "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug"
    },
    "android.release": {
      "type": "android.apk",
      "binaryPath": "android/app/build/outputs/apk/release/app-release.apk",
      "build": "cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release"
    }
  },
  "devices": {
    "simulator": {
      "type": "ios.simulator",
      "device": {
        "type": "iPhone 15 Pro"
      }
    },
    "emulator": {
      "type": "android.emulator",
      "device": {
        "avdName": "Pixel_5_API_33"
      }
    }
  },
  "configurations": {
    "ios.sim.debug": {
      "device": "simulator",
      "app": "ios.debug"
    },
    "ios.sim.release": {
      "device": "simulator",
      "app": "ios.release"
    },
    "android.emu.debug": {
      "device": "emulator",
      "app": "android.debug"
    },
    "android.emu.release": {
      "device": "emulator",
      "app": "android.release"
    }
  }
}
```

**e2e/jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000,
  maxWorkers: 1,
  verbose: true,
  reporters: ['detox/runners/jest/reporter'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  testEnvironment: 'detox/runners/jest/testEnvironment',
};
```

### E2E Test Examples

**e2e/login.e2e.ts:**
```typescript
import { by, device, element, expect as detoxExpect } from 'detox';

describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show welcome screen on first launch', async () => {
    await detoxExpect(element(by.id('welcome-screen'))).toBeVisible();
  });

  it('should navigate to login screen', async () => {
    await element(by.id('login-button')).tap();
    await detoxExpect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should login successfully with valid credentials', async () => {
    await element(by.id('login-button')).tap();

    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('TestPass123!');

    await element(by.id('submit-button')).tap();

    // Wait for navigation to main screen
    await waitFor(element(by.id('scanner-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('login-button')).tap();

    await element(by.id('email-input')).typeText('wrong@example.com');
    await element(by.id('password-input')).typeText('wrong');

    await element(by.id('submit-button')).tap();

    await detoxExpect(element(by.text('Invalid credentials'))).toBeVisible();
  });
});
```

**e2e/scanner.e2e.ts:**
```typescript
import { by, device, element, expect as detoxExpect } from 'detox';

describe('Scanner Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Login first
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('TestPass123!');
    await element(by.id('submit-button')).tap();
    await waitFor(element(by.id('scanner-screen'))).toBeVisible();
  });

  it('should show camera permission prompt', async () => {
    // On first access
    await detoxExpect(element(by.text('Camera Permission Required'))).toBeVisible();
  });

  it('should show scanner screen after permission granted', async () => {
    await element(by.text('Grant Permission')).tap();

    // Grant system permission (simulator/emulator)
    if (device.getPlatform() === 'ios') {
      await device.sendUserNotification({
        trigger: {
          type: 'push',
        },
      });
    }

    await detoxExpect(element(by.id('camera-view'))).toBeVisible();
  });

  it('should change scan mode', async () => {
    await element(by.id('scan-mode-selector')).tap();
    await element(by.text('Sponsor Scan')).tap();

    await detoxExpect(element(by.text('Sponsor Mode'))).toBeVisible();
  });

  // Note: QR scanning requires physical device or mocked scan
  it('should handle manual entry fallback', async () => {
    await element(by.id('manual-entry-button')).tap();

    await element(by.id('attendee-id-input')).typeText('ATT123');
    await element(by.id('submit-manual-entry')).tap();

    await detoxExpect(element(by.text('Check-in successful'))).toBeVisible();
  });
});
```

**e2e/networkErrors.e2e.ts:**
```typescript
import { by, device, element, expect as detoxExpect } from 'detox';

describe('Network Error Handling', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Login
    await loginHelper();
  });

  it('should show error message when network unavailable', async () => {
    // Disable network
    await device.setURLBlacklist(['.*']);

    // Attempt check-in
    await element(by.id('manual-entry-button')).tap();
    await element(by.id('attendee-id-input')).typeText('ATT456');
    await element(by.id('submit-manual-entry')).tap();

    // Should show network error message
    await detoxExpect(element(by.text(/no internet connection/i))).toBeVisible();
  });

  it('should allow retry after network restored', async () => {
    // Re-enable network
    await device.setURLBlacklist([]);

    // Tap retry button
    await element(by.id('retry-button')).tap();

    // Should succeed
    await waitFor(element(by.text('Check-in successful')))
      .toBeVisible()
      .withTimeout(5000);
  });
});

function loginHelper() {
  // Helper function to login
  // Implementation
}
```

### Running E2E Tests

```bash
# Build app for E2E (iOS)
detox build --configuration ios.sim.debug

# Run E2E tests (iOS)
detox test --configuration ios.sim.debug

# Build and test (Android)
detox build --configuration android.emu.debug
detox test --configuration android.emu.debug

# Run specific test
detox test --configuration ios.sim.debug e2e/login.e2e.ts

# Run with verbose logging
detox test --configuration ios.sim.debug --loglevel trace
```

## Manual Testing Checklist

### Pre-Release Testing

**Functionality:**
- [ ] Login with valid credentials
- [ ] Login fails with invalid credentials
- [ ] Conference scan setup via deep link
- [ ] QR code scanning (use test QR codes)
- [ ] Manual attendee ID entry
- [ ] Switch between scan modes
- [ ] Attendee search
- [ ] View statistics
- [ ] Offline queue persistence
- [ ] Queue sync when online
- [ ] Logout and data cleared

**Permissions:**
- [ ] Camera permission request on first use
- [ ] Permission blocked dialog shows settings link
- [ ] Location permission (if using field check-in)

**Offline Functionality:**
- [ ] Enable airplane mode
- [ ] Perform check-in (should queue)
- [ ] Disable airplane mode
- [ ] Verify auto-sync
- [ ] Manual sync from queue screen

**Platform-Specific (iOS):**
- [ ] Universal Links work from Safari
- [ ] Safe area handling on notched devices
- [ ] Face ID/Touch ID (if implemented)
- [ ] Keychain persists after app deletion
- [ ] Background app resume
- [ ] App switching/multitasking

**Platform-Specific (Android):**
- [ ] App Links work from Chrome
- [ ] Back button navigation
- [ ] Keystore survives app reinstall
- [ ] Edge-to-edge display on Android 10+
- [ ] Battery optimization dialog (if needed)

**Performance:**
- [ ] App launches in < 2 seconds
- [ ] Scan processing < 500ms
- [ ] Smooth scrolling in attendee list
- [ ] No memory leaks (use profiler)

**Accessibility:**
- [ ] Screen reader navigation (VoiceOver/TalkBack)
- [ ] Sufficient color contrast
- [ ] Touch targets >= 44x44 pts
- [ ] Form labels readable by screen reader

## Accessibility Testing

### Automated Accessibility Tests

```typescript
import { render } from '@testing-library/react-native';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(
      <Button title="Check In" onPress={() => {}} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible label', () => {
    const { getByLabelText } = render(
      <Button title="Check In" onPress={() => {}} accessibilityLabel="Check in attendee" />
    );

    expect(getByLabelText('Check in attendee')).toBeTruthy();
  });
});
```

### Manual Accessibility Testing

**iOS VoiceOver:**
1. Enable: Settings > Accessibility > VoiceOver
2. Navigate: Swipe right/left
3. Activate: Double tap
4. Test all screens

**Android TalkBack:**
1. Enable: Settings > Accessibility > TalkBack
2. Navigate: Swipe right/left
3. Activate: Double tap
4. Test all screens

## Performance Testing

### Measure App Startup Time

```typescript
// App.tsx
import { PerformanceObserver, performance } from 'perf_hooks';

if (__DEV__) {
  const startMark = performance.now();

  // After app ready
  setTimeout(() => {
    const duration = performance.now() - startMark;
    console.log(`App startup time: ${duration}ms`);
  }, 0);
}
```

### Measure Component Render Time

```typescript
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) {
  console.log(`${id} ${phase} took ${actualDuration}ms`);
}

<Profiler id="ScannerScreen" onRender={onRenderCallback}>
  <ScannerScreen />
</Profiler>
```

## CI/CD Integration

### GitHub Actions Example

**.github/workflows/test.yml:**
```yaml
name: Test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e-ios:
    runs-on: macos-13
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install pods
        run: cd ios && pod install

      - name: Build for E2E
        run: detox build --configuration ios.sim.release

      - name: Run E2E tests
        run: detox test --configuration ios.sim.release --cleanup

  e2e-android:
    runs-on: macos-13
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '11'

      - name: Install dependencies
        run: npm ci

      - name: Build for E2E
        run: detox build --configuration android.emu.release

      - name: Run E2E tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          target: google_apis
          arch: x86_64
          profile: Pixel_5
          script: detox test --configuration android.emu.release --headless
```

## Test Coverage Goals

**By Module:**

| Module | Target Coverage | Priority |
|--------|----------------|----------|
| Utils | 90%+ | High |
| Stores | 85%+ | High |
| API Modules | 80%+ | High |
| Services | 80%+ | High |
| Hooks | 75%+ | Medium |
| Components | 70%+ | Medium |
| Screens | 60%+ | Low |

**Critical Paths (100% coverage required):**
- Authentication flow
- Network error handling and retry logic
- QR code processing
- API error handling
- Token storage/retrieval

## Conclusion

Comprehensive testing strategy ensures:
- High code quality (>80% coverage)
- Confidence in refactoring
- Early bug detection
- Regression prevention
- App store approval readiness
- Robust network error handling

Testing investment pays off through:
- Faster development (fewer bugs)
- Easier maintenance
- Better user experience
- Higher app store ratings
- Reliable operation in poor network conditions
