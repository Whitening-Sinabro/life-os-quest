// Single source of truth for the app's default UI language.
//
// The product currently ships one real locale: onboarding and all chrome are
// Korean-only, and there is no English onboarding path. New (and legacy/partial)
// users must therefore default to Korean; English is opt-in via the settings
// toggle. When an English onboarding path exists, replace this constant with
// real locale resolution (e.g. navigator.language) — the two consumers below
// are the only seams that need to change.
export const DEFAULT_LANG = 'ko'

// Resolve the active UI language for a user state, falling back to the default
// when the field is absent (state that predates the field, or partial state).
export function resolveLang(state) {
  return state?.lang ?? DEFAULT_LANG
}
