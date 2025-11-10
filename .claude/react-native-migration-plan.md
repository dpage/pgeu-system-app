# React Native Migration Plan

**Purpose:** Detailed migration strategy from native Android to cross-platform React Native application

**Target:** iOS 14+ and Android 11+ (API 30+) with modern, non-deprecated APIs only

> **Note:** The React Native app will NOT include offline mode. All scanning operations require active network connectivity.

---

## Migration Strategy Overview

### Approach: Complete Rewrite

**Rationale:**
- Android app is relatively simple (~13 source files)
- No complex state management to migrate
- Opportunity to modernize architecture
- Fix known limitations from the start
- Implement iOS-specific best practices
- TypeScript for type safety

**Not Recommended:**
- Gradual migration (app too small to justify)
- React Native brownfield (no existing complex native features to preserve)
- Flutter or other frameworks (React Native has better community/tooling for this use case)

---

## Technology Stack

### Core Framework

**React Native:** 0.73+ (latest stable)
- JSI architecture (new architecture)
- Fabric renderer
- TurboModules
- Hermes JavaScript engine

### Language

**TypeScript:** 5.0+
- Strict mode enabled
- No `any` types
- Full type coverage for API responses
- Props validation

### Navigation

**React Navigation v6**
- Drawer navigator (conference selection)
- Stack navigator (screen flows)
- Deep linking support
- iOS/Android specific behaviors

### State Management

**Options (choose based on team preference):**

**Option 1: React Context + useReducer (Recommended for this app)**
- Simple, built-in
- Sufficient for app complexity
- Easy to understand
- No external dependencies

**Option 2: Redux Toolkit**
- More scalable
- Time-travel debugging
- Persist middleware built-in
- Overkill for current size but future-proof

**Option 3: Zustand**
- Lightweight
- Simple API
- Good TypeScript support
- Modern alternative to Redux

**Recommendation:** Start with Context, migrate to Zustand if needed

### Network Layer

**Axios** (recommended over fetch)
- Interceptors for auth/logging
- Request/response transformation
- Timeout configuration per request
- Automatic JSON parsing
- Better error handling

**Alternative:** React Query + fetch
- Built-in caching
- Automatic refetching
- Optimistic updates
- More complex but powerful

### Storage

**@react-native-async-storage/async-storage**
- For simple key-value (conference list)
- Built-in, well-supported

**react-native-mmkv** (recommended)
- 30x faster than AsyncStorage
- Synchronous API (easier to use)
- Encryption support
- Small bundle size

**react-native-keychain**
- For sensitive tokens
- iOS Keychain / Android Keystore
- Biometric protection support

### Camera & QR Scanning

**react-native-vision-camera v3**
- Modern camera API
- Frame processor plugin system
- High performance
- Both iOS and Android

**vision-camera-code-scanner**
- MLKit integration (Android)
- Apple Vision (iOS)
- Real-time QR detection
- Built on Vision Camera

**Alternative:** react-native-camera-kit
- Simpler API
- Good performance
- Less flexible

### UI Component Library

**React Native Paper** (recommended)
- Material Design 3
- Theming support
- Accessibility built-in
- Cross-platform consistency

**Alternative:** React Native Elements
- More customizable
- Lighter weight

**Custom Components:**
- Camera overlay
- Scanning reticle
- Conference list items
- Statistics display

### Development Tools

**Essential:**
- ESLint + Prettier (code quality)
- Husky (git hooks)
- TypeScript strict mode
- React DevTools
- Flipper (debugging)

**Testing:**
- Jest (unit tests)
- React Native Testing Library (component tests)
- Detox (E2E tests)
- MSW (API mocking)

**CI/CD:**
- GitHub Actions or Bitrise
- Fastlane (iOS/Android builds)
- App Center / TestFlight distribution

---

## Project Structure

```
src/
├── api/
│   ├── client.ts                 # Axios instance, interceptors
│   ├── endpoints.ts              # API endpoint functions
│   ├── types.ts                  # Response type definitions
│   └── mock.ts                   # Mock responses for testing
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── ErrorDialog.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── FieldHighlight.tsx
│   ├── camera/
│   │   ├── QRScanner.tsx
│   │   ├── ScanOverlay.tsx
│   │   └── PermissionGate.tsx
│   ├── conference/
│   │   ├── ConferenceList.tsx
│   │   ├── ConferenceListItem.tsx
│   │   └── AddConferenceDialog.tsx
│   ├── attendee/
│   │   ├── AttendeeDetails.tsx
│   │   ├── AttendeeFieldRow.tsx
│   │   └── AttendeeSearch.tsx
│   └── stats/
│       ├── StatisticsView.tsx
│       ├── StatGroup.tsx
│       └── StatRow.tsx
├── screens/
│   ├── MainScreen.tsx            # Camera scanning
│   ├── AttendeeReviewScreen.tsx  # Confirmation before check-in
│   ├── ConferenceListScreen.tsx  # Manage conferences
│   └── StatisticsScreen.tsx      # Admin stats
├── navigation/
│   ├── DrawerNavigator.tsx       # Conference selection drawer
│   ├── RootNavigator.tsx         # Root stack
│   ├── linking.ts                # Deep link configuration
│   └── types.ts                  # Navigation type definitions
├── hooks/
│   ├── useCamera.ts              # Camera permission, state
│   ├── useQRScanner.ts           # QR detection logic
│   ├── useConferences.ts         # Conference CRUD
│   ├── useCheckin.ts             # Check-in operations
│   ├── useSponsorScan.ts         # Sponsor scan operations
│   └── useOfflineQueue.ts        # Offline operation queue
├── context/
│   ├── ConferenceContext.tsx     # Selected conference
│   ├── AuthContext.tsx           # Token management
│   └── OfflineContext.tsx        # Network state, queue
├── utils/
│   ├── storage.ts                # MMKV wrappers
│   ├── tokenValidation.ts        # QR code parsing
│   ├── urlParser.ts              # Deep link parsing
│   ├── errorHandler.ts           # Centralized error handling
│   └── haptics.ts                # Haptic feedback
├── types/
│   ├── conference.ts             # Conference types
│   ├── attendee.ts               # Attendee types
│   ├── api.ts                    # API types
│   └── navigation.ts             # Navigation types
├── constants/
│   ├── theme.ts                  # Colors, spacing
│   ├── config.ts                 # API timeouts, etc.
│   └── strings.ts                # Static text
└── App.tsx                       # Root component
```

---

## Migration Phases

### Phase 1: Foundation (Week 1-2)

**Setup:**
- [x] Initialize React Native project
- [x] Configure TypeScript
- [x] Set up ESLint/Prettier
- [x] Configure Metro bundler
- [x] Set up iOS/Android native projects

**Core Infrastructure:**
- [x] Storage abstraction (MMKV)
- [x] API client (Axios with interceptors)
- [x] Type definitions for API responses
- [x] Error handling utilities
- [x] Navigation structure

**Basic UI:**
- [x] Theme configuration
- [x] Main screen skeleton
- [x] Navigation drawer skeleton

**Deliverable:** App shell that compiles and runs on both platforms

### Phase 2: Conference Management (Week 3)

**Features:**
- [x] Add conference (manual URL)
- [x] Deep link handling
- [x] Conference list display
- [x] Conference deletion
- [x] Conference selection
- [x] Last conference persistence
- [x] Conference status API integration

**Testing:**
- [x] Unit tests for URL parsing
- [x] Integration tests for conference CRUD
- [x] E2E test: Add conference via deep link

**Deliverable:** User can add/remove/select conferences

### Phase 3: Camera & QR Scanning (Week 4-5)

**Features:**
- [x] Camera permission handling (iOS + Android)
- [x] Camera preview
- [x] QR code detection
- [x] Token validation
- [x] Test code recognition
- [x] Scan pause mechanism
- [x] Wrong token type detection

**UI/UX:**
- [x] Scanning reticle overlay
- [x] "Start/Stop Camera" button
- [x] Permission request dialog
- [x] Scanning feedback (haptic/sound)

**Testing:**
- [x] Test code scanning
- [x] Invalid code handling
- [x] Permission denied flow
- [x] Camera error handling

**Deliverable:** Functional QR scanning with visual feedback

### Phase 4: Check-in Flow (Week 6-7)

**Features:**
- [x] Attendee lookup by QR
- [x] Attendee detail display
- [x] Field highlighting
- [x] Already checked-in detection
- [x] Check-in confirmation
- [x] Success feedback
- [x] Error handling (404, 412, 403)

**UI/UX:**
- [x] Attendee review screen
- [x] Field highlighting (red background)
- [x] Check-in button state
- [x] Success animation
- [x] Error dialogs

**Testing:**
- [x] Mock API responses
- [x] Already checked-in scenario
- [x] Network error scenarios
- [x] E2E: Complete check-in flow

**Deliverable:** Working check-in functionality

### Phase 5: Sponsor & Field Scanning (Week 8)

**Features:**
- [x] Sponsor badge scanning
- [x] Notes entry/editing
- [x] Note persistence per scanner
- [x] Field check-in scanning
- [x] Field-specific UI

**UI/UX:**
- [x] Notes text area
- [x] Field check-in confirmation
- [x] Type-specific intro text

**Testing:**
- [x] Multi-scan same attendee (sponsor)
- [x] Note persistence
- [x] Field check-in flow

**Deliverable:** All three scan types functional

### Phase 6: Search & Statistics (Week 9)

**Features:**
- [x] Attendee search
- [x] Search results display
- [x] Search result selection
- [x] Statistics API integration
- [x] Expandable statistics display
- [x] Admin-only access control

**UI/UX:**
- [x] Search input with debounce
- [x] Search results list
- [x] Expandable stat groups
- [x] Summary row formatting

**Testing:**
- [x] Search with no results
- [x] Search with multiple results
- [x] Statistics display
- [x] Non-admin stat hiding

**Deliverable:** Search and statistics features complete

### Phase 7: Offline Support (Week 10)

**Features:**
- [x] Network connectivity detection
- [x] Operation queue for failed requests
- [x] Background retry mechanism
- [x] Optimistic UI updates
- [x] Pending operations display
- [x] Manual retry/cancel

**UI/UX:**
- [x] Offline indicator banner
- [x] Pending operations badge
- [x] Queue management screen
- [x] Sync status feedback

**Testing:**
- [x] Airplane mode scenarios
- [x] Intermittent connectivity
- [x] Queue persistence
- [x] Retry logic

**Deliverable:** Robust offline support

### Phase 8: Polish & Accessibility (Week 11)

**Features:**
- [x] Haptic feedback on scan
- [x] Audio cues (optional)
- [x] Dark mode support
- [x] Large text support
- [x] Screen reader optimization
- [x] High contrast mode
- [x] Reduced motion support

**Performance:**
- [x] List virtualization
- [x] Image optimization
- [x] Bundle size optimization
- [x] Memory leak fixes
- [x] Battery optimization

**Testing:**
- [x] Accessibility audit
- [x] VoiceOver/TalkBack testing
- [x] Performance profiling
- [x] Memory profiling

**Deliverable:** Polished, accessible app

### Phase 9: Testing & QA (Week 12)

**Testing:**
- [x] Complete E2E test suite
- [x] Device farm testing (multiple devices)
- [x] iOS 14-17 testing
- [x] Android 11-14 testing
- [x] Tablet testing
- [x] Foldable device testing
- [x] Beta testing with real users

**Bug Fixes:**
- [x] Address all P0/P1 bugs
- [x] Performance optimizations
- [x] Edge case handling

**Deliverable:** Release candidate

### Phase 10: Deployment (Week 13-14)

**Preparation:**
- [x] App Store assets (screenshots, description)
- [x] Play Store assets
- [x] Privacy policy updates
- [x] App Store review guidelines compliance
- [x] Production environment configuration

**Release:**
- [x] TestFlight beta (iOS)
- [x] Internal testing track (Android)
- [x] Beta user feedback
- [x] Final bug fixes
- [x] Production release (phased rollout)

**Post-Release:**
- [x] Monitor crash reports
- [x] Monitor analytics
- [x] User feedback collection
- [x] Hotfix plan

**Deliverable:** App live on both stores

---

## Architecture Decisions

### State Management Pattern

**Selected:** React Context + useReducer

**Structure:**
```typescript
// ConferenceContext
interface ConferenceState {
  conferences: Conference[];
  selectedConference: Conference | null;
  isLoading: boolean;
  error: string | null;
}

// Actions
type ConferenceAction =
  | { type: 'ADD_CONFERENCE'; conference: Conference }
  | { type: 'REMOVE_CONFERENCE'; id: string }
  | { type: 'SELECT_CONFERENCE'; id: string }
  | { type: 'UPDATE_STATUS'; id: string; status: ConferenceStatus }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

// Reducer
function conferenceReducer(state: ConferenceState, action: ConferenceAction): ConferenceState;

// Context
const ConferenceContext = createContext<{
  state: ConferenceState;
  dispatch: Dispatch<ConferenceAction>;
} | null>(null);

// Custom hook
function useConferences() {
  const context = useContext(ConferenceContext);
  if (!context) throw new Error('useConferences must be used within ConferenceProvider');

  // Helper functions
  const addConference = (url: string) => { /* ... */ };
  const removeConference = (id: string) => { /* ... */ };
  const selectConference = (id: string) => { /* ... */ };

  return { ...context.state, addConference, removeConference, selectConference };
}
```

### API Client Architecture

**Structure:**
```typescript
// client.ts
const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add user agent
    config.headers['User-Agent'] = `PGScanner/${version} (${Platform.OS})`;

    // Log request (without tokens)
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log success
    console.log(`[API] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    // Handle errors
    if (error.response) {
      // Server responded with error
      const { status, data } = error.response;

      // Parse error message
      const message = typeof data === 'string' ? data : data.message || 'Unknown error';

      // Create typed error
      throw new ApiError(status, message);
    } else if (error.request) {
      // Request made but no response
      throw new NetworkError('No response from server');
    } else {
      // Request setup error
      throw new Error(error.message);
    }
  }
);

// Typed API functions
export const api = {
  async getStatus(baseurl: string): Promise<StatusResponse> {
    const response = await apiClient.get<StatusResponse>(`${baseurl}/api/status/`);
    return response.data;
  },

  async lookup(baseurl: string, qrcode: string): Promise<LookupResponse> {
    const response = await apiClient.get<LookupResponse>(
      `${baseurl}/api/lookup/`,
      { params: { lookup: qrcode } }
    );
    return response.data;
  },

  async checkin(baseurl: string, token: string): Promise<CheckinResponse> {
    const response = await apiClient.post<CheckinResponse>(
      `${baseurl}/api/store/`,
      new URLSearchParams({ token })
    );
    return response.data;
  },

  // ... other endpoints
};
```

### Offline Queue Architecture

**Structure:**
```typescript
interface QueuedOperation {
  id: string;
  type: 'checkin' | 'sponsor_scan' | 'field_checkin';
  baseurl: string;
  token: string;
  note?: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;

  async add(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const op: QueuedOperation = {
      ...operation,
      id: uuid(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.queue.push(op);
    await this.persist();

    // Try to process immediately
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const op = this.queue[0];

      try {
        await this.execute(op);
        // Success - remove from queue
        this.queue.shift();
        await this.persist();
      } catch (error) {
        // Failure - increment retry count
        op.retryCount++;

        if (op.retryCount >= op.maxRetries) {
          // Max retries reached - remove and notify
          this.queue.shift();
          this.notifyFailure(op);
        } else {
          // Will retry later
          break;
        }

        await this.persist();
      }
    }

    this.isProcessing = false;
  }

  private async execute(op: QueuedOperation): Promise<void> {
    switch (op.type) {
      case 'checkin':
        await api.checkin(op.baseurl, op.token);
        break;
      case 'sponsor_scan':
        await api.storeSponsorScan(op.baseurl, op.token, op.note!);
        break;
      case 'field_checkin':
        await api.fieldCheckin(op.baseurl, op.token);
        break;
    }
  }

  private async persist(): Promise<void> {
    await storage.set('offline_queue', JSON.stringify(this.queue));
  }

  private notifyFailure(op: QueuedOperation): void {
    // Show notification or add to failed operations list
  }
}

// Usage in context
const OfflineQueueContext = createContext<OfflineQueue | null>(null);

function useOfflineQueue() {
  const queue = useContext(OfflineQueueContext);
  if (!queue) throw new Error('useOfflineQueue must be used within OfflineQueueProvider');
  return queue;
}
```

---

## Platform-Specific Considerations

### iOS

**Deep Linking:**
- Configure Associated Domains in Xcode
- Add `apple-app-site-association` file to server
- Universal Links for seamless app opening

**Permissions:**
- Camera: Info.plist `NSCameraUsageDescription`
- Use Permission Handler library for unified API

**UI:**
- Safe area handling (notch, Dynamic Island)
- Navigation bar styling
- iOS-specific gestures (swipe back)

**Build:**
- Fastlane for automated builds
- Match for certificate management
- TestFlight for beta distribution

### Android

**Deep Linking:**
- Intent filters in AndroidManifest.xml
- App Links verification
- Digital Asset Links file on server

**Permissions:**
- Camera: Manifest + runtime request
- Use Permission Handler library

**UI:**
- Status bar styling
- Hardware back button handling
- Android-specific Material Design patterns

**Build:**
- Fastlane for automated builds
- Keystore management
- Internal testing track for beta

---

## Testing Strategy

### Unit Tests (Jest)

**Coverage targets:** 80%+

**Test files structure:**
```
__tests__/
├── api/
│   ├── client.test.ts
│   └── endpoints.test.ts
├── utils/
│   ├── tokenValidation.test.ts
│   ├── urlParser.test.ts
│   └── storage.test.ts
└── hooks/
    ├── useConferences.test.ts
    └── useQRScanner.test.ts
```

**Example:**
```typescript
describe('tokenValidation', () => {
  it('should validate check-in token format', () => {
    expect(validateToken('ID$abc123def456$ID', 'checkin')).toBe(true);
  });

  it('should reject badge token for check-in', () => {
    expect(validateToken('AT$abc123def456$AT', 'checkin')).toBe(false);
  });

  it('should recognize test tokens', () => {
    expect(isTestToken('ID$TESTTESTTESTTEST$ID')).toBe(true);
  });
});
```

### Component Tests (React Native Testing Library)

**Test files:** Co-located with components (`*.test.tsx`)

**Example:**
```typescript
describe('AttendeeDetails', () => {
  it('should highlight fields in highlight array', () => {
    const attendee = {
      name: 'Test User',
      photoconsent: 'Photos NOT OK',
      highlight: ['photoconsent'],
    };

    const { getByText } = render(<AttendeeDetails attendee={attendee} />);

    const field = getByText('Photos NOT OK');
    expect(field).toHaveStyle({ backgroundColor: 'red' });
  });
});
```

### E2E Tests (Detox)

**Test scenarios:**
```typescript
describe('Check-in flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should complete check-in from QR scan', async () => {
    // Add conference
    await element(by.id('add-conference-button')).tap();
    await element(by.id('url-input')).typeText('https://postgresql.eu/events/test/checkin/token123/');
    await element(by.text('Add')).tap();

    // Select conference
    await element(by.text('Test Conference')).tap();

    // Start camera
    await element(by.id('start-camera-button')).tap();

    // Grant camera permission
    await element(by.text('Allow')).tap();

    // Simulate QR scan (test code)
    await device.sendUserNotification({
      qrcode: 'ID$TESTTESTTESTTEST$ID',
    });

    // Verify attendee details shown
    await expect(element(by.id('attendee-review-screen'))).toBeVisible();

    // Confirm check-in
    await element(by.id('checkin-button')).tap();

    // Verify success
    await expect(element(by.text('Check-in successful'))).toBeVisible();
  });
});
```

### API Mocking (MSW)

**Setup:**
```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/api/status/', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        confname: 'Test Conference',
        user: 'testuser',
        active: true,
        admin: false,
      })
    );
  }),

  rest.get('*/api/lookup/', (req, res, ctx) => {
    const lookup = req.url.searchParams.get('lookup');

    if (lookup === 'ID$TESTTESTTESTTEST$ID') {
      return res(
        ctx.status(200),
        ctx.json({
          reg: {
            id: 1,
            name: 'Test User',
            type: 'Attendee',
            highlight: [],
            additional: [],
          },
        })
      );
    }

    return res(ctx.status(404));
  }),
];

export const server = setupServer(...handlers);
```

---

## Performance Optimization

### Bundle Size

**Targets:**
- iOS: < 25MB
- Android: < 20MB

**Strategies:**
- Code splitting (lazy loading screens)
- Tree shaking (ensure unused code removed)
- Image optimization (use WebP)
- Hermes engine (smaller bundle, faster startup)
- ProGuard/R8 (Android)

### Startup Time

**Target:** < 2 seconds to interactive

**Strategies:**
- Minimize JavaScript bundle size
- Use Hermes engine
- Lazy load non-critical screens
- Optimize native modules
- Reduce splash screen delay

### Runtime Performance

**Targets:**
- 60 FPS camera preview
- < 100ms QR detection latency
- < 500ms API response handling
- Smooth list scrolling (FlatList)

**Strategies:**
- Use FlatList for all lists (virtualization)
- Memoize expensive computations (useMemo)
- Avoid unnecessary re-renders (React.memo)
- Optimize frame processor (Vision Camera)
- Run heavy operations on worklets (Reanimated)

### Memory Management

**Strategies:**
- Remove event listeners on unmount
- Cancel network requests on unmount
- Optimize image sizes
- Clear camera frames promptly
- Monitor memory usage in profiler

---

## Security Hardening

### Token Security

**Implementation:**
```typescript
import Keychain from 'react-native-keychain';

// Store token
await Keychain.setGenericPassword('conference', baseurl, {
  service: conferenceId,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
});

// Retrieve token
const credentials = await Keychain.getGenericPassword({ service: conferenceId });
if (credentials) {
  const baseurl = credentials.password;
}

// Delete token
await Keychain.resetGenericPassword({ service: conferenceId });
```

### Network Security

**iOS (Info.plist):**
```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
  <key>NSExceptionDomains</key>
  <dict>
    <key>localhost</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <true/>
    </dict>
  </dict>
</dict>
```

**Android (network_security_config.xml):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>

  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">10.0.2.2</domain>
  </domain-config>
</network-security-config>
```

### Certificate Pinning (Optional)

**Implementation:**
```typescript
import { fetch } from 'react-native-ssl-pinning';

const response = await fetch('https://postgresql.eu/api/status/', {
  method: 'GET',
  sslPinning: {
    certs: ['postgresql-eu-cert'], // In android/app/src/main/assets/
  },
});
```

---

## Deployment Checklist

### Pre-Release

- [ ] All tests passing (unit, component, E2E)
- [ ] No console warnings in production build
- [ ] Error reporting configured (Sentry)
- [ ] Analytics configured (Firebase/custom)
- [ ] Crash reporting tested
- [ ] Privacy policy updated
- [ ] App Store/Play Store assets prepared
- [ ] Beta testing completed
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Security audit completed

### iOS Specific

- [ ] Certificates and provisioning profiles configured
- [ ] App Store Connect app created
- [ ] Screenshots for all device sizes
- [ ] App privacy details submitted
- [ ] TestFlight internal testing
- [ ] TestFlight external testing
- [ ] App Store review guidelines compliance
- [ ] Release notes prepared

### Android Specific

- [ ] Keystore created and backed up
- [ ] Play Console app created
- [ ] Screenshots for phone and tablet
- [ ] Store listing completed
- [ ] Internal testing track tested
- [ ] Closed/open testing track tested
- [ ] Release notes prepared
- [ ] App signing configured

### Post-Release

- [ ] Monitor crash reports (first 24 hours)
- [ ] Monitor user reviews
- [ ] Track adoption metrics
- [ ] Prepare hotfix process
- [ ] Document known issues
- [ ] Plan next release

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Camera API differences iOS/Android | High | Use react-native-vision-camera (abstracts differences) |
| QR detection accuracy | High | Use platform ML Kits, test extensively |
| Deep linking conflicts | Medium | Unique URL schemes, test with other apps |
| Network reliability at events | High | Implement offline queue, test in poor network |
| Token expiration handling | Medium | Add token refresh logic, clear error messages |
| Performance on old devices | Medium | Test on minimum spec devices, optimize |

### Process Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| iOS review rejection | High | Follow guidelines strictly, prepare appeal |
| Android approval delay | Low | Rare, but prepare for 1-2 day delay |
| Breaking API changes | Medium | Version API, maintain backwards compatibility |
| Beta tester availability | Medium | Recruit early, provide incentives |
| Timeline overrun | Medium | Build buffer time, prioritize ruthlessly |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| User adoption resistance | Medium | Maintain feature parity, provide migration guide |
| Conference-specific issues | High | Beta test at real conference before wide rollout |
| Backend compatibility | High | Extensive API testing, maintain old app until proven |
| Support burden | Medium | Comprehensive documentation, in-app help |

---

## Success Metrics

### Technical Metrics

- **Crash-free rate:** > 99.5%
- **App launch time:** < 2 seconds
- **API response time (p95):** < 3 seconds
- **Offline queue success rate:** > 95%
- **Battery drain during scanning:** < 10%/hour

### User Experience Metrics

- **Scan success rate:** > 98%
- **False positive rate:** < 1%
- **Check-in completion time:** < 10 seconds average
- **User rating:** > 4.5 stars
- **Support tickets:** < 5% of active users

### Adoption Metrics

- **Migration rate (within 3 months):** > 80%
- **Active conferences using new app:** > 90%
- **iOS vs Android split:** Track for future decisions

---

## Maintenance Plan

### Regular Updates

**Monthly:**
- Dependency security updates
- Bug fixes
- Minor improvements

**Quarterly:**
- Feature enhancements
- Performance optimizations
- New conference domains

**Annually:**
- Major version updates
- React Native version upgrade
- Design refresh

### Support Strategy

**Channels:**
- GitHub Issues (technical)
- Email support (conference organizers)
- In-app feedback form

**Response SLAs:**
- Critical bugs: 24 hours
- High priority: 1 week
- Feature requests: Best effort

### Deprecation Plan

**Native Android App:**
- Maintain for 6 months after RN release
- Show migration prompt
- Disable after 6 months, show "please update" message
- Remove from Play Store after 1 year

---

**End of Migration Plan**
