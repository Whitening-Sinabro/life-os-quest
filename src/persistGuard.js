// src/persistGuard.js
// Pure precondition for any write to a per-user Firestore document. No React, no Firebase —
// unit-testable with node:test, same convention as aiFlow.js / aiPlan.js.
//
// This guards the REQUEST rather than the rejection. An earlier attempt caught the resulting
// `permission-denied` and swallowed it when `auth.currentUser` was null, which was wrong twice
// over: the Auth SDK also force-signs-out on token invalidation (auth/user-disabled,
// auth/user-token-expired), so that predicate silently discarded genuine authorization
// failures; and it did nothing for the account-switch case, where a write aimed at the previous
// uid is denied while a *different* user is signed in.
//
// Refusing to issue the request instead means there is no round trip, no server verdict to
// misread, and a `permission-denied` that does reach us is once again a real signal.

/**
 * May we write to `targetUid`'s document right now?
 * True only when someone is signed in AND they own the document being written.
 *
 * @param {string|null|undefined} currentUid uid of the signed-in user (null when signed out)
 * @param {string|null|undefined} targetUid  uid whose document the write is aimed at
 */
export function canPersist(currentUid, targetUid) {
  if (!currentUid || !targetUid) return false
  return currentUid === targetUid
}
