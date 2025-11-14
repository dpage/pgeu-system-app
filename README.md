# PGEU PGConf Scanner

[![Tests](https://github.com/dpage/pgeu-system-app/workflows/Tests/badge.svg)](https://github.com/dpage/pgeu-system-app/actions/workflows/test.yml)
[![CI](https://github.com/dpage/pgeu-system-app/workflows/Continuous%20Integration/badge.svg)](https://github.com/dpage/pgeu-system-app/actions/workflows/ci.yml)

A cross-platform mobile application for conference attendee check-in and badge scanning, built with Ionic Framework and Capacitor for iOS and Android.

## Overview

The PGEU PGConf Scanner is a professional conference management tool used by PostgreSQL Europe and related organizations to:

- **Check in attendees** at conference registration using QR code scanning
- **Scan sponsor badges** to capture attendee interactions at sponsor booths
- **Manage field check-ins** for special events (t-shirt distribution, training sessions, etc.)
- **View real-time statistics** on check-in progress (admin users)

This Ionic application replaces the legacy Android-only app, expanding support to iOS while modernizing the codebase with current best practices and web technologies.

## Platform Support

- **iOS:** 14.0 and later
- **Android:** 11 (API 30) and later

**Architecture Principles:**
- Modern, non-deprecated APIs only
- TypeScript strict mode for type safety
- Secure token storage using platform keychains
- Network-first design (no offline mode)

## Key Features

### Three Scanning Modes

1. **Check-in Processing**
   - Scan attendee tickets (ID$ tokens)
   - View attendee details with field highlighting
   - Confirm registration and mark attendance

2. **Sponsor Badge Scanning**
   - Scan attendee badges at sponsor booths (AT$ tokens)
   - Add and edit notes for each scan
   - Track sponsor-attendee interactions

3. **Field Check-in**
   - Specialized check-ins for logistics (t-shirts, meals, training)
   - Field-specific workflows (AT$ tokens with field ID)

### Multi-Conference Support

- Manage multiple conferences simultaneously
- Add conferences via deep link or manual URL
- Switch between conferences seamlessly
- Persistent conference selection

### Additional Features

- Attendee search by name (check-in mode)
- Real-time statistics dashboard (admin only)
- Deep linking for easy setup
- Dark mode support
- Full accessibility support (screen readers, large text)

## Technology Stack

**Core Framework:**
- Ionic Framework 8.7.9
- Capacitor 7.4.2
- React 19.0.0
- TypeScript 5.8.3 (strict mode)
- Vite (build tool)

**Key Dependencies:**
- **UI Components:** @ionic/react (Ionic UI components)
- **Camera & QR:** @capacitor/camera + @capacitor-mlkit/barcode-scanning
- **Networking:** Axios with retry interceptors
- **Storage:** @capacitor/preferences (app data), @capacitor/secure-storage-plugin (secure tokens)
- **State Management:** Zustand (global state)
- **Routing:** Ionic React Router (built on React Router)
- **Icons:** Ionicons
- **Asset Generation:** @capacitor/assets

## Project Structure

```
pgeu-system-app/
├── src/
│   ├── api/              # API client and services
│   ├── components/       # Reusable UI components
│   ├── pages/            # Ionic page components
│   ├── services/         # Business logic services
│   ├── store/            # State management (Zustand)
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Helper functions
│   ├── theme/            # Theme and styling
│   └── constants/        # App-wide constants
├── public/               # Static assets
├── ios/                  # iOS native code (Capacitor)
├── android/              # Android native code (Capacitor)
├── src-react-native/     # Archived React Native implementation
└── .claude/              # Comprehensive project documentation
```

## Getting Started

### Prerequisites

- **Node.js** 18+ LTS
- **Xcode** 15+ (for iOS development, macOS only)
- **Android Studio** (for Android development)
- **Java 17** (for Android builds)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pgeu-system-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Sync native platforms**
   ```bash
   npx cap sync
   ```

4. **Run the app**

   **iOS:**
   ```bash
   npm run ios
   ```
   Or open `ios/App/App.xcworkspace` in Xcode and run

   **Android:**
   ```bash
   npm run android
   ```
   Or open the `android/` folder in Android Studio and run

### Development

**Type checking:**
```bash
npm run typecheck
```

**Linting:**
```bash
npm run lint
```

**Testing:**
```bash
npm test                # Run tests once
npm run test:watch      # Run tests in watch mode
npm run test:ui         # Run tests with UI
npm run test:coverage   # Run tests with coverage report
```

**Build:**
```bash
npm run build           # Build for production
npx cap sync           # Sync changes to native projects
```

## Backend Integration

The app integrates with the [pgeu-system](https://github.com/pgeu/pgeu-system) Django backend for:

- Conference status and metadata
- Attendee lookup and search
- Check-in/scan operations
- Statistics (admin users)

**Authentication:** Token-based (embedded in conference URLs)
**API Format:** REST with `application/x-www-form-urlencoded` POST bodies
**Domain Support:** Any domain hosting a compatible pgeu-system backend

See [.claude/backend-scanner-api-analysis.md](.claude/backend-scanner-api-analysis.md) for complete API documentation.

## Documentation

Comprehensive documentation is available in the `.claude/` directory:

### Start Here
- **[MIGRATION_OVERVIEW.md](.claude/MIGRATION_OVERVIEW.md)** - Project overview
- **[quick-reference.md](.claude/quick-reference.md)** - Quick lookup guide

### Backend & API
- **[api-integration-guide.md](.claude/api-integration-guide.md)** - API reference
- **[backend-scanner-api-analysis.md](.claude/backend-scanner-api-analysis.md)** - Backend deep-dive

### Legacy Implementations
- **[android-app-comprehensive-analysis.md](.claude/android-app-comprehensive-analysis.md)** - Original Android app analysis
- **[src-react-native/](.src-react-native/)** - Archived React Native implementation

## QR Code Formats

### Check-in Ticket
```
ID$[40-char-hex-token]$ID
or
https://{domain}/t/id/{token}/

Test token: ID$TESTTESTTESTTEST$ID
```

### Sponsor/Field Badge
```
AT$[40-char-hex-token]$AT
or
https://{domain}/t/at/{token}/

Test token: AT$TESTTESTTESTTEST$AT
```

## Deep Linking

The app supports deep linking for easy conference scan setup:

**Check-in:**
```
https://{domain}/events/{event}/checkin/{token}/
```

**Field Check-in:**
```
https://{domain}/events/{event}/checkin/{token}/f{fieldId}/
```

**Sponsor Scanning:**
```
https://{domain}/events/sponsor/scanning/{token}/
```

**Setup Requirements:**
- iOS: Associated Domains + Universal Links
- Android: App Links verification + Digital Asset Links

## App Store Deployment

### iOS App Store
- Privacy Manifest (PrivacyInfo.xcprivacy)
- Camera permission usage description
- TestFlight beta testing
- Age rating: 4+

### Google Play Store
- Data Safety declarations completed
- Target SDK 34 (Android 14) minimum
- 64-bit native libraries
- Age rating: Everyone

## Contributing

Development follows these principles:

1. **No deprecated APIs** - Only use current, supported APIs and features
2. **TypeScript strict mode** - All code must be properly typed
3. **Test coverage** - New features must include tests
4. **Accessibility** - All UI must be screen reader compatible
5. **Platform parity** - Features must work on both iOS and Android

## Security

- **Tokens:** Stored in platform keychains (iOS Keychain, Android Keystore)
- **Network:** HTTPS only (localhost excepted for development)
- **Logging:** Tokens and sensitive data sanitized from logs
- **Permissions:** Camera access only, with clear user consent

## Support

For issues related to:

- **App functionality:** Check documentation in `.claude/` directory
- **Backend API:** See [pgeu-system repository](https://github.com/pgeu/pgeu-system)
- **Original Android app:** See [android-PGConfScanner repository](https://github.com/pgeu/android-PGConfScanner)

## License

[License information to be added]

## Project Status

**Current Phase:** Active Development
**Last Updated:** 2025-11-10

---

**Built with:** Ionic Framework | Capacitor | TypeScript | React
**Platforms:** iOS 14+ | Android 11+ (API 30+)
**Organizations:** PostgreSQL Europe, PostgreSQL US, PGEvents Canada, PGDay UK
