// Compatibility shim. The backend migrated from Supabase to Firebase (Auth + Firestore); the
// real implementation now lives in ./firebase.js.
//
// This file stays because App.jsx (127 KB, and guarded by the design-contract preflight hook)
// imports every backend function from './supabase.js'. Re-exporting under the old path keeps the
// migration diff at zero for App.jsx and Auth.jsx. The one name that changes meaning is the raw
// client handle: App.jsx uses it only as a truthiness guard (`if (!supabase || …)`, line 1271),
// so `firebaseReady` — the Firestore instance, or null when unconfigured — takes that name.
//
// Follow-up: when App.jsx is next opened for editing, repoint its import at './firebase.js',
// rename the guard, and delete this file.

export {
  firebaseReady as supabase,
  signUp,
  signIn,
  signOut,
  getSession,
  onAuthChange,
  fetchUserState,
  upsertUserState,
  requestAiPlan,
  fetchAiPlan,
} from './firebase.js'
