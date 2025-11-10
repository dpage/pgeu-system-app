# Week 3: Camera Setup & QR Code Scanning - Implementation Plan

**Status:** Ready for Implementation
**React Native Version:** 0.82.1
**Target Platforms:** iOS 14+ and Android 11+ (API 30+)
**Duration:** 5 days

## Executive Summary

This document provides a complete implementation plan for Week 3 of the PGConf Scanner app development, focusing on camera setup, QR code scanning, and token format parsing. The implementation follows React Native best practices and uses only non-deprecated APIs.

## Table of Contents

1. [Required Dependencies](#required-dependencies)
2. [Platform-Specific Configuration](#platform-specific-configuration)
3. [Permission Handling Strategy](#permission-handling-strategy)
4. [Camera Architecture](#camera-architecture)
5. [QR Code Parsing](#qr-code-parsing)
6. [UI/UX Implementation](#uiux-implementation)
7. [Error Handling](#error-handling)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Testing Strategy](#testing-strategy)

---

## Required Dependencies

### Core Camera Dependencies

```json
{
  "dependencies": {
    "react-native-vision-camera": "^3.9.2",
    "vision-camera-code-scanner": "^0.2.2",
    "react-native-permissions": "^4.1.5",
    "react-native-reanimated": "^3.10.1"
  }
}
```

### Version Justification

**react-native-vision-camera 3.9.2:**
- Latest stable version compatible with RN 0.82.1
- Excellent performance (60fps frame processing)
- Frame processor support via Reanimated worklets
- Supports iOS 14+ and Android 11+ (API 30+)
- NOT deprecated (actively maintained)
- ML Kit integration via plugins

**vision-camera-code-scanner 0.2.2:**
- Official ML Kit plugin for Vision Camera
- Native QR/barcode scanning performance
- Multiple format support (QR, DataMatrix, etc.)
- No deprecated APIs

**react-native-permissions 4.1.5:**
- Unified permissions API for iOS and Android
- Type-safe with TypeScript
- Handles permission states correctly
- Works with iOS 14+ and Android 11+

**react-native-reanimated 3.10.1:**
- Required dependency for Vision Camera frame processors
- Provides worklet support for frame processing
- Already in use for navigation animations (likely)

### Installation Commands

```bash
# Install dependencies
npm install react-native-vision-camera@3.9.2 \
  vision-camera-code-scanner@0.2.2 \
  react-native-permissions@4.1.5 \
  react-native-reanimated@3.10.1

# iOS - Install pods
cd ios && pod install && cd ..

# Note: Android auto-links (no additional steps)
```

---

## Platform-Specific Configuration

### iOS Configuration

#### 1. Info.plist Updates

Add camera permission description to `/ios/PGConfScanner/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Existing keys... -->

  <!-- CAMERA PERMISSION - REQUIRED -->
  <key>NSCameraUsageDescription</key>
  <string>Camera access is required to scan attendee QR codes for conference check-in and badge scanning.</string>

  <!-- Optional: Photo Library (if implementing photo picker fallback) -->
  <key>NSPhotoLibraryUsageDescription</key>
  <string>Photo library access allows you to scan QR codes from saved images when the camera is unavailable.</string>

  <!-- Existing keys... -->
</dict>
</plist>
```

#### 2. Podfile Configuration

The Podfile should already handle Vision Camera via auto-linking, but verify:

```ruby
# ios/Podfile
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '14.0'  # Ensure iOS 14.0 minimum

target 'PGConfScanner' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true
  )

  # Vision Camera permissions
  permissions_path = '../node_modules/react-native-permissions/ios'
  pod 'Permission-Camera', :path => "#{permissions_path}/Camera"
  # Optional: Photo library permission
  # pod 'Permission-PhotoLibrary', :path => "#{permissions_path}/PhotoLibrary"

  post_install do |installer|
    react_native_post_install(installer)

    # Ensure iOS 14 deployment target
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0'
      end
    end
  end
end
```

#### 3. Enable Camera Background Mode (Optional)

Only if camera needs to work in background (likely not needed for scanner):

```xml
<!-- Info.plist -->
<key>UIBackgroundModes</key>
<array>
  <string>processing</string>
</array>
```

### Android Configuration

#### 1. AndroidManifest.xml Updates

Update `/android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- CAMERA PERMISSION - REQUIRED -->
    <uses-permission android:name="android.permission.CAMERA" />

    <!-- Internet permission (already present) -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Camera features (marks app as requiring camera in Play Store) -->
    <uses-feature
        android:name="android.hardware.camera"
        android:required="true" />
    <uses-feature
        android:name="android.hardware.camera.autofocus"
        android:required="false" />

    <application
      android:name=".MainApplication"
      android:label="@string/app_name"
      android:icon="@mipmap/ic_launcher"
      android:roundIcon="@mipmap/ic_launcher_round"
      android:allowBackup="false"
      android:theme="@style/AppTheme"
      android:usesCleartextTraffic="${usesCleartextTraffic}"
      android:supportsRtl="true">

      <activity
        android:name=".MainActivity"
        android:label="@string/app_name"
        android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
        android:launchMode="singleTask"
        android:windowSoftInputMode="adjustResize"
        android:screenOrientation="portrait"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity>
    </application>
</manifest>
```

#### 2. build.gradle Configuration

Ensure minimum SDK version in `/android/app/build.gradle`:

```gradle
android {
    compileSdkVersion 34
    buildToolsVersion "34.0.0"

    defaultConfig {
        applicationId "eu.postgresql.conferencescanner"
        minSdkVersion 30  // Android 11 minimum for this project
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"

        // Enable multidex if needed
        multiDexEnabled true
    }

    buildFeatures {
        buildConfig true
    }

    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### 3. ProGuard Rules

Add to `/android/app/proguard-rules.pro`:

```proguard
# React Native Vision Camera
-keep class com.mrousavy.camera.** { *; }
-keep class com.google.mlkit.vision.barcode.** { *; }

# React Native Permissions
-keep class com.zoontek.rnpermissions.** { *; }
```

---

## Permission Handling Strategy

### Permission Architecture

We'll use a service-based approach with a custom hook for component usage.

### Implementation Files

#### 1. Permission Service

**File:** `/src/services/permissions/CameraPermissionService.ts`

```typescript
import { Platform, Alert, Linking } from 'react-native';
import {
  request,
  check,
  PERMISSIONS,
  RESULTS,
  Permission,
  PermissionStatus,
} from 'react-native-permissions';

export type CameraPermissionResult = {
  granted: boolean;
  status: PermissionStatus;
  canRequest: boolean;
};

class CameraPermissionService {
  private getCameraPermission(): Permission {
    return Platform.select({
      ios: PERMISSIONS.IOS.CAMERA,
      android: PERMISSIONS.ANDROID.CAMERA,
    })!;
  }

  /**
   * Check current camera permission status without requesting
   */
  async checkPermission(): Promise<CameraPermissionResult> {
    const permission = this.getCameraPermission();
    const status = await check(permission);

    return {
      granted: status === RESULTS.GRANTED,
      status,
      canRequest: status === RESULTS.DENIED,
    };
  }

  /**
   * Request camera permission
   * @returns true if granted, false otherwise
   */
  async requestPermission(): Promise<boolean> {
    const permission = this.getCameraPermission();

    // Check current status first
    const currentStatus = await check(permission);

    // Already granted
    if (currentStatus === RESULTS.GRANTED) {
      return true;
    }

    // Blocked or unavailable - cannot request
    if (currentStatus === RESULTS.BLOCKED || currentStatus === RESULTS.UNAVAILABLE) {
      this.showSettingsDialog();
      return false;
    }

    // Request permission
    const result = await request(permission);

    if (result === RESULTS.BLOCKED) {
      this.showSettingsDialog();
      return false;
    }

    return result === RESULTS.GRANTED;
  }

  /**
   * Show dialog prompting user to open settings
   */
  private showSettingsDialog(): void {
    const title = 'Camera Permission Required';
    const message = Platform.select({
      ios: 'Camera access is required to scan QR codes. Please enable camera access in Settings > Privacy & Security > Camera.',
      android: 'Camera access is required to scan QR codes. Please enable camera access in Settings > Apps > Permissions.',
    }) || '';

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ],
      { cancelable: true }
    );
  }

  /**
   * Show rationale dialog before requesting permission (Android best practice)
   */
  async showRationaleAndRequest(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const { status, canRequest } = await this.checkPermission();

      if (status === RESULTS.DENIED && canRequest) {
        return new Promise((resolve) => {
          Alert.alert(
            'Camera Access',
            'This app needs camera access to scan attendee QR codes for check-in and badge scanning.',
            [
              {
                text: 'Not Now',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Allow',
                onPress: async () => {
                  const granted = await this.requestPermission();
                  resolve(granted);
                },
              },
            ],
            { cancelable: false }
          );
        });
      }
    }

    // iOS or already handled
    return this.requestPermission();
  }
}

export const cameraPermissionService = new CameraPermissionService();
```

#### 2. Custom Hook for Components

**File:** `/src/hooks/useCameraPermission.ts`

```typescript
import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { cameraPermissionService, CameraPermissionResult } from '@/services/permissions/CameraPermissionService';

export function useCameraPermission() {
  const [permissionState, setPermissionState] = useState<CameraPermissionResult>({
    granted: false,
    status: 'unavailable',
    canRequest: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const checkPermission = useCallback(async () => {
    setIsLoading(true);
    const result = await cameraPermissionService.checkPermission();
    setPermissionState(result);
    setIsLoading(false);
  }, []);

  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    const granted = await cameraPermissionService.showRationaleAndRequest();
    await checkPermission();
    setIsLoading(false);
    return granted;
  }, [checkPermission]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Re-check permission when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkPermission]);

  return {
    hasPermission: permissionState.granted,
    permissionStatus: permissionState.status,
    canRequest: permissionState.canRequest,
    isLoading,
    requestPermission,
    recheckPermission: checkPermission,
  };
}
```

---

## Camera Architecture

### Camera Component Structure

```
CameraScreen (Screen component)
  └── CameraView (Camera wrapper with lifecycle)
      ├── VisionCamera (react-native-vision-camera)
      ├── ScanOverlay (UI overlay with viewfinder)
      ├── ScanResultModal (Shows scan results)
      └── ManualEntryFallback (Manual token entry)
```

### Implementation Files

#### 1. Camera Screen

**File:** `/src/screens/ScannerScreen.tsx`

```typescript
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView } from '@/components/camera/CameraView';
import { PermissionPrompt } from '@/components/camera/PermissionPrompt';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { parseQRToken, TokenParseResult } from '@/utils/qrParser';
import type { ScanMode } from '@/types';

type Props = {
  mode: ScanMode; // 'checkin' | 'sponsor' | 'field'
};

export function ScannerScreen({ mode }: Props) {
  const { hasPermission, isLoading, requestPermission } = useCameraPermission();
  const [isActive, setIsActive] = useState(false);
  const [lastScannedToken, setLastScannedToken] = useState<string | null>(null);

  // Activate camera when screen is focused
  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
      };
    }, [])
  );

  const handleCodeScanned = useCallback((code: string) => {
    // Prevent duplicate scans
    if (code === lastScannedToken) {
      return;
    }

    setLastScannedToken(code);

    // Parse QR code
    const parseResult = parseQRToken(code);

    if (!parseResult.valid) {
      Alert.alert('Invalid QR Code', parseResult.error || 'This QR code is not recognized.');
      // Reset after delay to allow re-scanning
      setTimeout(() => setLastScannedToken(null), 2000);
      return;
    }

    // Validate token type matches scan mode
    if (!isTokenValidForMode(parseResult.tokenType, mode)) {
      Alert.alert(
        'Wrong Token Type',
        `This QR code is for ${parseResult.tokenType} but you are in ${mode} mode.`
      );
      setTimeout(() => setLastScannedToken(null), 2000);
      return;
    }

    // Process scan based on mode
    processScan(parseResult, mode);

    // Reset after processing
    setTimeout(() => setLastScannedToken(null), 3000);
  }, [lastScannedToken, mode]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return <PermissionPrompt onRequestPermission={requestPermission} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <CameraView
        isActive={isActive && hasPermission}
        onCodeScanned={handleCodeScanned}
        mode={mode}
      />
    </SafeAreaView>
  );
}

function isTokenValidForMode(tokenType: string, mode: ScanMode): boolean {
  switch (mode) {
    case 'checkin':
      return tokenType === 'ID';
    case 'sponsor':
    case 'field':
      return tokenType === 'AT';
    default:
      return false;
  }
}

function processScan(result: TokenParseResult, mode: ScanMode) {
  // TODO: Implement in Week 4
  // - Call lookup API with token
  // - Show attendee details
  // - Handle check-in/scan confirmation
  console.log('Scanned:', result, 'Mode:', mode);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

#### 2. Camera View Component

**File:** `/src/components/camera/CameraView.tsx`

```typescript
import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { ScanOverlay } from './ScanOverlay';
import type { ScanMode } from '@/types';

type Props = {
  isActive: boolean;
  onCodeScanned: (code: string) => void;
  mode: ScanMode;
};

export function CameraView({ isActive, onCodeScanned, mode }: Props) {
  const device = useCameraDevice('back');

  // Configure code scanner with debouncing
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: useCallback((codes) => {
      if (codes.length > 0 && codes[0].value) {
        onCodeScanned(codes[0].value);
      }
    }, [onCodeScanned]),
  });

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        codeScanner={codeScanner}
        enableZoomGesture={true}
      />
      <ScanOverlay mode={mode} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});
```

#### 3. Permission Prompt Component

**File:** `/src/components/camera/PermissionPrompt.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  onRequestPermission: () => Promise<boolean>;
};

export function PermissionPrompt({ onRequestPermission }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Camera Access Required</Text>
        <Text style={styles.description}>
          This app needs camera access to scan attendee QR codes for conference check-in and badge scanning.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onRequestPermission}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

#### 4. Scan Overlay Component

**File:** `/src/components/camera/ScanOverlay.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import type { ScanMode } from '@/types';

type Props = {
  mode: ScanMode;
};

const { width, height } = Dimensions.get('window');
const VIEWFINDER_SIZE = width * 0.7;

export function ScanOverlay({ mode }: Props) {
  const getModeInstructions = () => {
    switch (mode) {
      case 'checkin':
        return 'Scan attendee ID badge to check in';
      case 'sponsor':
        return 'Scan attendee badge for sponsor connection';
      case 'field':
        return 'Scan badge for field check-in';
      default:
        return 'Position QR code within frame';
    }
  };

  return (
    <View style={styles.overlay}>
      {/* Top overlay */}
      <View style={styles.topOverlay}>
        <Text style={styles.instructions}>{getModeInstructions()}</Text>
      </View>

      {/* Middle section with viewfinder */}
      <View style={styles.middleRow}>
        <View style={styles.sideOverlay} />
        <View style={styles.viewfinder}>
          {/* Corner markers */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <View style={styles.sideOverlay} />
      </View>

      {/* Bottom overlay */}
      <View style={styles.bottomOverlay}>
        <Text style={styles.hint}>Hold steady and ensure good lighting</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  middleRow: {
    flexDirection: 'row',
    height: VIEWFINDER_SIZE,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 12,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00FF00',
    borderWidth: 3,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  instructions: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  hint: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});
```

---

## QR Code Parsing

### Token Format Specification

According to the backend documentation, there are two token formats:

1. **ID$ Token (Attendee Check-in):**
   - Format: `ID$<64 hex chars>$ID`
   - Example: `ID$abc123def456...xyz$ID`
   - Used for: Attendee check-in

2. **AT$ Token (Public Token):**
   - Format: `AT$<64 hex chars>$AT`
   - Example: `AT$abc123def456...xyz$AT`
   - Used for: Sponsor scans and field check-ins

3. **Full URL Format (Alternative):**
   - Format: `https://{domain}/t/{type}/{token}/`
   - Example: `https://postgresql.eu/t/id/abc123def456...xyz/`
   - Types: `id`, `at`

### Parser Implementation

**File:** `/src/utils/qrParser.ts`

```typescript
export type TokenType = 'ID' | 'AT';

export type TokenParseResult = {
  valid: boolean;
  token?: string;
  tokenType?: TokenType;
  error?: string;
  rawValue: string;
};

/**
 * Parse QR code value into token format
 *
 * Supported formats:
 * 1. ID$<64 hex>$ID - Attendee check-in
 * 2. AT$<64 hex>$AT - Sponsor/field check-in
 * 3. https://{domain}/t/id/{64 hex}/ - URL format (ID)
 * 4. https://{domain}/t/at/{64 hex}/ - URL format (AT)
 */
export function parseQRToken(value: string): TokenParseResult {
  const rawValue = value.trim();

  // Try parsing as ID$ format
  const idTokenMatch = rawValue.match(/^ID\$([0-9a-fA-F]{64})\$ID$/);
  if (idTokenMatch) {
    return {
      valid: true,
      token: idTokenMatch[1].toLowerCase(),
      tokenType: 'ID',
      rawValue,
    };
  }

  // Try parsing as AT$ format
  const atTokenMatch = rawValue.match(/^AT\$([0-9a-fA-F]{64})\$AT$/);
  if (atTokenMatch) {
    return {
      valid: true,
      token: atTokenMatch[1].toLowerCase(),
      tokenType: 'AT',
      rawValue,
    };
  }

  // Try parsing as URL format
  const urlMatch = rawValue.match(/^https?:\/\/[^\/]+\/t\/(id|at)\/([0-9a-fA-F]{64})\/?$/i);
  if (urlMatch) {
    const [, type, token] = urlMatch;
    return {
      valid: true,
      token: token.toLowerCase(),
      tokenType: type.toUpperCase() as TokenType,
      rawValue,
    };
  }

  // Invalid format
  return {
    valid: false,
    error: 'Unrecognized QR code format. Expected ID$ or AT$ token.',
    rawValue,
  };
}

/**
 * Validate that token is 64 hexadecimal characters
 */
export function isValidTokenFormat(token: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(token);
}

/**
 * Format token for display (first 8 chars...last 8 chars)
 */
export function formatTokenForDisplay(token: string): string {
  if (token.length !== 64) {
    return token;
  }
  return `${token.substring(0, 8)}...${token.substring(56)}`;
}
```

### Parser Tests

**File:** `/src/utils/__tests__/qrParser.test.ts`

```typescript
import { parseQRToken, isValidTokenFormat, formatTokenForDisplay } from '../qrParser';

describe('parseQRToken', () => {
  const validToken = 'abc123def456789012345678901234567890123456789012345678901234';

  test('parses ID$ token format', () => {
    const result = parseQRToken(`ID$${validToken}$ID`);
    expect(result.valid).toBe(true);
    expect(result.tokenType).toBe('ID');
    expect(result.token).toBe(validToken.toLowerCase());
  });

  test('parses AT$ token format', () => {
    const result = parseQRToken(`AT$${validToken}$AT`);
    expect(result.valid).toBe(true);
    expect(result.tokenType).toBe('AT');
    expect(result.token).toBe(validToken.toLowerCase());
  });

  test('parses URL ID format', () => {
    const result = parseQRToken(`https://postgresql.eu/t/id/${validToken}/`);
    expect(result.valid).toBe(true);
    expect(result.tokenType).toBe('ID');
    expect(result.token).toBe(validToken.toLowerCase());
  });

  test('parses URL AT format', () => {
    const result = parseQRToken(`https://postgresql.eu/t/at/${validToken}/`);
    expect(result.valid).toBe(true);
    expect(result.tokenType).toBe('AT');
    expect(result.token).toBe(validToken.toLowerCase());
  });

  test('handles case insensitivity', () => {
    const upperToken = validToken.toUpperCase();
    const result = parseQRToken(`ID$${upperToken}$ID`);
    expect(result.valid).toBe(true);
    expect(result.token).toBe(validToken.toLowerCase());
  });

  test('rejects invalid format', () => {
    const result = parseQRToken('invalid-qr-code');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('rejects wrong token length', () => {
    const result = parseQRToken('ID$abc123$ID');
    expect(result.valid).toBe(false);
  });

  test('trims whitespace', () => {
    const result = parseQRToken(`  ID$${validToken}$ID  `);
    expect(result.valid).toBe(true);
  });
});

describe('isValidTokenFormat', () => {
  test('validates correct token length and format', () => {
    const token = 'a'.repeat(64);
    expect(isValidTokenFormat(token)).toBe(true);
  });

  test('rejects invalid length', () => {
    expect(isValidTokenFormat('abc123')).toBe(false);
  });

  test('rejects non-hex characters', () => {
    const token = 'g'.repeat(64);
    expect(isValidTokenFormat(token)).toBe(false);
  });
});

describe('formatTokenForDisplay', () => {
  test('formats 64-char token', () => {
    const token = 'abcdefgh' + 'x'.repeat(48) + '12345678';
    const result = formatTokenForDisplay(token);
    expect(result).toBe('abcdefgh...12345678');
  });

  test('returns short tokens as-is', () => {
    const token = 'short';
    expect(formatTokenForDisplay(token)).toBe('short');
  });
});
```

---

## UI/UX Implementation

### Scan Flow UX

```
1. User navigates to Scanner tab
2. App checks camera permission
   a. If denied: Show permission prompt
   b. If granted: Show camera view
3. Camera activates with overlay
4. User positions QR code in viewfinder
5. Code is scanned and parsed
   a. If invalid: Show error toast
   b. If valid: Trigger haptic feedback
6. Navigate to attendee detail screen (Week 4)
7. User confirms check-in/scan
8. Return to camera view for next scan
```

### Visual Design Recommendations

#### Color Scheme

- **Primary:** #007AFF (iOS blue) / #1976D2 (Material blue)
- **Success:** #34C759 (green for successful scans)
- **Error:** #FF3B30 (red for errors)
- **Overlay:** rgba(0, 0, 0, 0.6) (semi-transparent black)
- **Viewfinder:** White border (#FFF) with green corners (#00FF00)

#### Typography

- **Instructions:** 18pt, Semi-bold, White
- **Hints:** 14pt, Regular, White with 80% opacity
- **Error messages:** 16pt, Medium, Red

#### Animations

**Scan Success:**
1. Haptic feedback (medium impact)
2. Green flash on viewfinder corners
3. Brief pause (200ms)
4. Transition to result screen

**Scan Error:**
1. Haptic feedback (error)
2. Red flash on viewfinder
3. Show error toast

#### Accessibility

- VoiceOver/TalkBack announcements for scan results
- Large touch targets (minimum 44x44pt)
- High contrast mode support
- Font scaling support

---

## Error Handling

### Error Categories

1. **Permission Errors**
   - Denied: Show rationale and request
   - Blocked: Guide to settings
   - Unavailable: Device has no camera

2. **Camera Errors**
   - Device not found: Show error message
   - Camera busy: Retry after delay
   - Frame processor error: Fallback to manual entry

3. **Parse Errors**
   - Invalid format: "Unrecognized QR code"
   - Wrong token type: "This QR code is for {type}, but you're in {mode} mode"
   - Corrupted data: "QR code data is corrupted"

4. **Network Errors (Week 4)**
   - No internet: Queue scan for retry
   - API error: Show error with retry button
   - Timeout: Retry with exponential backoff

### Error Handling Service

**File:** `/src/services/error/CameraErrorHandler.ts`

```typescript
import { Alert } from 'react-native';

export enum CameraErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PERMISSION_BLOCKED = 'PERMISSION_BLOCKED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  CAMERA_BUSY = 'CAMERA_BUSY',
  INVALID_QR_CODE = 'INVALID_QR_CODE',
  WRONG_TOKEN_TYPE = 'WRONG_TOKEN_TYPE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class CameraError extends Error {
  constructor(
    public type: CameraErrorType,
    message: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'CameraError';
  }
}

export function handleCameraError(error: CameraError): void {
  switch (error.type) {
    case CameraErrorType.PERMISSION_DENIED:
      // Handled by permission prompt
      break;

    case CameraErrorType.PERMISSION_BLOCKED:
      // Handled by settings dialog
      break;

    case CameraErrorType.DEVICE_NOT_FOUND:
      Alert.alert(
        'Camera Not Available',
        'Your device does not have a camera or it is not accessible. Please use manual entry.',
        [{ text: 'OK' }]
      );
      break;

    case CameraErrorType.CAMERA_BUSY:
      Alert.alert(
        'Camera Busy',
        'The camera is being used by another app. Please close other apps and try again.',
        [{ text: 'OK' }]
      );
      break;

    case CameraErrorType.INVALID_QR_CODE:
      // Show toast instead of alert (less disruptive)
      // Toast implementation in Week 4
      console.warn('Invalid QR code:', error.message);
      break;

    case CameraErrorType.WRONG_TOKEN_TYPE:
      Alert.alert('Wrong Token Type', error.message, [{ text: 'OK' }]);
      break;

    default:
      Alert.alert(
        'Camera Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
      break;
  }
}
```

---

## Implementation Roadmap

### Day 1: Dependencies & Configuration (4-6 hours)

**Tasks:**
1. Install dependencies (Vision Camera, Code Scanner, Permissions, Reanimated)
2. Configure iOS: Info.plist, Podfile
3. Configure Android: AndroidManifest.xml, build.gradle
4. Test basic camera on both platforms
5. Verify permissions work correctly

**Deliverables:**
- [ ] Dependencies installed and linked
- [ ] iOS camera permissions configured
- [ ] Android camera permissions configured
- [ ] Basic camera view renders on both platforms

**Testing:**
- Camera opens on iOS
- Camera opens on Android
- Permission prompts appear correctly
- Settings navigation works when permission blocked

---

### Day 2: Permission Handling (4-6 hours)

**Tasks:**
1. Implement CameraPermissionService
2. Implement useCameraPermission hook
3. Create PermissionPrompt component
4. Handle permission state changes
5. Test permission flow on both platforms

**Deliverables:**
- [ ] Permission service implemented
- [ ] Permission hook working
- [ ] Permission prompt UI complete
- [ ] Permission state management working
- [ ] Settings navigation functional

**Testing:**
- Grant permission flow
- Deny permission flow
- Block permission and reopen app
- App state changes (background/foreground)
- Different permission states

---

### Day 3: Camera Implementation (6-8 hours)

**Tasks:**
1. Implement CameraView component
2. Configure Vision Camera settings
3. Implement code scanner with debouncing
4. Create ScanOverlay component
5. Handle camera lifecycle
6. Test on physical devices

**Deliverables:**
- [ ] CameraView component complete
- [ ] QR code scanning working
- [ ] Scan overlay UI implemented
- [ ] Camera lifecycle managed
- [ ] Works on iOS and Android devices

**Testing:**
- Scan QR codes successfully
- Camera activates/deactivates on focus
- Overlay displays correctly
- Performance on older devices
- Battery usage acceptable

---

### Day 4: QR Parsing & Validation (4-6 hours)

**Tasks:**
1. Implement QR parser utility
2. Add token validation
3. Add token type matching
4. Write unit tests for parser
5. Integrate parser with camera

**Deliverables:**
- [ ] QR parser implemented
- [ ] Token validation working
- [ ] Token type validation working
- [ ] Unit tests passing (>90% coverage)
- [ ] Parser integrated with camera

**Testing:**
- Parse ID$ tokens correctly
- Parse AT$ tokens correctly
- Parse URL tokens correctly
- Handle invalid formats gracefully
- Case insensitivity works
- Edge cases handled

---

### Day 5: Error Handling & Polish (4-6 hours)

**Tasks:**
1. Implement error handling service
2. Add error UI components
3. Add haptic feedback
4. Add visual feedback (animations)
5. Accessibility improvements
6. Performance optimization
7. Documentation

**Deliverables:**
- [ ] Error handling complete
- [ ] Haptic feedback working
- [ ] Visual feedback polished
- [ ] Accessibility tested
- [ ] Performance optimized
- [ ] Documentation updated

**Testing:**
- All error scenarios handled
- Haptic feedback on scan
- Visual feedback smooth
- VoiceOver/TalkBack work
- Performance targets met
- Battery usage acceptable

---

## Testing Strategy

### Unit Tests

**Files to test:**
- `qrParser.ts` (>90% coverage)
- `CameraPermissionService.ts` (>80% coverage)
- Token validation functions

**Test cases:**
- All token format variations
- Invalid formats
- Edge cases (empty strings, special characters)
- Token type validation

### Integration Tests

**Files to test:**
- `useCameraPermission` hook
- Permission flow integration
- Camera lifecycle

**Test cases:**
- Permission request flow
- Permission state changes
- App state changes
- Focus/blur behavior

### Manual Testing Checklist

**iOS:**
- [ ] Camera permission prompt appears
- [ ] Settings navigation works
- [ ] Camera opens and scans QR codes
- [ ] Scan overlay displays correctly
- [ ] Safe areas handled (notch, Dynamic Island)
- [ ] Haptic feedback works
- [ ] VoiceOver announces correctly
- [ ] Performance on iPhone 8 (oldest supported)
- [ ] Performance on iPhone 15

**Android:**
- [ ] Camera permission prompt appears
- [ ] Rationale dialog appears (first request)
- [ ] Settings navigation works
- [ ] Camera opens and scans QR codes
- [ ] Scan overlay displays correctly
- [ ] Edge-to-edge rendering correct
- [ ] Haptic feedback works
- [ ] TalkBack announces correctly
- [ ] Performance on API 30 device
- [ ] Performance on latest Android

**QR Code Formats:**
- [ ] ID$ token scans correctly
- [ ] AT$ token scans correctly
- [ ] URL ID token scans correctly
- [ ] URL AT token scans correctly
- [ ] Invalid tokens show error
- [ ] Wrong token type shows error

**Edge Cases:**
- [ ] No camera device (emulator)
- [ ] Camera already in use
- [ ] App backgrounded during scan
- [ ] Permission revoked while app running
- [ ] Screen rotation (if supported)
- [ ] Low light conditions
- [ ] Damaged/distorted QR codes

---

## Success Criteria

### Week 3 Goals

1. **Camera functionality:**
   - Camera opens successfully on iOS and Android
   - QR codes are detected reliably (>95% success rate)
   - Scan feedback < 500ms latency

2. **Permission handling:**
   - Permission flow works on both platforms
   - Settings navigation functional
   - Permission states handled correctly

3. **QR parsing:**
   - All token formats parsed correctly
   - Token validation working
   - Token type matching working

4. **User experience:**
   - Clear visual feedback on scan
   - Helpful error messages
   - Smooth performance (60fps camera view)
   - Accessible to screen reader users

5. **Code quality:**
   - TypeScript strict mode (no `any` types)
   - >80% test coverage
   - No deprecated APIs used
   - Documentation complete

### Performance Targets

- **Camera activation:** < 1 second
- **QR code detection:** < 500ms
- **Frame rate:** 30fps minimum (60fps target)
- **Battery usage:** < 10%/hour during active scanning
- **Memory usage:** < 150MB on older devices

### Deliverables for Week 4 Integration

1. Working camera view component
2. QR parser utility (ready for API integration)
3. Permission handling service
4. Error handling framework
5. UI components for scan flow
6. Unit and integration tests
7. Documentation updated

---

## Known Limitations & Future Enhancements

### Week 3 Limitations

- Manual entry fallback not implemented (Week 5)
- Scan result modal not implemented (Week 4)
- API integration not implemented (Week 4)
- Haptic feedback basic (can be enhanced)
- No scan history (Week 5)

### Future Enhancements

- Photo library QR code scanning (select from photos)
- Batch scanning mode (scan multiple codes rapidly)
- Custom scan sounds
- Scan analytics (success rate, performance metrics)
- Dark mode support
- Landscape orientation support

---

## Resources

### Documentation

- [Vision Camera Docs](https://react-native-vision-camera.com/)
- [Vision Camera Code Scanner](https://github.com/rodgomesc/vision-camera-code-scanner)
- [React Native Permissions](https://github.com/zoontek/react-native-permissions)
- [ML Kit Barcode Scanning](https://developers.google.com/ml-kit/vision/barcode-scanning)

### Sample QR Codes for Testing

Generate test QR codes at: https://www.qr-code-generator.com/

**ID Token:**
```
ID$abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890$ID
```

**AT Token:**
```
AT$1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef$AT
```

**URL Format:**
```
https://postgresql.eu/t/id/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890/
```

---

## Troubleshooting

### Common Issues

**Issue:** Camera view is black
- **Solution:** Check permissions, ensure device has camera, check `isActive` prop

**Issue:** QR codes not detected
- **Solution:** Verify `codeScanner` configuration, check ML Kit installation, test with high-quality QR codes

**Issue:** Build fails on iOS
- **Solution:** Run `cd ios && pod install`, clean build folder in Xcode

**Issue:** Build fails on Android
- **Solution:** Run `./gradlew clean`, check minimum SDK version, verify permissions in manifest

**Issue:** Performance issues
- **Solution:** Reduce frame rate, optimize overlay rendering, check for memory leaks

**Issue:** Permission prompt not showing
- **Solution:** Check Info.plist/manifest, verify permission not already blocked, check device settings

---

## Contact & Support

For questions or issues during implementation:
- Review existing documentation in `.claude/` directory
- Check Vision Camera GitHub issues
- Test on physical devices for camera issues (emulators have limited camera support)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-08
**Next Review:** After Week 3 completion
