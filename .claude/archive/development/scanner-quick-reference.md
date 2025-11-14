# Scanner Quick Reference Card

**Quick lookup for camera scanner implementation**

---

## QR Code Formats

```
ID Token (Check-in):    ID$<64-hex-chars>$ID
AT Token (Badge):       AT$<64-hex-chars>$AT
Test ID:                ID$TESTTESTTESTTEST$ID
Test AT:                AT$TESTTESTTESTTEST$AT

URL Format:
ID: https://{domain}/t/id/{token}/
AT: https://{domain}/t/at/{token}/
```

---

## Scan Mode → Token Type Mapping

| Scan Mode | Expected Token | Token Origin | Search Available? |
|-----------|---------------|--------------|-------------------|
| Check-in Processing | ID (idtoken) | Ticket/Registration | Yes |
| Sponsor Badge Scanning | AT (publictoken) | Physical Badge | No |
| Field Check-in | AT (publictoken) | Physical Badge | No |

---

## Token Validation Regex

```typescript
// URL format
const tokenRegex = new RegExp(
  `^${protocol}://${host}/t/(id|at)/([a-z0-9]+|TESTTESTTESTTEST)/$`
);

// Simple format
const simpleTokenRegex = /^(ID|AT)\$([a-z0-9]+|TESTTESTTESTTEST)\$(ID|AT)$/;
```

---

## Error Messages by HTTP Status

| Status | Title | Message |
|--------|-------|---------|
| 404 | Attendee not found | The scanned code does not appear to be a valid attendee of this conference. |
| 412 | Not ready for scan | [Server message - check-in not open] |
| 403 | Scanning failed | [Server message - access denied] |
| 500+ | Network error | Server returned error: {status} |
| No Response | Network error | No internet connection |

---

## Wrong Token Type Error

```
Title: "{badge/ticket} scanned"

Message: "You have scanned a {badge/ticket}. For {current mode},
you must scan the {expected type}, not the {scanned type}."

Example: "You have scanned a badge. For Check-in processing,
you must scan the ticket, not the badge."
```

---

## Scanner State Machine

```
STOPPED → (Start Camera Button) → STARTING
         ↓ (permission granted)
      ACTIVE ← (Dialog Dismissed) ← PAUSED
         ↓ (QR detected)              ↑
         ↓ (API call starts)          ↑
      PAUSED → (Dialog shown) ────────┘
         ↓ (Navigate to details)
      STOPPED
```

---

## Pause Detection Rules

**Set pauseDetection = true when:**
- API lookup starts
- Error dialog shown
- Success dialog shown
- Navigating to attendee details

**Reset pauseDetection = false when:**
- Dialog dismissed (OK button tapped)
- User cancels attendee details
- User returns to scanner screen

---

## Camera Lifecycle

**Start Camera:**
1. Check permission → Request if needed
2. Verify conference selected
3. Update button text: "Stop camera"
4. Show viewfinder
5. Start frame processing

**Stop Camera:**
1. Stop frame processing
2. Hide viewfinder
3. Update button text: "Start camera"
4. Reset pauseDetection

**Auto-stop triggers:**
- Navigation to attendee details
- Conference deselected
- App backgrounded (optional)

---

## API Endpoint Format

```
Base URL: {baseurl}
All endpoints: {baseurl}/api/{endpoint}

Status:  GET {baseurl}/api/status/
Lookup:  GET {baseurl}/api/lookup/?lookup={qrcode}
Search:  GET {baseurl}/api/search/?search={term}
Store:   POST {baseurl}/api/store/
```

---

## Intro Text by Mode

**Check-in (open):**
"Welcome to check-in processing! Start the camera and scan attendee tickets (ID$ codes) to check them in. You can also search by name."

**Check-in (closed):**
"Check-in processing is not currently open. You can search for attendees below, but not check them in."

**Sponsor (open):**
"Scan attendee badges (AT$ codes) to record sponsor booth visits. Notes can be added after scanning."

**Sponsor (closed):**
"Badge scanning is not currently open. Please contact the organizers."

**Field (open):**
"Scan attendee badges (AT$ codes) for {fieldName} field check-in."

**Field (closed):**
"Field check-in for {fieldName} is not currently open."

---

## Test Token Behavior

When `TESTTESTTESTTEST` detected:
- Show success dialog
- Do NOT call API
- Message: "You have successfully scanned a test code!"
- Set pauseDetection = true
- Reset when dialog dismissed

---

## Duplicate Prevention

**Primary Method:** `pauseDetection` flag
- Set true on first scan of frame
- Blocks all subsequent scans until reset

**Optional Enhancement:** Recent scan tracking
- Track scanned codes with timestamp
- Ignore if scanned within 2 seconds
- Prevents rapid re-scans after resuming

---

## UI Dimensions (Android Reference)

```
Camera Preview: Square (1:1 aspect ratio)
              : 16dp margin left/right
              : Centered vertically

Intro Text:   18sp font size
              : 8dp margin all sides
              : Multi-line, wrap content

Buttons:      64dp height
              : 18sp font size
              : 8dp margin all sides
              : Full width

Search Button: Only visible for CHECKIN mode
             : Only enabled when active=true
             : Positioned above scan button
```

---

## Haptic Feedback (Recommended)

```typescript
Success: Vibration.vibrate(50);              // Short, single
Error:   Vibration.vibrate([0, 100, 50, 100]); // Double pulse
```

---

## Common Pitfalls

1. **Forgetting to URL-encode QR code in lookup parameter**
   ```typescript
   // Wrong
   axios.get(`${baseurl}/api/lookup/?lookup=${qrcode}`)

   // Right
   axios.get(`${baseurl}/api/lookup/`, { params: { lookup: qrcode } })
   ```

2. **Not resetting pauseDetection on dialog dismiss**
   - Scanning will be permanently disabled
   - Always reset in dialog onDismiss handler

3. **Processing all codes in multi-code frame**
   - ML Kit returns ALL codes in frame
   - pauseDetection should block after first valid code

4. **Not stopping camera on navigation**
   - Battery drain
   - Memory leak
   - Always stop when navigating away

5. **Wrong token validation logic**
   - Must check BOTH format AND type
   - Must match against conference's expected type
   - Test tokens bypass type check

---

## Testing Checklist

- [ ] Test ID$ token in check-in mode (success)
- [ ] Test AT$ token in check-in mode (error)
- [ ] Test AT$ token in sponsor mode (success)
- [ ] Test ID$ token in sponsor mode (error)
- [ ] Test TESTTESTTESTTEST tokens (both types)
- [ ] Test URL format tokens
- [ ] Test non-conference QR code (error)
- [ ] Test arbitrary QR code (error)
- [ ] Test network failure (error handling)
- [ ] Test 404 response (not found)
- [ ] Test 412 response (not open)
- [ ] Test rapid scanning (duplicate prevention)
- [ ] Test multiple codes in frame
- [ ] Test permission denied
- [ ] Test poor lighting
- [ ] Test flashlight toggle

---

## Dependencies

```bash
npm install react-native-vision-camera vision-camera-code-scanner

# Permissions
Android: CAMERA in AndroidManifest.xml
iOS: NSCameraUsageDescription in Info.plist
```

---

## File References

**Full Guide:** `/Users/dpage/git/pgeu-system-app/.claude/camera-scanner-implementation-guide.md`

**API Details:** `/Users/dpage/git/pgeu-system-app/.claude/api-integration-guide.md`

**Android Source:**
- MainActivity.java (scanner logic)
- QRAnalyzer.java (ML Kit integration)
- ConferenceEntry.java (token validation)
- ApiBase.java (API client)

---

**Last Updated:** 2025-11-08
