// Firebase Auth + Firestore client. Replaces the Supabase/Postgres backend; the boundary the app
// sees is unchanged (same function names and return shapes), so App.jsx needs no edit -- see the
// re-export shim in ./supabase.js.
//
// Identity model: the Firestore DOCUMENT ID is the auth uid. That replaces the old
// `auth.uid()::text = user_id` RLS predicate, and it is what firestore.rules keys on, so there is
// no `user_id` field on either document any more. Reads must be getDoc() by id -- a
// where('user_id','==',uid) query is denied by the rules.

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { initializeFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { isPreview, PREVIEW_SESSION, previewUserState, previewAiRow } from './previewMode.js'
import { canPersist } from './persistGuard.js'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Same guard the Supabase client had: without config, initializeApp would throw at module load
// and blank the whole app. Stay null and let every call below no-op instead.
const configured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId)

const app = configured ? initializeApp(cfg) : null
const auth = app ? getAuth(app) : null
// ignoreUndefinedProperties: the app's state blob is assembled ad hoc and Firestore rejects
// `undefined` values outright, where Postgres jsonb simply dropped them.
const db = app ? initializeFirestore(app, { ignoreUndefinedProperties: true }) : null

/** Truthy when the backend is usable. Exported to App.jsx under the legacy name `supabase`. */
export const firebaseReady = db

if (!configured) {
  console.warn(
    '[firebase] VITE_FIREBASE_* not set — running in local-only mode (no cloud sync).'
  )
}

// --- auth -------------------------------------------------------------------------------------

// The app models a session as { user: { id, email } } (App.jsx reads session?.user?.id).
const toSession = (user) => (user ? { user: { id: user.uid, email: user.email ?? '' } } : null)

// Firebase resolves the persisted user asynchronously, so auth.currentUser is null for a tick
// after load. getSession() must wait for that first resolution or a returning user is briefly
// treated as signed out and gets bounced to the Auth screen.
let resolveReady
const authReady = new Promise((r) => { resolveReady = r })
if (auth) {
  const stop = onAuthStateChanged(auth, (u) => { resolveReady(u); stop() })
} else {
  resolveReady(null)
}

// Auth.jsx renders err.message verbatim for anything its regexes do not match, so translate here
// rather than leaking raw Firebase codes like "auth/invalid-credential" into the UI.
function authError(err) {
  const code = err?.code ?? ''
  if (code === 'auth/email-already-in-use') return new Error('이미 가입된 이메일이에요. 로그인해 주세요.')
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found')
    return new Error('이메일 또는 비밀번호가 올바르지 않아요.')
  if (code === 'auth/invalid-email') return new Error('이메일 형식이 올바르지 않아요.')
  if (code === 'auth/weak-password') return new Error('비밀번호는 6자 이상이어야 해요.')
  if (code === 'auth/too-many-requests') return new Error('시도가 너무 많아요. 잠시 후 다시 시도해 주세요.')
  if (code === 'auth/network-request-failed') return new Error('네트워크에 연결할 수 없어요. 연결을 확인해 주세요.')
  return new Error(err?.message ?? '문제가 발생했어요. 다시 시도해 주세요.')
}

export async function signUp(email, password) {
  if (!auth) throw new Error('Firebase not configured')
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    // Shape-compatible with the old Supabase return: Auth.jsx checks `data.session` to decide
    // whether to show the "check your email" notice. Firebase signs the user in immediately.
    return { session: toSession(cred.user), user: cred.user }
  } catch (err) {
    throw authError(err)
  }
}

export async function signIn(email, password) {
  if (!auth) throw new Error('Firebase not configured')
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return { session: toSession(cred.user), user: cred.user }
  } catch (err) {
    throw authError(err)
  }
}

export async function signOut() {
  if (!auth) return
  await fbSignOut(auth)
}

export async function getSession() {
  if (isPreview()) return PREVIEW_SESSION
  if (!auth) return null
  return toSession(await authReady)
}

export function onAuthChange(callback) {
  if (isPreview()) {
    callback(PREVIEW_SESSION)
    return () => {}
  }
  if (!auth) return () => {}
  return onAuthStateChanged(auth, (user) => callback(toSession(user)))
}

// --- write precondition -------------------------------------------------------------------------

// Writes are refused up front when nobody is signed in, or when the signed-in user does not own
// the target document (the account-switch case: a debounced write captured uid A while the user
// is now signed in as B). Guarding the request means no round trip and no server verdict to
// misinterpret — so a `permission-denied` that still arrives is a genuine signal again.
//
// Reads are deliberately NOT wrapped. An earlier revision caught their `permission-denied` and
// returned null, which collapsed "read denied" into "document absent" — and the mount effect
// treats absent as "seed this user" and writes defaults back. That turned a failed read into a
// remote overwrite. Let read failures throw; the callers already handle them.
const currentUid = () => auth?.currentUser?.uid ?? null

// --- user_states ------------------------------------------------------------------------------

// The blob is stored as a JSON STRING, not a Firestore map. Postgres jsonb accepted any shape the
// app produced; Firestore does not -- it rejects directly nested arrays outright. Serialising
// keeps this an opaque blob (which is exactly how both the app and the contract treat it) and
// removes a whole class of write failures on state shapes nobody audited. Nothing queries inside
// it, so nothing is lost. firestore.rules requires `state is string` to match.

export async function fetchUserState(userId) {
  if (isPreview()) return previewUserState()
  if (!db) return null
  const snap = await getDoc(doc(db, 'user_states', userId))
  if (!snap.exists()) return null // replaces Postgres PGRST116 "no row yet"
  const raw = snap.data().state
  return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? null)
}

export async function upsertUserState(userId, state) {
  if (isPreview()) return // preview is read-only — never persist fixture state
  if (!db) return
  if (!canPersist(currentUid(), userId)) return // signed out, or not this user's document
  // Full replacement, NOT { merge: true }: `state` is one opaque blob and the app is the sole
  // author of its shape, exactly as the previous Postgres jsonb upsert behaved. Merging would
  // strand keys the app has deliberately dropped. The clobber risk this was flagged for came
  // from *issuing* a defaults write during sign-out; that is fixed at the source — App.jsx now
  // cancels the debounced write, and canPersist refuses it if one still slips through.
  await setDoc(doc(db, 'user_states', userId), {
    state: JSON.stringify(state),
    updatedAt: serverTimestamp(),
  })
}

// --- ai_plans queue ---------------------------------------------------------------------------

export async function requestAiPlan(userId, request) {
  if (isPreview()) return // preview shows a fixture; never enqueue a real job
  if (!db) throw new Error('Firebase not configured')
  if (!canPersist(currentUid(), userId)) return // same precondition as every other write
  // Full overwrite (not merge): a new request must clear any previous result, exactly like the
  // old upsert with onConflict:'user_id'. The rules only permit status='pending' from a client.
  await setDoc(doc(db, 'ai_plans', userId), {
    request,
    status: 'pending',
    result: null,
    error: null,
    requestedAt: serverTimestamp(),
    completedAt: null,
  })
}

export async function fetchAiPlan(userId) {
  if (isPreview()) return previewAiRow()
  if (!db) return null
  const snap = await getDoc(doc(db, 'ai_plans', userId))
  if (!snap.exists()) return null
  const d = snap.data()
  return { status: d.status, result: d.result ?? null, error: d.error ?? null }
}
