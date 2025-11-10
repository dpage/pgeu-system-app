# App Store Compliance Guide

**Note:** Offline mode has been removed from requirements. All scanning operations require active network connectivity.

## Overview

This document provides comprehensive guidance for ensuring the conference scanner app meets all requirements for Apple App Store and Google Play Store approval on first submission.

## Apple App Store Requirements

### App Store Connect Setup

**Required Information:**

1. **App Information**
   - Name: "PGConf Scanner" (or final name)
   - Subtitle: "QR Code Check-in for Events" (max 30 chars)
   - Primary Language: English
   - Category: Primary - Business, Secondary - Productivity
   - Age Rating: 4+ (no objectionable content)

2. **Privacy Policy**
   - **Required**: URL to hosted privacy policy
   - Must be accessible without login
   - Must cover all data collection practices
   - Example location: https://pgeuconf.com/privacy

3. **App Review Information**
   - Contact Information: Phone and email for app review team
   - Demo Account: Provide test credentials for reviewers
   - Notes:
     ```
     This app is used by conference organizers to check in attendees via QR code scanning.

     Test Account:
     Username: reviewer@example.com
     Password: TestPass123!

     Test Conference Setup Link:
     pgeuconf://setup/test-token-12345

     The app requires camera access for QR code scanning. Active network
     connectivity is required for all check-in operations. The app includes
     retry logic for handling temporary network issues.
     ```

4. **Version Information**
   - Copyright: "2024 PostgreSQL Europe" (or appropriate)
   - Version: 1.0.0
   - Build: Auto-incremented

### Privacy Manifest (iOS 17+)

**PrivacyInfo.xcprivacy** (Required in ios/ folder):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Tracking -->
    <key>NSPrivacyTracking</key>
    <false/>

    <!-- Tracking Domains (empty - no tracking) -->
    <key>NSPrivacyTrackingDomains</key>
    <array/>

    <!-- Collected Data Types -->
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <!-- User Authentication -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeEmailAddress</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <!-- Device ID for offline queue -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeDeviceID</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>

    <!-- Accessed API Types -->
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <!-- File Timestamp APIs -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>C617.1</string> <!-- App displaying timestamps to user -->
            </array>
        </dict>
        <!-- User Defaults APIs -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string> <!-- App accessing user defaults -->
            </array>
        </dict>
    </array>
</dict>
</plist>
```

### Permission Usage Descriptions (Info.plist)

**Required descriptions with clear justification:**

```xml
<!-- Camera Permission (REQUIRED) -->
<key>NSCameraUsageDescription</key>
<string>Camera access is required to scan QR codes on attendee badges for conference check-in.</string>

<!-- Photo Library Permission (OPTIONAL - only if allowing photo selection) -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Photo library access allows you to select and scan QR codes from saved images.</string>

<!-- Location Permission (OPTIONAL - only for field check-in feature) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Location is used to verify field check-ins are performed at the conference venue.</string>

<!-- Face ID (if using biometric auth) -->
<key>NSFaceIDUsageDescription</key>
<string>Face ID is used to securely unlock the app and protect attendee data.</string>
```

**DO NOT include permissions you don't use** - Apple will reject if you request unnecessary permissions.

### Required Capabilities

**Xcode > Signing & Capabilities:**

1. **Required:**
   - Associated Domains (for Universal Links)
     - `applinks:pgeuconf.com`
     - `applinks:www.pgeuconf.com`

2. **Optional (based on features):**
   - Background Modes (only if needed)
     - Background fetch (for offline queue sync)
   - Keychain Sharing (if sharing with other apps)

### App Store Review Guidelines Compliance

**Key areas to address:**

1. **Guideline 2.1 - App Completeness**
   - App must be fully functional
   - No placeholder content
   - Include proper error messages
   - Provide test account that works

2. **Guideline 2.3 - Accurate Metadata**
   - Screenshots show actual app UI
   - Description matches functionality
   - Keywords relevant to features

3. **Guideline 4.0 - Design**
   - Follows iOS Human Interface Guidelines
   - Uses standard iOS UI components where appropriate
   - Proper safe area handling (notches, Dynamic Island)
   - Native navigation patterns

4. **Guideline 5.1.1 - Privacy**
   - Privacy Policy required
   - Clear data collection disclosure
   - Permission requests with clear explanations
   - No access to contacts/photos without clear reason

5. **Guideline 5.1.2 - Data Use and Sharing**
   - Don't use device data for advertising
   - No unauthorized data collection
   - Secure data transmission (HTTPS)

### App Privacy Questionnaire

**Data Collection Questions (in App Store Connect):**

1. **Contact Info**
   - Email Address: YES
   - Purpose: App Functionality, Developer Communications
   - Linked to User: YES
   - Used for Tracking: NO

2. **Identifiers**
   - Device ID: YES
   - Purpose: App Functionality (offline queue identification)
   - Linked to User: NO
   - Used for Tracking: NO

3. **Usage Data**
   - Product Interaction: YES (scan counts)
   - Purpose: Analytics
   - Linked to User: YES
   - Used for Tracking: NO

4. **Health & Fitness**: NO
5. **Financial Info**: NO
6. **Location**: OPTIONAL (only if field check-in enabled)
   - Precise Location: YES
   - Purpose: App Functionality (verify venue location)
   - Linked to User: NO
   - Used for Tracking: NO

7. **Contacts**: NO
8. **User Content**: NO
9. **Browsing History**: NO
10. **Search History**: NO
11. **Sensitive Info**: NO

### App Screenshots Requirements

**Required screenshot sizes:**
- 6.7" (iPhone 14 Pro Max, 15 Plus): 1290 x 2796
- 6.5" (iPhone 11 Pro Max, XS Max): 1242 x 2688
- 5.5" (iPhone 8 Plus): 1242 x 2208

**Recommended screenshots (5-10):**
1. Scanner screen showing camera view with QR code
2. Successful check-in confirmation
3. Attendee search results
4. Statistics dashboard
5. Offline queue showing pending syncs
6. Conference selection screen
7. Settings/configuration screen

**Screenshot guidelines:**
- Show actual app functionality (no mockups)
- Status bar can be visible or hidden
- No device frames required (App Store adds them)
- Use representative data (not lorem ipsum)
- Ensure proper safe area handling is visible

### Export Compliance

**App Store Connect Question:**
"Is your app designed to use cryptography or does it contain or incorporate cryptography?"

**Answer: YES**

**Reason:** App uses HTTPS (which uses encryption)

**Follow-up:** "Does your app qualify for any of the exemptions provided in Category 5, Part 2 of the U.S. Export Administration Regulations?"

**Answer: YES**

**Exemption:** Standard cryptographic protocols (HTTPS/TLS)

**No ITR (Import/Export) documentation needed** for standard HTTPS usage.

### App Review Timeline

**Typical process:**
1. Submit for review
2. "In Review" within 24-48 hours
3. Review takes 24-48 hours
4. Approval or Rejection notification

**Common rejection reasons:**
1. App crashes or doesn't work
2. Test credentials don't work
3. Missing or incorrect privacy policy
4. Permissions not properly justified
5. UI doesn't match guidelines

## Google Play Store Requirements

### Google Play Console Setup

**Required Information:**

1. **App Details**
   - App name: "PGConf Scanner" (max 50 characters)
   - Short description: "Fast QR code check-in for conference attendees" (max 80 characters)
   - Full description: (max 4000 characters)
     ```
     PGConf Scanner is a professional event management tool designed for conference organizers, volunteers, and sponsors.

     KEY FEATURES:
     • Fast QR code scanning for attendee check-in
     • Multiple scanning modes: Check-in, Sponsor badges, Field verification
     • Works offline with automatic sync when connection restored
     • Real-time statistics and attendance tracking
     • Attendee search and lookup
     • Multi-conference support

     PERFECT FOR:
     • Conference organizers managing attendee registration
     • Event volunteers at registration desks
     • Sponsors tracking booth visitors
     • Field staff verifying credentials

     SECURE & RELIABLE:
     • Secure authentication with token storage
     • Offline queue ensures no check-in is lost
     • Fast scanning with instant feedback
     • Privacy-focused with minimal data collection

     Designed specifically for PostgreSQL Europe conferences and similar events.
     ```

   - Category: Business
   - Tags: conference, event, qr code, scanner, check-in, event management

2. **Content Rating**
   - Complete questionnaire
   - Expected rating: Everyone
   - No violence, sex, drugs, gambling, etc.

3. **Target Audience**
   - Age range: 18+
   - Not designed for children

4. **Privacy Policy**
   - URL: https://pgeuconf.com/privacy
   - Must be accessible without authentication

5. **App Access**
   - Requires login: YES
   - Provide test credentials:
     ```
     Username: reviewer@example.com
     Password: TestPass123!
     Conference Setup: Use deep link or provide step-by-step instructions
     ```

### Data Safety Declaration

**Required in Play Console > App content > Data safety**

**Data Collection:**

1. **Location**
   - Collected: Optional (only if field check-in enabled)
   - Approximate location: NO
   - Precise location: YES
   - Usage: App functionality (verify venue location)
   - Optional: YES (can use app without)
   - Shared: NO
   - Ephemeral: YES (not stored long-term)

2. **Personal Info**
   - Email address: YES
   - Usage: App functionality, Account management
   - Shared: NO
   - Deletable: YES (via account deletion)

3. **App Info and Performance**
   - Crash logs: YES
   - Diagnostics: YES
   - Usage: Analytics, App functionality
   - Shared: YES (with Sentry or analytics provider)

4. **Device or Other IDs**
   - Device ID: YES
   - Usage: App functionality (offline queue tracking)
   - Shared: NO

**Security Practices:**

- Data encrypted in transit: YES (HTTPS)
- Data encrypted at rest: YES (Keystore)
- Users can request data deletion: YES
- Committed to Google Play Families Policy: NO
- Independent security review: NO (optional for this app type)

### Permissions Declaration

**AndroidManifest.xml permissions and their justifications:**

```xml
<!-- REQUIRED PERMISSIONS -->
<uses-permission android:name="android.permission.CAMERA" />
<!-- Justification: Scan QR codes on attendee badges -->

<uses-permission android:name="android.permission.INTERNET" />
<!-- Justification: Communicate with conference management server -->

<!-- OPTIONAL PERMISSIONS -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<!-- Justification: Verify field check-ins at venue location -->
<!-- Mark as optional in build.gradle -->

<!-- AUTOMATICALLY GRANTED -->
<uses-permission android:name="android.permission.WAKE_LOCK" />
<!-- Justification: Keep screen on during scanning -->
```

**In Play Console, explain each permission:**

Camera:
```
Required to scan QR codes on attendee badges for conference check-in. This is the primary function of the app. The camera is only active on the scanner screen and can be manually enabled/disabled.
```

Location (if used):
```
Optional feature for field check-in verification. Location is only accessed when performing field check-ins to verify the user is at the conference venue. Location is not tracked or stored beyond the check-in event.
```

### Store Listing Assets

**Required Graphics:**

1. **App Icon**
   - Size: 512 x 512 px
   - Format: 32-bit PNG
   - No transparency
   - Square shape (Play Store applies circle mask)

2. **Feature Graphic**
   - Size: 1024 x 500 px
   - Format: JPG or 24-bit PNG (no transparency)
   - Shows at top of store listing
   - Include app name and tagline

3. **Phone Screenshots**
   - Required: Minimum 2, Maximum 8
   - Size: 16:9 or 9:16 ratio
   - Min dimension: 320px
   - Max dimension: 3840px
   - Format: JPG or 24-bit PNG

**Recommended screenshots:**
1. Scanner screen with camera view
2. Successful check-in confirmation
3. Attendee search
4. Statistics dashboard
5. Offline queue view
6. Conference selection

4. **Tablet Screenshots** (Optional but recommended)
   - 7-inch tablet: 1024 x 600 or higher
   - 10-inch tablet: 1920 x 1200 or higher

### App Signing Configuration

**Play App Signing (Recommended):**

1. **Opt-in to Play App Signing**
   - Google manages release signing key
   - You keep upload key for builds
   - Better security, easier key management

2. **Generate Upload Key:**
```bash
keytool -genkey -v -keystore upload-key.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

3. **Configure gradle.properties:**
```properties
MYAPP_UPLOAD_STORE_FILE=upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=upload
MYAPP_UPLOAD_STORE_PASSWORD=****
MYAPP_UPLOAD_KEY_PASSWORD=****
```

4. **First release:** Upload APK/AAB, Google generates release key
5. **Subsequent releases:** Sign with upload key, Google re-signs with release key

### Android App Bundle (AAB)

**Use AAB instead of APK:**

```gradle
// Build AAB
./gradlew bundleRelease

// Output: android/app/build/outputs/bundle/release/app-release.aab
```

**Benefits:**
- Smaller downloads (dynamic delivery)
- Required for new apps (Play Store policy)
- Automatic APK generation for different devices

### Testing Tracks

**Use testing tracks before production:**

1. **Internal Testing**
   - Up to 100 testers
   - Instant deployment
   - Use for QA team

2. **Closed Testing (Alpha/Beta)**
   - Email list or Google Groups
   - Use for beta testers
   - Get feedback before public release

3. **Open Testing**
   - Anyone can join
   - Use for public beta

4. **Production**
   - Live for all users
   - Use staged rollout (10% → 50% → 100%)

### Play Store Review Process

**Review timeline:**
- First review: 1-7 days (typically 1-3 days)
- Updates: Few hours to 2 days
- Faster than Apple typically

**Common rejection reasons:**
1. Privacy policy missing or inaccessible
2. Permissions not justified in Data Safety
3. App crashes on test devices
4. Metadata doesn't match app functionality
5. Missing required declarations

### Pre-Launch Report

**Google automatically tests your app:**
- Tests on multiple devices
- Checks for crashes
- Accessibility testing
- Security vulnerabilities

**Review report before publishing:**
- Fix any crashes found
- Address security issues
- Ensure accessibility compliance

## Privacy Policy Requirements

### Required Content

**Your privacy policy must include:**

1. **Introduction**
   - What this policy covers
   - Who operates the app
   - Contact information

2. **Data Collection**
   ```
   We collect the following information:
   - Email address (for authentication)
   - Device identifier (for crash reporting)
   - Location data (optional, only for field check-in)
   - Usage statistics (scan counts, app version)
   ```

3. **How Data is Used**
   ```
   Your data is used to:
   - Authenticate your access to conference data
   - Process attendee check-ins
   - Provide statistics on conference attendance
   - Improve app performance and fix bugs
   ```

4. **Data Sharing**
   ```
   We share data with:
   - Conference organizers (check-in data only)
   - Analytics providers (anonymous usage data)
   - Crash reporting service (error logs)

   We DO NOT:
   - Sell your data to third parties
   - Use your data for advertising
   - Share personally identifiable information
   ```

5. **Data Storage and Security**
   ```
   - Authentication tokens stored in device Keychain/Keystore
   - All network communication encrypted with HTTPS
   - Data stored on secure servers
   - Regular security audits
   ```

6. **Data Retention**
   ```
   - Account data retained while account active
   - Check-in data retained per conference requirements
   - Can request data deletion by contacting support
   ```

7. **User Rights**
   ```
   You have the right to:
   - Access your data
   - Request data correction
   - Request data deletion
   - Opt-out of optional features (location)
   ```

8. **Children's Privacy**
   ```
   This app is not intended for children under 13 (or 16 in EU).
   We do not knowingly collect data from children.
   ```

9. **Changes to Policy**
   ```
   We may update this policy. Continued use constitutes acceptance.
   Last updated: [DATE]
   ```

10. **Contact Information**
    ```
    Questions about privacy:
    Email: privacy@pgeuconf.com
    Address: [Physical address if required]
    ```

### GDPR Compliance (if serving EU users)

**Additional requirements:**

1. **Legal Basis for Processing**
   - Contract: Data needed to provide service
   - Legitimate Interest: Analytics, fraud prevention
   - Consent: Optional features (location)

2. **Data Protection Officer** (if required)
   - Contact information
   - DPO email

3. **Right to Data Portability**
   - Provide data in machine-readable format

4. **Right to be Forgotten**
   - Account deletion process
   - Data removal timeline (30 days)

## App Review Preparation Checklist

### iOS App Store

- [ ] Privacy policy URL accessible
- [ ] PrivacyInfo.xcprivacy file included in Xcode project
- [ ] All permission usage descriptions in Info.plist
- [ ] Universal Links configured and verified (.well-known file)
- [ ] Test account credentials work
- [ ] App doesn't crash on launch
- [ ] All features functional without errors
- [ ] Screenshots show actual app (5-10 images)
- [ ] App icon at all required sizes
- [ ] Export compliance answered correctly
- [ ] Privacy questionnaire completed accurately
- [ ] App review notes explain functionality
- [ ] No placeholder content in app
- [ ] Proper safe area handling (test on notched device)

### Google Play Store

- [ ] Privacy policy URL accessible
- [ ] Data safety section completed
- [ ] All permissions justified
- [ ] Test account credentials work
- [ ] App doesn't crash (test on multiple devices)
- [ ] Feature graphic created (1024x500)
- [ ] App icon (512x512)
- [ ] Screenshots (minimum 2 phone screenshots)
- [ ] Full description written
- [ ] Short description written
- [ ] Content rating questionnaire completed
- [ ] Target audience declared
- [ ] Store listing reviewed for typos
- [ ] AAB built and tested
- [ ] ProGuard rules configured (no crashes in release build)
- [ ] Pre-launch report reviewed and issues fixed

## Common Rejection Scenarios & Solutions

### iOS Rejections

**Guideline 2.1 - App Completeness**
- Problem: App crashes on specific feature
- Solution: Test all features thoroughly, add error handling

**Guideline 5.1.1 - Privacy**
- Problem: Permission usage description too vague
- Solution: Clearly explain why permission is needed

**Guideline 4.2 - Minimum Functionality**
- Problem: App too simple or not providing value
- Solution: Ensure app demonstrates clear value for target users

### Android Rejections

**Permissions Policy**
- Problem: Requesting permissions not used
- Solution: Remove unused permissions from AndroidManifest.xml

**Privacy Policy**
- Problem: Privacy policy link broken or doesn't cover all data
- Solution: Verify link works, ensure all collected data documented

**Misleading Content**
- Problem: Store description doesn't match app functionality
- Solution: Ensure screenshots and description accurately represent app

## Post-Approval Best Practices

### iOS

1. **Staged Rollout**
   - Release to small percentage first
   - Monitor crash reports
   - Increase rollout if stable

2. **Update Strategy**
   - Submit updates during weekdays
   - Avoid major releases on Fridays
   - Plan for 24-48 hour review time

### Android

1. **Staged Rollout**
   - Start with 10% of users
   - Increase to 50% after 1-2 days
   - Full rollout after 3-5 days

2. **Monitor Pre-Launch Reports**
   - Check for crashes on new devices
   - Review security scan results

3. **Update Strategy**
   - Updates reviewed faster than initial submission
   - Can roll back if issues detected

## Conclusion

App store compliance requires:
- Accurate privacy documentation
- Clear permission justifications
- Thorough testing on physical devices
- Complete metadata and assets
- Functional test accounts for reviewers

By following this guide, you should achieve first-submission approval for both iOS App Store and Google Play Store. If rejected, carefully read the rejection reason, make requested changes, and resubmit promptly.

Key to success:
- Be transparent about data collection
- Provide working test credentials
- Ensure app is fully functional
- Follow platform design guidelines
- Justify all requested permissions
