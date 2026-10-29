# Care Band Firebase prototype data

The app reads Firestore in real time. All timestamps can be Firestore `Timestamp` values or ISO dates where noted. Create the following documents after creating/signing in as a caregiver.

## `wards/{wardId}`

```json
{
  "guardianId": "FIREBASE_AUTH_UID",
  "name": "Amina",
  "braceletId": "CB-001",
  "healthThresholds": { "minHeartRate": 50, "maxHeartRate": 120, "minSpo2": 92 },
  "safePlaces": [{ "id": "home", "name": "Home", "address": "1 Example St", "location": { "lat": 51.1694, "lng": 71.4491 }, "radius": 20, "schedule": [{ "start": "08:00", "end": "11:00", "days": [1,2,3,4,5] }] }],
  "safeRoutes": [{ "id": "home-school", "name": "Home to school", "points": [{ "lat": 51.1694, "lng": 71.4491 }, { "lat": 51.175, "lng": 71.46 }], "tolerance": 50, "enabled": true }]
}
```

## `devices/{braceletId}`

```json
{
  "connected": true, "worn": true, "battery": 78,
  "lastSyncAt": "Firestore Timestamp",
  "location": { "lat": 51.1694, "lng": 71.4491, "address": "Home", "updatedAt": "Firestore Timestamp" },
  "braceletLocation": { "lat": 51.1694, "lng": 71.4491 },
  "heartRate": 72, "spo2": 98,
  "sos": { "active": false }
}
```

The app writes `devices/{braceletId}.commands.alarm` as `sos_on` or `sos_off` after two caregiver confirmations. Hardware can observe that field. It also writes `events` documents for caregiver-initiated SOS actions.

## Repeatable fictional demo data

Sign in, open **Settings** from the dashboard, then choose **Seed fictional demo data** and confirm. This writes the same deterministic `care-band-demo-*` documents each time for the signed-in caregiver; it updates those documents rather than creating duplicates and does not alter other people or devices. It is intended only for Firebase projects where your current Firestore rules allow the signed-in caregiver to write their own data.

## Historical health and events

Create `healthReadings/{readingId}` documents: `{ "wardId": "...", "heartRate": 72, "spo2": 98, "recordedAt": Timestamp }`. Create `events/{eventId}` documents: `{ "wardId": "...", "category": "health|location|bracelet|sos|alert", "type": "...", "description": "...", "severity": "info|warning|critical", "createdAt": Timestamp, "requiresAttention": true }`.

For testing removed bracelet status, set `worn: false` and optionally give `braceletLocation`. For a future fall trigger, write an `events` document with category `alert`, type `fall`, severity `critical`; the UI will display it immediately.
