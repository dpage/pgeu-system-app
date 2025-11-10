# Camera Scanner Implementation Guide

**Purpose:** Comprehensive guide for implementing camera-based QR code scanning in React Native PGConf Scanner

**Last Updated:** 2025-11-08

---

## Table of Contents

1. [QR Code Token Formats](#qr-code-token-formats)
2. [Scanner Behavior from Android App](#scanner-behavior-from-android-app)
3. [Camera Lifecycle Management](#camera-lifecycle-management)
4. [QR Code Detection Flow](#qr-code-detection-flow)
5. [Duplicate Scan Prevention](#duplicate-scan-prevention)
6. [Visual and Haptic Feedback](#visual-and-haptic-feedback)
7. [Edge Cases to Handle](#edge-cases-to-handle)
8. [Integration with Conference Management](#integration-with-conference-management)
9. [UI/UX Requirements](#uiux-requirements)
10. [Implementation Checklist](#implementation-checklist)

---

## 1. QR Code Token Formats

### Token Types

There are TWO token types used in the system:

#### 1.1 ID Token (Check-in Processing)

**Format:** `ID$<64-hex-chars>$ID`

**Example:** `ID$abc123def456789abc123def456789abc123def456789abc123def456789abc$ID`

**Alternative Format:** `https://{domain}/t/id/{token}/`

**Example:** `https://postgresql.eu/t/id/abc123def456789abc123def456789abc123def456789abc123def456789abc/`

**Used For:**
- Regular check-in processing
- Printed on attendee registration confirmation
- Also called "idtoken" or "registration token"

#### 1.2 AT Token (Public/Badge Token)

**Format:** `AT$<64-hex-chars>$AT`

**Example:** `AT$def456789abc123def456789abc123def456789abc123def456789abc123def$AT`

**Alternative Format:** `https://{domain}/t/at/{token}/`

**Example:** `https://postgresql.eu/t/at/def456789abc123def456789abc123def456789abc123def456789abc123def/`

**Used For:**
- Sponsor badge scanning
- Field check-in (e.g., T-shirt pickup, lunch collection)
- Printed on attendee badges
- Also called "publictoken" or "attendee token"

#### 1.3 Test Tokens

**Purpose:** Allow scanner testing without real attendees

**Formats:**
- `ID$TESTTESTTESTTEST$ID` - Test check-in token
- `AT$TESTTESTTESTTEST$AT` - Test badge token
- `https://{domain}/t/id/TESTTESTTESTTEST/`
- `https://{domain}/t/at/TESTTESTTESTTEST/`

**Behavior:** When scanned, display success message without API call

### Token Validation Regex

Based on Android app's `ConferenceEntry.java`:

```javascript
// Build token regex based on conference base URL
function getTokenRegex(baseUrl: string): RegExp {
  const url = new URL(baseUrl);
  const protocol = url.protocol.replace(':', '');
  const host = url.hostname;
  const port = url.port;

  if (port) {
    return new RegExp(
      `^${protocol}://${host}:${port}/t/(id|at)/([a-z0-9]+|TESTTESTTESTTEST)/$`
    );
  } else {
    return new RegExp(
      `^${protocol}://${host}/t/(id|at)/([a-z0-9]+|TESTTESTTESTTEST)/$`
    );
  }
}

// Or use simpler format for $ delimited tokens
const SIMPLE_TOKEN_REGEX = /^(ID|AT)\$([a-z0-9]+|TESTTESTTESTTEST)\$(ID|AT)$/;
```

### Token Type Expectations by Scan Mode

| Scan Mode | Expected Token Type | Token Origin |
|-----------|-------------------|--------------|
| Check-in Processing | ID (idtoken) | Registration confirmation email/PDF |
| Sponsor Badge Scanning | AT (publictoken) | Physical badge |
| Field Check-in | AT (publictoken) | Physical badge |

**Critical:** The app MUST validate that the scanned token type matches the current scan mode. If wrong type is scanned, show clear error message explaining what was scanned vs. what was expected.

---

## 2. Scanner Behavior from Android App

### 2.1 Core Scanner Flow (from MainActivity.java)

```
1. User taps "Start camera" button
   ├─> Check camera permission
   │   ├─> If denied: Show error dialog explaining camera is required
   │   └─> If granted: Continue
   │
2. Initialize camera with ML Kit barcode scanner
   ├─> Use back camera only
   ├─> Configure for QR_CODE format only
   ├─> Set backpressure strategy to KEEP_ONLY_LATEST
   │   (prevents queue buildup if processing is slow)
   │
3. Show camera preview in square viewfinder
   │
4. For each frame:
   ├─> Process with ML Kit BarcodeScanner
   ├─> If QR code(s) detected:
   │   └─> For each QR code, call OnQRCodeFound(qrstring)
   │
5. OnQRCodeFound validation:
   ├─> Check if pauseDetection flag is set
   │   └─> If true: Ignore scan (dialog/processing in progress)
   │
   ├─> Validate QR code format against token regex
   │   ├─> If no match: Show "Unknown code scanned" dialog
   │   └─> If match: Continue
   │
   ├─> Check if test token (TESTTESTTESTTEST)
   │   └─> If yes: Show "Test code scanned" success dialog
   │
   ├─> Extract token type (ID or AT)
   │   ├─> If wrong type for current mode:
   │   │   └─> Show error dialog: "You have scanned a {badge/ticket}.
   │   │       For {current mode}, you must scan the {expected type}"
   │   └─> If correct type: Continue to API lookup
   │
6. API Lookup (in background AsyncTask):
   ├─> Set pauseDetection = true (prevent duplicate scans)
   ├─> Show progress spinner
   ├─> Call API: GET {baseurl}/api/lookup/?lookup={qrstring}
   │
7. Handle API Response:
   ├─> Success (200):
   │   └─> Navigate to AttendeeCheckinActivity with attendee data
   │
   ├─> Not Found (404):
   │   └─> Show dialog: "Attendee not found"
   │
   ├─> Precondition Failed (412):
   │   └─> Show dialog: "Not ready for scan" + server message
   │
   ├─> Forbidden (403):
   │   └─> Show dialog: "Scanning failed" + server message
   │
   └─> Network Error:
       └─> Show dialog: "Network error" + error message
   │
8. After dialog dismissed:
   └─> Set pauseDetection = false (re-enable scanning)
```

### 2.2 Key Implementation Details

**From QRAnalyzer.java:**
- Uses Google ML Kit Vision API (`com.google.mlkit.vision.barcode`)
- Configured for QR_CODE format only (not all barcode types)
- Processes camera frames asynchronously
- Calls success callback for ALL detected QR codes in frame
- IMPORTANT: Can detect multiple QR codes in a single frame

**From MainActivity.java:**
- Single conference must be selected before scanning
- Camera starts/stops with button toggle
- Camera state preserved across screen rotation (with 100ms delay on restore)
- All error dialogs set `pauseDetection = true` and reset to `false` when dismissed
- Progress spinner shown during API call
- Camera automatically stopped when navigating to attendee details

---

## 3. Camera Lifecycle Management

### 3.1 Camera States

```typescript
enum CameraState {
  STOPPED = 'stopped',        // Initial state, camera not active
  STARTING = 'starting',      // Permission granted, initializing camera
  ACTIVE = 'active',          // Camera running, scanning for QR codes
  PAUSED = 'paused',          // Detection paused (dialog shown, API call in progress)
  ERROR = 'error'             // Camera failed to start or encountered error
}
```

### 3.2 Camera Permission Handling

**Android Permission:** `android.permission.CAMERA`
**iOS Permission:** `NSCameraUsageDescription` in Info.plist

```typescript
// Permission flow
async function requestCameraPermission(): Promise<boolean> {
  const permission = await Camera.requestCameraPermission();

  if (permission === 'denied') {
    // Show error dialog with explanation
    showErrorDialog(
      'Camera permissions required',
      'As this app deals with scanning barcodes, it requires access to the ' +
      'camera to be able to provide any functionality at all. Please try again, ' +
      'and this time grant the camera permissions.'
    );
    return false;
  }

  if (permission === 'restricted') {
    // iOS only - show settings prompt
    showErrorDialog(
      'Camera access restricted',
      'Camera access has been restricted. Please enable it in Settings > PGConf Scanner > Camera.'
    );
    return false;
  }

  return permission === 'granted';
}
```

### 3.3 Camera Start/Stop Logic

**Start Camera:**
```typescript
async function startCamera() {
  // 1. Check permission
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return;

  // 2. Verify conference is selected
  if (!currentConference) {
    console.error('No conference selected');
    return;
  }

  // 3. Update button UI
  setCameraState(CameraState.STARTING);
  setScanButtonText('Stop camera');

  // 4. Show camera preview
  setViewfinderVisible(true);

  // 5. Start frame processing
  setCameraState(CameraState.ACTIVE);
}
```

**Stop Camera:**
```typescript
function stopCamera() {
  // 1. Stop frame processing
  setCameraState(CameraState.STOPPED);

  // 2. Hide camera preview
  setViewfinderVisible(false);

  // 3. Update button UI
  setScanButtonText('Start camera');

  // 4. Reset scanning state
  setPauseDetection(false);
}
```

### 3.4 Lifecycle Events

**App Backgrounded:**
- Stop camera to save battery
- Preserve camera state in app state
- Option: Show "Camera was stopped" message when returning

**Screen Rotation:**
- Android: Camera stops and restarts (handle in onSaveInstanceState)
- React Native: Maintain camera state through re-render
- Android workaround: 100ms delay after rotation before restarting camera

**Navigation Away:**
- Stop camera when navigating to attendee details screen
- Stop camera when opening navigation drawer
- Resume camera when returning (optional - user can manually restart)

---

## 4. QR Code Detection Flow

### 4.1 Frame Processing

```typescript
interface CodeScannerFrame {
  codes: Code[];
}

interface Code {
  value?: string;
  type: 'qr' | 'ean-13' | 'code-128' | /* ... */;
}

// Called for every camera frame with detected codes
function onCodeScanned(frame: CodeScannerFrame) {
  // IMPORTANT: Can have multiple codes in one frame
  for (const code of frame.codes) {
    if (code.type === 'qr' && code.value) {
      handleQRCode(code.value);
    }
  }
}
```

### 4.2 QR Code Validation

```typescript
function handleQRCode(qrString: string) {
  // 1. Check if scanning is paused
  if (pauseDetection) {
    return; // Ignore scan
  }

  // 2. Validate against conference token regex
  const tokenRegex = getTokenRegex(currentConference.baseUrl);
  const match = qrString.match(tokenRegex);

  if (!match) {
    // Not a valid conference token
    showScanCompletedDialog(
      'Unknown code scanned',
      'You have scanned a code that is not recognized by this system'
    );
    return;
  }

  const tokenType = match[1]; // 'id' or 'at'
  const tokenValue = match[2]; // hex string or 'TESTTESTTESTTEST'

  // 3. Check for test token
  if (tokenValue === 'TESTTESTTESTTEST') {
    showScanCompletedDialog(
      'Test code scanned',
      'You have successfully scanned a test code!'
    );
    return;
  }

  // 4. Validate token type matches scan mode
  const expectedType = getExpectedTokenType(currentConference.scanType);
  if (tokenType !== expectedType) {
    showScanCompletedDialog(
      `${getTokenOrigin(tokenType)} scanned`,
      `You have scanned a ${getTokenOrigin(tokenType)}. For ${currentConference.scanType}, ` +
      `you must scan the ${getTokenOrigin(expectedType)}, not the ${getTokenOrigin(tokenType)}.`
    );
    return;
  }

  // 5. Proceed to API lookup
  performLookup(qrString);
}

// Helper functions
function getExpectedTokenType(scanType: ScanType): 'id' | 'at' {
  switch (scanType) {
    case 'CHECKIN': return 'id';
    case 'SPONSORBADGE': return 'at';
    case 'CHECKINFIELD': return 'at';
  }
}

function getTokenOrigin(tokenType: 'id' | 'at'): string {
  return tokenType === 'id' ? 'ticket' : 'badge';
}
```

### 4.3 API Lookup

```typescript
async function performLookup(qrString: string) {
  // 1. Pause detection
  setPauseDetection(true);
  setShowProgress(true);

  try {
    // 2. Call API
    const response = await apiClient.get(
      `${currentConference.baseUrl}/api/lookup/`,
      { params: { lookup: qrString } }
    );

    // 3. Navigate to attendee details
    navigation.navigate('AttendeeCheckin', {
      scanType: currentConference.scanType,
      fieldName: currentConference.fieldName,
      token: qrString,
      registration: response.data.reg
    });

  } catch (error) {
    // 4. Handle errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data;

      switch (status) {
        case 404:
          showScanCompletedDialog(
            'Attendee not found',
            'The scanned code does not appear to be a valid attendee of this conference.'
          );
          break;

        case 412:
          showScanCompletedDialog(
            'Not ready for scan',
            typeof message === 'string' ? message : 'Check-in is not currently open'
          );
          break;

        case 403:
          showScanCompletedDialog(
            'Scanning failed',
            typeof message === 'string' ? message : 'Access denied'
          );
          break;

        default:
          showScanCompletedDialog(
            'Network error',
            `Server returned error: ${status}`
          );
      }
    } else {
      showScanCompletedDialog(
        'Network error',
        error.message || 'Failed to communicate with server'
      );
    }
  } finally {
    setShowProgress(false);
    // NOTE: pauseDetection is reset when dialog is dismissed
  }
}
```

---

## 5. Duplicate Scan Prevention

### 5.1 Pause Detection Mechanism

The Android app uses a `pauseDetection` flag to prevent duplicate scans:

```typescript
// Scanning state
const [pauseDetection, setPauseDetection] = useState(false);

// Called for every frame
function onCodeScanned(frame: CodeScannerFrame) {
  // Early return if paused
  if (pauseDetection) {
    return;
  }

  // Process codes...
  for (const code of frame.codes) {
    handleQRCode(code.value);
  }
}

// Set to true when:
// - API lookup starts
// - Dialog is shown
// Reset to false when:
// - Dialog is dismissed
// - User cancels attendee details screen
```

### 5.2 Pause Triggers

**Pause Detection When:**
1. API lookup initiated (prevent scanning while network request in progress)
2. Error dialog shown (user must acknowledge before continuing)
3. Success dialog shown (for test codes)
4. Navigating to attendee details screen (camera should stop)

**Resume Detection When:**
1. User dismisses error dialog (taps "OK")
2. User cancels attendee details (back button)
3. User completes check-in and returns to scanner

### 5.3 Additional Duplicate Prevention

**Frame-level deduplication:**
```typescript
// Optional: Track recently scanned codes to prevent rapid re-scans
const recentScans = useRef<Map<string, number>>(new Map());
const DUPLICATE_SCAN_THRESHOLD = 2000; // 2 seconds

function isRecentlyScanned(qrString: string): boolean {
  const lastScanTime = recentScans.current.get(qrString);
  if (!lastScanTime) return false;

  const now = Date.now();
  if (now - lastScanTime < DUPLICATE_SCAN_THRESHOLD) {
    return true; // Scanned within threshold
  }

  return false;
}

function recordScan(qrString: string) {
  recentScans.current.set(qrString, Date.now());

  // Cleanup old entries
  const now = Date.now();
  for (const [key, time] of recentScans.current.entries()) {
    if (now - time > DUPLICATE_SCAN_THRESHOLD * 2) {
      recentScans.current.delete(key);
    }
  }
}

// Usage in handleQRCode
function handleQRCode(qrString: string) {
  if (pauseDetection || isRecentlyScanned(qrString)) {
    return;
  }

  recordScan(qrString);
  // ... continue with validation
}
```

---

## 6. Visual and Haptic Feedback

### 6.1 Visual Feedback

**Camera Preview:**
- Square aspect ratio (1:1) viewfinder
- Centered on screen
- 16dp margin on left/right
- Takes remaining space between intro text and buttons

**Scanning Indicators:**
- No overlay shown in Android app (plain camera preview)
- Consider adding: Semi-transparent target reticle or frame guides
- Consider adding: Corner brackets to indicate scanning area

**Progress Indicator:**
- Spinner overlay when API lookup in progress
- Prevents user interaction during network call
- Positioned centrally over camera preview

**Button States:**
- "Start camera" (initial)
- "Stop camera" (when active)
- Disabled state when no conference selected
- 64dp height, 18sp text size

### 6.2 Haptic Feedback (React Native Addition)

The Android app does NOT implement haptic feedback, but it's recommended for better UX:

```typescript
import { Vibration } from 'react-native';

// Success haptic (code detected)
function successHaptic() {
  Vibration.vibrate(50); // Short vibration
}

// Error haptic (wrong code type)
function errorHaptic() {
  Vibration.vibrate([0, 100, 50, 100]); // Double vibration
}

// Use in handleQRCode
function handleQRCode(qrString: string) {
  // ... validation logic

  if (validCode) {
    successHaptic();
    performLookup(qrString);
  } else {
    errorHaptic();
    showErrorDialog(...);
  }
}
```

### 6.3 Audio Feedback (Optional)

Consider adding:
- Beep sound on successful scan
- Error sound on invalid code
- Configurable in app settings (on/off)

---

## 7. Edge Cases to Handle

### 7.1 Invalid QR Codes

**Scenario:** QR code contains arbitrary data (URL, text, etc.)

**Android Behavior:** Shows dialog: "Unknown code scanned - You have scanned a code that is not recognized by this system"

**Implementation:**
```typescript
function handleQRCode(qrString: string) {
  const tokenRegex = getTokenRegex(currentConference.baseUrl);
  if (!tokenRegex.test(qrString)) {
    showScanCompletedDialog(
      'Unknown code scanned',
      'You have scanned a code that is not recognized by this system'
    );
    return;
  }
  // Continue processing...
}
```

### 7.2 Non-Conference QR Codes

**Scenario:** Valid QR code but not for current conference

**API Response:** 404 Not Found

**Android Behavior:** Shows dialog: "Attendee not found - The scanned code does not appear to be a valid attendee of this conference."

**Implementation:** Handle 404 status in API error handling (see 4.3 above)

### 7.3 Wrong Token Type

**Scenario:** Scanned badge token (AT$) in check-in mode, or vice versa

**Android Behavior:** Shows dialog explaining what was scanned vs. what's expected

**Example:** "You have scanned a badge. For Check-in processing, you must scan the ticket, not the badge."

**Implementation:**
```typescript
const expectedType = getExpectedTokenType(scanType);
if (tokenType !== expectedType) {
  showScanCompletedDialog(
    `${getTokenOrigin(tokenType)} scanned`,
    `You have scanned a ${getTokenOrigin(tokenType)}. ` +
    `For ${getScanTypeDisplayName(scanType)}, you must scan the ` +
    `${getTokenOrigin(expectedType)}, not the ${getTokenOrigin(tokenType)}.`
  );
}
```

### 7.4 Camera Permission Denied

**Scenario:** User denies camera permission

**Android Behavior:** Shows dialog: "Camera permissions required - As this app deals with scanning barcodes, it requires access to the camera to be able to provide any functionality at all. Please try again, and this time grant the camera permissions."

**Implementation:**
```typescript
async function handlePermissionDenied() {
  const result = await showAlert({
    title: 'Camera permissions required',
    message: 'As this app deals with scanning barcodes, it requires access to the camera to be able to provide any functionality at all.',
    buttons: [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() }
    ]
  });
}
```

### 7.5 Poor Lighting Conditions

**Detection:** ML Kit may fail to detect QR codes in low light

**Solutions:**
1. Add flashlight/torch toggle button
2. Show tip in UI: "If codes won't scan, try better lighting"
3. Detect low light and show automatic warning

```typescript
// Vision Camera supports torch
const device = useCameraDevice('back', {
  physicalDevices: ['wide-angle-camera']
});

const [torchEnabled, setTorchEnabled] = useState(false);

<Camera
  device={device}
  torch={torchEnabled ? 'on' : 'off'}
/>

// Add flashlight button to UI
<IconButton
  icon="flashlight"
  onPress={() => setTorchEnabled(!torchEnabled)}
/>
```

### 7.6 Multiple QR Codes in View

**Scenario:** Camera sees multiple QR codes in single frame (e.g., two badges on table)

**Android Behavior:** Processes FIRST valid code detected, shows result

**ML Kit Behavior:** Returns array of ALL detected codes

**Implementation:**
```typescript
function onCodeScanned(frame: CodeScannerFrame) {
  if (pauseDetection) return;

  // Process ALL codes, but pauseDetection will prevent duplicates
  for (const code of frame.codes) {
    if (code.type === 'qr' && code.value) {
      handleQRCode(code.value);
      // After first valid code is processed, pauseDetection is set
      // so subsequent codes in frame are ignored
    }
  }
}
```

### 7.7 Network Failures During Scanning

**Scenarios:**
- No internet connection
- Server timeout
- Server error (500)

**Android Behavior:**
- Shows dialog: "Network error - [error message]"
- User taps OK to dismiss
- Can immediately scan again

**Implementation:**
```typescript
try {
  const response = await apiClient.get(/* ... */);
} catch (error) {
  let errorMessage = 'Failed to communicate with server';

  if (!error.response) {
    // Network error (no response received)
    errorMessage = error.message || 'No internet connection';
  } else {
    // Server error
    errorMessage = `Server error: ${error.response.status}`;
  }

  showScanCompletedDialog('Network error', errorMessage);
}
```

### 7.8 Camera Initialization Failures

**Scenarios:**
- Camera hardware unavailable
- Another app using camera
- System error

**Implementation:**
```typescript
function onCameraError(error: CameraError) {
  console.error('Camera error:', error);

  setCameraState(CameraState.ERROR);
  stopCamera();

  showErrorDialog(
    'Camera error',
    'Failed to initialize camera. Please try again or restart the app.'
  );
}

<Camera
  onError={onCameraError}
  // ...
/>
```

---

## 8. Integration with Conference Management

### 8.1 Conference Selection State

**Requirement:** A conference MUST be selected before scanning can begin

```typescript
interface Conference {
  id: string;
  baseUrl: string;
  confName: string;
  scanType: 'CHECKIN' | 'SPONSORBADGE' | 'CHECKINFIELD';
  fieldName?: string; // Only for CHECKINFIELD
}

// Global state (Zustand or Context)
const [currentConference, setCurrentConference] = useState<Conference | null>(null);

// Scanner screen logic
useEffect(() => {
  if (!currentConference) {
    // Stop camera if conference is deselected
    stopCamera();
  }
}, [currentConference]);
```

### 8.2 Conference Token Access

**Each conference has unique base URL with embedded token:**

```typescript
// Example base URLs:
const checkinUrl = 'https://postgresql.eu/events/pgconfeu2025/checkin/abc123.../';
const sponsorUrl = 'https://postgresql.eu/events/sponsor/scanning/def456.../';
const fieldUrl = 'https://postgresql.eu/events/pgconfeu2025/checkin/abc123.../f5/';

// Token is part of the URL path, extracted when conference is added
function parseConferenceUrl(url: string): Conference | null {
  // Pattern from Android:
  // ^https?://[^/]+/events/[^/]+/(checkin|scanning)/[a-z0-9]+(/f([A-Za-z0-9]+))?$

  const checkinPattern = /^(https?:\/\/[^/]+\/events\/[^/]+\/checkin\/[a-z0-9]+)(\/f([A-Za-z0-9]+))?$/;
  const sponsorPattern = /^https?:\/\/[^/]+\/events\/sponsor\/scanning\/[a-z0-9]+$/;

  // ... parsing logic
}
```

### 8.3 API Endpoint Construction

**All API calls append `/api/{endpoint}` to base URL:**

```typescript
class ConferenceApiClient {
  constructor(private baseUrl: string) {}

  async getStatus() {
    return axios.get(`${this.baseUrl}/api/status/`);
  }

  async lookup(qrCode: string) {
    return axios.get(`${this.baseUrl}/api/lookup/`, {
      params: { lookup: qrCode }
    });
  }

  async search(term: string) {
    return axios.get(`${this.baseUrl}/api/search/`, {
      params: { search: term }
    });
  }

  async performCheckin(regId: number) {
    return axios.post(`${this.baseUrl}/api/store/`,
      `reg=${regId}`, // Note: application/x-www-form-urlencoded
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  }
}

// Usage
const api = new ConferenceApiClient(currentConference.baseUrl);
const result = await api.lookup(qrString);
```

### 8.4 Scan Type Validation

**Each conference has a scan type that determines:**
- Expected token type (ID vs AT)
- Available features (search, statistics)
- Check-in flow behavior

```typescript
function getExpectedTokenType(scanType: ScanType): 'id' | 'at' {
  switch (scanType) {
    case 'CHECKIN':
      return 'id'; // Expects ticket QR codes
    case 'SPONSORBADGE':
      return 'at'; // Expects badge QR codes
    case 'CHECKINFIELD':
      return 'at'; // Expects badge QR codes
  }
}

function canSearch(scanType: ScanType): boolean {
  return scanType === 'CHECKIN'; // Only check-in supports search
}

function canViewStatistics(scanType: ScanType): boolean {
  return scanType === 'CHECKIN'; // Only check-in has statistics
}
```

---

## 9. UI/UX Requirements

### 9.1 Camera Screen Layout

**Based on Android `content_main.xml`:**

```
┌────────────────────────────────────────┐
│  [Navigation Drawer Icon]              │ <- Toolbar
├────────────────────────────────────────┤
│                                        │
│  Introduction Text (16sp, multi-line) │ <- Conference info, instructions
│                                        │
├────────────────────────────────────────┤
│                                        │
│   ┌────────────────────────────┐      │
│   │                            │      │
│   │                            │      │
│   │    Camera Preview (1:1)    │      │ <- Square viewfinder
│   │                            │      │
│   │                            │      │
│   └────────────────────────────┘      │
│                                        │
├────────────────────────────────────────┤
│  [     Search attendee     ] (64dp)   │ <- Only if scanType supports search
├────────────────────────────────────────┤
│  [     Start camera        ] (64dp)   │ <- Main action button
└────────────────────────────────────────┘
```

**Introduction Text Content:**

From Android `ApiBase.java` and subclasses:

```typescript
function getIntroText(isOpen: boolean, conference: Conference): string {
  if (!isOpen) {
    switch (conference.scanType) {
      case 'CHECKIN':
        return 'Check-in processing is not currently open. You can search for attendees below, but not check them in.';
      case 'SPONSORBADGE':
        return 'Badge scanning is not currently open. Please contact the organizers.';
      case 'CHECKINFIELD':
        return `Field check-in for ${conference.fieldName} is not currently open.`;
    }
  }

  switch (conference.scanType) {
    case 'CHECKIN':
      return 'Welcome to check-in processing! Start the camera and scan attendee tickets (ID$ codes) to check them in. You can also search by name.';
    case 'SPONSORBADGE':
      return 'Scan attendee badges (AT$ codes) to record sponsor booth visits. Notes can be added after scanning.';
    case 'CHECKINFIELD':
      return `Scan attendee badges (AT$ codes) for ${conference.fieldName} field check-in.`;
  }
}
```

### 9.2 Scanning Overlay (Recommended Addition)

The Android app shows a plain camera preview. Consider adding:

```
┌────────────────────────────────┐
│                                │
│     ┏━━━━━━━━━━━━━━━━━━┓       │
│     ┃                  ┃       │ <- Corner brackets
│     ┃                  ┃       │    (guides user where to position QR)
│     ┃   Scan QR Code   ┃       │
│     ┃                  ┃       │
│     ┗━━━━━━━━━━━━━━━━━━┛       │
│                                │
│  Semi-transparent background   │
└────────────────────────────────┘
```

**Implementation:**
```typescript
<View style={styles.cameraContainer}>
  <Camera {...props} />
  <View style={styles.overlay}>
    <View style={styles.scanFrame}>
      {/* Corner brackets */}
      <View style={styles.cornerTopLeft} />
      <View style={styles.cornerTopRight} />
      <View style={styles.cornerBottomLeft} />
      <View style={styles.cornerBottomRight} />
    </View>
    <Text style={styles.instruction}>
      Position QR code within frame
    </Text>
  </View>
</View>
```

### 9.3 Feedback When Code Scanned

**Visual:**
- Optional: Flash white overlay briefly on successful scan
- Show progress spinner immediately

**Haptic:**
- Short vibration (50ms) on successful code detection
- Double vibration on error

**Audio (Optional):**
- Beep sound on successful scan
- Error sound on invalid code

### 9.4 Manual Entry Fallback

**Android Implementation:**
- "Search attendee" button available for check-in mode
- Opens dialog with text input
- Searches by name/email/company

**React Native Implementation:**
```typescript
// Add button below camera (only for check-in mode)
{conference.scanType === 'CHECKIN' && (
  <Button
    mode="outlined"
    onPress={handleSearchPress}
    disabled={!isOpen}
    style={styles.searchButton}
  >
    Search attendee
  </Button>
)}

function handleSearchPress() {
  // Stop camera
  stopCamera();

  // Show search dialog or navigate to search screen
  navigation.navigate('SearchAttendee', {
    conferenceId: currentConference.id
  });
}
```

### 9.5 Error Dialog Design

**Android uses AlertDialog with:**
- Title (bold)
- Message (regular text, multi-line)
- Single "OK" button
- Blocks scanning until dismissed

**React Native equivalent:**
```typescript
import { Dialog, Paragraph, Button } from 'react-native-paper';

<Dialog visible={dialogVisible} onDismiss={handleDismiss}>
  <Dialog.Title>{dialogTitle}</Dialog.Title>
  <Dialog.Content>
    <Paragraph>{dialogMessage}</Paragraph>
  </Dialog.Content>
  <Dialog.Actions>
    <Button onPress={handleDismiss}>OK</Button>
  </Dialog.Actions>
</Dialog>

function handleDismiss() {
  setDialogVisible(false);
  setPauseDetection(false); // Resume scanning
}
```

---

## 10. Implementation Checklist

### Phase 1: Basic Camera Setup

- [ ] Install dependencies
  - [ ] react-native-vision-camera
  - [ ] vision-camera-code-scanner (ML Kit plugin)
- [ ] Configure camera permissions
  - [ ] Android: CAMERA in AndroidManifest.xml
  - [ ] iOS: NSCameraUsageDescription in Info.plist
- [ ] Create Scanner screen component
- [ ] Implement camera permission request flow
- [ ] Add camera preview with start/stop button
- [ ] Test camera on physical device (simulator won't work)

### Phase 2: QR Code Detection

- [ ] Configure code scanner for QR codes only
- [ ] Implement onCodeScanned callback
- [ ] Add pauseDetection state management
- [ ] Test with sample QR codes

### Phase 3: Token Validation

- [ ] Implement token regex generation from base URL
- [ ] Add token format validation (ID$/AT$ or URL format)
- [ ] Add test token detection (TESTTESTTESTTEST)
- [ ] Implement token type validation (id vs at)
- [ ] Add error dialogs for invalid codes
- [ ] Test with ID$, AT$, and test tokens

### Phase 4: API Integration

- [ ] Implement lookup API call
- [ ] Add progress spinner during API call
- [ ] Handle all HTTP error codes (404, 412, 403, 500)
- [ ] Handle network errors
- [ ] Test with real conference endpoint

### Phase 5: Navigation & Check-in Flow

- [ ] Navigate to AttendeeCheckin screen on successful lookup
- [ ] Pass scanned token and registration data
- [ ] Stop camera when navigating away
- [ ] Resume camera state when returning (optional)

### Phase 6: UI Polish

- [ ] Add scanning overlay with target frame (optional)
- [ ] Implement haptic feedback
- [ ] Add audio feedback (optional)
- [ ] Style error dialogs
- [ ] Add intro text based on conference state
- [ ] Show/hide search button based on scan type

### Phase 7: Edge Case Handling

- [ ] Handle multiple QR codes in frame
- [ ] Add flashlight/torch toggle
- [ ] Handle camera initialization errors
- [ ] Test poor lighting conditions
- [ ] Test camera permission denied flow
- [ ] Test screen rotation (Android)
- [ ] Test app backgrounding/foregrounding

### Phase 8: Integration Testing

- [ ] Test with all three scan types (check-in, sponsor, field)
- [ ] Test with wrong token type
- [ ] Test with non-conference QR codes
- [ ] Test with network failures
- [ ] Test duplicate scan prevention
- [ ] Test rapid scanning
- [ ] Performance test on older devices (iOS 14, Android 11)

### Phase 9: Accessibility

- [ ] Add accessibility labels for buttons
- [ ] Support screen reader announcements
- [ ] Test with VoiceOver/TalkBack
- [ ] Ensure sufficient color contrast
- [ ] Add reduced motion support

### Phase 10: Documentation

- [ ] Document camera setup for future developers
- [ ] Add inline code comments
- [ ] Create troubleshooting guide
- [ ] Document token formats
- [ ] Add examples for testing

---

## Appendix A: Key Android Source Files

**Primary scanner logic:**
- `/app/src/main/java/eu/postgresql/android/conferencescanner/MainActivity.java`
  - Camera lifecycle
  - QR code validation
  - API integration
  - Error handling

**QR code analyzer:**
- `/app/src/main/java/eu/postgresql/android/conferencescanner/QRAnalyzer.java`
  - ML Kit integration
  - Frame processing
  - Code detection callback

**Token validation:**
- `/app/src/main/java/eu/postgresql/android/conferencescanner/TokenType.java`
  - Token type mapping (id -> ticket, at -> badge)
- `/app/src/main/java/eu/postgresql/android/conferencescanner/params/ConferenceEntry.java`
  - Token regex generation
  - Expected token type logic

**API clients:**
- `/app/src/main/java/eu/postgresql/android/conferencescanner/api/ApiBase.java`
  - Base API client
  - Common API methods (lookup, search, status)
- `/app/src/main/java/eu/postgresql/android/conferencescanner/api/CheckinApi.java`
- `/app/src/main/java/eu/postgresql/android/conferencescanner/api/SponsorApi.java`
- `/app/src/main/java/eu/postgresql/android/conferencescanner/api/CheckinFieldApi.java`

---

## Appendix B: React Native Dependencies

```json
{
  "dependencies": {
    "react-native-vision-camera": "^3.6.0",
    "vision-camera-code-scanner": "^0.2.0",
    "axios": "^1.6.0",
    "react-native-paper": "^5.11.0",
    "zustand": "^4.4.0"
  }
}
```

**Installation:**
```bash
npm install react-native-vision-camera vision-camera-code-scanner

# iOS
cd ios && pod install

# Configure permissions in Info.plist and AndroidManifest.xml
```

---

## Appendix C: Sample Token Generation for Testing

**Create test QR codes for development:**

```typescript
// Test tokens
const testIdToken = 'ID$TESTTESTTESTTEST$ID';
const testAtToken = 'AT$TESTTESTTESTTEST$AT';

// Generate URL format test tokens
const testIdUrl = 'https://postgresql.eu/t/id/TESTTESTTESTTEST/';
const testAtUrl = 'https://postgresql.eu/t/at/TESTTESTTESTTEST/';

// Generate QR code images (use online generator or library)
// Example: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=ID$TESTTESTTESTTEST$ID
```

**For production testing, coordinate with backend team to:**
1. Create test conference
2. Generate test registration with real ID token
3. Generate test badge with real AT token
4. Print QR codes for physical testing

---

**End of Camera Scanner Implementation Guide**

_This guide should be used in conjunction with:_
- `/Users/dpage/git/pgeu-system-app/.claude/api-integration-guide.md`
- `/Users/dpage/git/pgeu-system-app/.claude/android-app-comprehensive-analysis.md`
- `/Users/dpage/git/pgeu-system-app/.claude/react-native/implementation-roadmap.md`
