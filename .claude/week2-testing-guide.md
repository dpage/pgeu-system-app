# Week 2 Testing Guide

## Manual Testing Checklist

### URL Parser Testing

Test various URL formats to ensure parsing works correctly:

```typescriptLet'
// Valid URLs to test
const testUrls = [
  // Check-in processor
  'https://eu.postgresql.org/events/pgconfeu2024/checkin/a'.repeat(64) + '/',

  // Field check-in
  'https://eu.postgresql.org/events/pgconfeu2024/checkin/a'.repeat(64) + '/fbreakfast/',

  // Sponsor scanner
  'https://eu.postgresql.org/events/sponsor/scanning/a'.repeat(64) + '/',
];

// Invalid URLs (should show errors)
const invalidUrls = [
  'https://example.com', // No conference path
  'https://eu.postgresql.org/events/test/checkin/abc/', // Token too short
  '', // Empty
];
```

### Add Conference Flow

1. **Launch app** → Should see "No Conferences" empty state
2. **Tap "Add" button** → Modal opens with URL input
3. **Enter invalid URL** → Should show descriptive error
4. **Enter valid URL** → Should:
   - Show "Validating..." message
   - Call status API
   - Show success alert
   - Return to conference list
   - Display conference in list

### Conference List

1. **View list** → Should show:
   - Conference name
   - Type (Check-in Processor / Sponsor Scanner)
   - Last used date (if applicable)

2. **Tap conference** → Should:
   - Highlight selected conference
   - Show checkmark
   - Update last used timestamp

3. **Long-press conference** → Should:
   - Show delete confirmation alert
   - Option to cancel or delete
   - Remove from list if deleted

### Error Scenarios

1. **Network offline** → Should show network error message
2. **Invalid token** → Should show "Unauthorized" or "Invalid token"
3. **Server error** → Should show server error message
4. **Timeout** → Should retry then show timeout error

## Automated Testing

### Run All Tests

```bash
npm test
```

**Expected:** 25/25 tests passing

### Run Specific Test Suites

```bash
# URL parser tests
npm test -- src/utils/__tests__/urlParser.test.ts

# Screen tests
npm test -- src/screens/__tests__/

# App test
npm test -- __tests__/App.test.tsx
```

### Type Checking

```bash
npm run typecheck
```

**Expected:** No TypeScript errors

### Lint Checking

```bash
npm run lint
```

**Expected:** Only jest.setup.js warnings (acceptable)

### Fix Auto-Fixable Lint Issues

```bash
npm run lint:fix
```

## Device Testing

### iOS Simulator

```bash
npm run ios
```

**Test:**
1. App launches without crashes
2. Conference list renders
3. Add conference button works
4. Navigation smooth
5. Modals present correctly
6. Safe areas respected (notch devices)

### Android Emulator

```bash
npm run android
```

**Test:**
1. App launches without crashes
2. Conference list renders
3. Back button works correctly
4. Hardware back on modal dismisses it
5. StatusBar shows correctly

## API Testing with Mock Server

### Setup Mock Status Endpoint

Create a simple Express server for testing:

```javascript
const express = require('express');
const app = express();

app.get('/events/:conf/checkin/:token/api/status/', (req, res) => {
  res.json({
    user: 'testuser',
    name: 'Test User',
    active: true,
    activestatus: 'Check-in active',
    confname: 'Test Conference 2024',
    admin: false
  });
});

app.listen(3000, () => console.log('Mock server on :3000'));
```

### Test with Mock Server

```bash
# Start mock server
node mock-server.js

# Test URL (use local IP, not localhost on device)
http://192.168.1.100:3000/events/test/checkin/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/
```

## Performance Testing

### Measure Startup Time

```bash
# iOS
react-native run-ios --configuration Release

# Android
react-native run-android --variant=release
```

**Target:** App launches in < 2 seconds

### Memory Usage

Use React Native Debugger or Flipper to monitor:
- Initial memory: < 100MB
- Conference list with 10 items: < 120MB
- No memory leaks on navigation

## Edge Cases to Test

1. **Very long conference name** → Should truncate or wrap gracefully
2. **10+ conferences** → List should scroll smoothly
3. **Rapid navigation** → No crashes or race conditions
4. **Conference deletion while selected** → Should deselect
5. **App backgrounding during API call** → Should handle gracefully
6. **Keychain access denied** → Should show appropriate error

## Accessibility Testing

### iOS

1. Enable VoiceOver
2. Navigate through screens
3. Verify all buttons have labels
4. Verify proper focus order

### Android

1. Enable TalkBack
2. Navigate through screens
3. Verify all buttons have content descriptions
4. Verify proper focus order

## Common Issues & Solutions

### Issue: Tests fail with "TurboModuleRegistry" error

**Solution:** Check jest.setup.js has all native module mocks

### Issue: TypeScript errors in tests

**Solution:** Ensure mock store matches actual store interface

### Issue: Navigation not working in app

**Solution:**
1. Check gesture handler is imported first in index.js
2. Verify GestureHandlerRootView wraps app
3. Check NavigationContainer is present

### Issue: Keychain errors on iOS

**Solution:**
1. Reset simulator
2. Check keychain entitlements
3. Verify keychain-sharing capability

### Issue: URL parsing fails

**Solution:**
1. Check token is exactly 64 hex characters
2. Verify URL format matches regex patterns
3. Check for trailing/leading whitespace

## Test Data

### Valid Conference URLs

```
Check-in (PostgreSQL Europe):
https://eu.postgresql.org/events/pgconfeu2024/checkin/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef/

Field Check-in (Breakfast):
https://eu.postgresql.org/events/pgconfeu2024/checkin/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef/fbreakfast/

Sponsor Scanner:
https://eu.postgresql.org/events/sponsor/scanning/fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210/
```

### Test Token Generator

```javascript
// Generate valid test token
function generateTestToken() {
  return Array(64).fill(0).map(() =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

console.log(generateTestToken());
```

## Success Criteria

- [ ] All 25 automated tests pass
- [ ] TypeScript compiles with no errors
- [ ] App launches on iOS simulator
- [ ] App launches on Android emulator
- [ ] Can add conference with valid URL
- [ ] Can view conference list
- [ ] Can select conference
- [ ] Can delete conference
- [ ] Network errors show helpful messages
- [ ] Navigation works smoothly
- [ ] No console errors in development mode
- [ ] Safe area respected on iPhone with notch
- [ ] Back button works on Android

## Regression Testing for Week 3

When implementing camera in Week 3, verify:
- Conference management still works
- URL parsing unchanged
- Token storage remains secure
- Navigation doesn't break
- All Week 2 tests still pass
