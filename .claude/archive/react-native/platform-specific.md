# Platform-Specific Implementation Guide

**Note:** Offline mode has been removed from requirements. All scanning operations require active network connectivity.

## Overview

This document covers iOS vs Android differences and platform-specific implementations required for the conference scanner app.

## Minimum Platform Support

- **iOS**: 13.0+ (Released September 2019 - 5 years of device support)
- **Android**: API 23 (Android 6.0, Marshmallow) - Released October 2015

## Platform Capabilities Comparison

| Feature | iOS 13+ | Android 6.0+ | Implementation Notes |
|---------|---------|--------------|----------------------|
| Camera API | AVFoundation | Camera2 API | Use react-native-vision-camera (abstracts both) |
| QR Scanning | Vision Framework | ML Kit | Use vision-camera-code-scanner |
| Secure Storage | Keychain | Keystore | Use react-native-keychain |
| Deep Linking | Universal Links | App Links | Different configuration, same API |
| Permissions | Request at runtime | Request at runtime | Different UX patterns |
| Background Tasks | Limited | More flexible | Plan for iOS restrictions |
| Safe Areas | Required (notched devices) | Required (edge-to-edge) | Use react-native-safe-area-context |
| Biometrics | Face ID, Touch ID | Fingerprint, Face Unlock | Use react-native-keychain with biometry |

## Camera Implementation

### iOS Camera Configuration

**Info.plist entries:**
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan QR codes for attendee check-in.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to allow selecting QR codes from your photos.</string>

<!-- Optional: Microphone if recording video later -->
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access is not used by this app.</string>
```

**Camera capabilities in Info.plist:**
```xml
<key>UIBackgroundModes</key>
<array>
  <!-- Only if needed for background scanning -->
  <!-- <string>camera</string> -->
</array>
```

### Android Camera Configuration

**AndroidManifest.xml:**
```xml
<!-- Camera permission -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Camera features (optional - marks app as requiring camera) -->
<uses-feature
    android:name="android.hardware.camera"
    android:required="true" />
<uses-feature
    android:name="android.hardware.camera.autofocus"
    android:required="false" />
```

**Gradle configuration for Camera2:**
```gradle
// android/app/build.gradle
android {
    defaultConfig {
        // Ensure minimum API 23 for Camera2
        minSdkVersion 23
    }
}
```

### Camera Permission Handling

**Platform-specific permission flow:**

```typescript
// services/permissions/CameraPermission.ts
import { Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS, check } from 'react-native-permissions';

export async function requestCameraPermission(): Promise<boolean> {
  const permission = Platform.select({
    ios: PERMISSIONS.IOS.CAMERA,
    android: PERMISSIONS.ANDROID.CAMERA,
  });

  if (!permission) return false;

  // Check current status
  const currentStatus = await check(permission);

  if (currentStatus === RESULTS.GRANTED) {
    return true;
  }

  if (currentStatus === RESULTS.BLOCKED || currentStatus === RESULTS.UNAVAILABLE) {
    // Show settings dialog
    showPermissionBlockedDialog();
    return false;
  }

  // Request permission
  const status = await request(permission);
  return status === RESULTS.GRANTED;
}

function showPermissionBlockedDialog() {
  Alert.alert(
    'Camera Permission Required',
    Platform.select({
      ios: 'Please enable camera access in Settings > Privacy > Camera',
      android: 'Please enable camera access in Settings > Apps > Permissions',
    }),
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
}
```

**Camera permission timing differences:**

- **iOS**: Can request anytime; system shows dialog
- **Android**: Must request at runtime (API 23+); should show rationale first

```typescript
// hooks/useCameraPermission.ts
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useCameraPermission() {
  const [hasPermission, setHasPermission] = useState(false);
  const [showRationale, setShowRationale] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  async function checkPermission() {
    const status = await check(CAMERA_PERMISSION);

    if (status === RESULTS.GRANTED) {
      setHasPermission(true);
    } else if (Platform.OS === 'android' && status === RESULTS.DENIED) {
      // On Android, show rationale before requesting
      setShowRationale(true);
    } else {
      setHasPermission(false);
    }
  }

  async function requestPermission() {
    const granted = await requestCameraPermission();
    setHasPermission(granted);
    setShowRationale(false);
  }

  return {
    hasPermission,
    showRationale,
    requestPermission,
  };
}
```

## Secure Storage (Token Storage)

### iOS Keychain

**Configuration:**
```typescript
// services/storage/secureStorage.ios.ts
import Keychain from 'react-native-keychain';

export async function saveToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('auth_token', token, {
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY, // Optional: Require biometric
    service: 'com.pgeuconf.scanner.auth',
  });
}

export async function getToken(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({
    service: 'com.pgeuconf.scanner.auth',
  });

  if (credentials) {
    return credentials.password;
  }

  return null;
}

export async function deleteToken(): Promise<void> {
  await Keychain.resetGenericPassword({
    service: 'com.pgeuconf.scanner.auth',
  });
}
```

**iOS Keychain Accessibility Options:**
- `AFTER_FIRST_UNLOCK`: Accessible after device unlocked once (recommended)
- `ALWAYS`: Accessible even when locked (less secure)
- `WHEN_UNLOCKED`: Only when device unlocked (more secure, but not accessible in background)

### Android Keystore

**Configuration:**
```typescript
// services/storage/secureStorage.android.ts
import Keychain from 'react-native-keychain';

export async function saveToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('auth_token', token, {
    service: 'com.pgeuconf.scanner.auth',
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    storage: Keychain.STORAGE_TYPE.RSA, // Use RSA encryption
  });
}

export async function getToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.pgeuconf.scanner.auth',
    });

    if (credentials) {
      return credentials.password;
    }
  } catch (error) {
    // Android Keystore can be cleared on some devices after OS updates
    console.error('Keystore access error:', error);
    return null;
  }

  return null;
}

export async function deleteToken(): Promise<void> {
  await Keychain.resetGenericPassword({
    service: 'com.pgeuconf.scanner.auth',
  });
}
```

**Android-specific considerations:**
- Keystore can be cleared on device encryption changes
- Some devices don't support SECURE_HARDWARE (fallback to software)
- Biometric prompt requires separate API (BiometricPrompt)

### Biometric Authentication

```typescript
// services/auth/biometric.ts
import Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await Keychain.getGenericPassword({
      authenticationPrompt: {
        title: 'Authenticate',
        subtitle: Platform.select({
          ios: 'Use Face ID or Touch ID to unlock',
          android: 'Use fingerprint or face to unlock',
        }),
        cancel: 'Cancel',
      },
      service: 'com.pgeuconf.scanner.auth',
    });

    return !!result;
  } catch (error) {
    // User cancelled or biometric auth failed
    return false;
  }
}

export async function isBiometricSupported(): Promise<boolean> {
  const biometryType = await Keychain.getSupportedBiometryType();

  return biometryType !== null;
}
```

## Deep Linking

### iOS Universal Links

**Associated Domains setup:**

**1. Enable in Xcode:**
- Select target > Signing & Capabilities
- Add "Associated Domains"
- Add domain: `applinks:pgeuconf.com`

**2. Apple App Site Association file on server:**
```json
// https://pgeuconf.com/.well-known/apple-app-site-association
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.pgeuconf.scanner",
        "paths": [
          "/setup/*",
          "/conference/*"
        ]
      }
    ]
  }
}
```

**3. iOS native code (AppDelegate.mm):**
```objective-c
// ios/PGEUConf/AppDelegate.mm
#import <React/RCTLinkingManager.h>

// Add this method
- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

// Add this method for Universal Links
- (BOOL)application:(UIApplication *)application
continueUserActivity:(nonnull NSUserActivity *)userActivity
 restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}
```

**4. URL Scheme (Info.plist) for custom URLs:**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>pgeuconf</string>
    </array>
  </dict>
</array>
```

### Android App Links

**1. AndroidManifest.xml:**
```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask">

  <!-- App Links (HTTPS) -->
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="pgeuconf.com"
        android:pathPrefix="/setup" />
    <data
        android:scheme="https"
        android:host="pgeuconf.com"
        android:pathPrefix="/conference" />
  </intent-filter>

  <!-- Custom URL Scheme -->
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="pgeuconf" />
  </intent-filter>
</activity>
```

**2. Digital Asset Links file on server:**
```json
// https://pgeuconf.com/.well-known/assetlinks.json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.pgeuconf.scanner",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FINGERPRINT"
    ]
  }
}]
```

**3. Get SHA256 fingerprint:**
```bash
# Debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release keystore
keytool -list -v -keystore /path/to/release.keystore -alias <your-alias>
```

**4. MainActivity.java - add deep link support:**
```java
// android/app/src/main/java/com/pgeuconf/MainActivity.java
package com.pgeuconf.scanner;

import android.content.Intent;
import android.os.Bundle;
import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
  }
}
```

### React Native Deep Link Handling

```typescript
// navigation/linking.ts
import { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'pgeuconf://',
    'https://pgeuconf.com',
    'https://www.pgeuconf.com',
  ],
  config: {
    screens: {
      Auth: {
        screens: {
          ConferenceSetup: {
            path: 'setup/:token',
            parse: {
              token: (token: string) => token,
            },
          },
        },
      },
      Main: {
        screens: {
          Tabs: {
            screens: {
              Scanner: {
                path: 'scan/:mode?',
                parse: {
                  mode: (mode: string) => mode as ScanMode,
                },
              },
            },
          },
          ConferenceSelector: {
            path: 'conference/:conferenceId',
            parse: {
              conferenceId: (id: string) => id,
            },
          },
        },
      },
    },
  },
};

// Usage in NavigationContainer
import { NavigationContainer } from '@react-navigation/native';

<NavigationContainer linking={linking}>
  {/* Your navigators */}
</NavigationContainer>
```

### Testing Deep Links

**iOS Simulator:**
```bash
xcrun simctl openurl booted "pgeuconf://setup/abc123"
xcrun simctl openurl booted "https://pgeuconf.com/setup/abc123"
```

**Android Emulator:**
```bash
adb shell am start -W -a android.intent.action.VIEW -d "pgeuconf://setup/abc123" com.pgeuconf.scanner
adb shell am start -W -a android.intent.action.VIEW -d "https://pgeuconf.com/setup/abc123" com.pgeuconf.scanner
```

## Safe Area Handling

### iOS Safe Areas (Notches, Dynamic Island)

```typescript
// components/layout/Screen.tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
```

**Edge-specific safe areas:**
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CameraScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Camera view */}
    </View>
  );
}
```

### Android Edge-to-Edge

**Enable edge-to-edge in MainActivity:**
```java
// android/app/src/main/java/com/pgeuconf/MainActivity.java
import android.os.Bundle;

public class MainActivity extends ReactActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(null);
    // Enable edge-to-edge
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      getWindow().setDecorFitsSystemWindows(false);
    }
  }
}
```

**Styles (values-v29+):**
```xml
<!-- android/app/src/main/res/values-v29/styles.xml -->
<resources>
  <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
    <!-- Enable edge-to-edge -->
    <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
    <item name="android:statusBarColor">@android:color/transparent</item>
    <item name="android:navigationBarColor">@android:color/transparent</item>
  </style>
</resources>
```

## Navigation Bar (iOS vs Android)

### iOS Status Bar

```typescript
import { StatusBar, Platform } from 'react-native';

// In App.tsx or Screen component
<StatusBar
  barStyle={Platform.select({
    ios: 'dark-content',
    android: 'light-content',
  })}
  backgroundColor="transparent"
  translucent
/>
```

### Android System UI

```typescript
// utils/systemUI.ts
import { Platform, StatusBar } from 'react-native';
import { Navigation } from 'react-native-navigation';

export function setSystemUIColors(theme: 'light' | 'dark') {
  if (Platform.OS === 'android') {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
    StatusBar.setBarStyle(theme === 'light' ? 'dark-content' : 'light-content');
  }
}
```

## Back Button Handling (Android)

```typescript
// hooks/useBackHandler.ts
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export function useBackHandler(handler: () => boolean) {
  useEffect(() => {
    // Only on Android
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);

    return () => subscription.remove();
  }, [handler]);
}

// Usage in screen
function ScannerScreen() {
  useBackHandler(() => {
    // Return true to prevent default back behavior
    // Return false to allow default back
    Alert.alert('Exit', 'Stop scanning?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', onPress: () => navigation.goBack() },
    ]);
    return true; // Prevent default
  });
}
```

## Build Configuration

### iOS Build Settings

**Xcode project settings:**
```
Deployment Target: iOS 13.0
Architectures: arm64 (no more 32-bit support)
Build System: New Build System
Swift Version: 5.x
```

**Info.plist required keys:**
```xml
<!-- App name -->
<key>CFBundleDisplayName</key>
<string>PGConf Scanner</string>

<!-- Bundle identifier -->
<key>CFBundleIdentifier</key>
<string>com.pgeuconf.scanner</string>

<!-- Version -->
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
<key>CFBundleVersion</key>
<string>1</string>

<!-- Orientation -->
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
</array>

<!-- Required device capabilities -->
<key>UIRequiredDeviceCapabilities</key>
<array>
  <string>arm64</string>
</array>
```

### Android Build Configuration

**android/app/build.gradle:**
```gradle
android {
    compileSdkVersion 34
    buildToolsVersion "34.0.0"

    defaultConfig {
        applicationId "com.pgeuconf.scanner"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"

        // Enable multidex for older devices
        multiDexEnabled true
    }

    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }

    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }

    // Split APKs for different ABIs (optional - reduces size)
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
            universalApk false
        }
    }
}
```

**ProGuard rules (proguard-rules.pro):**
```proguard
# Keep react-native-vision-camera
-keep class com.mrousavy.camera.** { *; }

# Keep react-native-keychain
-keep class com.oblador.keychain.** { *; }

# Keep Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
```

## App Icons and Splash Screens

### iOS App Icon

**Required sizes (AppIcon.appiconset):**
- 20x20 @2x, @3x (iPhone Notification)
- 29x29 @2x, @3x (iPhone Settings)
- 40x40 @2x, @3x (iPhone Spotlight)
- 60x60 @2x, @3x (iPhone App)
- 1024x1024 (App Store)

**Generate with:**
- Xcode asset catalog
- Online generators (appicon.co)

### Android App Icon

**Required densities (res/mipmap-*):**
```
mipmap-mdpi/ic_launcher.png (48x48)
mipmap-hdpi/ic_launcher.png (72x72)
mipmap-xhdpi/ic_launcher.png (96x96)
mipmap-xxhdpi/ic_launcher.png (144x144)
mipmap-xxxhdpi/ic_launcher.png (192x192)
```

**Adaptive icons (Android 8.0+):**
```xml
<!-- res/mipmap-anydpi-v26/ic_launcher.xml -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
```

### Splash Screen

**iOS Launch Screen (LaunchScreen.storyboard):**
- Use Xcode Interface Builder
- Keep simple (logo + background color)
- Auto-layout for all screen sizes

**Android Splash Screen:**
```xml
<!-- res/drawable/launch_screen.xml -->
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splash_background"/>
  <item>
    <bitmap
      android:src="@drawable/splash_logo"
      android:gravity="center" />
  </item>
</layer-list>
```

```xml
<!-- res/values/colors.xml -->
<resources>
  <color name="splash_background">#FFFFFF</color>
</resources>
```

```xml
<!-- res/values/styles.xml -->
<resources>
  <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
    <item name="android:windowBackground">@drawable/launch_screen</item>
  </style>
</resources>
```

## Performance Optimization Differences

### iOS Optimizations

**Hermes configuration (ios/Podfile):**
```ruby
# Use Hermes
use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => true
)
```

**Enable New Architecture (optional):**
```ruby
# ios/Podfile
ENV['RCT_NEW_ARCH_ENABLED'] = '1'
```

### Android Optimizations

**Enable Hermes (android/app/build.gradle):**
```gradle
project.ext.react = [
    enableHermes: true
]
```

**Enable New Architecture:**
```gradle
// android/gradle.properties
newArchEnabled=true
```

**ProGuard/R8 optimization:**
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

## Testing Considerations

### iOS Testing Devices

**Minimum:**
- iPhone 8 (smallest supported screen)
- iPhone 13 (standard notch)
- iPhone 15 Pro (Dynamic Island)
- iPad (if supporting tablets)

**Test on iOS versions:**
- iOS 13 (minimum)
- Latest iOS (17+)

### Android Testing Devices

**Minimum:**
- Android 6.0 (API 23) - minimum supported
- Android 13+ (API 33+) - latest
- Various screen sizes (small, normal, large)
- Different manufacturers (Samsung, Google, Xiaomi)

**Android emulator configurations:**
```
Pixel 3a (small screen, 5.6")
Pixel 5 (medium screen, 6.0")
Pixel 6 Pro (large screen, 6.7")
```

## App Store Specific Requirements

### iOS App Store

**Required assets:**
- App Icon (1024x1024)
- Screenshots (6.7", 6.5", 5.5" required)
- App Preview (optional)

**Required info:**
- Privacy Policy URL
- Support URL
- Age Rating (likely 4+)
- Export Compliance (if using encryption)

**App Review notes:**
- Explain QR scanning purpose
- Provide test credentials
- Explain offline functionality

### Google Play Store

**Required assets:**
- App Icon (512x512)
- Feature Graphic (1024x500)
- Screenshots (min 2, max 8)
- Phone screenshots (required)
- 7" tablet screenshots (optional)
- 10" tablet screenshots (optional)

**Required info:**
- Privacy Policy URL
- Target audience and content
- Data Safety section (detailed)

## Common Platform-Specific Gotchas

### iOS Issues

1. **Keychain Access After App Reinstall**: Data persists
   - Solution: Clear on first launch after install detection

2. **Camera Permission Denied Forever**: No programmatic re-request
   - Solution: Detect and guide user to Settings

3. **App Suspension**: App can be suspended anytime
   - Solution: Save state frequently, handle app state changes

### Android Issues

1. **Back Button**: Hardware back button behavior
   - Solution: Implement proper back handlers

2. **Keystore Loss**: Can be cleared on some devices
   - Solution: Handle gracefully, re-authenticate user

3. **Battery Optimization**: Can kill background tasks
   - Solution: Request battery optimization exemption if needed

4. **Permissions Reset**: User can revoke anytime
   - Solution: Check permissions on each app resume

## Summary

Platform-specific implementations are isolated to:
- Native configuration files (Info.plist, AndroidManifest.xml)
- Build configurations (Xcode, Gradle)
- Security implementations (Keychain vs Keystore)
- Deep linking setup (different verification files)
- Safe area handling (different notch/cutout behaviors)

The React Native layer (95%+ of code) remains platform-agnostic, with platform differences handled through:
- `Platform.select()` for small UI differences
- `.ios.ts` / `.android.ts` file extensions for different implementations
- Feature detection rather than platform detection where possible

This approach maximizes code reuse while ensuring native platform compliance and optimal user experience on both iOS and Android.
