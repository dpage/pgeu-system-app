# React Native Troubleshooting Guide

**Last Updated:** 2025-11-08

This document captures common issues encountered during development and their solutions.

---

## Runtime Issues

### Blank Screen / App Not Rendering

**Issue:** App builds successfully but shows a blank screen in the simulator/emulator.

**Common Causes:**

#### 1. Dynamic require() for package.json Files

**Symptom:** App shows blank screen, no errors in Metro bundler, but components don't render.

**Cause:** Using `require('package-name/package.json')` to access version numbers or other metadata fails silently at runtime in React Native.

**Example of problematic code:**
```typescript
// ❌ DON'T DO THIS - Causes blank screen
<Text>
  React Native {require('react-native/package.json').version}
</Text>
<Text>
  TypeScript {require('typescript/package.json').version}
</Text>
```

**Solution:** Use static values or environment variables instead:
```typescript
// ✅ DO THIS - Use static text
<Text>Platform: iOS & Android</Text>
<Text>Framework: React Native + TypeScript</Text>

// ✅ OR THIS - Import at build time if needed
import { version } from '../../../package.json';
<Text>Version {version}</Text>
```

**Prevention:**
- Never use `require()` for package.json files in component render methods
- If you need version info, import it at the top of the file or use static text
- Consider using environment variables for dynamic values

**Reference:** Discovered 2025-11-08 during initial app setup

---

#### 2. Metro Bundler Not Running

**Symptom:** Error message "No script URL provided" or blank screen.

**Cause:** The Metro bundler (React Native's JavaScript packager) isn't running when the app launches.

**Solution:**
1. Start Metro bundler in a separate terminal: `npm start`
2. Reload the app: Press `Cmd + R` (iOS) or `R + R` (Android)

**Prevention:**
- Always ensure Metro is running before launching the app
- Use `npm run ios` or `npm run android` which should start Metro automatically
- If Metro fails to start, manually run `npm start` first

---

## Build Issues

### iOS Build Issues

#### CocoaPods Installation Required

**Issue:** iOS build fails with missing dependencies.

**Solution:**
```bash
cd ios
pod install
cd ..
```

Run this whenever you add new native dependencies.

---

### Android Build Issues

#### Android Environment Setup (macOS)

**Issue:** Android build fails with various errors about missing Java, Android SDK paths, or Gradle compatibility.

**Common Symptoms:**
- `Unable to locate a Java Runtime`
- `adb: command not found`
- `No emulators found`
- `Minimum supported Gradle version is X.X`
- `Gradle version X.X is incompatible`

**Root Causes:**
1. JAVA_HOME not configured
2. ANDROID_HOME/ANDROID_SDK_ROOT not configured
3. Android SDK tools not in PATH
4. Gradle version incompatibility with Android Gradle Plugin

**Complete Solution (macOS with Android Studio):**

1. **Configure environment variables** (add to `~/.zshrc` or `~/.bash_profile`):

```bash
# Java (using Android Studio's bundled JDK)
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# Android SDK
export ANDROID_HOME=~/Library/Android/sdk
export ANDROID_SDK_ROOT=~/Library/Android/sdk

# Add Android tools to PATH
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

2. **Reload your shell configuration:**
```bash
source ~/.zshrc  # or source ~/.bash_profile
```

3. **Verify setup:**
```bash
echo $JAVA_HOME
java -version
which adb
adb devices
```

**Gradle Version Compatibility:**

React Native 0.82 with newer Android build tools requires specific Gradle versions:
- **Gradle 9.0.0:** Too new - causes incompatibility with React Native Gradle plugin
- **Gradle 8.10.2:** Too old - fails with "Minimum supported Gradle version is 8.13"
- **Gradle 8.13:** ✅ **Recommended** - Compatible with both React Native and Android build tools 36

If you encounter Gradle version errors, update `android/gradle/wrapper/gradle-wrapper.properties`:
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-bin.zip
```

**First Build Process:**

The first Android build takes 5-10 minutes and installs:
- Gradle distribution
- NDK (Native Development Kit)
- Android SDK Build-Tools
- CMake (for native code compilation)

Subsequent builds are much faster (30-60 seconds).

**Reference:** Encountered and resolved 2025-11-08 during initial Android setup

---

## Testing Issues

### Tests Fail Due to Missing Mocks

**Issue:** Tests fail with errors about missing modules like `react-native-safe-area-context`.

**Solution:** Ensure proper mocks in `jest.setup.js`:

```javascript
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };

  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, style }) =>
      React.createElement(View, { style }, children),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});
```

---

## Development Tips

### Fast Refresh Not Working

**Issue:** Changes don't appear after saving files.

**Solutions:**
1. Check Metro bundler terminal for errors
2. Force reload: `Cmd + R` (iOS) or `R + R` (Android)
3. Restart Metro: Kill Metro terminal and run `npm start`
4. Clear Metro cache: `npm start -- --reset-cache`

---

### Simulator/Emulator Issues

#### iOS Simulator

**Issue:** Simulator doesn't respond or shows errors.

**Solutions:**
1. Reset simulator: Device → Erase All Content and Settings
2. Restart Xcode
3. List available simulators: `xcrun simctl list devices`

#### Android Emulator

**Issue:** Need to start Android emulator for testing.

**Solutions:**

1. **List available Android Virtual Devices (AVDs):**
```bash
~/Library/Android/sdk/emulator/emulator -list-avds
```

2. **Start an emulator:**
```bash
~/Library/Android/sdk/emulator/emulator -avd [AVD_NAME] -no-snapshot-load &
```

3. **Verify emulator is running:**
```bash
~/Library/Android/sdk/platform-tools/adb devices
```

**Example:**
```bash
# List AVDs
~/Library/Android/sdk/emulator/emulator -list-avds

# Start Medium_Phone_API_36.1
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_36.1 -no-snapshot-load &

# Check running devices
adb devices
# Should show: emulator-5554   device
```

**Note:** Once environment variables are configured (see Android Environment Setup above), you can use shorter commands:
```bash
emulator -list-avds
emulator -avd Medium_Phone_API_36.1 -no-snapshot-load &
adb devices
```

---

## Network/API Issues

*To be documented as backend integration is implemented*

---

## Performance Issues

*To be documented as performance optimization is implemented*

---

## Common Error Messages

### "Element type is invalid: expected a string..."

**Cause:** Incorrect import/export of components or using undefined component.

**Solution:**
1. Check import statements match export type (default vs named)
2. Verify component is properly defined
3. Check for circular dependencies

---

### "Invariant Violation: View config not found"

**Cause:** Mismatch between native and JavaScript code, or stale cache.

**Solution:**
```bash
# Clear all caches
npm start -- --reset-cache
cd ios && rm -rf Pods && pod install && cd ..
cd android && ./gradlew clean && cd ..
```

---

## Debugging Techniques

### Enable Developer Menu

**iOS:** `Cmd + D`
**Android:** `Cmd + M` or shake device

### View React DevTools

1. Open developer menu
2. Select "Toggle Inspector" or "Show DevTools"

### View Console Logs

Metro bundler terminal shows all `console.log`, `console.warn`, and `console.error` output.

---

## Prevention Checklist

Before committing code, verify:

- [ ] No dynamic `require()` statements in render methods
- [ ] All new native dependencies have pod install run (iOS)
- [ ] Tests pass: `npm test`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] No ESLint errors: `npm run lint`
- [ ] App runs on both iOS and Android
- [ ] Fast Refresh works after code changes

---

## Getting Help

When reporting issues:

1. Include error messages from Metro bundler terminal
2. Include device/simulator version and OS
3. Describe steps to reproduce
4. Note what was tried to fix it
5. Include relevant code snippets

---

**Document Status:** Active - Update as new issues are encountered
