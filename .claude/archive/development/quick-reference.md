# pgeu-system PGConf Scanner - Quick Reference

**Quick lookup guide for developers working on the Ionic + Capacitor migration**

> **Note:** The app will NOT include offline mode. All scanning operations require active network connectivity.

---

## App Summary

**What it does:** Conference attendee check-in and sponsor badge scanning via QR codes

**Current state:** Native Android app (Java), v1.5.4

**Target:** Ionic + Capacitor app for iOS 14+ and Android 11+ (API 30+)

---

## Core Features (Priority Order)

1. **QR Code Scanning** - Primary function
   - Check-in tickets (ID$ tokens)
   - Sponsor badges (AT$ tokens)
   - Field check-ins (AT$ tokens with field ID)

2. **Conference Management** - Multiple conferences
   - Add via deep link or manual URL
   - Switch between conferences
   - Delete conferences

3. **Attendee Lookup** - Two methods
   - QR code scan (all modes)
   - Text search (check-in only)

4. **Three Scanning Modes:**
   - Check-in: Confirm attendee entry
   - Sponsor: Capture badge with notes
   - Field: Specific event check-in (t-shirts, training, etc.)

5. **Statistics** - Check-in only, admin only
   - View check-in progress
   - Registration type breakdown
   - Time-based analytics

---

## Critical User Flows

### 1. Add Conference (First-time setup)
1. User clicks deep link in email
2. App opens, extracts URL
3. API call validates conference
4. Conference added to drawer menu
5. Auto-selected as current conference

### 2. Check-in Attendee (Primary workflow)
1. Select conference from drawer
2. Tap "Start Camera"
3. Grant camera permission (first time)
4. Point at ticket QR code
5. Review attendee details
6. Tap "Check in!"
7. Success message, camera resumes

### 3. Sponsor Badge Scan
1. Select sponsor conference
2. Start camera
3. Scan badge (AT$ token)
4. Review attendee info
5. Add/edit notes
6. Tap "Store scan"
7. Success, camera resumes

---

## API Quick Reference

**Base URL format:**
```
https://{domain}/events/{event}/checkin/{token}/
```

**Key endpoints:**
- `GET /api/status/` - Conference info, active status
- `GET /api/lookup/?lookup={qr}` - Attendee details
- `GET /api/search/?search={term}` - Search attendees
- `POST /api/store/` - Confirm check-in/scan
- `GET /api/stats/` - Statistics (admin only)

**Authentication:** Token embedded in base URL (no separate auth)

**Timeouts:** 10 seconds for all requests

**Error codes:**
- 404: Not found
- 412: Precondition failed (closed or already checked in)
- 403: Forbidden (invalid token)

---

## Technology Stack (Current Android)

**Core:**
- Java 8
- Min SDK 23 (Android 6.0)
- Target SDK 35 (Android 15)

**Key libraries:**
- CameraX 1.4.2 (camera)
- ML Kit Barcode 17.3.0 (QR detection)
- Volley 1.2.1 (networking)
- Gson 2.8.6 (JSON)
- Material Components 1.6.0 (UI)

**Architecture:**
- Activity-based
- AsyncTask for background work (deprecated but functional)
- SharedPreferences for storage
- No database

---

## Technology Stack (Ionic + Capacitor)

**Core:**
- Ionic Framework 8.x (React variant)
- Capacitor 6.x
- React 18.x
- TypeScript 5.0+

**Essential libraries:**
- @capacitor-community/barcode-scanner (QR scanning)
- @capacitor/preferences (settings storage)
- @capacitor/secure-storage-plugin (token storage)
- axios (networking)
- react-router-dom (navigation)
- Ionic components (UI)

---

## Data Models

### Conference
```typescript
{
  id: string;              // Generated locally
  confname: string;        // "PGConf.EU 2025"
  baseurl: string;         // Includes token
  scantype: 'CHECKIN' | 'SPONSORBADGE' | 'CHECKINFIELD';
  fieldname?: string;      // For CHECKINFIELD only
}
```

### Attendee (Check-in)
```typescript
{
  id: number;              // Server ID
  name: string;
  type: string;            // "Speaker", "Attendee", etc.
  company?: string;
  tshirt?: string;
  partition?: string;      // Queue partition
  photoconsent?: string;
  policyconfirmed?: string;
  checkinmessage?: string;
  highlight: string[];     // Field names to highlight
  additional: string[];    // Add-ons/options
  already?: {
    title: string;
    body: string;
  };
}
```

### Attendee (Sponsor)
```typescript
{
  name: string;
  company?: string;
  country: string;
  email: string;
  note: string;            // Editable by scanner
}
```

---

## QR Code Formats

### Check-in Ticket
```
ID$[40-char-hex-token]$ID
OR
https://{domain}/t/id/{token}/

Test: ID$TESTTESTTESTTEST$ID
```

### Sponsor/Field Badge
```
AT$[40-char-hex-token]$AT
OR
https://{domain}/t/at/{token}/

Test: AT$TESTTESTTESTTEST$AT
```

### Validation Pattern
```regex
^{protocol}://{host}/t/(id|at)/([a-z0-9]+|TESTTESTTESTTEST)/$
```

---

## Deep Link Patterns

### Supported Domains
- www.postgresql.eu
- postgresql.us
- www.pgevents.ca
- pgday.uk

### URL Patterns
```
Check-in:
/events/{event}/checkin/{token}/

Check-in field:
/events/{event}/checkin/{token}/f{fieldId}/

Sponsor:
/events/sponsor/scanning/{token}/
```

**Setup required:**
- iOS: Associated Domains + universal links
- Android: Intent filters + App Links verification

---

## UI/UX Patterns

### Colors
```
Primary: #008577 (PostgreSQL teal)
Primary Dark: #00574B
Accent: #D81B60
Alert: #FF0000 (highlighted fields)
```

### Screen Structure
1. **Main Screen**
   - Navigation drawer (conference selection)
   - Intro text (dynamic based on status)
   - Camera preview (1:1 square)
   - Search button (check-in only)
   - Start/Stop camera button

2. **Attendee Review**
   - Scrollable field list
   - Highlighted fields (red background)
   - Notes section (sponsor only)
   - Check-in/Store button
   - Cancel button

3. **Conference List**
   - Checkboxes for selection
   - Conference name + type
   - Delete selected button

4. **Statistics**
   - Expandable groups
   - Bold summary rows

### Feedback Patterns
- Progress spinner during API calls
- Alert dialogs for errors
- Toast messages for success
- Pause scanning during dialogs

---

## Known Limitations (Must Fix in RN)

### Critical
1. **No offline support** - All operations require network
2. **No retry logic** - Single attempt per operation
3. **Generic error messages** - Hard to troubleshoot
4. **Token security** - Stored in plain text

### Important
5. **AsyncTask deprecated** - Works but legacy
6. **No error reporting** - Crashes invisible to developers
7. **No accessibility features** - Not screen reader optimized
8. **Silent camera failures** - User not notified

### Nice to Have
9. **No haptic feedback** - Missing scan confirmation
10. **No dark mode** - Only light theme
11. **No large text support** - Accessibility issue
12. **No unit tests** - Regression risk

---

## Migration Priorities

### Phase 1: Core Functionality (Weeks 1-7)
- [x] Project setup
- [x] Conference management
- [x] QR scanning
- [x] Check-in flow
- [x] API integration

### Phase 2: Complete Features (Weeks 8-9)
- [x] Sponsor scanning
- [x] Field check-in
- [x] Search
- [x] Statistics

### Phase 3: Improvements (Weeks 10-11)
- [x] Offline support
- [x] Better error handling
- [x] Accessibility
- [x] Polish

### Phase 4: Release (Weeks 12-14)
- [x] Testing
- [x] Beta
- [x] Production

---

## Testing Checklist

### Must Test
- [x] QR scan accuracy (various lighting conditions)
- [x] Offline behavior (airplane mode during scan)
- [x] Already checked-in scenario
- [x] Wrong token type (badge for check-in)
- [x] Permission denied (camera)
- [x] Deep link from email
- [x] Screen rotation (maintain state)
- [x] Multiple conferences switching
- [x] Search with no results
- [x] Statistics display (large datasets)

### Device Coverage
- [x] iOS 14-17 (modern devices)
- [x] Android 11-14 (modern devices)
- [x] iPhone SE (small screen)
- [x] iPhone 15 Pro Max (large screen, Dynamic Island)
- [x] iPad (tablet)
- [x] Budget Android phone (performance)
- [x] Foldable device (if available)

---

## Performance Targets

| Metric | Target | Current Android |
|--------|--------|-----------------|
| App launch | < 2s | ~1.5s |
| QR detection | < 100ms | ~80ms |
| API response | < 3s | < 2s (good network) |
| Camera FPS | 60 | 30-60 |
| Scan success rate | > 98% | ~99% |
| Crash-free rate | > 99.5% | Unknown (no reporting) |
| Bundle size iOS | < 25MB | N/A |
| Bundle size Android | < 20MB | ~8MB |

---

## Support Domains

If asked to add new conference domain:

1. **iOS:** Add to Associated Domains capability
2. **Android:** Add intent-filter in AndroidManifest
3. **Server:** Add domain to App Links/Universal Links config
4. **Code:** Update deep link parsing logic

---

## Common Pitfalls to Avoid

1. **Don't log tokens** - They're in URLs, sanitize logs
2. **Don't cache attendee data** - Privacy + staleness issues
3. **Don't skip permission handling** - Required for camera
4. **Don't forget haptic feedback** - Critical UX for scanning
5. **Don't ignore offline mode** - Conferences often have poor WiFi
6. **Don't use plain text storage** - Tokens must be encrypted
7. **Don't forget test codes** - Users need to validate setup
8. **Don't block UI thread** - Keep all network calls async
9. **Don't ignore accessibility** - Required for App Store approval
10. **Don't skip error reporting** - Essential for production support

---

## Emergency Contacts (Reference)

**Backend API Issues:**
- Check pgeu-system repository issues
- Verify API endpoint hasn't changed
- Test with curl/Postman independently

**Camera Issues:**
- Verify permissions granted
- Check device camera works in other apps
- Review react-native-vision-camera docs

**Deep Linking Issues:**
- Verify server has assetlinks.json (Android) or apple-app-site-association (iOS)
- Test URL pattern matching
- Check intent filters/universal links config

---

## Quick Commands (Development)

```bash
# Run in browser
ionic serve

# Run on iOS
ionic capacitor run ios

# Run on Android
ionic capacitor run android

# Build for production
ionic build

# Sync native platforms
ionic capacitor sync

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Documentation References

**Comprehensive Analysis:**
- `/Users/dpage/git/pgeu-system-app/.claude/android-app-comprehensive-analysis.md`

**API Integration:**
- `/Users/dpage/git/pgeu-system-app/.claude/api-integration-guide.md`

**Backend Analysis:**
- `/Users/dpage/git/pgeu-system-app/.claude/backend-scanner-api-analysis.md` (Comprehensive backend deep-dive)
- `/Users/dpage/git/pgeu-system-app/.claude/react-native-backend-integration.md` (Quick integration guide)

**Migration Plan:**
- `/Users/dpage/git/pgeu-system-app/.claude/react-native-migration-plan.md`

**Original Android Source:**
- `/Users/dpage/git/android-PGConfScanner/`

**Backend Source Code:**
- `/Users/dpage/git/pgeu-system/` (Django backend)
- `/Users/dpage/git/pgeu-system/postgresqleu/confreg/checkin.py` (Check-in API)
- `/Users/dpage/git/pgeu-system/postgresqleu/confsponsor/scanning.py` (Sponsor API)

---

**Last Updated:** 2025-11-10

**Document Status:** Updated for Ionic + Capacitor migration (React Native attempt archived due to 0.76.9 JSC compatibility issues)
