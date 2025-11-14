# PGConf Scanner App - React Native Architecture

**Note:** Offline mode has been removed from requirements. All scanning operations require active network connectivity.

## Executive Summary

This document outlines the architecture for a cross-platform conference scanner application built with React Native, targeting iOS 13+ and Android 6.0+ (API 23+). The app replaces an existing Android-only solution with multi-platform support.

## Technology Stack

### Core Framework
- **React Native**: 0.73.x (Latest stable with New Architecture support)
  - Rationale: Excellent stability, broad device support, optional New Architecture for future performance gains
  - Hermes engine enabled for both platforms (faster startup, lower memory)
  - New Architecture: Optional, can enable incrementally

### Key Dependencies

#### Camera & QR Scanning
- **react-native-vision-camera**: ^3.9.0
  - Modern, performant camera library with ML Kit integration
  - Frame processor support for real-time QR code detection
  - Supports iOS 13+ and Android 6.0+
  - Battery-efficient
- **vision-camera-code-scanner**: ^0.2.0
  - ML Kit wrapper for Vision Camera
  - Native QR/barcode scanning performance
  - Handles multiple code formats

#### Navigation
- **@react-navigation/native**: ^6.1.0
- **@react-navigation/native-stack**: ^6.9.0
- **@react-navigation/bottom-tabs**: ^6.5.0
- **react-native-screens**: ^3.29.0
  - Native navigation performance
  - Deep linking support built-in
  - Type-safe with TypeScript

#### State Management
- **Zustand**: ^4.5.0
  - Minimal boilerplate, excellent TypeScript support
  - Lightweight state management for UI state and auth
  - Lighter than Redux, more structured than Context
  - Easy to test and debug
- **@tanstack/react-query**: ^5.17.0
  - Server state management
  - Automatic background refetching
  - Optimistic updates
  - Cache management

#### Storage
- **@react-native-async-storage/async-storage**: ^1.21.0
  - Persistent storage for app preferences and settings
- **react-native-keychain**: ^8.1.0
  - Secure token storage (iOS Keychain, Android Keystore)
  - Biometric authentication support

#### Networking
- **axios**: ^1.6.0
  - Interceptor support for token auth
  - Request/response transformation
  - Form-urlencoded support for Django backend
- **axios-retry**: ^4.0.0
  - Automatic retry with exponential backoff

#### UI Components
- **react-native-paper**: ^5.12.0
  - Material Design components
  - Consistent iOS/Android styling
  - Accessibility built-in
  - Theme support
- **react-native-safe-area-context**: ^4.8.0
  - Safe area handling for notched devices

#### Utilities
- **react-native-device-info**: ^10.13.0
  - Device capabilities detection
  - Version information
- **react-native-permissions**: ^4.1.0
  - Unified permissions API
  - Required for camera access
- **date-fns**: ^3.0.0
  - Date manipulation (lighter than moment.js)
- **zod**: ^3.22.0
  - Runtime type validation for API responses

#### Development & Testing
- **TypeScript**: ^5.3.0
- **@testing-library/react-native**: ^12.4.0
- **jest**: ^29.7.0
- **detox**: ^20.17.0 (E2E testing)
- **@react-native-community/eslint-config**: ^3.2.0
- **prettier**: ^3.2.0

#### Build & Deployment
- **react-native-config**: ^1.5.0
  - Environment-specific configuration
  - API endpoints, feature flags
- **@sentry/react-native**: ^5.17.0
  - Error tracking and performance monitoring
  - Crash reporting
- **fastlane**: For automated builds and submissions

## Application Architecture

### High-Level Architecture Pattern

**Service-Oriented Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  (React Components, Screens, Navigation)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                      State Management Layer                  │
│  - UI State (Zustand)                                        │
│  - Server State (React Query)                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                       Service Layer                          │
│  - API Client (Axios)                                        │
│  - Camera Service                                            │
│  - Storage Service                                           │
│  - Deep Link Handler                                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                     Platform Layer                           │
│  - Native Modules (Camera, Storage, Keychain)                │
│  - Platform-Specific Implementations                         │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App (Root)
├── Navigation Container (Deep Linking)
│   ├── Auth Stack (Not authenticated)
│   │   ├── Welcome Screen
│   │   ├── Login Screen
│   │   └── Conference Scan Setup Screen (Deep Link)
│   │
│   └── Main Stack (Authenticated)
│       ├── Home Tab Navigator
│       │   ├── Scanner Tab
│       │   │   └── Scanner Screen
│       │   │       ├── Camera View Component
│       │   │       ├── Scan Result Modal
│       │   │       └── Mode Selector
│       │   ├── Search Tab
│       │   │   └── Attendee Search Screen
│       │   │       ├── Search Bar
│       │   │       ├── Attendee List
│       │   │       └── Attendee Detail Modal
│       │   └── Stats Tab
│       │       └── Statistics Dashboard
│       │           ├── Summary Cards
│       │           ├── Charts
│       │           └── Recent Activity
│       │
│       ├── Settings Screen (Modal)
│       ├── Conference Selector Screen
│       └── About Screen
│
└── Global Components
    ├── Error Boundary
    ├── Network Status Indicator
    ├── Loading Overlay
    └── Toast Notifications
```

### Navigation Structure

**Stack-based navigation with tab navigation for main screens:**

```typescript
// Navigation hierarchy
AuthStack (if not authenticated)
  - Welcome
  - Login
  - ConferenceSetup (from deep link)

MainStack (if authenticated)
  - TabNavigator
      - ScannerTab
      - SearchTab
      - StatsTab
  - ConferenceSelector (modal)
  - Settings (modal)
  - About (modal)
```

**Deep Linking Structure:**
- `pgeuconf://setup/{token}` - Conference scan setup link
- `pgeuconf://conference/{conferenceId}` - Switch conference
- `pgeuconf://scan/{mode}` - Deep link to specific scan mode

### State Management Strategy

#### 1. UI State (Zustand)

**Purpose**: Local UI state, user preferences, current conference

```typescript
// stores/appStore.ts
interface AppState {
  currentConference: Conference | null;
  scanMode: 'checkin' | 'sponsor' | 'field';
  preferences: UserPreferences;
}

// stores/authStore.ts
interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials) => Promise<void>;
  logout: () => void;
}
```

**Persistence Strategy:**
- Persist: auth state, preferences, current conference
- Don't persist: temporary UI state, camera state, network status

#### 2. Server State (React Query)

**Purpose**: API data fetching, caching, synchronization

```typescript
// hooks/useConferences.ts
export function useConferences() {
  return useQuery({
    queryKey: ['conferences'],
    queryFn: fetchConferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// hooks/useAttendees.ts
export function useAttendees(conferenceId: string) {
  return useQuery({
    queryKey: ['attendees', conferenceId],
    queryFn: () => fetchAttendees(conferenceId),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!conferenceId,
  });
}

// hooks/useCheckin.ts
export function useCheckin() {
  return useMutation({
    mutationFn: checkinAttendee,
    onError: (error, variables) => {
      // Show error toast with retry option
      showErrorToast('Check-in failed. Please try again.');
    },
  });
}
```

### API Client Architecture

**Layered API client with error handling and retry logic:**

```
API Client Layer
├── Base Client (axios instance)
│   ├── Request Interceptors
│   │   ├── Add auth token
│   │   ├── Add device info headers
│   │   └── Form-urlencoded transformation
│   │
│   ├── Response Interceptors
│   │   ├── Token refresh handling
│   │   ├── Error normalization
│   │   └── Response validation (Zod)
│   │
│   └── Network Error Handling
│       └── Retry logic with exponential backoff
│
└── API Modules
    ├── AuthAPI
    ├── ConferenceAPI
    ├── AttendeeAPI
    ├── ScanAPI
    └── StatisticsAPI
```

**Key Implementation Details:**

```typescript
// services/api/client.ts
const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = authStore.getState().token;
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      // Network error - will be handled by axios-retry
      // User will see error message with retry option
    }

    if (error.response?.status === 401) {
      // Token expired - logout
      authStore.getState().logout();
    }

    return Promise.reject(normalizeError(error));
  }
);
```

### Error Handling Strategy

**Multi-layered error handling:**

1. **Network Errors**: User notification with retry option (axios-retry for automatic retry)
2. **Validation Errors**: Inline form validation
3. **Server Errors**: Toast notifications with retry option
4. **Camera Errors**: Permission prompts + fallback manual entry
5. **Unhandled Errors**: Error boundary + crash reporting

```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: { react: errorInfo },
    });

    // Show user-friendly error screen
    this.setState({ hasError: true });
  }
}

// utils/errorHandling.ts
export function handleApiError(error: ApiError) {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'No internet connection. Please check your network and try again.';
    case 'VALIDATION_ERROR':
      return error.message;
    case 'NOT_FOUND':
      return 'Attendee not found for this conference.';
    case 'ALREADY_CHECKED_IN':
      return 'Already checked in at ' + error.metadata.timestamp;
    default:
      return 'Something went wrong. Please try again.';
  }
}
```

## Performance Optimization Strategy

### App Launch Optimization (Target: < 2 seconds)

1. **Hermes Engine**: Enabled for both platforms
2. **Inline Requires**: Lazy load heavy dependencies
3. **Startup Optimization**:
   - Defer non-critical services
   - Prefetch critical data only
   - Optimize splash screen transition

```javascript
// metro.config.js
module.exports = {
  transformer: {
    inlineRequires: true, // Lazy loading
  },
};
```

### Scan Processing Optimization (Target: < 500ms)

1. **Frame Processor Optimization**: Process every 3rd frame, not every frame
2. **Debounce Scans**: Prevent duplicate scans within 1 second
3. **Local Cache**: Cache attendee list for instant lookup
4. **Haptic Feedback**: Immediate user feedback before API call

```typescript
// hooks/useQRScanner.ts
const frameProcessor = useFrameProcessor((frame) => {
  'worklet';

  // Process every 3rd frame
  if (frame.timestamp % 3 !== 0) return;

  const codes = scanCodes(frame, ['qr']);
  if (codes.length > 0) {
    runOnJS(handleScan)(codes[0].value);
  }
}, []);

const handleScan = useMemo(
  () => debounce((value: string) => {
    // Local lookup first
    const attendee = attendeeCache.get(value);
    if (attendee) {
      processCheckin(attendee);
    } else {
      processCheckinAPI(value);
    }
  }, 1000),
  []
);
```

### List Rendering Optimization

1. **FlatList with optimizations**: windowSize, maxToRenderPerBatch
2. **Memoization**: React.memo for list items
3. **Virtualization**: Only render visible items

```typescript
<FlatList
  data={attendees}
  renderItem={renderAttendeeItem}
  keyExtractor={(item) => item.id}
  windowSize={10}
  maxToRenderPerBatch={20}
  removeClippedSubviews={true}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### Memory Management

1. **Image Optimization**: react-native-fast-image for caching
2. **Camera Cleanup**: Properly unmount camera on screen blur
3. **Query Garbage Collection**: Configure React Query cache time

```typescript
// Camera lifecycle management
useFocusEffect(
  useCallback(() => {
    setIsCameraActive(true);
    return () => {
      setIsCameraActive(false);
    };
  }, [])
);
```

### Battery Efficiency (Target: < 10%/hour)

1. **Camera Power Management**: Use low-resolution preview when idle
2. **Background Task Limits**: Minimize background processing
3. **Network Efficiency**: Batch requests, cache aggressively
4. **Location Services**: Only use when required for field check-in

## Security Architecture

### Token Storage
- **iOS**: Keychain with kSecAttrAccessibleAfterFirstUnlock
- **Android**: Keystore with AES encryption
- **Never**: Store tokens in AsyncStorage

```typescript
// services/auth/secureStorage.ts
export async function saveToken(token: string) {
  await Keychain.setGenericPassword('auth_token', token, {
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    service: 'com.pgeuconf.scanner',
  });
}
```

### Network Security
- **Certificate Pinning**: For production API (optional)
- **HTTPS Only**: Reject HTTP connections
- **Token Refresh**: Implement refresh token mechanism

### Data Privacy
- **PII Handling**: Minimize storage of attendee PII
- **Cache Expiration**: Clear sensitive data on logout
- **Biometric Protection**: Optional biometric auth for app access

## App Store Compliance

### iOS Requirements

**Privacy Manifest (PrivacyInfo.xcprivacy):**
```xml
<key>NSPrivacyTracking</key>
<false/>
<key>NSPrivacyAccessedAPITypes</key>
<array>
  <dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
      <string>C617.1</string>
    </array>
  </dict>
</array>
```

**Info.plist Permissions:**
- `NSCameraUsageDescription`: Required for QR code scanning
- `NSPhotoLibraryUsageDescription`: If allowing photo selection
- `NSLocationWhenInUseUsageDescription`: For field check-in only

### Android Requirements

**AndroidManifest.xml Permissions:**
- `<uses-permission android:name="android.permission.CAMERA" />`
- `<uses-permission android:name="android.permission.INTERNET" />`
- `<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />` (optional)

**Play Store Data Safety:**
- Declare data collection: User credentials, scan data
- Data transmission: Encrypted in transit
- Data deletion: User can request via support

## Deployment Architecture

### Environment Configuration

Three environments using react-native-config:

```
# .env.development
API_BASE_URL=http://localhost:8000
SENTRY_DSN=
LOG_LEVEL=debug

# .env.staging
API_BASE_URL=https://staging.pgeuconf.com
SENTRY_DSN=https://...
LOG_LEVEL=info

# .env.production
API_BASE_URL=https://api.pgeuconf.com
SENTRY_DSN=https://...
LOG_LEVEL=error
```

### Build Variants

- **Development**: Debug build with dev API
- **Staging**: Release build with staging API
- **Production**: Release build with production API

### Versioning Strategy

**Semantic Versioning**: MAJOR.MINOR.PATCH
- MAJOR: Breaking changes (new RN version)
- MINOR: New features (new scan modes)
- PATCH: Bug fixes

**Build Numbers**: Auto-increment via fastlane

## Testing Strategy

### Unit Tests (Jest)
- Utilities and helpers
- State management (Zustand stores)
- API client functions
- Offline queue logic
- Target: > 80% coverage

### Integration Tests (React Native Testing Library)
- Component interactions
- Navigation flows
- Form submissions
- Error handling
- Target: Critical paths covered

### E2E Tests (Detox)
- Login flow
- Conference scan setup
- QR code scan flow (mocked)
- Offline queue sync
- Target: Happy paths + critical errors

### Manual Testing Checklist
- [ ] Camera permissions on both platforms
- [ ] Deep linking from SMS/email
- [ ] Offline queue persistence
- [ ] App backgrounding/foregrounding
- [ ] Low battery mode behavior
- [ ] Accessibility (VoiceOver/TalkBack)

## Development Workflow

### Local Development Setup
1. Install dependencies: `npm install`
2. Install pods: `cd ios && pod install`
3. Start Metro: `npm start`
4. Run iOS: `npm run ios`
5. Run Android: `npm run android`

### Development Practices
- **Feature Branches**: `feature/scan-mode-selector`
- **PR Reviews**: Required before merge
- **TypeScript Strict Mode**: Enabled
- **Linting**: ESLint + Prettier on pre-commit
- **Conventional Commits**: For changelog generation

### CI/CD Pipeline (Recommended)

**GitHub Actions / Bitrise:**
```
On PR:
  - Lint
  - Type check
  - Unit tests
  - Build iOS/Android

On Merge to Main:
  - All PR checks
  - E2E tests
  - Build staging release
  - Deploy to TestFlight/Internal Testing

On Release Tag:
  - All checks
  - Build production release
  - Upload to App Store Connect / Play Console
  - Create GitHub release
```

## 14-Week Implementation Roadmap

### Weeks 1-2: Foundation
- [ ] Project initialization with React Native 0.73
- [ ] TypeScript configuration
- [ ] Navigation structure
- [ ] Authentication flow
- [ ] Secure token storage
- [ ] API client setup

### Weeks 3-4: Core Features
- [ ] QR scanner implementation
- [ ] Camera permissions handling
- [ ] Scan mode selection
- [ ] Basic attendee search
- [ ] Conference selection

### Weeks 5-6: Data & UI Polish
- [ ] Statistics dashboard
- [ ] UI component library
- [ ] Loading states
- [ ] Error states
- [ ] Accessibility improvements

### Weeks 7-8: Platform-Specific
- [ ] Deep linking (Universal Links + App Links)
- [ ] iOS safe areas
- [ ] Android back button handling
- [ ] Platform-specific UI tweaks
- [ ] Performance optimization

### Weeks 9-10: Testing & Quality
- [ ] Unit test coverage
- [ ] E2E test suite
- [ ] Manual testing on devices
- [ ] Performance testing
- [ ] Battery usage testing

### Weeks 11-12: Release Preparation
- [ ] App store assets (screenshots, descriptions)
- [ ] Privacy policy
- [ ] App store submissions
- [ ] Beta testing with organizers
- [ ] Bug fixes from beta feedback
- [ ] Final submissions

## Success Metrics

### Performance Metrics
- App launch time: < 2 seconds (measured with Flipper)
- Scan processing: < 500ms (from scan to feedback)
- TTI (Time to Interactive): < 3 seconds
- Battery usage: < 10%/hour during active scanning

### Quality Metrics
- Crash-free rate: > 99.5% (Sentry)
- Test coverage: > 80% (Jest)
- TypeScript coverage: 100% (no `any` types)
- Accessibility score: 100% (Lighthouse/Accessibility Inspector)

### Business Metrics
- App store approval: First submission
- Time to first productive scan: < 2 minutes
- Network error recovery rate: > 95%
- User satisfaction: > 4.5/5 stars

## Risk Mitigation

### Technical Risks
1. **Camera compatibility**: Test on wide range of devices early
2. **Network reliability**: Implement robust retry logic with user-friendly error messages
3. **App store rejections**: Follow guidelines strictly, use checklists
4. **Performance on older devices**: Test on Android API 23, iOS 13 devices

### Mitigation Strategies
- Weekly testing on physical devices (not just simulators)
- Beta testing program with actual conference organizers
- Staged rollout (10% → 50% → 100%)
- Rollback plan for critical bugs

## Conclusion

This architecture provides a solid foundation for a production-ready conference scanner app that:
- Supports iOS 13+ and Android 6.0+
- Handles network errors gracefully with retry logic
- Meets performance targets
- Complies with app store requirements
- Scales for future features

The service-oriented approach with Zustand + React Query ensures reliable operation with proper error handling, while the modular architecture allows for easy testing and maintenance.
