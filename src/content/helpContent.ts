/**
 * Help content for end users
 * Organized by screen/context
 */

export interface HelpSection {
  title: string;
  content: string[];
}

export interface HelpContent {
  [key: string]: HelpSection;
}

export const helpContent: HelpContent = {
  gettingStarted: {
    title: 'Getting Started',
    content: [
      'Welcome to PGConf Scanner! This app helps you check in attendees at PostgreSQL conferences.',
      'To get started, you need to add a conference using a special link provided by the conference organizers.',
      'Once added, you can scan attendee QR codes to check them in.',
    ],
  },

  addConference: {
    title: 'Adding a Conference',
    content: [
      'To add a conference, you need a special check-in URL from the conference organizers.',
      'This URL looks like: https://postgresql.eu/events/pgconf2024/checkin/...',
      'Simply paste the URL into the text field and tap "Add Conference".',
      'The conference will be saved and you can start scanning attendees immediately.',
    ],
  },

  conferenceList: {
    title: 'Managing Conferences',
    content: [
      'The main screen displays the active conference at the top and a "Start Scanning" button.',
      'Tap the conference selector at the bottom of the screen to view all conferences and switch between them.',
      'In the conference selector modal, tap on any conference to make it active.',
      'Swipe left on a conference to delete it from your device.',
      'Use the "Add Conference Scan" button to add a new conference.',
    ],
  },

  scanning: {
    title: 'Scanning QR Codes',
    content: [
      'Tap "Start Scanning" to open the camera.',
      'Point your camera at the attendee\'s QR code badge.',
      'The app will automatically read the code and look up the attendee.',
      'Once found, you\'ll see the attendee\'s details on screen.',
      'Review the information and tap the action button to complete:',
      '• Check-In Mode: Tap "Check In"',
      '• Field Check-In Mode: Tap "Confirm {Field}" (e.g., "Confirm T-shirt")',
      '• Sponsor Mode: Enter notes and tap "Save Lead"',
    ],
  },

  attendeeInfo: {
    title: 'Understanding Attendee Information',
    content: [
      'After scanning, you\'ll see details about the attendee:',
      '• Name and Company',
      '• Registration Type (e.g., Full Conference, Speaker)',
      '• T-Shirt Size (if applicable)',
      '• Special Requirements or Notes',
      '• Highlighted badges (e.g., Speaker, Sponsor)',
      'The information shown and action buttons vary by mode:',
      '• Check-In Mode: Shows full details with "Check In" button',
      '• Field Check-In Mode: Shows details with "Confirm {Field}" button',
      '• Sponsor Mode: Shows contact details with notes field and "Save Lead" button',
      'If the attendee is already checked in (check-in modes only), you\'ll see a warning message.',
    ],
  },

  searchAttendees: {
    title: 'Searching for Attendees',
    content: [
      'In Check-In Mode, you can search for attendees by name instead of scanning.',
      'Type the attendee\'s name in the search bar below the "Start Scanning" button.',
      'The app will show matching results as you type.',
      'Tap on a result to view their details and check them in.',
      'Note: Search is only available in Check-In Mode, not in Sponsor or Field modes.',
    ],
  },

  scanningModes: {
    title: 'Scanning Modes',
    content: [
      'The app supports three different scanning modes:',
      '',
      'Check-In Mode: For checking in conference attendees. Shows full attendee details including registration type, t-shirt size, and policy confirmation. Includes search functionality.',
      '',
      'Sponsor Mode: For exhibitors to collect leads. Shows contact information (name, email, company, country) with a notes field to record conversation details.',
      '',
      'Field Check-In Mode: For tracking specific items like badge or t-shirt distribution. Shows condensed attendee information optimized for quick confirmations.',
      '',
      'The mode is determined by the conference URL provided by the organizers.',
    ],
  },

  alreadyCheckedIn: {
    title: 'Already Checked In',
    content: [
      'If you scan someone who has already been checked in, you\'ll see a yellow warning card.',
      'This shows who checked them in and when.',
      'You can still view their details, but the "Check In" button will not be shown.',
      'This prevents duplicate check-ins.',
      'Note: This check only applies to Check-In and Field Check-In modes, not Sponsor Mode.',
    ],
  },

  permissions: {
    title: 'Camera Permissions',
    content: [
      'The app needs camera access to scan QR codes.',
      'If you see a permission error:',
      '1. Open your device Settings',
      '2. Find PGConf Scanner in the app list',
      '3. Enable Camera permission',
      '4. Return to the app and try scanning again',
    ],
  },

  networkErrors: {
    title: 'Connection Problems',
    content: [
      'The app needs internet access to look up attendees.',
      'If you see a network error:',
      '• Check your WiFi or mobile data connection',
      '• Make sure you\'re connected to the internet',
      '• Try scanning again',
      'If problems persist, contact the conference technical support.',
    ],
  },

  troubleshooting: {
    title: 'Troubleshooting',
    content: [
      'QR code not scanning:',
      '• Make sure the code is well-lit and in focus',
      '• Try moving closer or further from the badge',
      '• Clean your camera lens',
      '',
      'Attendee not found:',
      '• Verify the QR code is for this conference',
      '• Check your internet connection',
      '• Contact conference support if the issue persists',
      '',
      'App running slowly:',
      '• Close and restart the app',
      '• Ensure you have a stable internet connection',
      '• Check for app updates',
    ],
  },

  security: {
    title: 'Privacy & Security',
    content: [
      'This app securely connects to the conference registration system.',
      'All attendee data is encrypted during transmission.',
      'Conference URLs contain secure access tokens - do not share them.',
      'The app stores conference information locally on your device.',
      'If you lose your device, remove access via the conference admin panel.',
    ],
  },

  stats: {
    title: 'Statistics',
    content: [
      'The Statistics page shows check-in numbers and other conference metrics.',
      'This feature is available to authorized administrators only.',
      'Pull down to refresh the statistics at any time.',
      'Statistics are organized in tables showing:',
      '• Total attendees and check-in status',
      '• Check-ins by registration type',
      '• Other conference-specific metrics',
      'If you see an error, make sure you have administrator access.',
    ],
  },
};
