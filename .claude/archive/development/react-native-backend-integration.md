# React Native Backend Integration Guide

**Quick Reference for React Native Development**
**Backend:** pgeu-system (Django)
**Date:** 2025-11-08

> **Note:** The React Native app will NOT include offline mode. All API calls require active network connectivity.

## Critical Backend Behaviors

### 1. Authentication Model

**No session cookies, no JWT - Token-based via URL**

```javascript
// All auth is in the URL path
const API_URLS = {
  checkin: {
    status: `/events/${confname}/checkin/${regtoken}/api/status/`,
    lookup: `/events/${confname}/checkin/${regtoken}/api/lookup/`,
    search: `/events/${confname}/checkin/${regtoken}/api/search/`,
    store: `/events/${confname}/checkin/${regtoken}/api/store/`,
    stats: `/events/${confname}/checkin/${regtoken}/api/stats/`,
  },
  field: {
    status: `/events/${confname}/checkin/${regtoken}/f${fieldname}/api/status/`,
    lookup: `/events/${confname}/checkin/${regtoken}/f${fieldname}/api/lookup/`,
    store: `/events/${confname}/checkin/${regtoken}/f${fieldname}/api/store/`,
  },
  sponsor: {
    status: `/events/sponsor/scanning/${scannertoken}/api/status/`,
    lookup: `/events/sponsor/scanning/${scannertoken}/api/lookup/`,
    store: `/events/sponsor/scanning/${scannertoken}/api/store/`,
  },
};
```

**CSRF is disabled** - No CSRF token needed in requests

### 2. Token Formats

**Three token types you'll work with:**

```javascript
// 1. regtoken - Check-in processor authentication
const regtoken = "a1b2c3d4e5f6..."; // 64 hex chars

// 2. idtoken - Attendee ID badge (for check-in)
const idtoken = "x1y2z3a4b5c6..."; // 64 hex chars
const idTokenURL = `https://domain.com/t/id/${idtoken}/`;

// 3. publictoken - Attendee public badge (for scanning)
const publictoken = "p1q2r3s4t5u6..."; // 64 hex chars
const publicTokenURL = `https://domain.com/t/at/${publictoken}/`;

// 4. scannertoken - Sponsor scanner authentication
const scannertoken = "m1n2o3p4q5r6..."; // 64 hex chars
```

**Parse scanned QR codes:**

```javascript
const parseQRCode = (scannedData) => {
  // ID token (check-in)
  const idMatch = scannedData.match(/\/t\/id\/([a-z0-9]+)\//);
  if (idMatch) {
    return {
      type: 'id',
      token: idMatch[1],
      fullURL: scannedData,
    };
  }

  // Public token (badge scan)
  const atMatch = scannedData.match(/\/t\/at\/([a-z0-9]+)\//);
  if (atMatch) {
    return {
      type: 'at',
      token: atMatch[1],
      fullURL: scannedData,
    };
  }

  // Test token
  if (scannedData.includes('TESTTESTTESTTEST')) {
    return {
      type: 'test',
      token: 'TESTTESTTESTTEST',
      fullURL: scannedData,
    };
  }

  return null; // Invalid QR code
};
```

### 3. Critical Backend Quirks

**Quirk 1: Sponsor lookup CREATES the scan**

```javascript
// WARNING: lookup endpoint has side effects for sponsor scanning!
const response = await fetch(
  `/events/sponsor/scanning/${scannertoken}/api/lookup/?lookup=${tokenURL}`
);
// ^ This already creates a ScannedAttendee record

// The store endpoint only updates the note
await fetch(`/events/sponsor/scanning/${scannertoken}/api/store/`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `token=${tokenURL}&note=${encodeURIComponent(note)}`,
});
```

**Quirk 2: Backend accepts both full URL and short token**

```javascript
// Both work:
api.lookup(`https://domain.com/t/id/abc123.../`); // Full URL
api.lookup(`abc123...`); // Just the token

// Recommendation: Always send full URL for clarity
api.lookup(`${SITEBASE}/t/id/${token}/`);
```

**Quirk 3: Check-in active flag doesn't block status endpoint**

```javascript
// This always works (even if checkinactive=false)
await api.status();

// These fail with HTTP 412 if checkinactive=false
await api.lookup(token);
await api.store(token);

// Therefore: Always check status.active before enabling scan
```

**Quirk 4: Field scanning uses public token, not ID token**

```javascript
// Regular check-in uses ID token
const idToken = parseQRCode(scan); // type: 'id'
await checkinAPI.lookup(idToken.fullURL);

// Field scanning uses public (AT) token
const publicToken = parseQRCode(scan); // type: 'at'
await fieldAPI.lookup(publicToken.fullURL);

// Scanner must scan DIFFERENT QR code for field vs check-in!
```

### 4. Response Patterns

**Status response (all APIs):**

```typescript
interface StatusResponse {
  user: string; // Username
  name: string; // Full name (may include sponsor name)
  active: boolean; // Check-in is active
  activestatus: string; // Human-readable message
  confname: string; // Conference name
  admin: boolean; // Is admin (check-in only)
  fieldname?: string; // Field name (field API only)
  sponsorname?: string; // Sponsor name (sponsor API only)
  scanner?: string; // Scanner username (sponsor API only)
}
```

**Registration object (check-in/field):**

```typescript
interface Registration {
  id: number;
  name: string;
  type: string; // Registration type name
  company: string;
  tshirt: string | null;
  additional: string[]; // Additional option names
  token: string; // The scanned token
  highlight: string[]; // Fields to highlight in UI
  photoconsent?: string; // "Photos OK" | "Photos NOT OK"
  policyconfirmed?: string; // "Policy confirmed" | "Policy NOT confirmed"
  checkinmessage?: string; // Important message
  partition?: string; // Queue partition
  already?: {
    title: string;
    body: string;
  };
}
```

**Sponsor registration object (simpler):**

```typescript
interface SponsorRegistration {
  name: string;
  company: string;
  country: string;
  email: string;
  note: string; // Sponsor's note about this attendee
  token: string;
  highlight: string[]; // Always empty for sponsor scans
}
```

**Store response:**

```typescript
interface StoreResponse {
  reg: Registration | SponsorRegistration;
  message: string; // Success message
  showfields?: boolean; // true for check-in, false for sponsor
}
```

### 5. Error Handling Strategy

**HTTP Status Codes:**

```javascript
const handleAPIError = async (response) => {
  const text = await response.text();

  switch (response.status) {
    case 404:
      // Attendee not found, invalid token, or invalid field name
      return {
        type: 'not_found',
        message: 'Attendee not found or invalid QR code',
      };

    case 403:
      // Permission denied or privacy restriction
      if (text.includes('badge scanning')) {
        return {
          type: 'privacy',
          message: 'Attendee has not authorized badge scanning',
        };
      }
      if (text.includes('canceled')) {
        return {
          type: 'canceled',
          message: 'Attendee registration is canceled',
        };
      }
      return {
        type: 'permission',
        message: 'Permission denied',
      };

    case 412:
      // Precondition failed
      if (text === 'Check-in not open') {
        return {
          type: 'inactive',
          message: 'Check-in is not currently active',
        };
      }
      if (text === 'Already checked in.') {
        return {
          type: 'duplicate',
          message: 'This attendee is already checked in',
        };
      }
      return {
        type: 'precondition',
        message: text,
      };

    case 500:
      return {
        type: 'server',
        message: 'Server error - please try again',
      };

    default:
      return {
        type: 'unknown',
        message: `Unexpected error (${response.status})`,
      };
  }
};
```

**Network errors:**

```javascript
const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 10 seconds');
    }

    throw error;
  }
};
```

### 6. Request Formatting

**GET requests (lookup, search, status):**

```javascript
// Status
const statusURL = `${baseURL}/api/status/`;
const response = await fetch(statusURL);

// Lookup
const lookupURL = `${baseURL}/api/lookup/?lookup=${encodeURIComponent(tokenURL)}`;
const response = await fetch(lookupURL);

// Search
const searchURL = `${baseURL}/api/search/?search=${encodeURIComponent(query)}`;
const response = await fetch(searchURL);
```

**POST requests (store):**

```javascript
// Check-in store
const response = await fetch(`${baseURL}/api/store/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: `token=${encodeURIComponent(tokenURL)}`,
});

// Sponsor store (with note)
const response = await fetch(`${baseURL}/api/store/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: `token=${encodeURIComponent(tokenURL)}&note=${encodeURIComponent(note)}`,
});

// Note: Backend expects form-urlencoded, NOT JSON!
```

### 7. UI Helpers

**Highlight important fields:**

```javascript
const FieldRow = ({ label, value, highlight }) => {
  const style = highlight ? styles.highlighted : styles.normal;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={style}>{value}</Text>
    </View>
  );
};

// Usage
<FieldRow
  label="Policy Confirmed"
  value={reg.policyconfirmed}
  highlight={reg.highlight.includes('policyconfirmed')}
/>;
```

**Show "already" warnings:**

```javascript
const showAlreadyWarning = (already) => {
  Alert.alert(already.title, already.body, [
    { text: 'OK', style: 'default' },
  ]);
};

// In lookup response handler
if (reg.already) {
  showAlreadyWarning(reg.already);
}
```

**Format check-in message:**

```javascript
const CheckinMessage = ({ message }) => {
  // Messages can have double newlines
  const paragraphs = message.split('\n\n');

  return (
    <View style={styles.messageBox}>
      {paragraphs.map((para, i) => (
        <Text key={i} style={styles.paragraph}>
          {para}
        </Text>
      ))}
    </View>
  );
};
```

### 8. Statistics Handling (Admin Only)

**Response structure:**

```javascript
// Stats response is array of tables
const stats = [
  [
    ['Header1', 'Header2', 'Header3'], // Headers
    [
      ['Row1Col1', 'Row1Col2', 'Row1Col3'], // Row 1
      ['Row2Col1', 'Row2Col2', 'Row2Col3'], // Row 2
    ],
  ],
  // ... more tables
];
```

**Render tables:**

```javascript
const StatsTable = ({ headers, rows }) => (
  <View style={styles.table}>
    <View style={styles.headerRow}>
      {headers.map((h, i) => (
        <Text key={i} style={styles.headerCell}>
          {h}
        </Text>
      ))}
    </View>
    {rows.map((row, i) => (
      <View key={i} style={styles.row}>
        {row.map((cell, j) => (
          <Text key={j} style={styles.cell}>
            {cell}
          </Text>
        ))}
      </View>
    ))}
  </View>
);

const StatsScreen = ({ stats }) => (
  <ScrollView>
    {stats.map(([headers, rows], i) => (
      <StatsTable key={i} headers={headers} rows={rows} />
    ))}
  </ScrollView>
);
```

### 9. Caching Strategy

**Status caching:**

```javascript
class StatusCache {
  constructor(ttl = 5 * 60 * 1000) {
    // 5 minute TTL
    this.ttl = ttl;
    this.cache = new Map();
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
  }
}

const statusCache = new StatusCache();

const getStatus = async (baseURL) => {
  const cached = statusCache.get(baseURL);
  if (cached) return cached;

  const response = await fetch(`${baseURL}/api/status/`);
  const data = await response.json();

  statusCache.set(baseURL, data);
  return data;
};
```

**Don't cache store operations:**

```javascript
// Never cache POST requests
const store = async (baseURL, token, note) => {
  // Always fresh
  const response = await fetch(`${baseURL}/api/store/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: note
      ? `token=${encodeURIComponent(token)}&note=${encodeURIComponent(note)}`
      : `token=${encodeURIComponent(token)}`,
  });

  return await response.json();
};
```

### 10. Search Implementation

**Debouncing:**

```javascript
import { useEffect, useState, useCallback } from 'react';
import { debounce } from 'lodash';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${baseURL}/api/search/?search=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      setResults(data.regs);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((q) => performSearch(q), 300),
    []
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name..."
      />
      {loading && <ActivityIndicator />}
      <FlatList
        data={results}
        renderItem={({ item }) => <RegistrationRow reg={item} />}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};
```

**Backend search behavior:**

```javascript
// Backend splits on whitespace and matches each part against firstname OR lastname
// Example: "john doe"
//   Matches: "John Doe", "Doe, John"
//   Logic: (firstname ICONTAINS 'john' OR lastname ICONTAINS 'john')
//         AND (firstname ICONTAINS 'doe' OR lastname ICONTAINS 'doe')

// Therefore, order doesn't matter:
search('john doe'); // Same as search('doe john')
```

### 11. Offline Handling

**Detect network status:**

```javascript
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  return isConnected;
};

// Usage
const ScannerScreen = () => {
  const isConnected = useNetworkStatus();

  if (!isConnected) {
    return <OfflineMessage />;
  }

  return <ScannerView />;
};
```

**Queue operations (optional but recommended):**

```javascript
class OperationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async add(operation) {
    this.queue.push(operation);
    await this.process();
  }

  async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const op = this.queue[0];

      try {
        await op.execute();
        this.queue.shift(); // Remove on success
      } catch (error) {
        if (error.message.includes('network')) {
          // Network error - stop processing, retry later
          break;
        } else {
          // Other error - remove from queue
          this.queue.shift();
        }
      }
    }

    this.processing = false;
  }
}

const queue = new OperationQueue();

// Queue check-in
queue.add({
  execute: async () => {
    await fetch(`${baseURL}/api/store/`, {
      method: 'POST',
      body: `token=${token}`,
    });
  },
});
```

### 12. Development & Testing

**Test token:**

```javascript
const TEST_TOKEN = 'TESTTESTTESTTEST';
const testIDToken = `${SITEBASE}/t/id/${TEST_TOKEN}/`;
const testPublicToken = `${SITEBASE}/t/at/${TEST_TOKEN}/`;

// Backend returns plain text for test tokens
const response = await fetch(testIDToken);
const text = await response.text();
// "You have successfully scanned the test token."

// Use for testing scanner without database changes
```

**Environment config:**

```javascript
// .env.development
SITEBASE = 'http://localhost:8000';

// .env.staging
SITEBASE = 'https://staging.postgresql.eu';

// .env.production
SITEBASE = 'https://www.postgresql.eu';

// Usage
import Constants from 'expo-constants';

const SITEBASE = Constants.expoConfig.extra.sitebase;
```

**Mock responses for development:**

```javascript
const MOCK_RESPONSES = {
  status: {
    user: 'test_user',
    name: 'Test User',
    active: true,
    activestatus: 'Check-in active',
    confname: 'Test Conference 2025',
    admin: true,
  },
  lookup: {
    reg: {
      id: 123,
      name: 'Test Attendee',
      type: 'Conference Attendee',
      company: 'Test Corp',
      tshirt: 'L',
      additional: [],
      token: 'test123',
      highlight: [],
    },
  },
  search: {
    regs: [
      {
        id: 123,
        name: 'Test Attendee 1',
        type: 'Conference Attendee',
        company: 'Test Corp',
        tshirt: 'L',
        additional: [],
        token: 'test123',
        highlight: [],
      },
    ],
  },
};

const useMockAPI = __DEV__ && !process.env.USE_REAL_API;

const api = {
  status: async () => {
    if (useMockAPI) return MOCK_RESPONSES.status;
    const response = await fetch(`${baseURL}/api/status/`);
    return await response.json();
  },
  // ... other methods
};
```

### 13. Common Pitfalls

**Pitfall 1: Forgetting to URL-encode**

```javascript
// WRONG
const url = `${baseURL}/api/lookup/?lookup=${token}`;

// RIGHT
const url = `${baseURL}/api/lookup/?lookup=${encodeURIComponent(token)}`;

// Especially important when token is a full URL with slashes
```

**Pitfall 2: Using JSON instead of form data**

```javascript
// WRONG
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token }),
});

// RIGHT
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `token=${encodeURIComponent(token)}`,
});
```

**Pitfall 3: Scanning wrong token type**

```javascript
// Check-in requires ID token (t/id/)
const idScan = parseQRCode(data);
if (idScan.type !== 'id') {
  Alert.alert('Wrong QR Code', 'Please scan the ID badge (blue QR code)');
  return;
}

// Field/sponsor requires public token (t/at/)
const publicScan = parseQRCode(data);
if (publicScan.type !== 'at') {
  Alert.alert('Wrong QR Code', 'Please scan the badge (red QR code)');
  return;
}
```

**Pitfall 4: Not checking check-in active**

```javascript
// Always check before scanning
const status = await api.status();

if (!status.active && scanType === 'checkin') {
  Alert.alert('Check-in Not Active', status.activestatus);
  return;
}

// Sponsor scanning doesn't require active flag
```

**Pitfall 5: Expecting JSON from test token**

```javascript
// Test token returns plain text, not JSON
const response = await fetch(testTokenURL);

if (scannedToken === 'TESTTESTTESTTEST') {
  const text = await response.text(); // Not response.json()!
  Alert.alert('Test Successful', text);
}
```

### 14. Complete API Client Example

```javascript
// api.js
class PGEUAPIClient {
  constructor(baseURL, authToken, authType = 'regtoken') {
    this.baseURL = baseURL;
    this.authToken = authToken;
    this.authType = authType; // 'regtoken' or 'scannertoken'
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetchWithTimeout(url, options, 10000);

      if (!response.ok) {
        const error = await handleAPIError(response);
        throw error;
      }

      // Test token returns text
      if (endpoint.includes('TESTTESTTESTTEST')) {
        return await response.text();
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async status() {
    return await this.request('/api/status/');
  }

  async lookup(tokenURL) {
    return await this.request(
      `/api/lookup/?lookup=${encodeURIComponent(tokenURL)}`
    );
  }

  async search(query) {
    return await this.request(
      `/api/search/?search=${encodeURIComponent(query)}`
    );
  }

  async store(tokenURL, note = '') {
    const body = note
      ? `token=${encodeURIComponent(tokenURL)}&note=${encodeURIComponent(
          note
        )}`
      : `token=${encodeURIComponent(tokenURL)}`;

    return await this.request('/api/store/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
  }

  async stats() {
    return await this.request('/api/stats/');
  }
}

// Usage
const checkinAPI = new PGEUAPIClient(
  `${SITEBASE}/events/${confname}/checkin/${regtoken}`,
  regtoken,
  'regtoken'
);

const fieldAPI = new PGEUAPIClient(
  `${SITEBASE}/events/${confname}/checkin/${regtoken}/f${fieldname}`,
  regtoken,
  'regtoken'
);

const sponsorAPI = new PGEUAPIClient(
  `${SITEBASE}/events/sponsor/scanning/${scannertoken}`,
  scannertoken,
  'scannertoken'
);

// Make requests
const status = await checkinAPI.status();
const lookup = await checkinAPI.lookup(tokenURL);
const result = await checkinAPI.store(tokenURL);
```

---

## Quick Checklist

Before implementing the React Native app, ensure you understand:

- [ ] Token types (regtoken, idtoken, publictoken, scannertoken)
- [ ] URL-based authentication (no cookies/JWT)
- [ ] CSRF is disabled (no CSRF token needed)
- [ ] Sponsor lookup has side effects (creates scan record)
- [ ] Backend accepts full URL or short token form
- [ ] Check-in active flag doesn't block status endpoint
- [ ] Field scanning uses public token (not ID token)
- [ ] Form-urlencoded POST body (not JSON)
- [ ] Test token returns plain text (not JSON)
- [ ] Highlight array usage for UI emphasis
- [ ] "already" object for duplicate warnings
- [ ] Error codes (404, 403, 412, 500)
- [ ] Network timeout handling
- [ ] Offline queue strategy
- [ ] Status caching (5 min)
- [ ] Search debouncing (300ms)
- [ ] Statistics are admin-only
- [ ] Scanner fields are comma-separated in config
- [ ] Privacy consent (badgescan flag)
- [ ] Registration validation (payconfirmed, not canceled)

---

**Reference:** See `/Users/dpage/git/pgeu-system-app/.claude/backend-scanner-api-analysis.md` for complete backend analysis.
