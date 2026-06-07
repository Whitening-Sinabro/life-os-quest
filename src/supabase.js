import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create a client when credentials are present. Without this guard,
// createClient throws at module load and crashes the whole app (blank page).
export const supabase = url && anonKey ? createClient(url, anonKey) : null

if (!supabase) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — running in local-only mode (no cloud sync).'
  )
}

export async function fetchUserState(userId) {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('user_states')
    .select('state')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data?.state ?? null
}

export async function upsertUserState(userId, state) {
  if (!supabase) return

  const { error } = await supabase
    .from('user_states')
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() })

  if (error) throw error
}
