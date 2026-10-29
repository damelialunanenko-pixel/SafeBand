# Required Firestore indexes

Create these Cloud Firestore composite indexes in the Firebase Console for collection scope. The app's real-time listeners use `where` plus `orderBy`, which requires them:

| Collection | Fields |
| --- | --- |
| `events` | `wardId` **Ascending**, `createdAt` **Descending** |
| `healthReadings` | `wardId` **Ascending**, `recordedAt` **Descending** |

The `wards` listener (`guardianId ==`) and direct `devices/{braceletId}` reads do not need composite indexes. The Cloud Function's `wards` query (`braceletId ==`) does not need one either.

Firebase will show an index-creation link in the console when an index is absent. Follow that link or add the field ordering above exactly. The `events` index resolves the known `wardId` + `createdAt` error.
