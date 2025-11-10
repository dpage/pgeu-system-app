# Week 3 Camera Setup - Quick Start Guide

**Quick Reference:** Step-by-step implementation guide for camera setup

## Prerequisites

- Weeks 1-2 completed (Auth, Conference Management, Deep Linking)
- React Native 0.82.1 running
- Physical devices available for testing (camera doesn't work well in emulators)

---

## Quick Implementation Steps

### Step 1: Install Dependencies (15 minutes)

```bash
# Install camera and permission packages
npm install react-native-vision-camera@3.9.2 \
  vision-camera-code-scanner@0.2.2 \
  react-native-permissions@4.1.5 \
  react-native-reanimated@3.10.1

# iOS - Install native dependencies
cd ios && pod install && cd ..
```

### Step 2: Configure iOS (15 minutes)

**Edit `/ios/PGConfScanner/Info.plist`:**

Add before closing `</dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required to scan attendee QR codes for conference check-in and badge scanning.</string>
```

**Edit `/ios/Podfile`:**

Add after `use_react_native!` block:

```ruby
# Camera permissions
permissions_path = '../node_modules/react-native-permissions/ios'
pod 'Permission-Camera', :path => "#{permissions_path}/Camera"
```

Then run:

```bash
cd ios && pod install && cd ..
```

### Step 3: Configure Android (15 minutes)

**Edit `/android/app/src/main/AndroidManifest.xml`:**

Add after `<manifest>` tag:

```xml
<!-- Camera permission -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Camera feature -->
<uses-feature
    android:name="android.hardware.camera"
    android:required="true" />
<uses-feature
    android:name="android.hardware.camera.autofocus"
    android:required="false" />
```

**Verify `/android/app/build.gradle`:**

Ensure minimum SDK version:

```gradle
android {
    defaultConfig {
        minSdkVersion 30  // Android 11
    }
}
```

### Step 4: Create Permission Service (30 minutes)

**Create `/src/services/permissions/CameraPermissionService.ts`:**

See full implementation in main document. Key methods:

- `checkPermission()` - Check current permission status
- `requestPermission()` - Request camera permission
- `showRationaleAndRequest()` - Android-friendly flow

**Create `/src/hooks/useCameraPermission.ts`:**

Custom hook for components to use camera permissions.

### Step 5: Create QR Parser (30 minutes)

**Create `/src/utils/qrParser.ts`:**

```typescript
export function parseQRToken(value: string): TokenParseResult {
  // Parse ID$ format: ID$<64 hex>$ID
  // Parse AT$ format: AT$<64 hex>$AT
  // Parse URL format: https://.../t/id/<64 hex>/
  // Return { valid, token, tokenType, error, rawValue }
}
```

**Create `/src/utils/__tests__/qrParser.test.ts`:**

Write tests for all token formats.

### Step 6: Create Camera Components (2 hours)

**File structure:**

```
src/components/camera/
├── CameraView.tsx          # Main camera component
├── PermissionPrompt.tsx    # Permission request UI
└── ScanOverlay.tsx         # Viewfinder overlay
```

**Create `/src/components/camera/CameraView.tsx`:**

```typescript
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

export function CameraView({ isActive, onCodeScanned }) {
  const device = useCameraDevice('back');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes[0]?.value) {
        onCodeScanned(codes[0].value);
      }
    },
  });

  return (
    <Camera
      device={device}
      isActive={isActive}
      codeScanner={codeScanner}
    />
  );
}
```

**Create `/src/components/camera/PermissionPrompt.tsx`:**

UI for requesting camera permission.

**Create `/src/components/camera/ScanOverlay.tsx`:**

Overlay with viewfinder and instructions.

### Step 7: Create Scanner Screen (1 hour)

**Create `/src/screens/ScannerScreen.tsx`:**

```typescript
export function ScannerScreen({ mode }) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isActive, setIsActive] = useState(false);

  useFocusEffect(() => {
    setIsActive(true);
    return () => setIsActive(false);
  });

  const handleCodeScanned = (code) => {
    const result = parseQRToken(code);
    if (result.valid) {
      // Process scan (Week 4 integration)
    }
  };

  if (!hasPermission) {
    return <PermissionPrompt onRequestPermission={requestPermission} />;
  }

  return <CameraView isActive={isActive} onCodeScanned={handleCodeScanned} />;
}
```

### Step 8: Add to Navigation (15 minutes)

**Edit `/src/navigation/RootNavigator.tsx`:**

Add ScannerScreen to navigation stack.

### Step 9: Test on Physical Devices (1 hour)

**iOS:**

```bash
npm run ios
```

**Android:**

```bash
npm run android
```

**Test checklist:**

- [ ] Camera permission prompt appears
- [ ] Camera opens and displays preview
- [ ] QR codes are detected
- [ ] Scan overlay displays correctly
- [ ] Settings navigation works when permission blocked

### Step 10: Add Error Handling (30 minutes)

**Create `/src/services/error/CameraErrorHandler.ts`:**

Error types and handlers for camera errors.

---

## File Checklist

By end of Week 3, you should have:

### Services (2 files)

- [ ] `/src/services/permissions/CameraPermissionService.ts`
- [ ] `/src/services/error/CameraErrorHandler.ts`

### Hooks (1 file)

- [ ] `/src/hooks/useCameraPermission.ts`

### Components (3 files)

- [ ] `/src/components/camera/CameraView.tsx`
- [ ] `/src/components/camera/PermissionPrompt.tsx`
- [ ] `/src/components/camera/ScanOverlay.tsx`

### Screens (1 file)

- [ ] `/src/screens/ScannerScreen.tsx`

### Utils (2 files)

- [ ] `/src/utils/qrParser.ts`
- [ ] `/src/utils/__tests__/qrParser.test.ts`

### Types (1 file)

- [ ] `/src/types/scan.ts` (ScanMode, TokenType, etc.)

### Configuration (4 files modified)

- [ ] `/ios/PGConfScanner/Info.plist` (camera permission)
- [ ] `/ios/Podfile` (camera permission pod)
- [ ] `/android/app/src/main/AndroidManifest.xml` (camera permission)
- [ ] `/android/app/build.gradle` (verify minSdk)

---

## Testing Commands

```bash
# Run unit tests
npm test

# Run specific test file
npm test qrParser.test.ts

# Run with coverage
npm test -- --coverage

# iOS on device
npm run ios -- --device

# Android on device
npm run android
```

---

## Sample QR Codes for Testing

Generate at https://www.qr-code-generator.com/

**ID Token (Attendee Check-in):**
```
ID$abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890$ID
```

**AT Token (Sponsor/Field):**
```
AT$1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef$AT
```

**URL Format:**
```
https://postgresql.eu/t/id/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890/
```

---

## Common Issues

**Camera view is black:**
- Check permission granted
- Verify device has camera
- Check `isActive={true}`
- Test on physical device (not emulator)

**QR codes not detected:**
- Verify code scanner configured
- Check QR code quality
- Ensure good lighting
- Test with known-good QR code

**Build fails (iOS):**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

**Build fails (Android):**
```bash
cd android
./gradlew clean
cd ..
```

**Permission prompt doesn't show:**
- Check Info.plist/AndroidManifest
- Verify permission not already blocked
- Delete app and reinstall

---

## Next Steps (Week 4)

Once camera scanning works:

1. Integrate with API lookup endpoint
2. Show attendee details on scan
3. Implement check-in confirmation
4. Add scan history
5. Handle already-checked-in scenarios
6. Add network error handling

---

## Support

For detailed implementation:
- See `/Users/dpage/git/pgeu-system-app/.claude/react-native/week3-camera-implementation.md`
- Vision Camera docs: https://react-native-vision-camera.com/
- Permissions docs: https://github.com/zoontek/react-native-permissions

---

**Estimated Total Time:** 6-8 hours for core implementation + 2-3 hours for testing and polish

**Success Criteria:**
- Camera opens on both platforms
- QR codes are detected
- All token formats parsed correctly
- Permission flow works
- No deprecated APIs used
