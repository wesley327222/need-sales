import { getGoogleAccessToken } from './auth'

const BASE = 'https://www.googleapis.com/calendar/v3'
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_EMAIL ?? 'primary'

async function headers() {
  const token = await getGoogleAccessToken()
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export interface CalendarEvent {
  id: string
  summary: string | null
  description: string | null
  start: { dateTime?: string; date?: string }
  end:   { dateTime?: string; date?: string }
  hangoutLink?: string
  organizer: { email: string; displayName?: string }
  attendees?: { email: string; responseStatus: string; self?: boolean }[]
  status: string
}

/** Fetch events changed since last sync. Returns events + new syncToken. */
export async function listChangedEvents(syncToken: string): Promise<{
  events: CalendarEvent[]
  nextSyncToken: string
}> {
  const h = await headers()
  const res = await fetch(
    `${BASE}/calendars/${encodeURIComponent(CALENDAR_ID)}/events?syncToken=${encodeURIComponent(syncToken)}&maxResults=50`,
    { headers: h }
  )

  if (res.status === 410) {
    throw new Error('SYNC_TOKEN_EXPIRED')
  }
  if (!res.ok) throw new Error(`Calendar list failed: ${await res.text()}`)

  const data = await res.json()
  return {
    events:        data.items ?? [],
    nextSyncToken: data.nextSyncToken,
  }
}

/** Get initial sync token (no events, just the token). */
export async function getInitialSyncToken(): Promise<string> {
  const h = await headers()
  const res = await fetch(
    `${BASE}/calendars/${encodeURIComponent(CALENDAR_ID)}/events?maxResults=1`,
    { headers: h }
  )
  if (!res.ok) throw new Error(`Calendar init sync failed: ${await res.text()}`)
  const data = await res.json()
  return data.nextSyncToken
}

/** Accept a calendar event invitation. */
export async function acceptEvent(eventId: string): Promise<void> {
  const h = await headers()
  const botEmail = process.env.GOOGLE_CALENDAR_EMAIL!
  await fetch(
    `${BASE}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}?sendUpdates=none`,
    {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({
        attendees: [{ email: botEmail, responseStatus: 'accepted' }],
      }),
    }
  )
}

/** Register a Google Calendar push notification channel. */
export async function registerWatchChannel(webhookUrl: string, channelId: string): Promise<{
  id: string
  resourceId: string
  expiration: number
}> {
  const h = await headers()
  const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days max
  const res = await fetch(
    `${BASE}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/watch`,
    {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        id:         channelId,
        type:       'web_hook',
        address:    webhookUrl,
        expiration: expiration.toString(),
      }),
    }
  )
  if (!res.ok) throw new Error(`Watch registration failed: ${await res.text()}`)
  const data = await res.json()
  return {
    id:          data.id,
    resourceId:  data.resourceId,
    expiration:  parseInt(data.expiration),
  }
}

/** Stop an existing watch channel. */
export async function stopWatchChannel(channelId: string, resourceId: string): Promise<void> {
  const h = await headers()
  await fetch(`${BASE}/channels/stop`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ id: channelId, resourceId }),
  })
}
