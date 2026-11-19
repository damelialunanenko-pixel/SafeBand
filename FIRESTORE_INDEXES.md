# Required Firestore indexes

Create these Cloud Firestore composite indexes in the Firebase Console for collection scope. The app's real-time listeners use `where` plus `orderBy`, which requires them:

| Collection | Fields |
| --- | --- |
| `events` | `wardId` **Ascending**, `createdAt` **Descending** |
| `healthReadings` | `wardId` **Ascending**, `recordedAt` **Descending** |

The `wards` listener (`guardianId ==`) and direct `devices/{braceletId}` reads do not need composite indexes. The Cloud Function's `wards` query (`braceletId ==`) does not need one either.

Firebase will show an index-creation link in the console when an index is absent. Follow that link or add the field ordering above exactly. The `events` index resolves the known `wardId` + `createdAt` error.

## Security rules (`firestore.rules`) and these queries

The rules were checked against every query and write the app makes; no extra composite indexes are needed:

| Where | Operation | Rule that allows it |
| --- | --- | --- |
| `use-care-data` | `wards` where `guardianId == uid` | the filter equals the rule condition `resource.data.guardianId == request.auth.uid` |
| `use-care-data` | get `devices/{braceletId}` | `devices.wardId` points at a ward of the caller (or the document does not exist yet) |
| `home`, `history` | `events` where `wardId == X` order by `createdAt` | `get(wards/X).guardianId == uid`; Firestore takes `X` from the equality filter |
| `health` | `healthReadings` where `wardId == X` order by `recordedAt` | same as `events` |
| `home` (`setSos`), `use-care-alerts` | merge into `devices/{id}`, `events`, `activeAlerts` | caller owns the linked ward |
| `ward`, `bracelet` | create ward, then batch `wards.braceletId` + `devices.wardId` | `guardianId == uid`; `getAfter` sees the batch |
| `settings` (`seedDemoData`) | one batch: ward, device, readings, events | `getAfter` sees the ward created in the same batch |
| Cloud Functions | everything (`wards` by `braceletId`, deletion, security answers) | Admin SDK, not subject to rules |

Every rule also requires `request.auth.token.email_verified == true`.

Notes:

- `events`, `healthReadings` and `activeAlerts` documents must carry `wardId`. Readings written by the
  bracelet itself with only `deviceId` (see DEVICE_SPEC.md) are not visible to the app; the bracelet
  gateway should write through the Admin SDK and add `wardId`.
- A `devices/{braceletId}` document created before the rules existed has no `wardId`. Link the bracelet
  again on the "Link the bracelet" screen to add it.
- Demo data now uses per-caregiver IDs (`care-band-demo-*-{uid}`), because a shared demo ID would belong
  to whoever seeded it first.
