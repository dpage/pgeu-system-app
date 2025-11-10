# pgeu-system Scanner Backend API Analysis

**Document Version:** 1.0
**Date:** 2025-11-08
**Backend Repository:** https://github.com/pgeu/pgeu-system
**Analyzed Codebase:** /Users/dpage/git/pgeu-system

> **Note for React Native Migration:** The React Native app will NOT include offline mode. All API calls require active network connectivity.

## Overview

The pgeu-system backend provides three distinct scanner API endpoints for conference check-in and sponsor badge scanning. This document provides a comprehensive analysis of the backend implementation to guide the React Native mobile app development.

---

## 1. Backend Implementation

### 1.1 Core Files

**Check-in APIs:**
- **File:** `/postgresqleu/confreg/checkin.py` (407 lines)
- **URL Config:** `/postgresqleu/urls.py` (lines 131-135, 381-382)
- **Functions:**
  - `landing()` - Landing page for check-in processors
  - `checkin()` - Main check-in page
  - `checkin_field()` - Field-specific check-in page
  - `api()` - Main check-in API endpoint
  - `checkin_field_api()` - Field check-in API endpoint
  - `checkin_token()` - Handle ID token scans
  - `badge_token()` - Handle public token scans

**Sponsor Scanning APIs:**
- **File:** `/postgresqleu/confsponsor/scanning.py`
- **URL Config:** `/postgresqleu/confsponsor/urls.py` (lines 19-24, 59)
- **Functions:**
  - `sponsor_scanning()` - Sponsor dashboard for managing scanners
  - `scanning_page()` - Scanner app page
  - `scanning_api()` - Sponsor scanning API endpoint
  - `landing()` - Scanner landing page with QR codes

**Models:**
- **File:** `/postgresqleu/confreg/models.py`
  - `Conference` - Conference configuration
  - `ConferenceRegistration` - Attendee registrations
  - `ConferenceRegistrationLog` - Audit log
- **File:** `/postgresqleu/confsponsor/models.py`
  - `SponsorScanner` - Sponsor scanner configuration
  - `ScannedAttendee` - Scanned badge records

### 1.2 URL Patterns

```python
# Main URLs (/postgresqleu/urls.py)

# Check-in landing page (requires login)
/events/{confname}/checkin/

# Check-in processor page
/events/{confname}/checkin/{regtoken}/

# Check-in API endpoint
/events/{confname}/checkin/{regtoken}/api/{what}/

# Field check-in page
/events/{confname}/checkin/{regtoken}/f{fieldname}/

# Field check-in API endpoint
/events/{confname}/checkin/{regtoken}/f{fieldname}/api/{what}/

# Token handling endpoints
/t/id/{idtoken}/                    # ID token (check-in)
/t/at/{publictoken}/                # Public token (badge scan)
/t/at/{publictoken}/{what}/         # Badge scan with scanner choice

# Badge scan landing page
/events/{confname}/badgescan/
```

```python
# Sponsor URLs (/postgresqleu/confsponsor/urls.py)

# Sponsor dashboard for managing scanners
/events/sponsor/{sponsorid}/scanning/

# Download scanned attendees CSV
/events/sponsor/{sponsorid}/scanning/download.csv/

# Scanner app page (token-based)
/events/sponsor/scanning/{scannertoken}/

# Sponsor scanning API
/events/sponsor/scanning/{scannertoken}/api/{what}/

# Admin scan status
/events/sponsor/admin/{confname}/badgescanstatus/
```

---

## 2. Authentication & Authorization

### 2.1 Token Types

**Three distinct token types are used:**

1. **regtoken** (64 hex chars)
   - Used to authenticate check-in processors
   - Identifies which conference registration has check-in permissions
   - Generated on registration creation: `generate_random_token()`
   - Stored in: `ConferenceRegistration.regtoken`

2. **idtoken** (64 hex chars)
   - Used for attendee check-in (ID badge)
   - Encoded in QR code as: `{SITEBASE}/t/id/{idtoken}/`
   - Generated on registration: `generate_random_token()`
   - Stored in: `ConferenceRegistration.idtoken`
   - Property helper: `ConferenceRegistration.fullidtoken()`

3. **publictoken** (64 hex chars)
   - Used for badge scanning (public token)
   - Encoded in QR code as: `{SITEBASE}/t/at/{publictoken}/`
   - Generated on registration: `generate_random_token()`
   - Stored in: `ConferenceRegistration.publictoken`
   - Property helper: `ConferenceRegistration.fullpublictoken()`

4. **scannertoken** (64 hex chars)
   - Used for sponsor scanner authentication
   - Generated when sponsor adds a scanner: `generate_random_token()`
   - Stored in: `SponsorScanner.token`

### 2.2 Token Generation

**Location:** `/postgresqleu/confreg/views.py` (line 387)

```python
reg = ConferenceRegistration(conference=conference, attendee=request.user, registrator=request.user)
reg.email = request.user.email.lower()
reg.firstname = request.user.first_name
reg.lastname = request.user.last_name
reg.created = timezone.now()
reg.regtoken = generate_random_token()      # Check-in processor auth
reg.idtoken = generate_random_token()       # Attendee ID badge
reg.publictoken = generate_random_token()   # Public badge scan
```

**Token Format:** 64 hexadecimal characters (256 bits of entropy)

### 2.3 Permission Model

**Check-in Processors:**

```python
# File: /postgresqleu/confreg/checkin.py
def _get_checkin(request, urlname, regtoken):
    conference = get_conference_or_404(urlname)
    reg = get_object_or_404(ConferenceRegistration,
                            conference=conference,
                            regtoken=regtoken)

    # Permission check
    if not reg.checkinprocessors_set.filter(pk=conference.pk).exists():
        raise PermissionDenied()

    is_admin = conference.administrators.filter(pk=reg.attendee_id).exists()
    return (conference, reg, is_admin)
```

**Key points:**
- `regtoken` must belong to a valid `ConferenceRegistration`
- That registration must be in the conference's `checkinprocessors` M2M field
- Admins get additional privileges (stats access)

**Sponsor Scanners:**

```python
# File: /postgresqleu/confsponsor/scanning.py
def scanning_api(request, scannertoken, what):
    scanner = get_object_or_404(SponsorScanner, token=scannertoken)
    sponsor = scanner.sponsor
    # Scanner automatically has permission via valid token
```

**Key points:**
- `scannertoken` must exist in `SponsorScanner.token`
- Sponsor must have `BadgeScanning` benefit claimed and confirmed
- Conference must have `askbadgescan=True`

### 2.4 CSRF Exemption

**Both API endpoints are CSRF-exempt:**

```python
@csrf_exempt
@global_login_exempt
def api(request, urlname, regtoken, what):
    # Check-in API

@csrf_exempt
@global_login_exempt
def checkin_field_api(request, urlname, regtoken, fieldname, what):
    # Field check-in API

@csrf_exempt
@global_login_exempt
def scanning_api(request, scannertoken, what):
    # Sponsor scanning API
```

This allows mobile apps to make API calls without Django session cookies.

---

## 3. Data Models

### 3.1 Conference Model

**File:** `/postgresqleu/confreg/models.py`

```python
class Conference(models.Model):
    # Scanner configuration
    checkinactive = models.BooleanField(
        default=False,
        verbose_name="Check-in active"
    )

    askbadgescan = models.BooleanField(
        default=False,
        verbose_name="Field: badge scanning",
        help_text="Include field for allowing sponsors to scan badge"
    )

    scannerfields = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Scanning properties",
        help_text="Dynamic properties used in the badge scanner interface"
    )

    checkinprocessors = models.ManyToManyField(
        'ConferenceRegistration',
        blank=True,
        related_name="checkinprocessors_set",
        verbose_name="Check-in processors",
        help_text="Users who process checkins"
    )

    # Helper property
    @property
    def scannerfields_list(self):
        return [f for f in self.scannerfields.split(',') if f != '']
```

**Scanner fields format:**
- Comma-separated list of field names
- Example: `"breakfast,lunch,dinner"`
- Used for dynamic check-in tracking (e.g., meal tracking)

### 3.2 ConferenceRegistration Model

**File:** `/postgresqleu/confreg/models.py`

```python
class ConferenceRegistration(models.Model):
    # Core fields
    conference = models.ForeignKey(Conference, on_delete=models.CASCADE)
    regtype = models.ForeignKey(RegistrationType, on_delete=models.CASCADE)
    attendee = models.ForeignKey(User, null=True, on_delete=models.CASCADE)

    # Personal information
    firstname = models.CharField(max_length=100)
    lastname = models.CharField(max_length=100)
    email = LowercaseEmailField()
    company = models.CharField(max_length=100, blank=True)
    country = models.ForeignKey(Country, null=True, on_delete=models.CASCADE)
    phone = models.CharField(max_length=100, blank=True)

    # Conference-specific fields
    shirtsize = models.ForeignKey(ShirtSize, null=True, on_delete=models.CASCADE)
    dietary = models.CharField(max_length=100, blank=True)
    additionaloptions = models.ManyToManyField(ConferenceAdditionalOption, blank=True)
    twittername = models.CharField(max_length=100, blank=True)
    nick = models.CharField(max_length=100, blank=True)
    pronouns = models.IntegerField(default=0, choices=PRONOUNS_CHOICES)

    # Privacy & consent
    badgescan = models.BooleanField(
        default=True,
        verbose_name="Allow sponsors to scan badge"
    )
    shareemail = models.BooleanField(
        default=False,
        verbose_name="Share e-mail with sponsors"
    )
    photoconsent = models.BooleanField(
        null=True,
        verbose_name="Consent to photos"
    )
    policyconfirmedat = models.DateTimeField(null=True, blank=True)

    # Check-in tracking
    checkedinat = models.DateTimeField(null=True, blank=True)
    checkedinby = models.ForeignKey(
        'ConferenceRegistration',
        null=True,
        on_delete=models.CASCADE,
        verbose_name="Checked in by"
    )

    # Tokens (64 hex chars each)
    regtoken = models.TextField(unique=True)        # Check-in processor auth
    idtoken = models.TextField(unique=True)         # Attendee ID badge
    publictoken = models.TextField(unique=True)     # Public badge scan

    # Dynamic properties (JSON field)
    dynaprops = models.JSONField(default=dict, blank=True)

    # Queue management
    queuepartition = models.CharField(max_length=10, blank=True)

    # Payment tracking
    payconfirmedat = models.DateTimeField(null=True, blank=True)
    canceledat = models.DateTimeField(null=True, blank=True)

    # Registration type check-in message
    checkinmessage = models.TextField(blank=True)

    # Helper methods
    @property
    def fullname(self):
        return f"{self.firstname} {self.lastname}"

    def fullidtoken(self):
        return f"{settings.SITEBASE}/t/id/{self.idtoken}/"

    def fullpublictoken(self):
        return f"{settings.SITEBASE}/t/at/{self.publictoken}/"
```

**Key validation criteria:**
- `payconfirmedat IS NOT NULL` - Registration is confirmed/paid
- `canceledat IS NULL` - Registration is not canceled

### 3.3 SponsorScanner Model

**File:** `/postgresqleu/confsponsor/models.py`

```python
class SponsorScanner(models.Model):
    sponsor = models.ForeignKey(Sponsor, on_delete=models.CASCADE)
    scanner = models.ForeignKey(ConferenceRegistration, on_delete=models.CASCADE)
    token = models.TextField(unique=True)

    class Meta:
        unique_together = (('sponsor', 'scanner'),)
```

**Business rules:**
- Each scanner (ConferenceRegistration) can only be added once per sponsor
- Scanner must have a connected user account (`attendee IS NOT NULL`)
- Scanner must be a confirmed, non-canceled registration
- Cannot delete scanner if they have already scanned badges

### 3.4 ScannedAttendee Model

**File:** `/postgresqleu/confsponsor/models.py`

```python
class ScannedAttendee(models.Model):
    sponsor = models.ForeignKey(Sponsor, on_delete=models.CASCADE)
    scannedby = models.ForeignKey(
        ConferenceRegistration,
        related_name='scanned_attendees',
        on_delete=models.CASCADE
    )
    attendee = models.ForeignKey(
        ConferenceRegistration,
        related_name='scanned_by',
        on_delete=models.CASCADE
    )
    scannedat = models.DateTimeField(auto_now_add=True)
    firstscan = models.BooleanField(default=True)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ('-scannedat',)
        unique_together = (('sponsor', 'scannedby', 'attendee'),)
```

**Key behaviors:**
- `scannedat` is automatically set on creation
- `firstscan` flag is used to track if the scan is new or a note update
- `unique_together` prevents duplicate scans by same scanner for same attendee
- Notes can be updated after initial scan

---

## 4. API Endpoints

### 4.1 Check-in API

**Base URL:** `/events/{confname}/checkin/{regtoken}/api/{what}/`

**Authentication:** URL-based via `regtoken`

#### 4.1.1 Status Endpoint

**Request:**
```
GET /events/{confname}/checkin/{regtoken}/api/status/
```

**Response:**
```json
{
  "user": "username",
  "name": "John Doe",
  "active": true,
  "activestatus": "Check-in active",
  "confname": "PostgreSQL Conference 2025",
  "admin": false
}
```

**Fields:**
- `user` - Username of the check-in processor
- `name` - Full name of the check-in processor
- `active` - Boolean: is check-in currently active? (`conference.checkinactive`)
- `activestatus` - Human-readable status message
- `confname` - Conference name
- `admin` - Boolean: is this user a conference administrator?

**Notes:**
- This endpoint works even when `checkinactive=False`
- Used by app to verify authentication and check conference status

#### 4.1.2 Lookup Endpoint

**Request:**
```
GET /events/{confname}/checkin/{regtoken}/api/lookup/?lookup={token_url}
```

**Parameters:**
- `lookup` - Full token URL or just the token part
  - Full: `https://domain.com/t/id/abc123.../`
  - Short: `abc123...`

**Response:**
```json
{
  "reg": {
    "id": 123,
    "name": "Jane Smith",
    "type": "Conference Attendee",
    "company": "ACME Corp",
    "tshirt": "XL",
    "additional": ["Workshop A", "Lunch"],
    "token": "abc123...",
    "highlight": ["policyconfirmed", "checkinmessage"],
    "photoconsent": "Photos OK",
    "policyconfirmed": "Policy NOT confirmed",
    "checkinmessage": "VIP attendee - provide welcome package",
    "partition": "A",
    "already": {
      "title": "Attendee already checked in",
      "body": "Attendee was checked in by John Doe at 2025-11-08 09:30:00."
    }
  }
}
```

**Field details:**
- `id` - Registration ID
- `name` - Attendee full name
- `type` - Registration type name
- `company` - Company name (may be empty)
- `tshirt` - T-shirt size (may be null)
- `additional` - Array of additional option names
- `token` - The idtoken (same as looked up)
- `highlight` - Array of field names that should be highlighted in UI
- `photoconsent` - Present only if `conference.askphotoconsent=True`
- `policyconfirmed` - Present only if `conference.confirmpolicy=True`
- `checkinmessage` - Present only if there's a message (from regtype or registration)
- `partition` - Queue partition (for managing check-in queues)
- `already` - Present only if attendee is already checked in

**Error responses:**
- `404` - Token not found or invalid
- `412` - Check-in not open (only if `checkinactive=False`)

#### 4.1.3 Search Endpoint

**Request:**
```
GET /events/{confname}/checkin/{regtoken}/api/search/?search={query}
```

**Parameters:**
- `search` - Search query (name parts)

**Search behavior:**
- Splits query by whitespace
- Each part must match either firstname or lastname (case-insensitive)
- All parts must match (AND logic)
- Example: "john doe" matches "John Doe" or "Doe, John"

**Response:**
```json
{
  "regs": [
    {
      "id": 123,
      "name": "John Doe",
      "type": "Conference Attendee",
      "company": "ACME Corp",
      "tshirt": "L",
      "additional": ["Workshop B"],
      "token": "def456...",
      "highlight": [],
      "partition": "B"
    }
  ]
}
```

**Notes:**
- Returns array of registrations (can be empty)
- Only includes confirmed, non-canceled registrations
- Same `reg` structure as lookup endpoint

#### 4.1.4 Store Endpoint (Check-in)

**Request:**
```
POST /events/{confname}/checkin/{regtoken}/api/store/
Content-Type: application/x-www-form-urlencoded

token={token_url_or_short}
```

**Parameters:**
- `token` - Full URL or short form of idtoken

**Response (success):**
```json
{
  "reg": {
    "id": 123,
    "name": "Jane Smith",
    "type": "Conference Attendee",
    "company": "ACME Corp",
    "tshirt": "XL",
    "additional": ["Workshop A"],
    "token": "abc123...",
    "highlight": []
  },
  "message": "Attendee Jane Smith checked in successfully.",
  "showfields": true
}
```

**Response (already checked in):**
```
HTTP 412 Precondition Failed
Already checked in.
```

**Response (check-in not open):**
```
HTTP 412 Precondition Failed
Check-in not open
```

**Side effects:**
```python
reg.checkedinat = timezone.now()
reg.checkedinby = user  # The check-in processor
reg.save()
```

**Notes:**
- `showfields=true` indicates the app should display field details
- Database transaction ensures atomicity

#### 4.1.5 Stats Endpoint (Admin only)

**Request:**
```
GET /events/{confname}/checkin/{regtoken}/api/stats/
```

**Permission:** Requires `admin=true` (conference administrator)

**Response:**
```json
[
  [
    ["Registration types", "Done", "Left"],
    [
      ["Conference Attendee", 120, 30],
      ["Speaker", 25, 5],
      ["Total", 145, 35]
    ]
  ],
  [
    ["Check in users", "Done", ""],
    [
      ["john_doe", 50, null],
      ["jane_smith", 95, null]
    ]
  ],
  [
    ["Latest checkins", "By", "Who"],
    [
      ["8th 09:30:15", "john_doe", "Alice Johnson"],
      ["8th 09:28:42", "jane_smith", "Bob Williams"]
    ]
  ]
]
```

**Structure:**
- Array of table data
- Each table: `[headers, rows]`
- Headers: Array of column names
- Rows: Array of row arrays

**Tables provided:**
1. **Registration types** - Breakdown by type (with ROLLUP total)
2. **Check-in users** - Count per check-in processor
3. **Latest checkins** - Last 10 check-ins with timestamp and names

**Notes:**
- Uses timezone-aware formatting
- Non-admin users get 404

### 4.2 Field Check-in API

**Base URL:** `/events/{confname}/checkin/{regtoken}/f{fieldname}/api/{what}/`

**Authentication:** URL-based via `regtoken`

**Field validation:** `fieldname` must be in `conference.scannerfields_list`

#### 4.2.1 Status Endpoint

**Request:**
```
GET /events/{confname}/checkin/{regtoken}/f{fieldname}/api/status/
```

**Response:**
```json
{
  "user": "username",
  "name": "John Doe",
  "active": true,
  "activestatus": "Check-in active",
  "confname": "PostgreSQL Conference 2025",
  "fieldname": "breakfast",
  "admin": false
}
```

**Additional field:**
- `fieldname` - The field being tracked

#### 4.2.2 Lookup Endpoint

**Request:**
```
GET /events/{confname}/checkin/{regtoken}/f{fieldname}/api/lookup/?lookup={token_url}
```

**Parameters:**
- `lookup` - Public token URL or short form
  - Full: `https://domain.com/t/at/xyz789.../`
  - Short: `xyz789...`

**Response:**
```json
{
  "reg": {
    "id": 123,
    "name": "Jane Smith",
    "type": "Conference Attendee",
    "company": "ACME Corp",
    "tshirt": "XL",
    "additional": ["Workshop A"],
    "token": "xyz789...",
    "highlight": [],
    "already": {
      "title": "Field breakfast already marked",
      "body": "Field breakfast already marked at 2025-11-08 08:15:23"
    }
  }
}
```

**Notes:**
- Uses `publictoken` instead of `idtoken`
- `already` appears if field is already set in `dynaprops`

#### 4.2.3 Store Endpoint (Field tracking)

**Request:**
```
POST /events/{confname}/checkin/{regtoken}/f{fieldname}/api/store/
Content-Type: application/x-www-form-urlencoded

token={token_url_or_short}
```

**Response:**
```json
{
  "reg": {
    "id": 123,
    "name": "Jane Smith",
    "type": "Conference Attendee",
    "tshirt": "XL",
    "additional": [],
    "token": "xyz789...",
    "highlight": []
  },
  "message": "Field breakfast marked for attendee Jane Smith."
}
```

**Side effects:**
```python
from postgresqleu.util.time import datetime_string

reg.dynaprops[fieldname] = datetime_string(timezone.now())
reg.save(update_fields=['dynaprops'])

# Also logs the action
reglog(reg, f"Marked scanner field {fieldname}", user.attendee)
```

**dynaprops structure:**
```json
{
  "breakfast": "2025-11-08 08:15:23",
  "lunch": "2025-11-08 12:30:45"
}
```

**Notes:**
- Stores ISO timestamp string in JSONField
- Allows re-scanning (updates timestamp)
- Logs every scan for audit trail

### 4.3 Sponsor Scanning API

**Base URL:** `/events/sponsor/scanning/{scannertoken}/api/{what}/`

**Authentication:** URL-based via `scannertoken`

**Prerequisites:**
- Sponsor must have `BadgeScanning` benefit claimed and confirmed
- Conference must have `askbadgescan=True`

#### 4.3.1 Status Endpoint

**Request:**
```
GET /events/sponsor/scanning/{scannertoken}/api/status/
```

**Response:**
```json
{
  "scanner": "username",
  "name": "John Doe for ACME Corporation",
  "sponsorname": "ACME Corporation",
  "confname": "PostgreSQL Conference 2025",
  "active": true,
  "admin": false,
  "activestatus": ""
}
```

**Fields:**
- `scanner` - Username of the scanner
- `name` - "{scanner fullname} for {sponsor name}"
- `sponsorname` - Sponsor display name
- `confname` - Conference name
- `active` - Always `true` (badges can always be scanned)
- `admin` - Always `false` (no admin concept for sponsor scanning)
- `activestatus` - Always empty string

#### 4.3.2 Lookup Endpoint

**Request:**
```
GET /events/sponsor/scanning/{scannertoken}/api/lookup/?lookup={token_url}
```

**Parameters:**
- `lookup` - Public token URL or short form
  - Full: `https://domain.com/t/at/xyz789.../`
  - Short: `xyz789...`

**Response (new scan):**
```json
{
  "reg": {
    "name": "Jane Smith",
    "company": "ACME Corp",
    "country": "United States",
    "email": "jane@acme.com",
    "note": "",
    "token": "xyz789...",
    "highlight": []
  },
  "message": "Attendee Jane Smith scan stored successfully.",
  "showfields": false
}
```

**Response (already scanned):**
```json
{
  "reg": {
    "name": "Jane Smith",
    "company": "ACME Corp",
    "country": "United States",
    "email": "jane@acme.com",
    "note": "Interested in product demo",
    "token": "xyz789...",
    "highlight": []
  },
  "message": "Attendee Jane Smith scan stored successfully.",
  "showfields": false
}
```

**Error responses:**
```
HTTP 404 - "Attendee not found"
HTTP 403 - "Attendee has not authorized badge scanning"
HTTP 403 - "Attendee registration is canceled"
```

**Side effects:**
The lookup endpoint actually creates the scan record:

```python
scan, created = ScannedAttendee.objects.get_or_create(
    sponsor=sponsor,
    scannedby=scanner.scanner,
    attendee=r
)

if not created and scan.firstscan:
    scan.firstscan = False
    scan.save(update_fields=['firstscan'])
```

**Notes:**
- Lookup CREATES the scan record (different from check-in API)
- Returns existing note if previously scanned
- `firstscan` flag is cleared on second lookup

#### 4.3.3 Store Endpoint (Update note)

**Request:**
```
POST /events/sponsor/scanning/{scannertoken}/api/store/
Content-Type: application/x-www-form-urlencoded

token={token_url_or_short}
note={optional_note}
```

**Response (first scan):**
```json
{
  "reg": {
    "name": "Jane Smith",
    "company": "ACME Corp",
    "country": "United States",
    "email": "jane@acme.com",
    "note": "Interested in product demo",
    "token": "xyz789...",
    "highlight": []
  },
  "message": "Attendee Jane Smith scan stored successfully.",
  "showfields": false
}
```

**HTTP Status:** `201 Created` (first scan) or `208 Already Reported` (update)

**Response (note update):**
```json
{
  "reg": {
    "name": "Jane Smith",
    "company": "ACME Corp",
    "country": "United States",
    "email": "jane@acme.com",
    "note": "Updated note text",
    "token": "xyz789...",
    "highlight": []
  },
  "message": "Attendee Jane Smith has already been stored. The note has been updated.",
  "showfields": false
}
```

**HTTP Status:** `208 Already Reported`

**Side effects:**
```python
scan, created = ScannedAttendee.objects.get_or_create(
    sponsor=sponsor,
    scannedby=scanner.scanner,
    attendee=r,
    defaults={'note': request.POST.get('note')}
)

if not created:
    update = []
    if scan.note != request.POST.get('note'):
        scan.note = request.POST.get('note')
        update.append('note')

    if scan.firstscan:
        scan.firstscan = False
        update.append('firstscan')

    if update:
        scan.save(update_fields=update)
```

**Notes:**
- Can be called multiple times to update note
- `firstscan` flag tracks if this is truly the first scan
- Note can be empty string

---

## 5. Business Logic & Validation

### 5.1 Check-in Validation

**Registration must meet ALL criteria:**

```python
# From checkin.py lookup endpoint
r = get_object_or_404(ConferenceRegistration,
    conference=conference,
    payconfirmedat__isnull=False,    # Must be paid/confirmed
    canceledat__isnull=True,          # Must not be canceled
    idtoken=token                      # Token must match
)
```

**Additional check-in rules:**

1. **Active check-in required** (except for status/stats):
```python
if not conference.checkinactive and what != 'stats':
    return HttpResponse("Check-in not open", status=412)
```

2. **Prevent double check-in:**
```python
if reg.checkedinat:
    return HttpResponse("Already checked in.", status=412)
```

3. **Authorization:**
```python
if not reg.checkinprocessors_set.filter(pk=conference.pk).exists():
    raise PermissionDenied()
```

### 5.2 Field Check-in Validation

**Field name validation:**
```python
if fieldname not in conference.scannerfields_list:
    raise Http404()
```

**Public token validation:**
```python
r = get_object_or_404(ConferenceRegistration,
    conference=conference,
    payconfirmedat__isnull=False,
    canceledat__isnull=True,
    publictoken=token
)
```

**No duplicate prevention:**
- Fields can be rescanned (timestamp updates)
- No HTTP 412 error for already-scanned

### 5.3 Sponsor Scanning Validation

**Sponsor scanner authorization:**
```python
scanner = get_object_or_404(SponsorScanner, token=scannertoken)
sponsor = scanner.sponsor

# Implicit: token existence proves authorization
```

**Attendee validation:**
```python
def _get_scanned_attendee(sponsor, token):
    attendee = get_object_or_404(ConferenceRegistration,
        conference=sponsor.conference,
        publictoken=token
    )

    if not attendee.badgescan:
        return HttpResponse("Attendee has not authorized badge scanning", status=403)

    if attendee.canceledat:
        return HttpResponse("Attendee registration is canceled", status=403)

    return attendee
```

**Key differences from check-in:**
- Does NOT require `payconfirmedat` check (but attendee must be registered)
- Checks `badgescan` flag (privacy consent)
- No concept of "active" scanning (always allowed)

### 5.4 Token Parsing

**Both full URL and short form accepted:**

```python
import re
from django.conf import settings

_tokenmatcher = re.compile(r'^{}/t/id/([^/]+)/$'.format(settings.SITEBASE))
_publictokenmatcher = re.compile(r'^{}/t/at/([^/]+)/$'.format(settings.SITEBASE))

# In API handlers:
token = request.GET.get('lookup')
m = _tokenmatcher.match(token)
if m:
    token = m.group(1)  # Extract just the token part
```

**Example transformations:**
- Input: `https://example.com/t/id/abc123.../` → Extract: `abc123...`
- Input: `abc123...` → Use directly: `abc123...`

### 5.5 Audit Logging

**Check-in logging:**
```python
# Automatic via model save
reg.checkedinat = timezone.now()
reg.checkedinby = user
reg.save()
```

**Field scan logging:**
```python
from postgresqleu.confreg.util import reglog

reglog(reg, "Marked scanner field {}".format(fieldname), user.attendee)
```

**Sponsor scan logging:**
```python
# Automatic via ScannedAttendee model
ScannedAttendee.objects.create(
    sponsor=sponsor,
    scannedby=scanner.scanner,
    attendee=attendee,
    scannedat=timezone.now(),  # auto_now_add
    note=note
)
```

---

## 6. Configuration & Admin

### 6.1 Conference Configuration

**Admin interface fields:**

```python
class Conference(models.Model):
    # Enable/disable check-in
    checkinactive = models.BooleanField(
        default=False,
        verbose_name="Check-in active"
    )

    # Enable sponsor badge scanning
    askbadgescan = models.BooleanField(
        default=False,
        verbose_name="Field: badge scanning"
    )

    # Define dynamic fields (comma-separated)
    scannerfields = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Scanning properties"
    )

    # Assign check-in processors
    checkinprocessors = models.ManyToManyField(
        'ConferenceRegistration',
        blank=True,
        related_name="checkinprocessors_set"
    )

    # Conference administrators
    administrators = models.ManyToManyField(
        User,
        blank=True
    )
```

**Scanner fields examples:**
- Empty: No field scanning available
- `"breakfast"`: Single field for breakfast tracking
- `"breakfast,lunch,dinner"`: Three meal fields
- `"swag,tshirt,badge"`: Registration desk items

### 6.2 Check-in Processor Setup

**Steps to add a check-in processor:**

1. Attendee must have a confirmed registration
2. Admin adds their registration to `conference.checkinprocessors`
3. Processor can access landing page: `/events/{confname}/checkin/`
4. Landing page displays:
   - QR code for main check-in scanner
   - QR codes for each scanner field (if configured)
   - Test QR code (`TESTTESTTESTTEST`)

**Landing page code:**
```python
@login_required
def landing(request, urlname):
    conference = get_conference_or_404(urlname)
    reg = get_object_or_404(ConferenceRegistration,
        conference=conference,
        attendee=request.user
    )

    if not reg.checkinprocessors_set.filter(pk=conference.pk).exists():
        raise PermissionDenied()

    link = "{}/events/{}/checkin/{}/".format(
        settings.SITEBASE,
        conference.urlname,
        reg.regtoken
    )

    links = [
        ('Check-in' if conference.scannerfields else None, link, generate_base64_qr(link, 5, 100)),
    ]

    for f in conference.scannerfields.split(','):
        if f:
            fieldlink = '{}f{}/'.format(link, f)
            links.append(
                (f.title(), fieldlink, generate_base64_qr(fieldlink, 5, 100)),
            )

    return render_conference_response(...)
```

### 6.3 Sponsor Scanner Setup

**Steps to add a sponsor scanner:**

1. Sponsor must have `BadgeScanning` benefit
2. Sponsor admin accesses: `/events/sponsor/{sponsorid}/scanning/`
3. Add scanner by email address
4. System validates:
   - Email matches a confirmed registration
   - Registration has connected user account
   - Not already a scanner for this sponsor
5. System creates `SponsorScanner` with random token
6. Sponsor can email instructions to scanner
7. Scanner accesses: `/events/{confname}/badgescan/`
8. Scanner gets QR code linking to: `/events/sponsor/scanning/{scannertoken}/`

**Sponsor dashboard features:**
- Add/remove scanners
- View all scanned attendees
- Delete individual scans
- Download scanned list as CSV
- Email instructions to scanners

---

## 7. Token Generation & QR Codes

### 7.1 Token Generation

**Source:** `/postgresqleu/util/random.py`

```python
def generate_random_token():
    # Returns 64 hexadecimal characters (256 bits)
    return secrets.token_hex(32)
```

**Properties:**
- 256 bits of cryptographic randomness
- Hex encoding (0-9, a-f)
- Unique database constraint
- Collision probability: negligible

### 7.2 QR Code Generation

**Source:** `/postgresqleu/util/qr.py`

```python
from postgresqleu.util.qr import generate_base64_qr

# Parameters: (data, version, size)
qr_code = generate_base64_qr(url, version=5, size=100)
```

**Usage in landing pages:**
```python
# Check-in scanner QR
link = "{}/events/{}/checkin/{}/".format(
    settings.SITEBASE,
    conference.urlname,
    reg.regtoken
)
qr = generate_base64_qr(link, 5, 100)

# Field scanner QR
fieldlink = "{}f{}/".format(link, fieldname)
qr = generate_base64_qr(fieldlink, 5, 100)

# Test QR code
test_qr = generate_base64_qr(
    "{}/t/id/TESTTESTTESTTEST/".format(settings.SITEBASE),
    2,
    150
)

# Sponsor scanner QR
sponsor_link = "{}/events/sponsor/scanning/{}/".format(
    settings.SITEBASE,
    scanner.token
)
qr = generate_base64_qr(sponsor_link, 5, 200)

# Sponsor test QR
test_qr = generate_base64_qr(
    "{}/t/at/TESTTESTTESTTEST/".format(settings.SITEBASE),
    2,
    150
)
```

### 7.3 Badge QR Codes

**Attendee ID token:**
```
https://domain.com/t/id/{idtoken}/
```

**Attendee public token:**
```
https://domain.com/t/at/{publictoken}/
```

**Format:**
- Printed on attendee badges
- ID token: for check-in
- Public token: for sponsor scanning
- Both redirect to appropriate handler

**Token routing:**
```python
# /postgresqleu/urls.py
re_path(r'^t/id/([a-z0-9]+|TESTTESTTESTTEST)/$',
    postgresqleu.confreg.checkin.checkin_token),

re_path(r'^t/at/(?P<scanned_token>[a-z0-9]+|TESTTESTTESTTEST)/(?P<what>\w+/)?$',
    postgresqleu.confreg.checkin.badge_token),
```

**Special test token:**
- `TESTTESTTESTTEST` works for both ID and public token
- Returns success message without database lookup
- Used for testing scanner functionality

---

## 8. Limitations & Considerations

### 8.1 Performance

**No explicit rate limiting:**
- APIs do not have rate limiting middleware
- Database queries use `get_object_or_404` (no prefetch optimization)
- Statistics endpoint may be slow with large conferences

**Optimization opportunities:**
```python
# Current: N+1 queries for additional options
_get_reg_json(r)  # Calls r.additionaloptions.all()

# Better: Prefetch in search
ConferenceRegistration.objects.filter(...).select_related(
    'regtype', 'shirtsize', 'country'
).prefetch_related('additionaloptions')
```

**Concurrent check-ins:**
- No locking mechanism
- Potential race condition on `reg.save()`
- Low risk due to unique constraint on `idtoken`

### 8.2 Network & Offline Behavior

**No offline support:**
- All API calls require network connectivity
- No queue-and-retry mechanism
- Apps should implement local caching

**Transaction handling:**
- Check-in uses atomic transactions
- Sponsor scanning uses atomic transactions
- Network interruption mid-request may cause inconsistency

**Recommendations for mobile app:**
1. Cache scanned tokens locally
2. Implement retry logic with exponential backoff
3. Show network status indicator
4. Queue operations when offline
5. Sync when connection restored

### 8.3 Data Privacy

**Attendee consent:**
```python
class ConferenceRegistration(models.Model):
    badgescan = models.BooleanField(
        default=True,
        verbose_name="Allow sponsors to scan badge"
    )
```

**Privacy rules:**
- Sponsor scanning checks `badgescan` flag
- Check-in ignores `badgescan` (internal use)
- Email sharing controlled by separate `shareemail` flag
- Photo consent tracked separately (`photoconsent`)

**Data exposed to sponsors:**
- Name (always)
- Company (always)
- Country (always)
- Email (only if `badgescan=True`)

**Data exposed to check-in processors:**
- All registration data
- Payment status
- Additional options
- Check-in history

### 8.4 Token Security

**Token characteristics:**
- 256-bit entropy (strong)
- Unique database constraint
- No expiration (tokens are permanent)
- No IP-based restrictions

**Attack vectors:**
- Token leakage via QR code photos
- Token reuse if badge is stolen
- No revocation mechanism (except deleting registration)

**Mitigations:**
- HTTPS required for all API calls
- CSRF exemption requires careful CORS handling
- Database constraints prevent token reuse across registrations

### 8.5 Database Constraints

**Unique constraints:**
```python
# ConferenceRegistration
regtoken = models.TextField(unique=True)
idtoken = models.TextField(unique=True)
publictoken = models.TextField(unique=True)

# SponsorScanner
token = models.TextField(unique=True)
unique_together = (('sponsor', 'scanner'),)

# ScannedAttendee
unique_together = (('sponsor', 'scannedby', 'attendee'),)
```

**Implications:**
- Cannot check in same attendee twice
- Cannot scan same attendee twice by same scanner
- Tokens never collide (cryptographic guarantee)

---

## 9. Recent Changes & API Stability

### 9.1 API Version

**No formal versioning:**
- APIs do not have version numbers
- Breaking changes are avoided
- New features added additively

**Stable since:**
- Check-in API: Long-standing (2+ years)
- Sponsor scanning API: Long-standing (2+ years)
- Field check-in API: Added with `scannerfields` feature

### 9.2 Known Changes

**Recent additions:**
1. **Scanner fields** (`scannerfields`)
   - Allows dynamic field tracking
   - Separate API endpoint
   - Uses `publictoken` instead of `idtoken`

2. **Queue partitions** (`queuepartition`)
   - Added to registration model
   - Returned in check-in API responses
   - Used for managing check-in queues

3. **First scan tracking** (`firstscan` in ScannedAttendee)
   - Distinguishes new scans from note updates
   - Affects HTTP status code (201 vs 208)

### 9.3 Backward Compatibility

**Changes that would break existing apps:**
- None expected
- Django deprecation warnings guide changes
- Database schema uses migrations

**Safe to rely on:**
- Token format (64 hex chars)
- URL patterns
- JSON response structure
- Authentication mechanism

---

## 10. Testing & Development

### 10.1 Test Token

**Special test token:** `TESTTESTTESTTEST`

**Usage:**
```python
# ID token test
https://domain.com/t/id/TESTTESTTESTTEST/

# Public token test
https://domain.com/t/at/TESTTESTTESTTEST/
```

**Behavior:**
```python
if scanned_token == 'TESTTESTTESTTEST':
    return HttpResponse("You have successfully scanned the test token.")
```

**Notes:**
- Does not hit database
- Works in both check-in and sponsor scanning
- Landing pages include test QR codes
- Test page: `/events/sponsor/scanning-test/`

### 10.2 Development Setup

**Local testing steps:**

1. **Create test conference:**
```python
from postgresqleu.confreg.models import Conference
conf = Conference.objects.create(
    urlname='testconf',
    conferencename='Test Conference',
    checkinactive=True,
    askbadgescan=True,
    scannerfields='breakfast,lunch'
)
```

2. **Create test registration:**
```python
from django.contrib.auth.models import User
from postgresqleu.confreg.models import ConferenceRegistration

user = User.objects.create_user('testuser', 'test@test.com', 'password')
reg = ConferenceRegistration.objects.create(
    conference=conf,
    attendee=user,
    registrator=user,
    firstname='Test',
    lastname='User',
    email='test@test.com',
    payconfirmedat=timezone.now(),
    regtoken=generate_random_token(),
    idtoken=generate_random_token(),
    publictoken=generate_random_token()
)
```

3. **Add as check-in processor:**
```python
conf.checkinprocessors.add(reg)
```

4. **Access landing page:**
```
http://localhost:8000/events/testconf/checkin/
```

### 10.3 API Testing

**Using curl:**

```bash
# Check status
curl "http://localhost:8000/events/testconf/checkin/{regtoken}/api/status/"

# Lookup attendee
curl "http://localhost:8000/events/testconf/checkin/{regtoken}/api/lookup/?lookup=http://localhost:8000/t/id/{idtoken}/"

# Search attendees
curl "http://localhost:8000/events/testconf/checkin/{regtoken}/api/search/?search=test+user"

# Check in attendee
curl -X POST \
  -d "token=http://localhost:8000/t/id/{idtoken}/" \
  "http://localhost:8000/events/testconf/checkin/{regtoken}/api/store/"

# Sponsor scan lookup
curl "http://localhost:8000/events/sponsor/scanning/{scannertoken}/api/lookup/?lookup=http://localhost:8000/t/at/{publictoken}/"

# Sponsor scan store
curl -X POST \
  -d "token=http://localhost:8000/t/at/{publictoken}/" \
  -d "note=Test note" \
  "http://localhost:8000/events/sponsor/scanning/{scannertoken}/api/store/"
```

**Using HTTPie:**

```bash
# Status
http GET "localhost:8000/events/testconf/checkin/{regtoken}/api/status/"

# Lookup
http GET "localhost:8000/events/testconf/checkin/{regtoken}/api/lookup/" lookup=="http://localhost:8000/t/id/{idtoken}/"

# Check in
http POST "localhost:8000/events/testconf/checkin/{regtoken}/api/store/" token="http://localhost:8000/t/id/{idtoken}/"
```

### 10.4 Database Inspection

**Useful queries:**

```sql
-- Check registrations
SELECT id, firstname, lastname, email, payconfirmedat, canceledat, checkedinat
FROM confreg_conferenceregistration
WHERE conference_id = 123;

-- Check tokens
SELECT id, firstname, lastname, regtoken, idtoken, publictoken
FROM confreg_conferenceregistration
WHERE id = 456;

-- Check check-in processors
SELECT cr.firstname, cr.lastname
FROM confreg_conferenceregistration cr
INNER JOIN confreg_conference_checkinprocessors ccp ON cr.id = ccp.conferenceregistration_id
WHERE ccp.conference_id = 123;

-- Check sponsor scans
SELECT sa.scannedat, sa.note,
       r1.firstname || ' ' || r1.lastname as scanned_by,
       r2.firstname || ' ' || r2.lastname as attendee_name
FROM confsponsor_scannedattendee sa
INNER JOIN confreg_conferenceregistration r1 ON sa.scannedby_id = r1.id
INNER JOIN confreg_conferenceregistration r2 ON sa.attendee_id = r2.id
WHERE sa.sponsor_id = 789;

-- Check dynamic properties
SELECT id, firstname, lastname, dynaprops
FROM confreg_conferenceregistration
WHERE dynaprops != '{}'::jsonb;
```

---

## 11. Mobile Client Recommendations

### 11.1 Token Handling

**Always send full URL format:**
```javascript
// Good
const token = `${SITEBASE}/t/id/${idtoken}/`;
api.lookup(token);

// Also works (but less clear)
const token = idtoken;
api.lookup(token);
```

**Store tokens securely:**
```javascript
// Use secure storage for regtoken/scannertoken
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('regtoken', regtoken);
const regtoken = await SecureStore.getItemAsync('regtoken');
```

**Parse scanned QR codes:**
```javascript
// Extract token from full URL
const parseQRCode = (data) => {
  const idMatch = data.match(/\/t\/id\/([a-z0-9]+)\//);
  const atMatch = data.match(/\/t\/at\/([a-z0-9]+)\//);

  if (idMatch) {
    return { type: 'id', token: idMatch[1] };
  } else if (atMatch) {
    return { type: 'at', token: atMatch[1] };
  }

  return null;
};
```

### 11.2 Error Handling

**Expected error codes:**
```javascript
const handleAPIError = (error) => {
  switch (error.status) {
    case 404:
      return 'Attendee not found or invalid token';
    case 403:
      return 'Permission denied or badge scanning not authorized';
    case 412:
      if (error.message === 'Check-in not open') {
        return 'Check-in is not currently active';
      } else if (error.message === 'Already checked in.') {
        return 'This attendee is already checked in';
      }
      return error.message;
    case 500:
      return 'Server error - please try again';
    default:
      return 'Unknown error occurred';
  }
};
```

**Network error handling:**
```javascript
const callAPI = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      timeout: 10000,  // 10 second timeout
    });

    if (!response.ok) {
      const text = await response.text();
      throw new APIError(response.status, text);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    } else if (!navigator.onLine) {
      throw new Error('No network connection');
    }
    throw error;
  }
};
```

### 11.3 Caching Strategy

**Cache status response:**
```javascript
// Cache for 5 minutes
const STATUS_CACHE_TIME = 5 * 60 * 1000;

let cachedStatus = null;
let cacheTime = 0;

const getStatus = async () => {
  const now = Date.now();
  if (cachedStatus && (now - cacheTime) < STATUS_CACHE_TIME) {
    return cachedStatus;
  }

  cachedStatus = await api.status();
  cacheTime = now;
  return cachedStatus;
};
```

**Cache lookup results:**
```javascript
// Temporary cache for search results
const lookupCache = new Map();

const lookup = async (token) => {
  if (lookupCache.has(token)) {
    return lookupCache.get(token);
  }

  const result = await api.lookup(token);
  lookupCache.set(token, result);

  // Clear after 30 seconds
  setTimeout(() => lookupCache.delete(token), 30000);

  return result;
};
```

**Don't cache store operations:**
```javascript
// Never cache POST requests
const checkin = async (token) => {
  // Always fresh call
  return await api.store(token);
};
```

### 11.4 UI/UX Recommendations

**Display check-in status:**
```javascript
// Show clear indicators
const StatusIndicator = ({ active, activestatus }) => {
  return (
    <View style={active ? styles.active : styles.inactive}>
      <Text>{activestatus}</Text>
    </View>
  );
};
```

**Highlight important fields:**
```javascript
// Respect backend's highlight array
const RegistrationDetails = ({ reg }) => {
  return (
    <View>
      {reg.policyconfirmed && (
        <Text style={reg.highlight.includes('policyconfirmed') ? styles.warning : null}>
          {reg.policyconfirmed}
        </Text>
      )}
      {reg.checkinmessage && (
        <Text style={reg.highlight.includes('checkinmessage') ? styles.important : null}>
          {reg.checkinmessage}
        </Text>
      )}
    </View>
  );
};
```

**Handle "already" warnings:**
```javascript
// Show modal for already checked in
if (reg.already) {
  Alert.alert(
    reg.already.title,
    reg.already.body,
    [{ text: 'OK' }]
  );
}
```

**Search debouncing:**
```javascript
// Debounce search API calls
import { debounce } from 'lodash';

const searchDebounced = debounce(async (query) => {
  if (query.length < 2) return;
  const results = await api.search(query);
  setSearchResults(results.regs);
}, 300);
```

### 11.5 Testing Integration

**Test mode detection:**
```javascript
// Detect test token scans
const isTestToken = (token) => {
  return token.includes('TESTTESTTESTTEST');
};

// Show test mode indicator
if (isTestToken(scannedToken)) {
  showTestModeMessage();
}
```

**Environment configuration:**
```javascript
// Support multiple environments
const API_BASE = {
  production: 'https://www.postgresql.eu',
  staging: 'https://staging.postgresql.eu',
  development: 'http://localhost:8000',
}[process.env.ENV || 'production'];
```

### 11.6 Performance Tips

**Batch statistics requests:**
```javascript
// Only fetch stats when needed (admin view)
const loadStats = async () => {
  if (!status.admin) return null;

  const stats = await api.stats();
  return stats;
};
```

**Optimize search:**
```javascript
// Only search with meaningful input
const handleSearch = (text) => {
  if (text.length >= 2) {
    searchDebounced(text);
  } else {
    setSearchResults([]);
  }
};
```

**Prefetch on scan:**
```javascript
// Immediately lookup after successful scan
const handleScan = async (data) => {
  const parsed = parseQRCode(data);
  if (!parsed) {
    showError('Invalid QR code');
    return;
  }

  // Show loading immediately
  setLoading(true);

  try {
    const result = await api.lookup(parsed.token);
    showRegistrationDetails(result.reg);
  } catch (error) {
    showError(handleAPIError(error));
  } finally {
    setLoading(false);
  }
};
```

---

## 12. Summary

### 12.1 API Quick Reference

| API | Method | URL Pattern | Auth | Purpose |
|-----|--------|-------------|------|---------|
| **Check-in Status** | GET | `/events/{conf}/checkin/{regtoken}/api/status/` | regtoken | Get processor info & active status |
| **Check-in Lookup** | GET | `/events/{conf}/checkin/{regtoken}/api/lookup/` | regtoken | Look up attendee by ID token |
| **Check-in Search** | GET | `/events/{conf}/checkin/{regtoken}/api/search/` | regtoken | Search attendees by name |
| **Check-in Store** | POST | `/events/{conf}/checkin/{regtoken}/api/store/` | regtoken | Check in attendee |
| **Check-in Stats** | GET | `/events/{conf}/checkin/{regtoken}/api/stats/` | regtoken+admin | Get check-in statistics |
| **Field Status** | GET | `/events/{conf}/checkin/{regtoken}/f{field}/api/status/` | regtoken | Get field scanner info |
| **Field Lookup** | GET | `/events/{conf}/checkin/{regtoken}/f{field}/api/lookup/` | regtoken | Look up by public token |
| **Field Store** | POST | `/events/{conf}/checkin/{regtoken}/f{field}/api/store/` | regtoken | Mark field for attendee |
| **Sponsor Status** | GET | `/events/sponsor/scanning/{scannertoken}/api/status/` | scannertoken | Get sponsor scanner info |
| **Sponsor Lookup** | GET | `/events/sponsor/scanning/{scannertoken}/api/lookup/` | scannertoken | Look up & create scan |
| **Sponsor Store** | POST | `/events/sponsor/scanning/{scannertoken}/api/store/` | scannertoken | Update scan note |

### 12.2 Key Differences

**Check-in vs Field vs Sponsor:**

| Feature | Check-in | Field Scan | Sponsor Scan |
|---------|----------|------------|--------------|
| Token Type | ID token | Public token | Public token |
| Requires Active | Yes (except status) | Yes | No |
| Prevents Duplicates | Yes (HTTP 412) | No (updates timestamp) | No (updates note) |
| Stores In | checkedinat/by | dynaprops JSON | ScannedAttendee table |
| Privacy Check | No | No | Yes (badgescan flag) |
| Admin Features | Stats endpoint | No | No |

### 12.3 Integration Checklist

For a React Native app, ensure you:

- [ ] Store `regtoken` or `scannertoken` securely (SecureStore)
- [ ] Implement QR code scanner (expo-barcode-scanner)
- [ ] Parse both full URL and short token formats
- [ ] Handle all HTTP status codes (404, 403, 412, 500)
- [ ] Show "already scanned" warnings appropriately
- [ ] Respect `highlight` array for UI emphasis
- [ ] Cache status responses (5 min)
- [ ] Debounce search input (300ms)
- [ ] Show network status indicator
- [ ] Implement retry logic with backoff
- [ ] Support test token (`TESTTESTTESTTEST`)
- [ ] Display field-specific messages
- [ ] Handle sponsor scan notes
- [ ] Show statistics (admin only)
- [ ] Validate check-in active state
- [ ] Support multiple scanner types (check-in, field, sponsor)
- [ ] Provide offline queue (optional but recommended)
- [ ] Log operations for debugging
- [ ] Support environment switching (dev/staging/prod)
- [ ] Implement proper error messages

---

## Appendix A: Example Responses

### Check-in Status (Active)
```json
{
  "user": "john_processor",
  "name": "John Processor",
  "active": true,
  "activestatus": "Check-in active",
  "confname": "PostgreSQL Conference Europe 2025",
  "admin": false
}
```

### Check-in Lookup (With Warnings)
```json
{
  "reg": {
    "id": 456,
    "name": "Jane VIP Speaker",
    "type": "Speaker",
    "company": "PostgreSQL GmbH",
    "tshirt": "M",
    "additional": ["Speaker Dinner", "Workshop Access"],
    "token": "a1b2c3d4...",
    "highlight": ["checkinmessage", "policyconfirmed"],
    "photoconsent": "Photos OK",
    "policyconfirmed": "Policy NOT confirmed",
    "checkinmessage": "VIP Speaker - provide speaker kit and green badge",
    "partition": "VIP"
  }
}
```

### Search Results
```json
{
  "regs": [
    {
      "id": 123,
      "name": "Alice Smith",
      "type": "Conference Attendee",
      "company": "ACME Corp",
      "tshirt": "L",
      "additional": [],
      "token": "x1y2z3...",
      "highlight": [],
      "partition": "A"
    },
    {
      "id": 124,
      "name": "Bob Smith",
      "type": "Student",
      "company": "",
      "tshirt": "XL",
      "additional": ["Student Lunch"],
      "token": "p1q2r3...",
      "highlight": [],
      "partition": "B"
    }
  ]
}
```

### Sponsor Scan (First Time)
```json
{
  "reg": {
    "name": "Jane Attendee",
    "company": "PostgreSQL GmbH",
    "country": "Germany",
    "email": "jane@postgresql.de",
    "note": "",
    "token": "m1n2o3...",
    "highlight": []
  },
  "message": "Attendee Jane Attendee scan stored successfully.",
  "showfields": false
}
```

### Sponsor Scan (Already Scanned, Note Updated)
```json
{
  "reg": {
    "name": "Jane Attendee",
    "company": "PostgreSQL GmbH",
    "country": "Germany",
    "email": "jane@postgresql.de",
    "note": "Interested in enterprise support - follow up next week",
    "token": "m1n2o3...",
    "highlight": []
  },
  "message": "Attendee Jane Attendee has already been stored. The note has been updated.",
  "showfields": false
}
```

### Statistics (Admin)
```json
[
  [
    ["Registration types", "Done", "Left"],
    [
      ["Conference Attendee", 245, 55],
      ["Speaker", 42, 3],
      ["Student", 78, 12],
      ["", 365, 70]
    ]
  ],
  [
    ["Check in users", "Done", ""],
    [
      ["john_processor", 187, null],
      ["alice_helper", 98, null],
      ["bob_volunteer", 80, null]
    ]
  ],
  [
    ["Latest checkins", "By", "Who"],
    [
      ["8th 14:32:15", "john_processor", "Emma Watson"],
      ["8th 14:31:58", "alice_helper", "David Chen"],
      ["8th 14:30:42", "bob_volunteer", "Maria Garcia"]
    ]
  ]
]
```

---

## Appendix B: Database Schema Reference

### ConferenceRegistration (Simplified)
```sql
CREATE TABLE confreg_conferenceregistration (
    id SERIAL PRIMARY KEY,
    conference_id INTEGER NOT NULL,
    regtype_id INTEGER,
    attendee_id INTEGER,
    registrator_id INTEGER NOT NULL,

    -- Personal info
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    company VARCHAR(100),
    country_id INTEGER,
    phone VARCHAR(100),

    -- Conference specifics
    shirtsize_id INTEGER,
    dietary VARCHAR(100),
    twittername VARCHAR(100),
    nick VARCHAR(100),
    pronouns INTEGER DEFAULT 0,

    -- Privacy
    badgescan BOOLEAN DEFAULT TRUE,
    shareemail BOOLEAN DEFAULT FALSE,
    photoconsent BOOLEAN,
    policyconfirmedat TIMESTAMP,

    -- Check-in
    checkedinat TIMESTAMP,
    checkedinby_id INTEGER,
    checkinmessage TEXT,

    -- Tokens (64 hex chars)
    regtoken TEXT UNIQUE NOT NULL,
    idtoken TEXT UNIQUE NOT NULL,
    publictoken TEXT UNIQUE NOT NULL,

    -- Dynamic properties
    dynaprops JSONB DEFAULT '{}',

    -- Queue
    queuepartition VARCHAR(10),

    -- Payment
    payconfirmedat TIMESTAMP,
    canceledat TIMESTAMP,

    created TIMESTAMP DEFAULT NOW()
);
```

### SponsorScanner
```sql
CREATE TABLE confsponsor_sponsorscanner (
    id SERIAL PRIMARY KEY,
    sponsor_id INTEGER NOT NULL,
    scanner_id INTEGER NOT NULL,  -- ConferenceRegistration
    token TEXT UNIQUE NOT NULL,

    UNIQUE (sponsor_id, scanner_id)
);
```

### ScannedAttendee
```sql
CREATE TABLE confsponsor_scannedattendee (
    id SERIAL PRIMARY KEY,
    sponsor_id INTEGER NOT NULL,
    scannedby_id INTEGER NOT NULL,  -- ConferenceRegistration (scanner)
    attendee_id INTEGER NOT NULL,    -- ConferenceRegistration (scanned)
    scannedat TIMESTAMP DEFAULT NOW(),
    firstscan BOOLEAN DEFAULT TRUE,
    note TEXT,

    UNIQUE (sponsor_id, scannedby_id, attendee_id)
);

CREATE INDEX ON confsponsor_scannedattendee (scannedat DESC);
```

---

## Appendix C: Code References

**Key Files:**
- `/postgresqleu/confreg/checkin.py` - Check-in and field APIs (407 lines)
- `/postgresqleu/confsponsor/scanning.py` - Sponsor scanning API
- `/postgresqleu/confreg/models.py` - Core data models
- `/postgresqleu/confsponsor/models.py` - Sponsor models
- `/postgresqleu/urls.py` - Main URL routing (lines 131-135, 381-382)
- `/postgresqleu/confsponsor/urls.py` - Sponsor URL routing (lines 19-24)
- `/postgresqleu/util/random.py` - Token generation
- `/postgresqleu/util/qr.py` - QR code generation

**Important Functions:**
- `_get_checkin()` - Authorization check for check-in
- `_get_reg_json()` - Serialize registration data
- `_get_statistics()` - Generate check-in stats
- `_get_scanned_attendee()` - Validate sponsor scan permissions
- `generate_random_token()` - Create secure tokens
- `generate_base64_qr()` - Create QR codes

**URL Patterns:**
```python
# Check-in
r'^events/([^/]+)/checkin/([a-z0-9]{64})/api/(\w+)/$'
r'^events/([^/]+)/checkin/([a-z0-9]{64})/f(\w+)/api/(\w+)/$'

# Sponsor
r'^scanning/([a-z0-9]{64})/api/(\w+)/$'

# Tokens
r'^t/id/([a-z0-9]+|TESTTESTTESTTEST)/$'
r'^t/at/(?P<scanned_token>[a-z0-9]+|TESTTESTTESTTEST)/(?P<what>\w+/)?$'
```

---

**Document End**
