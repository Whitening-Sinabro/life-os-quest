import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export async function fetchUserState(userId) {
  const { data, error } = await supabase
    .from('user_states')
    .select('state')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data?.state ?? null
}

export async function upsertUserState(userId, state) {
  const { error } = await supabase
    .from('user_states')
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() })

  if (error) throw error
}
