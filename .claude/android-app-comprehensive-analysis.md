# pgeu-system Android PGConf Scanner - Comprehensive Analysis

**Document Version:** 1.0
**Analysis Date:** 2025-11-08
**Repository:** https://github.com/pgeu/android-PGConfScanner
**Current Version:** 1.5.4 (versionCode 105004)

> **Note for React Native Migration:** This document analyzes the existing Android app. The React Native replacement will NOT include offline mode - all scanning operations will require active network connectivity.

---

## Executive Summary

The pgeu-system Android PGConf Scanner is a native Android application built in Java that provides QR code scanning functionality for conference attendee check-in and sponsor badge scanning. The app supports multiple PostgreSQL community event organizations (PostgreSQL Europe, PostgreSQL US, PGEvents Canada, PGDay UK) and handles three distinct scanning modes:

1. **Check-in Processing** - Scanning attendee tickets for conference entry
2. **Sponsor Badge Scanning** - Sponsors capturing attendee badge data with notes
3. **Check-in Field Scanning** - Scanning for specific event fields (e.g., t-shirt pickup, training sessions)

The app is designed for simplicity and speed during live conference operations. While originally conceived with offline capabilities in mind, the current implementation requires network connectivity for all scanning operations.

---

## 1. Application Architecture

### 1.1 Overall Structure

The application follows a traditional Android architecture pattern:

- **Language:** 100% Java (targeting Java 8)
- **Architecture Pattern:** Activity-based with AsyncTask for background operations
- **Min SDK:** 23 (Android 6.0 Marshmallow - released 2015)
- **Target/Compile SDK:** 35 (Android 15)
- **Package:** `eu.postgresql.android.conferencescanner`

### 1.2 Component Overview

```
app/src/main/java/eu/postgresql/android/conferencescanner/
├── Activities (UI Controllers)
│   ├── MainActivity.java                 # Primary scanning interface
│   ├── AttendeeCheckinActivity.java      # Confirmation/review screen
│   ├── ListConferencesActivity.java      # Conference management
│   └── CheckinStatsActivity.java         # Statistics viewer (admin only)
├── API Layer (Network Communication)
│   ├── api/ApiBase.java                  # Abstract base for all API calls
│   ├── api/CheckinApi.java               # Check-in endpoints
│   ├── api/SponsorApi.java               # Sponsor scanning endpoints
│   └── api/CheckinFieldApi.java          # Field check-in endpoints
├── Data Models
│   ├── params/ConferenceEntry.java       # Conference configuration model
│   └── params/ParamManager.java          # Persistence manager (SharedPreferences)
├── Scanning Infrastructure
│   ├── QRAnalyzer.java                   # Camera frame analyzer
│   ├── ScanType.java                     # Enum: CHECKIN, SPONSORBADGE, CHECKINFIELD
│   └── TokenType.java                    # Token validation utilities
```

### 1.3 Activity Responsibilities

**MainActivity:**
- App entry point and primary scanning interface
- Deep link handling for conference registration URLs
- Camera lifecycle management (CameraX)
- QR code detection and validation
- Navigation drawer for conference selection
- Search functionality for attendee lookup

**AttendeeCheckinActivity:**
- Display attendee information pre-confirmation
- Handle check-in/scan confirmation
- Show already-checked-in status
- Notes entry for sponsor scans
- Display highlighted fields (warnings/alerts)

**ListConferencesActivity:**
- Multi-select conference deletion
- Display configured conferences with types
- Conference list management UI

**CheckinStatsActivity:**
- Expandable statistics display
- Admin-only feature for check-in progress tracking
- Hierarchical data presentation

### 1.4 Key Architectural Patterns

**Async Operations:**
- All network calls use `AsyncTask<Void, Void, Result>` pattern
- UI thread protection with onPreExecute/onPostExecute
- 10-second timeout on all network requests

**State Management:**
- Conference list stored in SharedPreferences (JSON via Gson)
- Last selected conference persisted separately
- No local database - all data from API calls
- Minimal local caching (conference metadata only)

**Deep Linking:**
- App responds to HTTPS URLs matching specific patterns
- Auto-verification enabled for conference domains
- Pattern: `https://{domain}/events/{event}/checkin/{token}/`
- Sponsor pattern: `https://{domain}/events/sponsor/scanning/{token}`
- Field pattern: `https://{domain}/events/{event}/checkin/{token}/f{fieldId}/`

---

## 2. Core Features & User Workflows

### 2.1 Conference Registration

**Method 1: Deep Link (Primary)**
1. User clicks registration link from email/web
2. Android OS routes to app via intent filter
3. App extracts baseurl, validates pattern with regex
4. API call to `{baseurl}/api/status/` validates conference
5. Conference added to navigation drawer
6. Automatically switches to new conference

**Method 2: Manual URL Entry**
1. User selects "Add conference" from menu
2. Dialog prompts for full URL
3. Same validation and API flow as Method 1

**Supported URL Patterns:**
```regex
^https?://[^/]+/events/[^/]+/(checkin|scanning)/[a-z0-9]+(/f([A-Za-z0-9]+))?$
```

**Supported Domains (Deep Linking):**
- www.postgresql.eu (PostgreSQL Europe)
- postgresql.us (PostgreSQL US)
- www.pgevents.ca (Slonik Events Canada)
- pgday.uk (PGDay UK)

### 2.2 Check-in Processing Workflow

**User Flow:**
1. Select conference from navigation drawer
2. Verify check-in is "open" (shown in intro text)
3. Tap "Start camera" button
4. Point camera at attendee's **ticket QR code**
5. App automatically detects and processes code
6. Review attendee information screen appears
7. Tap "Check in!" to confirm
8. Success message displayed, camera resumes

**Token Format:**
- QR Code Content: `ID$[40-char-token]$ID` OR URL format `https://{domain}/t/id/{token}/`
- Test Code: `ID$TESTTESTTESTTEST$ID`

**API Sequence:**
```
1. GET {baseurl}/api/lookup/?lookup={qrcode}
   → Returns attendee details

2. POST {baseurl}/api/store/
   Body: token={qrcode}
   → Confirms check-in
```

**Displayed Attendee Fields:**
- Name (required)
- Registration type
- Check-in message (if any)
- Photo consent status
- Policy confirmed status
- T-shirt size
- Company
- Queue partition
- Additional options (array of strings)
- Already checked-in status (if applicable)

**Highlighted Fields:**
- Server returns `highlight` array with field names
- App displays these with RED background
- Used for warnings/alerts requiring scanner attention

### 2.3 Sponsor Badge Scanning Workflow

**User Flow:**
1. Select sponsor conference from navigation drawer
2. Tap "Start camera" button
3. Point camera at attendee's **badge QR code**
4. App automatically detects and processes code
5. Attendee details appear with editable notes field
6. Add/edit notes about interaction
7. Tap "Store scan" to save
8. Success message, camera resumes

**Token Format:**
- QR Code Content: `AT$[40-char-token]$AT` OR URL format `https://{domain}/t/at/{token}/`
- Test Code: `AT$TESTTESTTESTTEST$AT`

**API Sequence:**
```
1. GET {baseurl}/api/lookup/?lookup={qrcode}
   → Returns attendee details + previous note

2. POST {baseurl}/api/store/
   Body: token={qrcode}&note={user_note}
   → Stores scan with notes
```

**Displayed Fields:**
- Name
- Company
- Country
- Email
- Note (editable, per-scanner persistent)

**Key Difference from Check-in:**
- Notes are editable and persist per scanner
- Scanning same badge multiple times retrieves previous note
- No "already scanned" blocking - can scan repeatedly
- No search functionality

### 2.4 Check-in Field Scanning Workflow

**Purpose:** Special scanning for specific conference logistics (t-shirt pickup, training session attendance, meal tickets, etc.)

**User Flow:**
1. Select field scanner from navigation drawer (shows as "{Conference}: {Field Name}")
2. Works identically to check-in but scopes to specific field
3. Scans attendee **badge** (not ticket)
4. Confirms field check-in

**Token Format:**
- Same as sponsor: `AT$[token]$AT`

**API:**
- Same structure as check-in API
- Different baseurl includes field identifier
- Server tracks field-specific check-in state

### 2.5 Search Functionality

**Availability:** Check-in mode only (not sponsor or field scanning)

**User Flow:**
1. Tap "Search attendee" button
2. Enter search term (name, email, etc.)
3. API returns matching attendees
4. Select from results
5. Continues as normal check-in flow

**API:**
```
GET {baseurl}/api/search/?search={term}
Response: {
  "regs": [
    { /* same structure as lookup response */ }
  ]
}
```

**Use Case:** Attendee lost/forgot ticket but needs check-in

### 2.6 Statistics (Admin Only)

**Access Control:**
- Menu item only enabled if `admin: true` in status API
- Available only in check-in mode

**User Flow:**
1. Select "Statistics" from overflow menu
2. Expandable list shows check-in progress
3. Data organized in hierarchical groups

**API:**
```
GET {baseurl}/api/stats/
Response: [
  [
    ["Group Title", "Col2", "Col3"],  // Group header
    [                                  // Group items
      ["Item 1", "Value", "Count"],
      [null, "Total", "100"]           // null in col1 = summary row (bold)
    ]
  ]
]
```

**UI Characteristics:**
- Expandable list view
- Summary rows displayed in bold italic
- Auto-expands first group on load

---

## 3. Backend Integration

### 3.1 API Architecture

**Base Implementation:** `ApiBase.java`
- All API classes extend this abstract base
- Uses Volley library for HTTP requests
- RequestFuture pattern for synchronous calls in AsyncTask
- 10-second timeout on all requests
- Status code and error tracking

**API Variants:**

| API Class | Base URL Pattern | Scan Type | Search Support |
|-----------|------------------|-----------|----------------|
| CheckinApi | `/events/{event}/checkin/{token}/` | CHECKIN | Yes |
| SponsorApi | `/events/sponsor/scanning/{token}/` | SPONSORBADGE | No |
| CheckinFieldApi | `/events/{event}/checkin/{token}/f{fieldId}/` | CHECKINFIELD | No |

### 3.2 Authentication & Authorization

**Authentication Method:**
- **Token-based via URL** - No separate login
- Token embedded in conference registration URL
- Token included in API endpoint path (baseurl)
- All requests to `{baseurl}/api/*` implicitly authenticated

**Authorization Checks:**
- `active` flag - Controls if scanning is currently open
- `admin` flag - Enables statistics view
- HTTP 403 - Forbidden (invalid token/permissions)
- HTTP 412 - Precondition Failed (scanning closed or already checked in)

**Security Considerations:**
- Tokens are opaque hex strings (appears to be ~40 characters)
- No token refresh mechanism visible
- HTTPS enforced via deep link patterns
- `usesCleartextTraffic="true"` in manifest (allows HTTP for development/local servers)

### 3.3 API Endpoints

**Conference Status:**
```
GET {baseurl}/api/status/

Response (Check-in):
{
  "confname": "PGConf.EU 2025",
  "user": "scanner_username",
  "active": true,
  "admin": false
}

Response (Sponsor):
{
  "confname": "PGConf.EU 2025",
  "sponsorname": "PostgreSQL Experts Inc",
  "scanner": "sponsor_user",
  "active": true,
  "admin": false
}

Response (Field):
{
  "confname": "PGConf.EU 2025",
  "fieldname": "T-Shirt Pickup",
  "user": "scanner_username",
  "active": true,
  "admin": false
}
```

**Attendee Lookup:**
```
GET {baseurl}/api/lookup/?lookup={qrcode}

Success (200):
{
  "reg": {
    "id": 123,
    "name": "Magnus Hagander",
    "type": "Normal",
    "company": "PostgreSQL Experts",
    "email": "test@example.com",  // Sponsor only
    "country": "Sweden",           // Sponsor only
    "tshirt": "L",
    "partition": "H",
    "photoconsent": "Photos OK",
    "policyconfirmed": "2025-01-15 10:30:00",
    "checkinmessage": "VIP - escort to speakers room",
    "highlight": ["photoconsent", "checkinmessage"],
    "additional": [
      "Workshop: Advanced PostgreSQL",
      "Training: Performance Tuning"
    ],
    "note": "Met at booth, interested in enterprise features",  // Sponsor only
    "already": {                    // Only if already checked in
      "title": "Already checked in",
      "body": "Checked in at 2025-01-15 09:15 by John Doe"
    }
  }
}

Not Found (404):
- Attendee not registered or token invalid

Precondition Failed (412):
- Check-in is closed
- OR Already checked in (for immutable operations)

Forbidden (403):
- Invalid permissions
```

**Store Check-in/Scan:**
```
POST {baseurl}/api/store/

Body (Check-in):
token={qrcode}

Body (Sponsor):
token={qrcode}&note={user_notes}

Success (200):
Returns same JSON structure as lookup (with updated state)
```

**Search:**
```
GET {baseurl}/api/search/?search={term}

Response:
{
  "regs": [
    { /* same structure as reg object from lookup */ }
  ]
}
```

**Statistics (Check-in only):**
```
GET {baseurl}/api/stats/

Response:
[
  [
    ["Registration Type", "Checked In", "Total"],  // Group header
    [
      ["Normal", "45", "50"],
      ["Student", "12", "15"],
      [null, "57", "65"]  // Summary row (null = bold formatting)
    ]
  ],
  [
    ["By Time", "Count", ""],
    [
      ["09:00-10:00", "23", ""],
      ["10:00-11:00", "34", ""]
    ]
  ]
]
```

### 3.4 Error Handling

**Network Errors:**
- Timeout (10s): Shows "Network timeout" error dialog
- No connection: Shows "Network error occurred when communicating with the server"
- Interrupted: Shows "Network call interrupted"

**HTTP Status Codes:**
- 200: Success
- 404: Attendee not found - "The scanned code does not appear to be a valid attendee"
- 412: Not ready - Shows server-provided message
- 403: Scanning failed - Shows server-provided message
- 4xx/5xx: Generic "Network error" with status details

**QR Code Validation:**
- Unknown format: "Unknown code scanned"
- Test codes: "You have successfully scanned a test code!"
- Wrong token type: "You have scanned a {type}. For {purpose}, you must scan the {correct_type}"

**Offline Behavior:**
- No offline queue - network required for all operations
- Conference metadata cached from initial setup
- API status checked on conference selection
- Camera can run offline, but processing requires network

---

## 4. Data Management

### 4.1 Local Storage

**Storage Mechanism:** SharedPreferences (key-value XML file)
- Preference file: `"conferences"`
- Serialization: Gson library (JSON)

**Stored Data:**

**Conference List:**
```java
// SharedPreferences key: "confs"
ArrayList<ConferenceEntry> {
  ConferenceEntry {
    String confname;      // "PGConf.EU 2025"
    String baseurl;       // "https://www.postgresql.eu/events/pgconfeu2025/checkin/abc123..."
    ScanType scantype;    // CHECKIN, SPONSORBADGE, or CHECKINFIELD
    String fieldname;     // Only for CHECKINFIELD type
    transient boolean selected;  // UI state, not persisted
  }
}
```

**Last Conference:**
```java
// SharedPreferences key: "lastbase"
String lastConferenceBaseUrl;  // Restored on app launch
```

### 4.2 Data Validation

**Loading Conferences:**
- Validates non-null: `confname`, `baseurl`, `scantype`
- For CHECKINFIELD: validates non-null `fieldname`
- Removes invalid entries with warning log
- Handles corrupt JSON gracefully (returns empty list)

**URL Validation:**
```java
// Regex pattern
Pattern.compile("^https?://[^/]+/events/[^/]+/(checkin|scanning)/[a-z0-9]+(/f([A-Za-z0-9]+))?$")
```

### 4.3 Caching Strategy

**What is Cached:**
- Conference metadata (name, url, type, field name)
- Last selected conference

**What is NOT Cached:**
- Attendee data
- Check-in status
- Statistics
- API responses

**Cache Invalidation:**
- No automatic refresh - manual deletion only
- Conference removed via "Edit conferences" screen
- No expiration mechanism

**Rationale:**
- Conferences are long-lived (months/years)
- Real-time status critical (can't cache check-in state)
- Network required anyway for primary function
- Simplifies data consistency

### 4.4 No Database

**Design Decision:**
- No SQLite database
- No Room persistence library
- All transient data from API
- Only configuration in SharedPreferences

**Implications for React Native:**
- Simple AsyncStorage/MMKV for conference list
- No migration/schema complexity
- API remains single source of truth

---

## 5. QR/Barcode Scanning Implementation

### 5.1 Scanning Library

**Library:** Google ML Kit Barcode Scanning
- Dependency: `com.google.mlkit:barcode-scanning:17.3.0`
- On-device processing (no cloud API calls)
- Real-time scanning from camera feed
- Format: QR codes only (`Barcode.FORMAT_QR_CODE`)

**ML Kit Configuration:**
```xml
<!-- AndroidManifest.xml -->
<meta-data
    android:name="com.google.mlkit.vision.DEPENDENCIES"
    android:value="barcode" />
```

### 5.2 Camera Implementation

**Library:** AndroidX CameraX
- Dependencies:
  - `androidx.camera:camera-core:1.4.2`
  - `androidx.camera:camera-camera2:1.4.2`
  - `androidx.camera:camera-lifecycle:1.4.2`
  - `androidx.camera:camera-view:1.4.2`

**Camera Lifecycle:**
```java
// MainActivity.java
1. User taps "Start camera"
2. Check CAMERA permission
3. ProcessCameraProvider.getInstance()
4. Bind Preview + ImageAnalysis use cases
5. QRAnalyzer processes each frame
6. On QR detected: pause detection, process code
7. After processing: resume detection
```

**Frame Processing:**
```java
// QRAnalyzer.java implements ImageAnalysis.Analyzer
@Override
public void analyze(ImageProxy image) {
  InputImage visionImage = InputImage.fromMediaImage(
    image.getImage(),
    image.getImageInfo().getRotationDegrees()
  );

  scanner.process(visionImage)
    .addOnSuccessListener(barcodes -> {
      for (Barcode barcode : barcodes) {
        notificationReceiver.OnQRCodeFound(barcode.getRawValue());
      }
    })
    .addOnCompleteListener(task -> image.close());
}
```

**Backpressure Strategy:**
- `ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST`
- Drops frames if processing can't keep up
- Prevents memory buildup
- Prioritizes latest frame for best UX

### 5.3 QR Code Formats

**Check-in Ticket Format:**
```
String formats:
1. ID$[40-char-hex-token]$ID
2. https://{domain}/t/id/{token}/

Test code:
ID$TESTTESTTESTTEST$ID
```

**Sponsor/Field Badge Format:**
```
String formats:
1. AT$[40-char-hex-token]$AT
2. https://{domain}/t/at/{token}/

Test code:
AT$TESTTESTTESTTEST$AT
```

**Token Validation:**
```java
// ConferenceEntry.java
Pattern getTokenRegexp() {
  return Pattern.compile(
    String.format(
      "^%s://%s/t/(id|at)/([a-z0-9]+|TESTTESTTESTTEST)/$",
      protocol, host
    )
  );
}

// Matches against conference's base URL domain
// Validates token type matches scan type:
// - CHECKIN requires "id" tokens
// - SPONSORBADGE/CHECKINFIELD require "at" tokens
```

### 5.4 Detection Pause Mechanism

**Problem:** Continuous scanning would trigger multiple times for same code

**Solution:** Pause detection flag
```java
private boolean pauseDetection = false;

@Override
public void OnQRCodeFound(String qrstring) {
  if (pauseDetection) return;  // Ignore additional detections

  pauseDetection = true;
  // Process QR code...
}

// Resume on:
// - User dismisses dialog
// - Check-in/scan completes
// - Error occurs
```

### 5.5 Camera Permission Handling

**Permission:** `android.permission.CAMERA` (AndroidManifest.xml)

**Runtime Flow:**
```java
1. User taps "Start camera"
2. Check if permission granted
3. If not: Request permission (PERMISSION_REQUEST_CAMERA = 17)
4. onRequestPermissionsResult():
   - Granted: StartCamera()
   - Denied: Show error dialog explaining camera is essential
```

**Educational Error:**
> "As this app deals with scanning barcodes, it requires access to the camera to be able to provide any functionality at all. Please try again, and this time grant the camera permissions."

### 5.6 Camera State Management

**State Preservation:**
```java
@Override
protected void onSaveInstanceState(Bundle state) {
  super.onSaveInstanceState(state);
  state.putBoolean("cameraActive", cameraActive);
}

// On restore (e.g., screen rotation):
if (savedInstanceState.getBoolean("cameraActive", false)) {
  // Delay 100ms to avoid rotation timing issues
  handler.postDelayed(() -> StartCamera(), 100);
}
```

**Camera Cleanup:**
```java
private void StopCamera() {
  ProcessCameraProvider.getInstance(this).get().unbindAll();
  cameraActive = false;
  viewfinder.setVisibility(View.INVISIBLE);
}
```

---

## 6. UI/UX Patterns & Design

### 6.1 Design System

**Theme:**
- Base: `Theme.AppCompat.Light.DarkActionBar`
- Color scheme:
  - Primary: #008577 (Teal green - PostgreSQL elephant color)
  - Primary Dark: #00574B
  - Accent: #D81B60 (Pink)

**Material Design:**
- Material Components: `com.google.android.material:material:1.6.0`
- Navigation Drawer pattern
- Floating Action Bar
- Constraint Layout for responsive design

### 6.2 Screen Structure

**MainActivity (Primary Screen):**

```
┌─────────────────────────────┐
│ ☰  PGConf Scanner       │  ← Toolbar with drawer toggle
├─────────────────────────────┤
│                             │
│  Intro Text (Dynamic)       │  ← Status message
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │   Camera Preview      │  │  ← 1:1 aspect ratio square
│  │   (or hidden)         │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  [  Search Attendee     ]   │  ← Conditional (check-in only)
│  [  Start Camera        ]   │  ← Toggle to "Stop Camera"
│                             │
└─────────────────────────────┘
```

**Navigation Drawer:**
```
┌─────────────────────────────┐
│  PGConf Scanner         │  ← Header
│  https://github.com/pgeu/   │
├─────────────────────────────┤
│  Check-in ▼                 │  ← Expandable section
│    ☑ PGConf.EU 2025         │  ← Selected conference
│    ☐ PGDay UK 2025          │
│    ☐ PGConf.EU 2025: T-Sh.. │  ← Field scanner
├─────────────────────────────┤
│  Sponsor ▼                  │
│    ☐ PGConf.EU - MegaCorp   │
├─────────────────────────────┤
│  Manage                     │
│    Edit conferences         │
│    Add conference           │
└─────────────────────────────┘
```

**AttendeeCheckinActivity:**
```
┌─────────────────────────────┐
│ ← Check in attendee         │  ← Back button
├─────────────────────────────┤
│  Name         Magnus Haga.. │
│  Type         Normal        │
│  Company      PostgreSQL E..│  ← Scrollable list
│  T-Shirt      L             │
│  Photo consent Photos OK    │  ← May have RED background
├─────────────────────────────┤
│  Notes (Sponsor only)       │
│  ┌───────────────────────┐  │
│  │                       │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  [  Check in!  ] [ Cancel ] │  ← Action buttons
└─────────────────────────────┘
```

### 6.3 Key UI Patterns

**Progress Indicator:**
- Material ProgressBar (indeterminate)
- Shown during all AsyncTask operations
- Positioned at toolbar level
- Visibility toggled in onPreExecute/onPostExecute

**Error Dialogs:**
```java
new AlertDialog.Builder(this)
  .setTitle("Error Title")
  .setMessage("Detailed error message")
  .setIcon(android.R.drawable.ic_dialog_alert)
  .setPositiveButton("OK", null)
  .show();
```

**Scan Completion Dialog:**
- Modal dialog pauses scanning
- Shows result (success/error/info)
- On dismiss: resumes camera scanning
- Prevents duplicate scans

**Field Highlighting:**
- Red background: `Color.RED`
- Applied to fields in `highlight` array from API
- Draws scanner attention to important info/warnings

**Conference Selection:**
- Radio button behavior in menu (only one selected)
- Checkmarks indicate current conference
- Grouped by scan type (Check-in vs Sponsor)

### 6.4 Responsive Layout

**Constraint Layout:**
- All screens use ConstraintLayout
- Relative positioning (no absolute pixels except margins)
- Camera preview: 1:1 aspect ratio constraint
- Buttons: 64dp height, 18sp text

**Text Sizes:**
- Intro text: 18sp
- Buttons: 18sp
- Field labels: 16sp
- Default: System default

**Margins:**
- Standard: 8dp
- Camera view: 16dp horizontal
- Buttons: 8dp all sides

### 6.5 Accessibility Considerations

**Current Implementation:**
- `android:labelFor` on labels pointing to inputs
- `android:autofillHints` on EditText
- Material components provide basic accessibility
- High contrast colors (WCAG AA compliant)

**Missing:**
- No content descriptions on ImageViews
- No TalkBack optimization
- No large text support testing
- No accessibility service testing

---

## 7. Configuration & Settings

### 7.1 App Configuration

**No User Settings Screen:**
- App has no settings/preferences UI
- All configuration via conference registration
- No toggles, switches, or user preferences

**Build Configuration:**
```gradle
android {
  compileSdkVersion 35
  defaultConfig {
    applicationId "eu.postgresql.android.conferencescanner"
    minSdkVersion 23        // Android 6.0 (2015)
    targetSdkVersion 35     // Android 15
    versionCode 105004      // Internal version
    versionName "1.5.4"     // User-facing version
  }
}
```

### 7.2 Conference Configuration

**User-Managed:**
- Add conferences via URL or deep link
- Delete conferences via "Edit conferences" screen
- Switch active conference via navigation drawer

**Per-Conference Settings (Stored):**
```java
ConferenceEntry {
  String confname;    // Display name
  String baseurl;     // API endpoint root (includes auth token)
  ScanType scantype;  // CHECKIN, SPONSORBADGE, or CHECKINFIELD
  String fieldname;   // For CHECKINFIELD only
}
```

**Last Conference Persistence:**
- App remembers last selected conference
- Auto-selects on next launch
- Updates on manual conference switch

### 7.3 Deep Link Configuration

**Domains (in AndroidManifest.xml):**
- www.postgresql.eu
- postgresql.us
- www.pgevents.ca
- pgday.uk

**URL Patterns:**
```xml
<!-- Check-in -->
android:pathPattern="/events/.*/checkin/.*/"

<!-- Check-in with field -->
android:pathPattern="/events/.*/checkin/.*/f.*/"

<!-- Sponsor scanning -->
android:pathPattern="/events/sponsor/scanning/.*"
```

**Auto-Verify:** `android:autoVerify="true"`
- Enables App Links (preferred over deep links)
- Requires server-side `assetlinks.json` file
- Opens directly in app without disambiguation dialog

### 7.4 Permissions

**Required Permissions:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
```

**Camera:**
- Runtime permission (dangerous)
- Required for core functionality
- Requested on first "Start camera" tap

**Internet:**
- Install-time permission (normal)
- No runtime prompt needed
- Required for all API calls

### 7.5 Backup Configuration

**Auto Backup:** Enabled
- `android:allowBackup="true"`
- `android:fullBackupContent="@xml/backup_rules"`

**Backup Rules:**
```xml
<full-backup-content>
  <!-- Exclude GCM registration -->
  <exclude domain="sharedpref" path="com.google.android.gms.appid.xml" />
</full-backup-content>
```

**Included in Backup:**
- Conference list (SharedPreferences)
- Last selected conference
- All app state

**Implications:**
- Conference tokens backed up to Google account
- Restored on new device
- Security consideration: tokens are sensitive

### 7.6 Network Security

**Cleartext Traffic:**
```xml
android:usesCleartextTraffic="true"
```

**Implications:**
- Allows HTTP connections (not just HTTPS)
- Required for development/testing servers
- Production uses HTTPS (per URL patterns)

**Recommendation for React Native:**
- Default to HTTPS-only
- Provide debug build variant for HTTP testing
- Never ship production with cleartext enabled

---

## 8. Error Handling & Edge Cases

### 8.1 Network Error Handling

**Timeout Handling:**
```java
// ApiBase.java - 10 second timeout
requestFuture.get(10, TimeUnit.SECONDS);

// On timeout:
lasterror = "Network timeout";
```

**Connection Failures:**
- Interrupted: "Network call interrupted"
- Execution error: "Network execution error: {details}"
- Generic: "Network error occurred when communicating with the server"

**User Feedback:**
- All network errors show AlertDialog
- Error message includes API's `LastError()`
- Progress spinner hidden on error
- User must dismiss dialog to continue

### 8.2 HTTP Status Code Handling

**404 Not Found:**
- Attendee lookup: "The scanned code does not appear to be a valid attendee"
- Conference registration: "Invalid URL"

**412 Precondition Failed:**
- Dialog title: "Not ready for scan"
- Message: Server-provided error (from response body)
- Common causes: Check-in closed, already checked in

**403 Forbidden:**
- Dialog title: "Scanning failed"
- Message: Server-provided error
- Cause: Invalid token/permissions

**200 Success:**
- Silent success on API calls
- UI updates with returned data
- Toast message for completed actions

### 8.3 QR Code Validation Errors

**Unknown Code Format:**
```java
if (!tokenMatcher.matches()) {
  ShowDialog("Unknown code scanned",
    "You have scanned a code that is not recognized by this system");
}
```

**Wrong Token Type:**
```java
// Example: Scanning badge (AT) for check-in (needs ID)
ShowDialog("Badge scanned",
  "You have scanned a badge. For check-in processing, you must " +
  "scan the ticket, not the badge.");
```

**Test Code:**
```java
if (token.equals("TESTTESTTESTTEST")) {
  ShowDialog("Test code scanned",
    "You have successfully scanned a test code!");
}
```

### 8.4 Conference Registration Errors

**Invalid URL Pattern:**
```java
if (!urlpattern.matcher(cleanurl).matches()) {
  ErrorBox("Invalid URL",
    "URL does not look like a check-in or sponsor URL");
}
```

**API Failure:**
```java
if (confname == null) {
  ErrorBox("Could not get conference name",
    String.format("Failed to get the name of the conference:\n%s",
      api.LastError()));
}
```

**Duplicate Conference:**
```java
for (conference in conferences) {
  if (conference.baseurl.equals(api.baseurl)) {
    ErrorBox("Conference already added",
      "Conference is already added.");
    // Auto-switch to existing conference
  }
}
```

### 8.5 Camera Errors

**Permission Denied:**
```java
if (grantResults[0] != PackageManager.PERMISSION_GRANTED) {
  ErrorBox("Camera permissions required",
    "As this app deals with scanning barcodes, it requires access " +
    "to the camera to be able to provide any functionality at all. " +
    "Please try again, and this time grant the camera permissions.");
}
```

**Camera Unavailable:**
- ExecutionException: Logs error, silently fails
- InterruptedException: Logs error, silently fails
- No user-facing error (may confuse users)

**Recommendation for React Native:**
- Show error dialog if camera fails to initialize
- Provide troubleshooting guidance
- Check if another app is using camera

### 8.6 Data Parsing Errors

**JSON Parse Failures:**
```java
try {
  reg = new JSONObject(intent.getStringExtra("reg"));
  // ... parse fields
} catch (JSONException e) {
  Log.w("conferencescanner", "Failed to parse: " + e);
  FinishWithError("Failed to parse returned JSON");
}
```

**Invalid Conference Data:**
```java
// ParamManager.java - Validates on load
if (e.confname == null || e.baseurl == null || e.scantype == null) {
  Log.w("conferencescanner", "Invalid values, removing");
  iterator.remove();
}
```

### 8.7 State Management Edge Cases

**Screen Rotation:**
- Camera state preserved in `savedInstanceState`
- 100ms delay before restarting camera (timing issue workaround)
- Dialog state NOT preserved (dismissed on rotation)

**App Backgrounded:**
- Camera automatically released by lifecycle
- Conference selection preserved
- No automatic resume of scanning

**Process Death:**
- Conference list restored from SharedPreferences
- Last conference restored
- In-flight operations lost (no persistence)

### 8.8 Concurrent Scanning Prevention

**Pause Detection Flag:**
```java
private boolean pauseDetection = false;

public void OnQRCodeFound(String qrstring) {
  if (pauseDetection) return;  // Ignore
  pauseDetection = true;
  // Process...
}

// Reset on:
// - Dialog dismissed
// - Activity result received
// - Error occurred
```

**Race Condition:**
- ML Kit may detect multiple codes in one frame
- Loop processes all, but pauseDetection prevents issues
- First detected code processed, rest ignored

### 8.9 Missing Error Handling

**Potential Issues:**
1. No retry mechanism for transient network failures
2. No offline queue for failed operations
3. Camera initialization failures not shown to user
4. No validation that conference is still accessible before switching
5. No handling of token expiration
6. SharedPreferences corruption not recovered gracefully

**Recommendations for React Native:**
- Implement retry with exponential backoff
- Show actionable error messages
- Add connectivity status indicator
- Validate conference access on selection
- Handle token refresh if backend supports it

---

## 9. Technical Dependencies

### 9.1 Third-Party Libraries

**AndroidX Libraries:**
```gradle
androidx.appcompat:appcompat:1.6.0
androidx.legacy:legacy-support-v4:1.0.0
androidx.constraintlayout:constraintlayout:2.1.4
androidx.camera:camera-core:1.4.2
androidx.camera:camera-camera2:1.4.2
androidx.camera:camera-lifecycle:1.4.2
androidx.camera:camera-view:1.4.2
androidx.concurrent:concurrent-futures:1.1.0
```

**Material Design:**
```gradle
com.google.android.material:material:1.6.0
```

**Networking:**
```gradle
com.android.volley:volley:1.2.1
```
- HTTP client library (maintained by Google)
- Request queue management
- Request futures for synchronous calls
- Automatic retry and caching

**JSON Parsing:**
```gradle
com.google.code.gson:gson:2.8.6
```
- JSON serialization/deserialization
- Used for SharedPreferences persistence
- Type-safe conversion

**Barcode Scanning:**
```gradle
com.google.mlkit:barcode-scanning:17.3.0
```
- On-device ML-based barcode detection
- No internet required for scanning
- Supports QR codes

**Google Services:**
```gradle
classpath 'com.google.gms:google-services:4.4.2'
```
- Required for ML Kit integration
- Manages Google Play Services dependencies

**Testing:**
```gradle
junit:junit:4.13.2 (testImplementation)
androidx.test:runner:1.5.2 (androidTestImplementation)
```

### 9.2 Android Framework APIs

**Core APIs Used:**

**CameraX (androidx.camera):**
- Modern camera API
- Lifecycle-aware
- Preview and analysis use cases
- Automatic handling of camera rotation/configuration

**ML Kit Vision:**
- Barcode scanning without internet
- Real-time processing
- Multiple format support

**Volley (com.android.volley):**
- Network request queue
- Request prioritization
- Automatic scheduling
- Request futures for sync calls in background threads

**SharedPreferences:**
- Simple key-value storage
- Automatic backup
- Thread-safe access

**Intent/Deep Linking:**
- ACTION_VIEW intent handling
- Auto-verify App Links
- URI pattern matching

**AsyncTask:**
- Background thread execution
- UI thread result delivery
- Built-in cancel support

**Material Components:**
- NavigationView (drawer)
- Toolbar
- AlertDialog
- ProgressBar

### 9.3 Minimum SDK Implications

**minSdkVersion 23 (Android 6.0 - Marshmallow):**

**Supports:**
- ~98% of active Android devices (as of 2024)
- Runtime permissions model
- Modern material design
- CameraX library

**Requires:**
- Runtime permission requests
- HTTPS by default (can override)
- Doze mode battery optimization

**Does NOT Support:**
- Android 5.x (Lollipop) - 1.5% of devices
- Android 4.x (KitKat and below) - <1%

**Recommendation for React Native:**
- Keep minSdk 23 for similar device coverage
- React Native 0.72+ requires minSdk 23 anyway
- Simplifies permission handling

### 9.4 Gradle & Build System

**Gradle Version:** 8.7
**Android Gradle Plugin:** 8.5.1

**Build Features:**
```gradle
buildFeatures {
  buildConfig = true
}
```

**Lint Options:**
```gradle
lintOptions {
  checkReleaseBuilds false
}
```
- Disables lint checks on release builds
- Speeds up build process
- May miss potential issues

**ProGuard/R8:**
- Minification disabled (`minifyEnabled false`)
- No code obfuscation
- Faster builds, larger APK
- Easier debugging

**Java Version:**
```gradle
compileOptions {
  sourceCompatibility JavaVersion.VERSION_1_8
  targetCompatibility JavaVersion.VERSION_1_8
}
```
- Java 8 features (lambdas, streams)
- Modern syntax support

### 9.5 Dependency Update Recommendations

**Current Versions (as of analysis):**

**Potential Updates:**
- androidx.appcompat:appcompat:1.6.0 → 1.7.0+
- material:material:1.6.0 → 1.12.0+ (significant updates)
- gson:2.8.6 → 2.10.1 (security fixes)
- camera libraries are relatively current

**Breaking Changes to Watch:**
- Material Design 1.6 → 1.10+ (color system changes)
- Volley deprecated features in newer versions
- CameraX API stability

**For React Native Migration:**
- Won't use these Android-specific libraries
- Will use React Native equivalents:
  - Networking: Axios or fetch
  - Camera: react-native-vision-camera
  - QR: built-in or community library
  - Storage: AsyncStorage or MMKV
  - Navigation: React Navigation

---

## 10. Known Limitations & Technical Debt

### 10.1 Architecture Limitations

**AsyncTask Deprecation:**
- `AsyncTask` deprecated in Android 11 (API 30)
- Still works but Google recommends Kotlin coroutines or RxJava
- All network and IO operations use this pattern
- No crash risk, but considered legacy code

**Impact:**
- App still functions on Android 15
- Not following modern best practices
- Harder to maintain/extend

**Recommendation:**
- React Native avoids this entirely (JavaScript async/await)
- More modern pattern than AsyncTask

**No ViewModel/LiveData:**
- Traditional Activity-based architecture
- State not preserved across configuration changes
- No separation of UI and business logic

**Impact:**
- Screen rotation loses some state
- Harder to unit test
- Code duplication between similar screens

**No Repository Pattern:**
- API calls directly in Activity classes
- No data layer abstraction
- Difficult to mock for testing

### 10.2 Network & Offline Limitations

**No Offline Support:**
- All operations require active network
- No local queue for failed operations
- Can't check in attendees during network outage
- Only conference metadata cached

**Impact:**
- Wi-Fi failures at venue = app unusable
- No graceful degradation
- Lost check-ins if network drops during operation

**No Retry Logic:**
- Single attempt per operation
- User must manually retry on failure
- No exponential backoff

**No Request Cancellation:**
- AsyncTask can be cancelled, but not implemented
- Background requests continue even after user navigates away
- Potential memory leaks (weak reference pattern not used)

**Fixed 10-Second Timeout:**
- May be too short for poor connections
- May be too long for good connections
- Not configurable per operation type

### 10.3 Security Considerations

**Token Security:**
- Tokens stored in plain text (SharedPreferences)
- Backed up to Google account by default
- No encryption
- No token expiration handling
- No token refresh mechanism

**Cleartext Traffic Enabled:**
```xml
android:usesCleartextTraffic="true"
```
- Allows HTTP connections
- Man-in-the-middle vulnerability
- Should be disabled for production

**No Certificate Pinning:**
- Trusts system certificate store
- Vulnerable to certificate authority compromise
- No additional validation of server certificates

**Recommendation:**
- Implement secure storage (EncryptedSharedPreferences)
- Disable cleartext in production builds
- Consider token expiration/refresh
- Implement certificate pinning for known domains

### 10.4 Error Handling Gaps

**Silent Failures:**
- Camera initialization errors logged but not shown to user
- JSON parse errors sometimes swallowed
- SharedPreferences corruption returns empty list

**Generic Error Messages:**
- "Network error" doesn't distinguish between:
  - No internet connection
  - DNS failure
  - Server down
  - Timeout
  - Invalid response

**No Error Reporting:**
- No crash reporting (Crashlytics, Sentry, etc.)
- Developers unaware of production issues
- No analytics on error frequency

**Recommendation:**
- Integrate crash reporting (React Native: Sentry, Crashlytics)
- Implement error categorization
- Provide actionable error messages
- Add connectivity check before operations

### 10.5 UI/UX Limitations

**No Loading States:**
- Progress bar shows "something is happening"
- Doesn't show what or how long
- No progress percentage
- No cancellation option

**No Empty States:**
- No guidance when conference list is empty
- No visual for "no statistics available"

**No Success Confirmation:**
- Some operations succeed silently
- Toast messages easy to miss
- No persistent success indicator

**Screen Rotation Issues:**
- 100ms delay workaround for camera restart
- Dialogs dismissed on rotation
- In-progress operations lost

**No Accessibility Features:**
- No content descriptions
- No TalkBack testing
- No large text support
- No high contrast mode

**No Haptic Feedback:**
- No vibration on successful scan
- No audio cues
- Could improve confidence in scan success

### 10.6 Data Management Limitations

**No Data Validation:**
- Trusts server responses completely
- No schema validation
- No type checking beyond Java types
- Malformed data can crash app

**No Cache Invalidation:**
- Conference metadata never refreshed
- Stale data if conference details change
- Only removal is manual deletion

**No Conflict Resolution:**
- Multiple devices can check in same attendee
- No optimistic concurrency control
- Last write wins (server-side)

**No Data Export:**
- Can't export conference list
- Can't backup/restore outside Google backup
- No sharing between users

### 10.7 Testing Gaps

**No Unit Tests:**
- JUnit dependency present but no tests written
- No test coverage

**No Integration Tests:**
- No API mocking
- No end-to-end test scenarios

**No UI Tests:**
- No Espresso tests
- No screenshot tests
- Manual testing only

**Impact:**
- Regression risk on changes
- No confidence in refactoring
- Difficult to validate fixes

**Recommendation for React Native:**
- Jest for unit tests
- React Native Testing Library for component tests
- Detox or Appium for E2E tests
- Mock API responses for testing

### 10.8 Performance Considerations

**Camera Frame Processing:**
- Every frame sent to ML Kit
- No throttling mechanism
- Battery drain during continuous scanning
- Could limit to 1 frame per second

**Image Analysis Backpressure:**
- STRATEGY_KEEP_ONLY_LATEST drops frames
- Good for performance
- May miss rapidly presented QR codes

**Main Thread Operations:**
- JSON parsing on main thread (in AsyncTask callbacks)
- Dialog creation on main thread
- Could cause jank on slow devices

**Memory Management:**
- No explicit bitmap recycling
- Relies on garbage collection
- Camera frames handled by CameraX

### 10.9 Scalability Limitations

**Conference List:**
- Linear search through conferences
- No indexing or search
- List view doesn't virtualize well at scale
- Performance degrades with 100+ conferences

**Statistics Display:**
- All statistics loaded at once
- No pagination
- Large datasets could crash app
- JSON parsing blocking

**API Response Size:**
- No response size limits
- No pagination for search results
- All search results loaded at once

### 10.10 Recommendations for React Native Migration

**High Priority Fixes:**
1. Implement proper error handling with user-friendly messages
2. Add offline support with operation queue
3. Use secure storage for tokens
4. Implement retry logic with exponential backoff
5. Add crash reporting and analytics
6. Improve accessibility support

**Architecture Improvements:**
1. Use React Context/Redux for state management
2. Implement repository pattern for data access
3. Separate business logic from UI components
4. Use async/await instead of callbacks
5. Implement proper TypeScript types

**Security Enhancements:**
1. Disable cleartext traffic in production
2. Implement token encryption
3. Add certificate pinning
4. Implement token expiration handling
5. Add biometric authentication option

**UX Improvements:**
1. Add loading states with progress indication
2. Implement haptic/audio feedback on scan
3. Add empty states with helpful guidance
4. Persist dialog state across rotation
5. Add success animations
6. Implement pull-to-refresh for conference list

**Testing Infrastructure:**
1. Set up Jest for unit tests
2. Mock API layer for testing
3. Implement E2E tests with Detox
4. Add visual regression testing
5. Set up CI/CD pipeline

---

## Appendix A: File Structure Reference

```
android-PGConfScanner/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/eu/postgresql/android/conferencescanner/
│   │   │   │   ├── MainActivity.java
│   │   │   │   ├── AttendeeCheckinActivity.java
│   │   │   │   ├── ListConferencesActivity.java
│   │   │   │   ├── CheckinStatsActivity.java
│   │   │   │   ├── QRAnalyzer.java
│   │   │   │   ├── ScanType.java
│   │   │   │   ├── TokenType.java
│   │   │   │   ├── api/
│   │   │   │   │   ├── ApiBase.java
│   │   │   │   │   ├── CheckinApi.java
│   │   │   │   │   ├── SponsorApi.java
│   │   │   │   │   └── CheckinFieldApi.java
│   │   │   │   └── params/
│   │   │   │       ├── ConferenceEntry.java
│   │   │   │       └── ParamManager.java
│   │   │   ├── res/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── activity_main.xml
│   │   │   │   │   ├── app_bar_main.xml
│   │   │   │   │   ├── content_main.xml
│   │   │   │   │   ├── nav_header_main.xml
│   │   │   │   │   ├── activity_attendee_checkin.xml
│   │   │   │   │   ├── activity_list_conferences.xml
│   │   │   │   │   ├── activity_checkin_stats.xml
│   │   │   │   │   ├── item_checkin.xml
│   │   │   │   │   ├── item_conference.xml
│   │   │   │   │   ├── stats_group.xml
│   │   │   │   │   └── stats_item.xml
│   │   │   │   ├── menu/
│   │   │   │   │   ├── activity_main_drawer.xml
│   │   │   │   │   ├── checkin.xml
│   │   │   │   │   ├── sponsor.xml
│   │   │   │   │   └── checkinfield.xml
│   │   │   │   ├── values/
│   │   │   │   │   ├── strings.xml
│   │   │   │   │   ├── colors.xml
│   │   │   │   │   └── styles.xml
│   │   │   │   ├── xml/
│   │   │   │   │   └── backup_rules.xml
│   │   │   │   ├── drawable/
│   │   │   │   └── mipmap-*/
│   │   │   └── AndroidManifest.xml
│   │   └── test/ (empty)
│   └── build.gradle
├── build.gradle
├── settings.gradle
├── gradle.properties
├── gradle/wrapper/
├── docs/
│   └── workflow.md
├── privacy.md
└── LICENSE
```

---

## Appendix B: API Endpoint Summary

| Endpoint | Method | Purpose | Scan Types |
|----------|--------|---------|------------|
| `/api/status/` | GET | Get conference info, active status, admin flag | All |
| `/api/lookup/?lookup={qr}` | GET | Get attendee details by QR code | All |
| `/api/search/?search={term}` | GET | Search attendees by name/email | Check-in only |
| `/api/store/` | POST | Perform check-in or store badge scan | All |
| `/api/stats/` | GET | Get check-in statistics | Check-in only (admin) |

**POST Parameters:**
- Check-in: `token={qrcode}`
- Sponsor: `token={qrcode}&note={text}`
- Field: `token={qrcode}`

---

## Appendix C: QR Code Token Formats

| Scan Type | Token Prefix | QR Content Example | URL Format |
|-----------|--------------|-------------------|------------|
| Check-in | ID | `ID$abc123def456...$ID` | `https://domain/t/id/token/` |
| Sponsor Badge | AT | `AT$abc123def456...$AT` | `https://domain/t/at/token/` |
| Field Check-in | AT | `AT$abc123def456...$AT` | `https://domain/t/at/token/` |
| Test Check-in | ID | `ID$TESTTESTTESTTEST$ID` | N/A |
| Test Badge | AT | `AT$TESTTESTTESTTEST$AT` | N/A |

---

## Appendix D: SharedPreferences Schema

**File:** `conferences.xml`

**Keys:**
- `confs` (String): JSON array of ConferenceEntry objects
- `lastbase` (String): Base URL of last selected conference

**ConferenceEntry JSON:**
```json
{
  "confname": "PGConf.EU 2025",
  "baseurl": "https://www.postgresql.eu/events/pgconfeu2025/checkin/abc123...",
  "scantype": "CHECKIN",
  "fieldname": "T-Shirt Pickup"
}
```

---

## Appendix E: Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #008577 | Toolbar, branding |
| Primary Dark | #00574B | Status bar |
| Accent | #D81B60 | Buttons, highlights (non-alert) |
| Alert Red | #FF0000 | Highlighted fields |

---

## Appendix F: React Native Migration Checklist

### Core Functionality
- [ ] QR code scanning (react-native-vision-camera + ML Kit or equivalent)
- [ ] Camera permission handling (iOS + Android)
- [ ] Deep linking (React Navigation deep links)
- [ ] Conference management (CRUD operations)
- [ ] Network API integration (Axios/fetch)
- [ ] Local storage (AsyncStorage/MMKV)
- [ ] Search functionality
- [ ] Statistics display

### UI Components
- [ ] Navigation drawer (React Navigation Drawer)
- [ ] Conference list with selection
- [ ] Attendee detail view
- [ ] Statistics expandable list
- [ ] Loading states
- [ ] Error dialogs
- [ ] Success feedback
- [ ] Camera preview overlay

### Platform-Specific
- [ ] Android deep link configuration
- [ ] iOS universal links configuration
- [ ] Android back button handling
- [ ] iOS safe area handling
- [ ] Push notification setup (future)

### Non-Functional Requirements
- [ ] Offline support with operation queue
- [ ] Retry logic with exponential backoff
- [ ] Secure token storage (react-native-keychain)
- [ ] Crash reporting (Sentry)
- [ ] Analytics (Firebase/custom)
- [ ] Accessibility (screen reader support)
- [ ] Haptic feedback
- [ ] Audio cues
- [ ] Dark mode support

### Testing
- [ ] Unit tests (Jest)
- [ ] Component tests (React Native Testing Library)
- [ ] E2E tests (Detox)
- [ ] API mocking layer
- [ ] CI/CD pipeline

### Performance
- [ ] Code splitting
- [ ] Image optimization
- [ ] List virtualization (FlatList)
- [ ] Memory leak prevention
- [ ] Battery optimization (camera usage)

### Security
- [ ] HTTPS enforcement
- [ ] Certificate pinning
- [ ] Token encryption
- [ ] Secure storage
- [ ] Biometric authentication (optional)

### 5-Year Device Support
- [ ] iOS 13+ support (covers last 5 years)
- [ ] Android 6+ support (already in place)
- [ ] Responsive layouts for various screen sizes
- [ ] Tablet optimization
- [ ] Foldable device support
- [ ] Notch/Dynamic Island handling

---

## Document Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-08 | Initial comprehensive analysis | Claude Code |

---

**End of Document**
