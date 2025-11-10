# Project Structure & Code Organization

**Note:** Offline mode has been removed from requirements. All scanning operations require active network connectivity.

## Directory Structure

```
pgeu-system-app/
├── android/                          # Android native code
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── res/
│   │   │   └── java/com/pgeuconf/
│   │   ├── build.gradle
│   │   └── proguard-rules.pro
│   ├── gradle/
│   └── build.gradle
│
├── ios/                              # iOS native code
│   ├── PGEUConf/
│   │   ├── AppDelegate.mm
│   │   ├── Info.plist
│   │   ├── PrivacyInfo.xcprivacy
│   │   └── LaunchScreen.storyboard
│   ├── PGEUConf.xcodeproj/
│   ├── PGEUConf.xcworkspace/
│   └── Podfile
│
├── src/                              # Application source code
│   ├── components/                   # Reusable components
│   │   ├── common/                   # Generic UI components
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Card/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   └── Toast/
│   │   │
│   │   ├── features/                 # Feature-specific components
│   │   │   ├── scanner/
│   │   │   │   ├── CameraView/
│   │   │   │   │   ├── CameraView.tsx
│   │   │   │   │   ├── CameraView.test.tsx
│   │   │   │   │   ├── useCameraPermission.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── ScanModeSelector/
│   │   │   │   ├── ScanResultModal/
│   │   │   │   └── ManualEntryFallback/
│   │   │   │
│   │   │   ├── search/
│   │   │   │   ├── AttendeeList/
│   │   │   │   ├── AttendeeListItem/
│   │   │   │   ├── SearchBar/
│   │   │   │   └── AttendeeDetailModal/
│   │   │   │
│   │   │   └── stats/
│   │   │       ├── SummaryCard/
│   │   │       ├── ScanChart/
│   │   │       └── RecentActivity/
│   │   │
│   │   └── layout/                   # Layout components
│   │       ├── Screen/
│   │       ├── ErrorBoundary/
│   │       └── LoadingOverlay/
│   │
│   ├── screens/                      # Screen components
│   │   ├── auth/
│   │   │   ├── WelcomeScreen/
│   │   │   │   ├── WelcomeScreen.tsx
│   │   │   │   ├── WelcomeScreen.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── LoginScreen/
│   │   │   └── ConferenceSetupScreen/
│   │   │
│   │   ├── main/
│   │   │   ├── ScannerScreen/
│   │   │   │   ├── ScannerScreen.tsx
│   │   │   │   ├── ScannerScreen.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── SearchScreen/
│   │   │   ├── StatsScreen/
│   │   │   ├── SettingsScreen/
│   │   │   ├── ConferenceSelectorScreen/
│   │   │   └── AboutScreen/
│   │   │
│   │   └── index.ts                  # Screen exports
│   │
│   ├── navigation/                   # Navigation configuration
│   │   ├── types.ts                  # Navigation type definitions
│   │   ├── RootNavigator.tsx         # Root navigation container
│   │   ├── AuthNavigator.tsx         # Auth stack navigator
│   │   ├── MainNavigator.tsx         # Main stack navigator
│   │   ├── TabNavigator.tsx          # Bottom tab navigator
│   │   ├── linking.ts                # Deep linking configuration
│   │   └── index.ts
│   │
│   ├── services/                     # Business logic & external integrations
│   │   ├── api/                      # API client
│   │   │   ├── client.ts             # Axios instance & interceptors
│   │   │   ├── types.ts              # API types
│   │   │   ├── modules/              # API endpoint modules
│   │   │   │   ├── auth.ts
│   │   │   │   ├── conference.ts
│   │   │   │   ├── attendee.ts
│   │   │   │   ├── scan.ts
│   │   │   │   └── statistics.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── storage/                  # Storage services
│   │   │   ├── secureStorage.ts      # Keychain/Keystore wrapper
│   │   │   ├── asyncStorage.ts       # AsyncStorage wrapper
│   │   │   └── index.ts
│   │   │
│   │   ├── camera/                   # Camera service
│   │   │   ├── CameraService.ts
│   │   │   ├── QRCodeScanner.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── deepLinking/              # Deep link handling
│   │   │   ├── DeepLinkHandler.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── permissions/              # Permission handling
│   │   │   ├── PermissionService.ts
│   │   │   └── index.ts
│   │   │
│   │   └── analytics/                # Analytics & crash reporting
│   │       ├── AnalyticsService.ts
│   │       └── index.ts
│   │
│   ├── stores/                       # State management (Zustand)
│   │   ├── appStore.ts               # Global app state
│   │   ├── authStore.ts              # Authentication state
│   │   ├── preferencesStore.ts       # User preferences
│   │   ├── middleware/               # Store middleware
│   │   │   ├── persistMiddleware.ts
│   │   │   └── loggerMiddleware.ts
│   │   └── index.ts
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── api/                      # React Query hooks
│   │   │   ├── useConferences.ts
│   │   │   ├── useAttendees.ts
│   │   │   ├── useCheckin.ts
│   │   │   ├── useStatistics.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── useQRScanner.ts           # QR scanner hook
│   │   ├── useNetworkStatus.ts       # Network detection hook
│   │   ├── usePermissions.ts         # Permission hook
│   │   ├── useDeepLinking.ts         # Deep linking hook
│   │   └── index.ts
│   │
│   ├── utils/                        # Utility functions
│   │   ├── errorHandling.ts          # Error normalization & handling
│   │   ├── validation.ts             # Input validation
│   │   ├── formatting.ts             # Date/number formatting
│   │   ├── platform.ts               # Platform detection utilities
│   │   ├── logger.ts                 # Logging utility
│   │   └── index.ts
│   │
│   ├── types/                        # TypeScript type definitions
│   │   ├── models/                   # Domain models
│   │   │   ├── Conference.ts
│   │   │   ├── Attendee.ts
│   │   │   ├── Scan.ts
│   │   │   ├── User.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── api.ts                    # API-related types
│   │   ├── navigation.ts             # Navigation types
│   │   ├── store.ts                  # Store types
│   │   └── index.ts
│   │
│   ├── config/                       # Configuration
│   │   ├── index.ts                  # Unified config (react-native-config)
│   │   ├── queryClient.ts            # React Query configuration
│   │   ├── theme.ts                  # App theme (colors, fonts, spacing)
│   │   └── constants.ts              # App constants
│   │
│   ├── assets/                       # Static assets
│   │   ├── images/
│   │   │   ├── logo.png
│   │   │   └── placeholder.png
│   │   ├── icons/                    # Custom icons (if not using icon library)
│   │   └── fonts/                    # Custom fonts
│   │
│   ├── styles/                       # Global styles
│   │   ├── global.ts                 # Global style definitions
│   │   └── typography.ts             # Typography styles
│   │
│   └── App.tsx                       # Root application component
│
├── e2e/                              # End-to-end tests (Detox)
│   ├── config.json
│   ├── setup.ts
│   └── tests/
│       ├── login.e2e.ts
│       ├── scanner.e2e.ts
│       └── offlineQueue.e2e.ts
│
├── __tests__/                        # Unit & integration tests
│   ├── components/
│   ├── screens/
│   ├── services/
│   ├── stores/
│   └── utils/
│
├── .env.development                  # Development environment variables
├── .env.staging                      # Staging environment variables
├── .env.production                   # Production environment variables
│
├── .eslintrc.js                      # ESLint configuration
├── .prettierrc.js                    # Prettier configuration
├── tsconfig.json                     # TypeScript configuration
├── jest.config.js                    # Jest configuration
├── metro.config.js                   # Metro bundler configuration
├── babel.config.js                   # Babel configuration
│
├── package.json                      # Dependencies & scripts
├── package-lock.json
│
├── README.md                         # Project documentation
└── CHANGELOG.md                      # Version history

```

## Naming Conventions

### Files & Folders

**Components:**
- PascalCase for component folders and files: `Button/`, `Button.tsx`
- Index exports: `index.ts` re-exports the main component
- Test files: `ComponentName.test.tsx` next to component
- Types file (if complex): `ComponentName.types.ts`

**Screens:**
- PascalCase with "Screen" suffix: `ScannerScreen.tsx`
- Folder per screen: `ScannerScreen/ScannerScreen.tsx`

**Hooks:**
- camelCase with "use" prefix: `useQRScanner.ts`
- React Query hooks: `useConferences.ts`, `useAttendees.ts`

**Services:**
- PascalCase for classes: `QueueManager.ts`
- camelCase for function modules: `secureStorage.ts`

**Stores:**
- camelCase with "Store" suffix: `authStore.ts`

**Utils:**
- camelCase: `errorHandling.ts`, `validation.ts`

**Types:**
- PascalCase for interfaces/types: `Conference.ts`, `Attendee.ts`

### Code Conventions

**Component Names:**
```typescript
// Component files
export function ScannerScreen() { ... }
export function Button() { ... }

// HOCs
export const withAuth = (Component) => { ... }

// Render functions (private)
const renderItem = ({ item }: { item: Attendee }) => { ... }
```

**Hook Names:**
```typescript
// Custom hooks
export function useQRScanner() { ... }
export function useNetworkStatus() { ... }

// React Query hooks
export function useConferences() { ... }
export function useCheckin() { ... }
```

**Type Names:**
```typescript
// Interfaces for models
export interface Conference { ... }
export interface Attendee { ... }

// Types for unions/utilities
export type ScanMode = 'checkin' | 'sponsor' | 'field';
export type ApiResponse<T> = { ... }

// Props interfaces
export interface ButtonProps { ... }
export interface ScannerScreenProps { ... }
```

**Constants:**
```typescript
// All caps with underscores for true constants
export const API_TIMEOUT = 10000;
export const MAX_RETRY_ATTEMPTS = 3;

// PascalCase for configuration objects
export const QueryConfig = { ... }
export const ThemeColors = { ... }
```

**Function Names:**
```typescript
// camelCase for functions
export function formatDate(date: Date): string { ... }
export async function fetchConferences(): Promise<Conference[]> { ... }

// Event handlers: "handle" + Event
const handlePress = () => { ... }
const handleScan = (code: string) => { ... }

// Boolean functions: "is" or "has" prefix
export function isOffline(): boolean { ... }
export function hasPermission(permission: string): boolean { ... }
```

## Component Patterns

### Component Structure

**Standard component file structure:**

```typescript
// Button.tsx
import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/config/theme';

// 1. Type definitions
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

// 2. Component
export const Button = memo<ButtonProps>(({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
}) => {
  // 3. Hooks
  const theme = useTheme();

  // 4. Derived state/values
  const backgroundColor = theme.button[variant];

  // 5. Event handlers
  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  // 6. Render
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }]}
      onPress={handlePress}
      disabled={disabled || loading}
      testID={testID}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
});

// 7. Display name (for debugging)
Button.displayName = 'Button';

// 8. Styles
const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

### Screen Structure

**Standard screen file structure:**

```typescript
// ScannerScreen.tsx
import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '@/components/layout/Screen';
import { CameraView } from '@/components/features/scanner/CameraView';
import { ScanModeSelector } from '@/components/features/scanner/ScanModeSelector';
import { useQRScanner } from '@/hooks/useQRScanner';
import { useCheckin } from '@/hooks/api/useCheckin';
import { appStore } from '@/stores/appStore';
import type { MainStackScreenProps } from '@/navigation/types';

// 1. Type definitions
type Props = MainStackScreenProps<'Scanner'>;

// 2. Component
export function ScannerScreen({ navigation }: Props) {
  // 3. Hooks - state management
  const scanMode = appStore((state) => state.scanMode);
  const setScanMode = appStore((state) => state.setScanMode);

  // 4. Hooks - API/data
  const { mutate: checkinAttendee } = useCheckin();
  const { startScanning, stopScanning, scannedCode } = useQRScanner();

  // 5. Side effects
  useFocusEffect(
    useCallback(() => {
      startScanning();
      return () => stopScanning();
    }, [])
  );

  useEffect(() => {
    if (scannedCode) {
      handleScan(scannedCode);
    }
  }, [scannedCode]);

  // 6. Event handlers
  const handleScan = (code: string) => {
    checkinAttendee({
      attendeeId: code,
      mode: scanMode,
    });
  };

  const handleModeChange = (mode: ScanMode) => {
    setScanMode(mode);
  };

  // 7. Render
  return (
    <Screen>
      <View style={styles.container}>
        <ScanModeSelector
          selectedMode={scanMode}
          onModeChange={handleModeChange}
        />
        <CameraView onScan={handleScan} />
      </View>
    </Screen>
  );
}

// 8. Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Custom Hook Structure

```typescript
// useQRScanner.ts
import { useState, useCallback, useRef } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { scanCodes, Code } from 'vision-camera-code-scanner';

export interface UseQRScannerResult {
  scannedCode: string | null;
  startScanning: () => void;
  stopScanning: () => void;
  isScanning: boolean;
}

export function useQRScanner(): UseQRScannerResult {
  // 1. State
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const lastScanTime = useRef(0);

  // 2. Frame processor
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    if (!isScanning) return;

    const codes = scanCodes(frame, ['qr']);
    if (codes.length > 0) {
      const now = Date.now();
      // Debounce: only scan once per second
      if (now - lastScanTime.current > 1000) {
        runOnJS(setScannedCode)(codes[0].value);
        lastScanTime.current = now;
      }
    }
  }, [isScanning]);

  // 3. Handlers
  const startScanning = useCallback(() => {
    setIsScanning(true);
    setScannedCode(null);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  // 4. Return interface
  return {
    scannedCode,
    startScanning,
    stopScanning,
    isScanning,
  };
}
```

## Platform-Specific Code Isolation

### Platform File Extensions

```typescript
// Use .ios.ts and .android.ts for platform-specific implementations

// secureStorage.ios.ts
import Keychain from 'react-native-keychain';

export async function saveToken(token: string) {
  await Keychain.setGenericPassword('auth_token', token, {
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
  });
}

// secureStorage.android.ts
import Keychain from 'react-native-keychain';

export async function saveToken(token: string) {
  await Keychain.setGenericPassword('auth_token', token, {
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  });
}

// Usage in code - imports correct platform version automatically
import { saveToken } from '@/services/storage/secureStorage';
```

### Platform Select for Small Differences

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  header: {
    fontSize: 20,
    fontWeight: '600',
    ...Platform.select({
      ios: {
        fontFamily: 'SF Pro Display',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
});

// For values
const SHADOW_CONFIG = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  android: {
    elevation: 5,
  },
});
```

### Platform Checks for Conditional Logic

```typescript
import { Platform } from 'react-native';

function requestCameraPermission() {
  if (Platform.OS === 'ios') {
    // iOS-specific permission flow
    return request(PERMISSIONS.IOS.CAMERA);
  } else {
    // Android-specific permission flow
    return request(PERMISSIONS.ANDROID.CAMERA);
  }
}

// Check version
if (Platform.Version >= 29) {
  // Android 10+ specific code
}
```

## Import Path Aliases

Configure TypeScript and Metro for cleaner imports:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/screens/*": ["src/screens/*"],
      "@/services/*": ["src/services/*"],
      "@/stores/*": ["src/stores/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/utils/*": ["src/utils/*"],
      "@/types/*": ["src/types/*"],
      "@/config/*": ["src/config/*"],
      "@/assets/*": ["src/assets/*"]
    }
  }
}
```

```javascript
// babel.config.js
module.exports = {
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/screens': './src/screens',
          '@/services': './src/services',
          '@/stores': './src/stores',
          '@/hooks': './src/hooks',
          '@/utils': './src/utils',
          '@/types': './src/types',
          '@/config': './src/config',
          '@/assets': './src/assets',
        },
      },
    ],
  ],
};
```

**Usage:**
```typescript
// Instead of
import { Button } from '../../../components/common/Button';
import { useConferences } from '../../../hooks/api/useConferences';

// Use
import { Button } from '@/components/common/Button';
import { useConferences } from '@/hooks/api/useConferences';
```

## Code Sharing Strategy

### Maximum Code Reuse
- **95%+ shared code** between iOS and Android
- Platform-specific code isolated in dedicated files
- Business logic completely platform-agnostic

### What to Share
- All business logic (API calls, state management, offline queue)
- All React components (UI differences handled via theme/Platform)
- All utilities and helpers
- Navigation structure
- Type definitions

### What to Separate
- Native module configurations (Info.plist, AndroidManifest.xml)
- Build configurations (Xcode, Gradle)
- Platform-specific security (Keychain vs Keystore)
- Deep linking configuration (Universal Links vs App Links)
- Push notification setup (APNs vs FCM)

## Export Patterns

### Barrel Exports

Use `index.ts` files to create clean public APIs:

```typescript
// components/common/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { Modal } from './Modal';

// Usage
import { Button, Card, Input } from '@/components/common';
```

**When to use barrel exports:**
- Component folders
- Hook folders
- Utility folders
- Type folders

**When NOT to use barrel exports:**
- Screens (explicit imports preferred)
- Large service modules (tree-shaking optimization)

### Named Exports vs Default Exports

**Prefer named exports:**
```typescript
// Good - named export
export function Button() { ... }

// Avoid - default export
export default function Button() { ... }
```

**Rationale:**
- Better for refactoring (auto-imports work correctly)
- Consistent naming across codebase
- Better tree-shaking
- Easier to search

**Exception:** React Navigation screen components (navigation typing works better with default exports)

## Documentation Standards

### Component Documentation

```typescript
/**
 * Button component for primary user actions.
 *
 * @example
 * ```tsx
 * <Button
 *   title="Check In"
 *   onPress={handleCheckin}
 *   variant="primary"
 * />
 * ```
 */
export interface ButtonProps {
  /** Button text to display */
  title: string;

  /** Callback when button is pressed */
  onPress: () => void;

  /**
   * Visual variant of the button
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'danger';

  /**
   * Whether the button is disabled
   * @default false
   */
  disabled?: boolean;
}
```

### Complex Logic Documentation

```typescript
/**
 * Processes the offline queue by attempting to sync pending actions.
 *
 * Strategy:
 * 1. Filter for pending/failed items
 * 2. Process in FIFO order
 * 3. Exponential backoff for failures (max 5 retries)
 * 4. Mark successful items for cleanup
 *
 * @throws {QueueProcessingError} If critical sync failure occurs
 */
async function processQueue(): Promise<void> {
  // Implementation
}
```

## Testing Organization

### Test File Placement

**Co-located with source:**
```
Button/
├── Button.tsx
├── Button.test.tsx
├── Button.types.ts
└── index.ts
```

### Test Structure

```typescript
// Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  // Group by functionality
  describe('rendering', () => {
    it('should render title text', () => {
      // Test
    });

    it('should apply variant styles correctly', () => {
      // Test
    });
  });

  describe('interactions', () => {
    it('should call onPress when pressed', () => {
      // Test
    });

    it('should not call onPress when disabled', () => {
      // Test
    });
  });

  describe('accessibility', () => {
    it('should be accessible to screen readers', () => {
      // Test
    });
  });
});
```

## Style Organization

### StyleSheet Pattern

```typescript
// Prefer StyleSheet.create for performance
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  // Group related styles
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  // Use semantic names
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
});
```

### Theme Integration

```typescript
// config/theme.ts
export const theme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    danger: '#FF3B30',
    background: '#FFFFFF',
    text: '#000000',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: '700' },
    h2: { fontSize: 22, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: '400' },
    caption: { fontSize: 12, fontWeight: '400' },
  },
};

// Usage in components
import { theme } from '@/config/theme';

const styles = StyleSheet.create({
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
});
```

## Configuration Management

### Environment Variables

```typescript
// config/index.ts
import Config from 'react-native-config';

export const config = {
  // API
  apiBaseUrl: Config.API_BASE_URL || 'http://localhost:8000',
  apiTimeout: parseInt(Config.API_TIMEOUT || '10000', 10),

  // Features
  enableAnalytics: Config.ENABLE_ANALYTICS === 'true',
  enableCrashReporting: Config.ENABLE_CRASH_REPORTING === 'true',

  // Sentry
  sentryDsn: Config.SENTRY_DSN || '',

  // App
  appVersion: Config.APP_VERSION || '1.0.0',
  buildNumber: Config.BUILD_NUMBER || '1',

  // Environment
  environment: Config.ENV || 'development',
  isDevelopment: Config.ENV === 'development',
  isProduction: Config.ENV === 'production',
};
```

## Summary

This structure provides:
- **Clear separation of concerns**: Components, screens, services, state
- **Scalability**: Easy to add new features without restructuring
- **Maintainability**: Consistent patterns and naming
- **Testability**: Co-located tests, dependency injection
- **Developer experience**: Clean imports, TypeScript support, documentation

The folder structure scales from the initial implementation through years of maintenance and feature additions.
