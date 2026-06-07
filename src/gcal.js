const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const CAL_ID = 'primary'
const SOURCE = 'life-os-quest'
const MISSION_EMOJIS = { reading:'📚', workout:'🏋️', 'ai-coding':'💻', 'parent-talk':'💬', 'weekend-review':'📋', memo:'📝' }

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function nextDateStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return localDateStr(d)
}
export function initTokenClient(clientId, callback) {
  return window.google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: SCOPE, callback })
}
async function apiFetch(token, path, options = {}) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers }
  })
  if (res.status === 204 || res.status === 410) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message ?? `API error ${res.status}`)
  return data
}
export async function listLifeOsEvents(token, dateStr) {
  const params = new URLSearchParams({ timeMin:`${dateStr}T00:00:00+09:00`, timeMax:`${dateStr}T23:59:59+09:00`, singleEvents:'true', maxResults:'100' })
  const data = await apiFetch(token, `/calendars/${encodeURIComponent(CAL_ID)}/events?${params}`)
  return (data?.items ?? []).filter(ev => ev.extendedProperties?.private?.source === SOURCE)
}
export async function createCalendarEvent(token, { date, missionId, missionName, detail, userNames, xp }) {
  const emoji = MISSION_EMOJIS[missionId] ?? '⭐'
  return apiFetch(token, `/calendars/${encodeURIComponent(CAL_ID)}/events`, {
    method: 'POST',
    body: JSON.stringify({ summary:`${emoji} ${missionName} — ${userNames.join(', ')}`, description:`${detail}\n\n+${xp} XP · Life OS Quest`, start:{ date }, end:{ date: nextDateStr(date) }, extendedProperties:{ private:{ source:SOURCE, lifeOsKey:`${date}:${missionId}` } } })
  })
}
export async function deleteCalendarEvent(token, eventId) {
  return apiFetch(token, `/calendars/${encodeURIComponent(CAL_ID)}/events/${eventId}`, { method: 'DELETE' })
}
