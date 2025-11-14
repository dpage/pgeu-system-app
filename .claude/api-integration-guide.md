# pgeu-system API Integration Guide

**Purpose:** Detailed reference for backend API integration in React Native rewrite

> **Note:** The React Native app will NOT include offline mode. All API calls require active network connectivity.

---

## API Base URL Structure

Each conference has a unique base URL that includes the authentication token:

```
Check-in:
https://{domain}/events/{eventname}/checkin/{token}/

Sponsor Badge:
https://{domain}/events/sponsor/scanning/{token}/

Field Check-in:
https://{domain}/events/{eventname}/checkin/{token}/f{fieldId}/
```

The token is embedded in the URL path, not as a query parameter or header.

---

## Authentication Mechanism

**Method:** URL-based token authentication

- No separate login endpoint
- No username/password
- No OAuth/JWT
- Token is part of the base URL path
- All API calls append `/api/{endpoint}` to base URL

**Example:**
```
Base URL: https://postgresql.eu/events/pgconfeu2025/checkin/abc123def456/
API Call:  https://postgresql.eu/events/pgconfeu2025/checkin/abc123def456/api/status/
```

---

## Endpoint Specifications

### 1. Conference Status

**Purpose:** Get conference metadata and verify access

```http
GET {baseurl}/api/status/

Response (Check-in):
{
  "confname": "PGConf.EU 2025",
  "user": "magnus",              // Scanner username
  "active": true,                // Check-in currently open?
  "admin": false                 // Can view statistics?
}

Response (Sponsor):
{
  "confname": "PGConf.EU 2025",
  "sponsorname": "MegaCorp Inc",
  "scanner": "sponsor_user",
  "active": true,
  "admin": false
}

Response (Field):
{
  "confname": "PGConf.EU 2025",
  "fieldname": "T-Shirt Pickup",
  "user": "magnus",
  "active": true,
  "admin": false
}
```

**When to Call:**
- When adding new conference (to get name)
- When selecting conference (to check if active)
- Periodically to detect status changes (recommended: every 60s if scanning screen active)

**Error Responses:**
- 403 Forbidden: Invalid token
- 404 Not Found: Conference/endpoint doesn't exist
- 500 Server Error: Backend issue

---

### 2. Attendee Lookup by QR Code

**Purpose:** Get attendee details from scanned QR code

```http
GET {baseurl}/api/lookup/?lookup={qrcode}

Query Parameters:
  lookup: Full QR code content (URL-encoded)
          Examples: "ID$abc123def456$ID"
                   "https://postgresql.eu/t/id/abc123def456/"

Response (Check-in):
{
  "reg": {
    "id": 12345,
    "name": "Magnus Hagander",
    "type": "Speaker",
    "company": "PostgreSQL Experts",
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
    "already": {
      "title": "Already checked in",
      "body": "Checked in at 2025-01-15 09:15 by John Doe"
    }
  }
}

Response (Sponsor Badge):
{
  "reg": {
    "name": "Magnus Hagander",
    "company": "PostgreSQL Experts",
    "country": "Sweden",
    "email": "magnus@example.com",
    "note": "Met at booth yesterday, follow up on enterprise features"
  }
}
```

**Field Descriptions:**

**Common Fields:**
- `name` (string): Full name
- `company` (string|null): Company name

**Check-in Specific:**
- `id` (number): Registration ID (required for check-in POST)
- `type` (string): Registration type (e.g., "Speaker", "Attendee", "Student")
- `tshirt` (string|null): T-shirt size
- `partition` (string|null): Queue partition letter
- `photoconsent` (string|null): Photo consent status
- `policyconfirmed` (string|null): When policy was confirmed
- `checkinmessage` (string|null): Special message for scanner
- `highlight` (array): Field names to highlight in UI (warnings/alerts)
- `additional` (array): List of additional options/purchases
- `already` (object|null): Present if already checked in
  - `title` (string): Display title
  - `body` (string): Details about previous check-in

**Sponsor Specific:**
- `email` (string): Attendee email
- `country` (string): Country name
- `note` (string): Previous note from this scanner (empty string if none)

**Error Responses:**
- 404 Not Found: QR code not valid for this conference
- 412 Precondition Failed: Check-in not open
- 403 Forbidden: Invalid token/permissions

**Implementation Notes:**
- URL-encode the `lookup` parameter
- `highlight` array indicates fields to show with visual prominence (e.g., red background)
- `already` object presence means attendee is already checked in
- For sponsors, `note` is per-scanner (each scanner has their own notes)

---

### 3. Attendee Search

**Purpose:** Find attendees by name/email when they don't have QR code

**Availability:** Check-in mode only (not sponsor or field scanning)

```http
GET {baseurl}/api/search/?search={term}

Query Parameters:
  search: Search term (URL-encoded)
          Searches: name, email, company

Response:
{
  "regs": [
    {
      // Same structure as "reg" object from lookup endpoint
      "id": 12345,
      "name": "Magnus Hagander",
      "type": "Speaker",
      // ... all other fields
    },
    {
      "id": 12346,
      "name": "Magnus Andresson",
      // ...
    }
  ]
}
```

**Implementation Notes:**
- Returns array of matching registrations
- Each item has same structure as lookup response
- May return 0 results (empty array)
- Present results to user for selection
- After selection, continue with normal check-in flow (use the `id` field)

---

### 4. Store Check-in / Badge Scan

**Purpose:** Confirm check-in or store badge scan with notes

```http
POST {baseurl}/api/store/

Headers:
  Content-Type: application/x-www-form-urlencoded

Body (Check-in):
token={qrcode}

Body (Sponsor):
token={qrcode}&note={user_notes}

Body (Field Check-in):
token={qrcode}

Response (Check-in):
{
  // Same structure as lookup response, with updated state
  "reg": {
    "id": 12345,
    "name": "Magnus Hagander",
    // ... all fields
    "already": {
      "title": "Already checked in",
      "body": "Checked in just now by You"
    }
  }
}

Response (Sponsor):
{
  // Success indicator (exact structure may vary)
  "success": true
}

Response (Field):
{
  "success": true
}
```

**Parameters:**
- `token`: The full QR code content (same as passed to lookup)
- `note`: Free text note (sponsor only, can contain newlines)

**Error Responses:**
- 412 Precondition Failed: Check-in closed OR already checked in
- 403 Forbidden: Invalid permissions
- 404 Not Found: Invalid token

**Implementation Notes:**
- For check-in, response includes updated attendee info
- Can display this to confirm successful check-in
- For sponsor, note replaces any previous note from this scanner
- Notes are per-scanner, per-attendee
- Newlines in notes should be preserved

---

### 5. Check-in Statistics

**Purpose:** View check-in progress (admin only)

**Availability:** Check-in mode only, when `admin: true` in status endpoint

```http
GET {baseurl}/api/stats/

Response:
[
  [
    ["Registration Type", "Checked In", "Total"],  // Group header
    [
      ["Speaker", "15", "18"],
      ["Attendee", "120", "200"],
      ["Student", "8", "12"],
      [null, "143", "230"]  // Summary row (null col1 = bold)
    ]
  ],
  [
    ["By Hour", "Count", ""],
    [
      ["08:00-09:00", "45", ""],
      ["09:00-10:00", "68", ""],
      ["10:00-11:00", "30", ""]
    ]
  ],
  [
    ["T-Shirt Sizes", "Checked In", "Total"],
    [
      ["S", "12", "15"],
      ["M", "45", "60"],
      ["L", "60", "80"],
      ["XL", "20", "25"],
      [null, "137", "180"]
    ]
  ]
]
```

**Structure:**
- Array of groups
- Each group: `[header_row, [data_rows]]`
- Header row: Array of column titles
- Data rows: Array of arrays (column values)
- Summary rows: First column is `null` (should be displayed in bold)

**UI Recommendations:**
- Display as expandable/collapsible sections
- Header row shown when collapsed
- All rows shown when expanded
- Bold/highlight summary rows (where col1 is null)

---

## HTTP Client Configuration

### Timeouts

**Current Android App:**
- 10 seconds for all requests

**Recommendations for React Native:**
- Status check: 5 seconds
- Lookup: 10 seconds
- Store: 15 seconds (may involve database operations)
- Search: 10 seconds
- Statistics: 20 seconds (may be large dataset)

### Retry Policy

**Current Android App:**
- No automatic retry
- User must manually retry

**Recommendations:**
- Implement exponential backoff for transient failures
- Don't retry 4xx errors (client errors)
- Retry 5xx errors up to 3 times
- Retry network timeouts up to 2 times
- Show "Retry" button for failed operations

### Request Headers

**Current Android App:**
- Uses Volley defaults
- Content-Type: `application/x-www-form-urlencoded` for POST

**Recommended:**
```http
POST requests:
  Content-Type: application/x-www-form-urlencoded
  User-Agent: PGPGConfScanner/2.0.0 (iOS|Android)

GET requests:
  User-Agent: PGPGConfScanner/2.0.0 (iOS|Android)
```

### Error Handling

**HTTP Status Code Mapping:**

| Status | Meaning | User Message |
|--------|---------|--------------|
| 200 | Success | Process normally |
| 404 | Not found | "Attendee not found for this conference" |
| 412 | Precondition failed | Show server message (already checked in, closed, etc.) |
| 403 | Forbidden | "Access denied. Please check your conference registration." |
| 500 | Server error | "Server error. Please try again or contact support." |
| Timeout | Network timeout | "Request timed out. Check your connection and try again." |
| Network error | No connection | "No internet connection. Please check your network." |

**Response Body on Error:**
- For 412/403, server may return plain text error message in body
- Parse and display to user
- Fallback to generic message if body is empty/unparseable

---

## API Testing

### Test Tokens

**Check-in Test Code:**
```
ID$TESTTESTTESTTEST$ID
```

**Sponsor/Field Test Code:**
```
AT$TESTTESTTESTTEST$AT
```

**Expected Behavior:**
- Lookup should recognize as test code
- Should return test attendee data OR
- Should show "Test code scanned successfully" message
- Should NOT actually store check-in

### Mock API Responses

For development without backend access:

**Status Endpoint:**
```json
{
  "confname": "Test Conference 2025",
  "user": "testuser",
  "active": true,
  "admin": true
}
```

**Lookup Endpoint (Check-in):**
```json
{
  "reg": {
    "id": 1,
    "name": "Test User",
    "type": "Attendee",
    "company": "Test Corp",
    "tshirt": "M",
    "partition": "A",
    "photoconsent": "Photos OK",
    "policyconfirmed": null,
    "checkinmessage": null,
    "highlight": [],
    "additional": ["Workshop A", "Training B"]
  }
}
```

**Lookup Endpoint (Sponsor):**
```json
{
  "reg": {
    "name": "Test User",
    "company": "Test Corp",
    "country": "United States",
    "email": "test@example.com",
    "note": ""
  }
}
```

---

## Offline Support Strategy

**Current App:** No offline support

**Recommended for React Native:**

### 1. Queue Failed Operations
```typescript
interface PendingOperation {
  id: string;
  type: 'checkin' | 'sponsor_scan';
  baseurl: string;
  token: string;
  note?: string;
  timestamp: number;
  retryCount: number;
}
```

### 2. Background Sync
- Store failed operations in local queue
- Retry when connectivity restored
- Show pending operations count in UI
- Allow manual retry/cancel

### 3. Optimistic Updates
- Show success UI immediately
- Queue operation for background sync
- Revert if sync fails
- Show conflict resolution UI if needed

---

## Security Considerations

### HTTPS Enforcement

**Current App:** Allows HTTP (`usesCleartextTraffic="true"`)

**Recommendation:**
- Production: HTTPS only
- Development: Allow HTTP for localhost/test servers
- Implement certificate pinning for known domains

### Token Storage

**Current App:** Plain text in SharedPreferences

**Recommendation:**
- iOS: Keychain (react-native-keychain)
- Android: EncryptedSharedPreferences (react-native-keychain)
- Never log tokens
- Clear tokens on app uninstall

### Request Logging

**Don't Log:**
- Full URLs (contain tokens)
- Request/response bodies (may contain PII)

**Safe to Log:**
- HTTP method
- Relative endpoint (/api/status/)
- Status code
- Response time
- Error types (not messages)

---

## Rate Limiting

**Unknown from current app** - likely handled server-side

**Defensive Measures:**
- Implement client-side request throttling
- Max 1 request per second per endpoint type
- Debounce rapid scans (500ms)
- Cache status endpoint (60s TTL)

---

## Future API Enhancements

**Not currently implemented, may be valuable:**

### Token Refresh
```http
POST {baseurl}/api/refresh/
Response: { "newBaseUrl": "..." }
```

### Batch Operations
```http
POST {baseurl}/api/batch/
Body: [
  { "operation": "checkin", "token": "..." },
  { "operation": "checkin", "token": "..." }
]
```

### Websocket for Real-time Updates
```
wss://{domain}/events/{event}/ws/{token}/
Messages: { "type": "checkin_status_changed", "active": false }
```

### Push Notifications
- Conference opening/closing
- System messages
- Statistics updates

---

## Appendix: Complete Type Definitions

**TypeScript interfaces for API responses:**

```typescript
// Status endpoint
interface StatusResponse {
  confname: string;
  user?: string;        // Check-in and field
  scanner?: string;     // Sponsor
  sponsorname?: string; // Sponsor
  fieldname?: string;   // Field
  active: boolean;
  admin: boolean;
}

// Lookup/Search common
interface RegistrationBase {
  name: string;
  company?: string | null;
}

// Check-in registration
interface CheckinRegistration extends RegistrationBase {
  id: number;
  type: string;
  tshirt?: string | null;
  partition?: string | null;
  photoconsent?: string | null;
  policyconfirmed?: string | null;
  checkinmessage?: string | null;
  highlight: string[];
  additional: string[];
  already?: {
    title: string;
    body: string;
  };
}

// Sponsor registration
interface SponsorRegistration extends RegistrationBase {
  email: string;
  country: string;
  note: string;
}

// Lookup response
interface LookupResponse<T = CheckinRegistration | SponsorRegistration> {
  reg: T;
}

// Search response
interface SearchResponse {
  regs: CheckinRegistration[];
}

// Statistics
type StatRow = (string | null)[];
type StatGroup = [StatRow, StatRow[]];
type StatsResponse = StatGroup[];

// Store response
interface StoreResponse {
  success?: boolean;
  reg?: CheckinRegistration;
}
```

---

**End of API Integration Guide**
