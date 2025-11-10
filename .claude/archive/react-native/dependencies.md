# Dependencies and Package Management

**Note:** Offline mode has been removed from requirements. All scanning operations require active network connectivity.

## Core Dependencies

### React Native Framework

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.6"
  }
}
```

**Version Notes:**
- React Native 0.73.x: Latest stable with optional New Architecture support
- Hermes engine enabled by default
- Good backward compatibility with existing libraries
- iOS 13.0+ and Android 6.0+ (API 23) support

**Alternative Consideration:**
- 0.72.x: If 0.73 has compatibility issues with specific libraries
- 0.74.x: When released and stable (check compatibility first)

### Navigation

```json
{
  "dependencies": {
    "@react-navigation/native": "^6.1.10",
    "@react-navigation/native-stack": "^6.9.18",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "react-native-screens": "^3.29.0",
    "react-native-safe-area-context": "^4.8.2",
    "react-native-gesture-handler": "^2.14.1"
  }
}
```

**Purpose:**
- `@react-navigation/native`: Core navigation library
- `@react-navigation/native-stack`: Native stack navigation (better performance than JS stack)
- `@react-navigation/bottom-tabs`: Tab navigation for main screens
- `react-native-screens`: Native screen optimization
- `react-native-safe-area-context`: Safe area handling (notches, etc.)
- `react-native-gesture-handler`: Required for navigation gestures

**Configuration Notes:**
- TypeScript types included
- Deep linking configuration built-in
- Excellent documentation and community support

### Camera & QR Scanning

```json
{
  "dependencies": {
    "react-native-vision-camera": "^3.9.0",
    "vision-camera-code-scanner": "^0.2.0"
  }
}
```

**Purpose:**
- `react-native-vision-camera`: Modern camera library with frame processor support
- `vision-camera-code-scanner`: ML Kit integration for QR code scanning

**Configuration:**
- iOS: Add camera usage description to Info.plist
- Android: Add camera permission to AndroidManifest.xml
- Requires worklet (Reanimated 2 style) for frame processing

**Performance:**
- Native ML Kit performance (60fps scanning)
- Battery efficient
- Supports barcode, QR code, and other formats

**Alternative:**
- `react-native-camera` (deprecated, don't use)
- `react-native-camera-kit` (good alternative if Vision Camera has issues)

### State Management

```json
{
  "dependencies": {
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.17.19"
  }
}
```

**Purpose:**
- `zustand`: Lightweight state management (UI state, auth)
- `@tanstack/react-query`: Server state management (API data, caching)

**Why Zustand over Redux:**
- Less boilerplate (no actions/reducers)
- Better TypeScript support out of box
- Smaller bundle size
- Easier testing
- Simpler middleware

**Why React Query:**
- Automatic background refetching
- Cache management with stale-while-revalidate
- Optimistic updates
- Request deduplication
- Built-in retry logic for network errors

### Storage

```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-keychain": "^8.1.2"
  }
}
```

**Purpose:**
- `@react-native-async-storage/async-storage`: Persistent key-value storage
- `react-native-keychain`: Secure storage (iOS Keychain, Android Keystore)

**Usage:**
- AsyncStorage: User preferences, app settings
- Keychain: Authentication tokens, sensitive credentials

**Configuration:**
- AsyncStorage: Works out of box
- Keychain: iOS requires Keychain entitlement (auto-configured)

### Networking

```json
{
  "dependencies": {
    "axios": "^1.6.7",
    "axios-retry": "^4.0.0"
  }
}
```

**Purpose:**
- `axios`: HTTP client with interceptor support
- `axios-retry`: Automatic retry with exponential backoff

**Why Axios over Fetch:**
- Request/response interceptors (for auth tokens)
- Automatic request cancellation
- Better error handling
- Form-urlencoded support for Django backend
- Timeout support

**Configuration:**
```typescript
import axios from 'axios';
import axiosRetry from 'axios-retry';

const client = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 10000,
});

axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error)
      || error.response?.status === 429; // Rate limiting
  },
});
```

### UI Components

```json
{
  "dependencies": {
    "react-native-paper": "^5.12.3",
    "react-native-vector-icons": "^10.0.3"
  }
}
```

**Purpose:**
- `react-native-paper`: Material Design components
- `react-native-vector-icons`: Icon library (Material Icons, Ionicons, etc.)

**Why React Native Paper:**
- Comprehensive component library
- Follows Material Design 3 guidelines
- Built-in theming
- Accessibility compliant
- Works well on iOS and Android

**Alternative UI Libraries:**
- `react-native-elements`: Good alternative
- `native-base`: Another option
- Build custom components: For full control

**Configuration:**
```bash
# iOS - link fonts
cd ios && pod install

# Android - automatic linking (RN 0.60+)
```

### Permissions

```json
{
  "dependencies": {
    "react-native-permissions": "^4.1.0"
  }
}
```

**Purpose:**
- Unified API for iOS and Android permissions
- Check and request camera, location, etc.

**Configuration:**
```ruby
# ios/Podfile
permissions_path = '../node_modules/react-native-permissions/ios'
pod 'Permission-Camera', :path => "#{permissions_path}/Camera"
pod 'Permission-LocationWhenInUse', :path => "#{permissions_path}/LocationWhenInUse"
```

```gradle
// android/app/build.gradle - permissions auto-linked
```

### Utilities

```json
{
  "dependencies": {
    "react-native-device-info": "^10.13.1",
    "date-fns": "^3.3.1",
    "zod": "^3.22.4"
  }
}
```

**Purpose:**
- `react-native-device-info`: Device capabilities, version info
- `date-fns`: Date formatting and manipulation (lighter than moment.js)
- `zod`: Runtime type validation for API responses

**Why date-fns:**
- Tree-shakeable (only bundle what you use)
- Functional API
- Immutable
- TypeScript support

**Why Zod:**
- Runtime validation
- Type inference (TypeScript types from schema)
- Composable schemas
- Great for validating API responses

### Configuration

```json
{
  "dependencies": {
    "react-native-config": "^1.5.1"
  }
}
```

**Purpose:**
- Environment-specific configuration
- API URLs, feature flags, etc.

**Usage:**
```typescript
import Config from 'react-native-config';

const apiUrl = Config.API_BASE_URL;
const environment = Config.ENV;
```

**Configuration:**
```bash
# .env.development
API_BASE_URL=http://localhost:8000
ENV=development

# .env.production
API_BASE_URL=https://api.pgeuconf.com
ENV=production
```

### Error Tracking & Analytics

```json
{
  "dependencies": {
    "@sentry/react-native": "^5.17.0"
  }
}
```

**Purpose:**
- Crash reporting
- Error tracking
- Performance monitoring

**Configuration:**
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: Config.SENTRY_DSN,
  environment: Config.ENV,
  enabled: Config.ENABLE_CRASH_REPORTING,
  tracesSampleRate: Config.ENV === 'production' ? 0.1 : 1.0,
});
```

**Alternatives:**
- Firebase Crashlytics
- Bugsnag
- Custom error logging

## Development Dependencies

### TypeScript

```json
{
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-native": "^0.73.0",
    "typescript": "^5.3.3"
  }
}
```

**Configuration:**
```json
// tsconfig.json
{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Testing

```json
{
  "devDependencies": {
    "@testing-library/react-native": "^12.4.3",
    "@testing-library/jest-native": "^5.4.3",
    "jest": "^29.7.0",
    "@react-native/babel-preset": "^0.73.20",
    "detox": "^20.17.0"
  }
}
```

**Purpose:**
- `@testing-library/react-native`: Component testing utilities
- `jest`: Test runner
- `detox`: E2E testing framework

**Configuration:**
```json
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-paper)/)',
  ],
};
```

### Linting & Formatting

```json
{
  "devDependencies": {
    "@react-native/eslint-config": "^0.73.2",
    "eslint": "^8.56.0",
    "prettier": "^3.2.4",
    "@typescript-eslint/parser": "^6.19.1",
    "@typescript-eslint/eslint-plugin": "^6.19.1"
  }
}
```

**Configuration:**
```json
// .eslintrc.js
module.exports = {
  root: true,
  extends: '@react-native',
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'react-native/no-inline-styles': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
  },
};
```

```json
// .prettierrc.js
module.exports = {
  arrowParens: 'always',
  bracketSameLine: true,
  bracketSpacing: true,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  semi: true,
};
```

### Build Tools

```json
{
  "devDependencies": {
    "@react-native/metro-config": "^0.73.5",
    "metro-react-native-babel-preset": "^0.77.0",
    "babel-plugin-module-resolver": "^5.0.0"
  }
}
```

**Purpose:**
- Metro bundler configuration
- Babel presets for React Native
- Module resolver for path aliases

**Configuration:**
```javascript
// metro.config.js
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {
  transformer: {
    inlineRequires: true, // Lazy loading for faster startup
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

```javascript
// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/screens': './src/screens',
          '@/services': './src/services',
          '@/stores': './src/stores',
          '@/hooks': './src/hooks',
          '@/utils': './src/utils',
          '@/types': './src/types',
          '@/config': './src/config',
          '@/assets': './src/assets',
        },
      },
    ],
  ],
};
```

## Complete package.json

```json
{
  "name": "pgeu-conference-scanner",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "detox test",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx,json}\"",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf node_modules && npm install && cd ios && pod install",
    "clean:android": "cd android && ./gradlew clean",
    "clean:ios": "cd ios && rm -rf build && pod install",
    "build:android": "cd android && ./gradlew assembleRelease",
    "build:ios": "cd ios && xcodebuild -workspace PGEUConf.xcworkspace -scheme PGEUConf -configuration Release",
    "bundle:android": "cd android && ./gradlew bundleRelease",
    "postinstall": "patch-package"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.6",
    "@react-navigation/native": "^6.1.10",
    "@react-navigation/native-stack": "^6.9.18",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "react-native-screens": "^3.29.0",
    "react-native-safe-area-context": "^4.8.2",
    "react-native-gesture-handler": "^2.14.1",
    "react-native-vision-camera": "^3.9.0",
    "vision-camera-code-scanner": "^0.2.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.17.19",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-keychain": "^8.1.2",
    "axios": "^1.6.7",
    "axios-retry": "^4.0.0",
    "react-native-paper": "^5.12.3",
    "react-native-vector-icons": "^10.0.3",
    "react-native-permissions": "^4.1.0",
    "react-native-device-info": "^10.13.1",
    "date-fns": "^3.3.1",
    "zod": "^3.22.4",
    "react-native-config": "^1.5.1",
    "@sentry/react-native": "^5.17.0"
  },
  "devDependencies": {
    "@babel/core": "^7.23.9",
    "@babel/preset-env": "^7.23.9",
    "@babel/runtime": "^7.23.9",
    "@react-native/babel-preset": "^0.73.20",
    "@react-native/eslint-config": "^0.73.2",
    "@react-native/metro-config": "^0.73.5",
    "@react-native/typescript-config": "^0.73.1",
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-native": "^12.4.3",
    "@types/react": "^18.2.48",
    "@types/react-test-renderer": "^18.0.7",
    "@typescript-eslint/eslint-plugin": "^6.19.1",
    "@typescript-eslint/parser": "^6.19.1",
    "babel-jest": "^29.7.0",
    "babel-plugin-module-resolver": "^5.0.0",
    "detox": "^20.17.0",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "metro-react-native-babel-preset": "^0.77.0",
    "patch-package": "^8.0.0",
    "prettier": "^3.2.4",
    "react-test-renderer": "18.2.0",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=18",
    "npm": ">=9"
  }
}
```

## Dependency Management Best Practices

### Version Pinning Strategy

**Semantic Versioning:**
- `^1.2.3`: Accept minor and patch updates (recommended for most deps)
- `~1.2.3`: Accept only patch updates
- `1.2.3`: Exact version (use for critical dependencies)

**Recommended approach:**
- React Native: Exact version (`0.73.6`)
- React: Exact version (must match RN requirement)
- Navigation libraries: Caret (`^6.1.0`)
- Utilities: Caret (`^1.5.0`)
- DevDependencies: Caret

### Update Strategy

**Check for updates:**
```bash
npm outdated
```

**Update specific package:**
```bash
npm update react-native-paper
```

**Update all packages:**
```bash
# Careful - test thoroughly
npm update
```

**Major version updates:**
```bash
# Use npm-check-updates
npx npm-check-updates -u
npm install
```

### Lockfile Management

**Commit lockfile:**
- Always commit `package-lock.json`
- Ensures consistent installs across team

**Regenerate lockfile:**
```bash
rm package-lock.json
npm install
```

### Patch Management

**Use patch-package for critical fixes:**
```bash
npm install patch-package --save-dev
```

**Create patch:**
```bash
# 1. Modify node_modules/package-name/file.js
# 2. Generate patch
npx patch-package package-name

# 3. Patch saved to patches/package-name+version.patch
# 4. Automatically applied on npm install
```

**Add to package.json:**
```json
{
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

## Native Dependencies (iOS)

**CocoaPods dependencies (auto-generated in Podfile):**

```ruby
# ios/Podfile
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '13.0'

target 'PGEUConf' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true
  )

  # Permissions
  permissions_path = '../node_modules/react-native-permissions/ios'
  pod 'Permission-Camera', :path => "#{permissions_path}/Camera"
  pod 'Permission-LocationWhenInUse', :path => "#{permissions_path}/LocationWhenInUse"

  # Vision Camera
  # Auto-linked

  post_install do |installer|
    react_native_post_install(installer)
  end
end
```

**Update pods:**
```bash
cd ios
pod install
pod update # Only if needed
```

## Native Dependencies (Android)

**Gradle dependencies (auto-linked):**

Most React Native packages auto-link. Manual linking rarely needed.

**If manual linking required:**
```gradle
// android/app/build.gradle
dependencies {
    implementation project(':react-native-custom-package')
}
```

```gradle
// android/settings.gradle
include ':react-native-custom-package'
project(':react-native-custom-package').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-custom-package/android')
```

## Troubleshooting Dependencies

### Common Issues

**1. Metro bundler cache issues:**
```bash
npx react-native start --reset-cache
```

**2. iOS build failures:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
npx react-native run-ios
```

**3. Android build failures:**
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

**4. Node modules corruption:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**5. Xcode DerivedData issues:**
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### Dependency Conflicts

**Check for duplicate dependencies:**
```bash
npm ls package-name
```

**Resolve peer dependency warnings:**
```bash
npm install --legacy-peer-deps
```

## Security Considerations

### Audit Dependencies

**Run security audit:**
```bash
npm audit
```

**Fix vulnerabilities:**
```bash
npm audit fix
```

**Fix with breaking changes:**
```bash
npm audit fix --force
```

### Keep Dependencies Updated

**Schedule regular updates:**
- Monthly: Check for security updates
- Quarterly: Update minor versions
- Annually: Consider major version updates

**Subscribe to security advisories:**
- GitHub security alerts (enabled by default)
- Snyk or similar security scanning

## Performance Considerations

### Bundle Size Impact

**Check bundle size:**
```bash
npx react-native-bundle-visualizer
```

**Reduce bundle size:**
- Use tree-shakeable libraries (date-fns over moment)
- Avoid importing entire libraries (`import { format } from 'date-fns'`)
- Enable Hermes for smaller bundles
- Use ProGuard/R8 on Android

### Startup Performance

**Optimize imports:**
```typescript
// Bad - imports entire library
import _ from 'lodash';

// Good - imports only needed function
import debounce from 'lodash/debounce';
```

**Inline requires in Metro:**
```javascript
// metro.config.js
module.exports = {
  transformer: {
    inlineRequires: true, // Lazy load dependencies
  },
};
```

## Conclusion

This dependency configuration provides:
- Stable, well-maintained libraries
- Good TypeScript support
- Excellent documentation
- Active community support
- Minimal bundle size overhead
- Security best practices

All selected dependencies are:
- Production-ready
- Actively maintained
- Compatible with React Native 0.73
- Support iOS 13+ and Android 6.0+

Regular updates and security audits ensure long-term maintainability.
