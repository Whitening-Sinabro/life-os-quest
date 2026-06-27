// Pure domain logic for the AI personalization overlay (Plan B-2).
// No React / Supabase / weeklyMissionPlans imports — the caller passes the default
// week schedule in, so this module stays unit-testable with node:test.

const READING_CATEGORIES = ['reading', 'video'] // video folds into the reading slots
const SYSTEM_QUEST_ID = 'weekend-review'
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export function mapProfileToRequest(profile) {
  return {
    schemaVersion: '2.0',
    profile: {
      goals: Array.isArray(profile?.goals) ? profile.goals : [],
      goalText: typeof profile?.dream === 'string' ? profile.dream : '',
      currentState:
        profile?.currentState && typeof profile.currentState === 'object' ? profile.currentState : {},
      pattern: profile?.pattern && typeof profile.pattern === 'object' ? profile.pattern : {},
      duration: typeof profile?.duration === 'string' ? profile.duration : '',
    },
  }
}

export function isPersonalizable(profile) {
  return Boolean(
    profile &&
      Array.isArray(profile.goals) &&
      profile.goals.length > 0 &&
      typeof profile.dream === 'string' &&
      profile.dream.trim().length > 0 &&
      profile.currentState &&
      typeof profile.currentState === 'object' &&
      profile.pattern &&
      typeof profile.pattern === 'object' &&
      typeof profile.duration === 'string' &&
      profile.duration.length > 0,
  )
}
