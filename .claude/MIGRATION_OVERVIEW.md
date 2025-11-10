# PGEU PGConf Scanner - Ionic + Capacitor Migration

**Last Updated:** 2025-11-10
**Status:** Migration in Progress - Cleaned up React Native, initializing Ionic + Capacitor
**Technology Stack:** Ionic Framework + Capacitor

## Executive Summary

This project is migrating the pgeu-system Android conference scanner application to a cross-platform solution using Ionic Framework with Capacitor, enabling support for both iOS and Android platforms.

### Technology Decision: React Native → Ionic + Capacitor

**Previous Attempt:** React Native 0.76.9
**Current Direction:** Ionic Framework + Capacitor

**Reason for Change:**
React Native 0.76.9 introduced breaking changes to the JavaScript engine architecture. When attempting to use JavaScriptCore (JSC) instead of Hermes, the app experienced critical runtime crashes due to library consolidation (`libjscexecutor.so` merged into `libreactnative.so`). These issues persisted across both the old and new React Native architectures, making the platform unstable for production use.

The decision was made to pivot to Ionic + Capacitor, which offers:
- Stable, mature web-based framework
- Excellent documentation and community support
- Familiar React development model (using React)
- Proven track record for enterprise applications
- Better camera and QR scanning plugin ecosystem
- More predictable deployment and app store submission process

## Goals

1. **Platform Expansion**: Support iOS 14+ and Android 11+ (API 30+)
2. **App Store Compliance**: Meet all requirements for Google Play Store and Apple App Store
3. **Feature Parity**: Maintain all existing functionality from the Android app
4. **Modern Architecture**: Build using Ionic 8+ and Capacitor 6+ best practices
5. **Enhanced User Experience**: Improved error handling, accessibility, and visual polish

## Current State

### What Has Been Completed

1. **React Native Cleanup (November 10, 2025)**
   - Removed `android/` directory (React Native Android project)
   - Removed `ios/` directory (React Native iOS project)
   - Removed React Native configuration files:
     - `metro.config.js`
     - `babel.config.js`
     - `index.js`
     - `.watchmanconfig`
   - Updated `package.json` to remove React Native dependencies
   - Archived React Native documentation to `.claude/archive/react-native/`

2. **Preserved Assets**
   - Application source code in `src/` (TypeScript/React components)
   - Backend integration documentation
   - API documentation and analysis
   - Project structure and architecture learnings

### What Remains

The following files and directories are intact and will be adapted for Ionic:

```
/Users/dpage/git/pgeu-system-app/
├── src/                           # Application code (needs adaptation to Ionic)
├── .claude/                       # Documentation
│   ├── archive/react-native/      # Archived React Native docs
│   ├── android-app-comprehensive-analysis.md
│   ├── api-integration-guide.md
│   ├── backend-scanner-api-analysis.md
│   └── react-native-backend-integration.md
├── package.json                   # Updated for Ionic
└── tsconfig.json                  # TypeScript configuration
```

## Migration to Ionic + Capacitor

### Technology Stack

**Core Framework:**
- Ionic Framework 8.x (React variant)
- Capacitor 6.x (native runtime)
- React 18.x
- TypeScript 5.x (strict mode)

**Key Dependencies:**
- **Camera/QR Scanning:** `@capacitor-community/barcode-scanner` or `capacitor-mlkit-barcode-scanning`
- **Networking:** Axios with retry interceptors (same as planned for RN)
- **Storage:** `@capacitor/preferences` for settings, `@capacitor/secure-storage-plugin` for tokens
- **State Management:** Zustand (UI state) + React Query (server state)
- **UI Components:** Ionic Components (Material Design)
- **Routing:** React Router (integrated with Ionic)
- **Error Reporting:** Sentry

### Architecture Approach

The application will maintain the service-oriented architecture previously planned:

1. **Service Layer**
   - API services for backend communication
   - Storage services for local persistence
   - Clear separation of concerns
   - Retry logic with exponential backoff

2. **Type-Safe Development**
   - TypeScript strict mode
   - Runtime validation with Zod
   - Shared types between API and UI

3. **Platform-Agnostic Business Logic**
   - 95%+ code sharing between platforms
   - Platform-specific code handled by Capacitor plugins
   - Web-based UI renders natively on both platforms

4. **Network-First Design**
   - All scanning operations require active network
   - Clear network status indicators
   - Graceful error handling for network failures

### Existing Android Application

**Version:** 1.5.4
**Platform:** Android 6.0+ (API 23-35)
**Language:** Java 8

#### Core Features to Migrate

1. **Three Scanning Modes:**
   - Check-in processing (ID$ tokens)
   - Sponsor badge scanning (AT$ tokens)
   - Field check-in for logistics (AT$ tokens)

2. **Multi-Conference Support:**
   - PostgreSQL Europe
   - PostgreSQL US
   - PGEvents Canada
   - PGDay UK

3. **Deep Link Setup:** Seamless conference registration via QR code

4. **Search Functionality:** Find attendees without QR codes

5. **Statistics Dashboard:** Admin view of check-in progress

See `.claude/android-app-comprehensive-analysis.md` for complete details.

### Backend Integration

**Platform:** Django-based pgeu-system
**Location:** `/Users/dpage/git/pgeu-system/postgresqleu/`

The backend API is well-documented and will work identically with Ionic as it would have with React Native. Key integration points:

- **Authentication:** Token-based (no session cookies)
- **Data Format:** POST requests require `application/x-www-form-urlencoded`
- **Endpoints:** Three main APIs (Check-in, Field Check-in, Sponsor Scanning)

See `.claude/backend-scanner-api-analysis.md` for API details.

## Next Steps

### Immediate Actions

1. **Install Ionic CLI and Initialize Project**
   ```bash
   npm install -g @ionic/cli
   ionic start PGConfScanner blank --type=react --capacitor
   ```

2. **Add Capacitor Platforms**
   ```bash
   ionic capacitor add ios
   ionic capacitor add android
   ```

3. **Install Core Dependencies**
   - Barcode scanning plugin
   - Secure storage
   - Network detection
   - Axios for HTTP
   - React Query for data fetching
   - Zustand for state management

4. **Adapt Existing Source Code**
   - Convert React Native components to Ionic components
   - Replace React Native APIs with Capacitor plugins
   - Update navigation from React Navigation to React Router
   - Adapt styling to Ionic's design system

5. **Set Up Development Environment**
   - Configure iOS development (Xcode 15+)
   - Configure Android development (Android Studio)
   - Set up emulators/simulators
   - Configure live reload

### Migration Phases

#### Phase 1: Foundation (Weeks 1-2)
- Project initialization and configuration
- Deep linking setup (iOS Universal Links + Android App Links)
- Conference management and token storage
- Basic navigation structure

#### Phase 2: Core Scanning (Weeks 3-4)
- Camera permissions and barcode scanning
- QR code detection and parsing
- Check-in flow implementation
- Attendee lookup and display

#### Phase 3: Additional Features (Weeks 5-6)
- Search functionality
- Sponsor scanning mode
- Field check-in mode
- Statistics dashboard

#### Phase 4: Polish & Testing (Weeks 7-8)
- Error handling and retry logic
- Dark mode and accessibility
- Network status monitoring
- Performance optimization

#### Phase 5: Deployment (Weeks 9-10)
- App store preparation
- TestFlight/Internal Testing beta
- App Store and Play Store submission

## App Store Compliance

### iOS Requirements
- Privacy Manifest for iOS 17+
- Camera usage descriptions
- Data collection declarations
- Universal Links configuration

### Android Requirements
- Target SDK 34+ (Android 14)
- Data Safety declarations
- Deep Links configuration
- Permission justifications

See archived React Native docs for detailed compliance checklists (requirements remain the same).

## Lessons Learned from React Native Attempt

### What Went Wrong

1. **React Native 0.76.9 JSC Issues:**
   - `libjscexecutor.so` library missing (merged into `libreactnative.so`)
   - Runtime crashes on both old and new architecture
   - Inadequate documentation for JSC usage in 0.76+
   - Hermes-first approach made JSC a second-class citizen

2. **Time Investment:**
   - Multiple days spent troubleshooting build and runtime issues
   - Unclear error messages and debugging difficulty
   - Frequent architecture changes in React Native ecosystem

### Why Ionic + Capacitor is Better

1. **Stability:**
   - Mature framework with years of production use
   - Web standards-based (fewer platform-specific issues)
   - Predictable upgrade path

2. **Development Experience:**
   - Familiar React development model
   - Standard web debugging tools
   - Live reload works consistently
   - Better error messages

3. **Plugin Ecosystem:**
   - Well-maintained official plugins
   - Clear documentation
   - Capacitor's focus on web-to-native bridge is simpler than React Native's approach

4. **App Store Success:**
   - Many successful apps in both stores
   - Well-documented submission process
   - Fewer platform-specific compliance issues

## Documentation Structure

```
.claude/
├── MIGRATION_OVERVIEW.md                      # This file
├── archive/
│   └── react-native/                          # React Native attempt (archived)
├── android-app-comprehensive-analysis.md      # Existing Android app
├── api-integration-guide.md                   # Backend API reference
├── backend-scanner-api-analysis.md            # Backend details
└── agents/
    ├── pgeu-system-expert.md                  # Backend expert
    └── pgeu-scanner-expert.md                 # Original Android app expert
```

## Resources

### Ionic + Capacitor Resources
- [Ionic Framework Documentation](https://ionicframework.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Ionic React Documentation](https://ionicframework.com/docs/react)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)

### pgeu-system Resources
- **Backend Codebase:** `/Users/dpage/git/pgeu-system/`
- **Android App Codebase:** `/Users/dpage/git/android-PGConfScanner/`
- **API Documentation:** Preserved in `.claude/backend-scanner-api-analysis.md`

### React Native Archive
- **Archived Documentation:** `.claude/archive/react-native/`
- **Reason for Archive:** React Native 0.76.9 JSC incompatibility issues
- **Date Archived:** November 10, 2025

## Conclusion

After encountering insurmountable runtime issues with React Native 0.76.9, the project has pivoted to Ionic Framework with Capacitor. This technology stack provides:

✅ Stable, production-ready framework
✅ Excellent documentation and tooling
✅ Familiar React development model
✅ Strong plugin ecosystem for native features
✅ Proven app store submission success
✅ Lower risk of platform-specific issues

The foundation has been cleared, dependencies cleaned up, and the project is ready to begin implementation with Ionic + Capacitor.

---

**Document Version:** 2.0
**Last Updated:** November 10, 2025
**Technology:** Ionic Framework + Capacitor (React variant)
**Previous Version:** React Native 0.76.9 (abandoned due to JSC compatibility issues)
