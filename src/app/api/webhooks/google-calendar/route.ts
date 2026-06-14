import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { listChangedEvents, acceptEvent, getInitialSyncToken, type CalendarEvent } from '@/lib/google/calendar'
import { createNotetaker } from '@/lib/nylas/notetaker'

const BOT_EMAIL = process.env.GOOGLE_CALENDAR_EMAIL ?? ''

export async function POST(request: Request) {
  const state = request.headers.get('X-Goog-Resource-State')

  // Google sends a 'sync' ping when the channel is first registered — just ack it
  if (state === 'sync') {
    return new NextResponse(null, { status: 200 })
  }

  if (state !== 'exists') {
    return new NextResponse(null, { status: 200 })
  }

  const supabase = createServiceClient()

  // Load stored sync token
  const { data: syncData } = await supabase
    .from('google_calendar_sync')
    .select('sync_token')
    .eq('id', 'default')
    .single()

  if (!syncData?.sync_token) {
    console.error('[google-cal] No sync token in DB — run /api/google/register-watch first')
    return new NextResponse(null, { status: 200 })
  }

  let events: CalendarEvent[]
  let nextSyncToken: string

  try {
    const result = await listChangedEvents(syncData.sync_token)
    events        = result.events
    nextSyncToken = result.nextSyncToken
  } catch (err) {
    if (err instanceof Error && err.message === 'SYNC_TOKEN_EXPIRED') {
      // Sync token expired — get a fresh one and bail (next notification will work)
      const freshToken = await getInitialSyncToken()
      await supabase.from('google_calendar_sync').update({ sync_token: freshToken, updated_at: new Date().toISOString() }).eq('id', 'default')
      return new NextResponse(null, { status: 200 })
    }
    console.error('[google-cal] listChangedEvents error:', err)
    return new NextResponse(null, { status: 200 })
  }

  // Always persist the new sync token first
  await supabase
    .from('google_calendar_sync')
    .update({ sync_token: nextSyncToken, updated_at: new Date().toISOString() })
    .eq('id', 'default')

  for (const event of events) {
    await processEvent(event, supabase)
  }

  return new NextResponse(null, { status: 200 })
}

async function processEvent(
  event: CalendarEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  // Only care about confirmed events with a Meet link
  if (event.status === 'cancelled') return
  if (!event.hangoutLink) return

  // Check that our bot is an invited attendee with status needsAction
  const botAttendee = event.attendees?.find(a => a.email === BOT_EMAIL)
  if (!botAttendee || botAttendee.responseStatus !== 'needsAction') return

  // Avoid processing the same event twice
  const { data: existing } = await supabase
    .from('reunioes')
    .select('id')
    .eq('google_event_id', event.id)
    .maybeSingle()

  if (existing) return

  console.log(`[google-cal] New invite: ${event.summary} — ${event.hangoutLink}`)

  // Accept the invitation
  try {
    await acceptEvent(event.id)
  } catch (err) {
    console.error('[google-cal] acceptEvent failed:', err)
  }

  // Identify the vendor by organizer email
  const organizerEmail = event.organizer.email
  const { data: vendorProfile } = await supabase
    .from('profiles')
    .select('id, empresa_id')
    .eq('email', organizerEmail)
    .maybeSingle()

  const vendedorId = vendorProfile?.id ?? null
  const empresaId  = vendorProfile?.empresa_id ?? null

  const startTime = event.start.dateTime ?? event.start.date ?? null
  const endTime   = event.end.dateTime   ?? event.end.date   ?? null

  // Create the reuniao record
  const { data: reuniao, error: reuniaoError } = await supabase
    .from('reunioes')
    .insert({
      titulo:          event.summary ?? 'Reunião Google Meet',
      vendedor_id:     vendedorId,
      empresa_id:      empresaId,
      google_event_id: event.id,
      meet_url:        event.hangoutLink,
      data_hora:       startTime,
      status:          'pending',
      origem:          'google_meet',
    })
    .select('id')
    .single()

  if (reuniaoError || !reuniao) {
    console.error('[google-cal] Failed to create reuniao:', reuniaoError)
    return
  }

  console.log(`[google-cal] Created reuniao ${reuniao.id} for event ${event.id}`)

  // Send Nylas bot — join 2 minutes before start
  if (!startTime) {
    console.warn('[google-cal] Event has no start time, skipping Nylas')
    return
  }

  const joinTimestamp = Math.floor(new Date(startTime).getTime() / 1000) - 120
  const now           = Math.floor(Date.now() / 1000)

  if (joinTimestamp < now) {
    // Meeting already started or in the past — join immediately
    console.log(`[google-cal] Meeting already started, joining now`)
  }

  try {
    const notetaker = await createNotetaker(
      event.hangoutLink,
      Math.max(joinTimestamp, now + 10),
      'NeedSales'
    )

    await supabase
      .from('reunioes')
      .update({
        nylas_notetaker_id: notetaker.id,
        status:             'aguardando_bot',
      })
      .eq('id', reuniao.id)

    console.log(`[google-cal] Nylas notetaker ${notetaker.id} scheduled for reuniao ${reuniao.id}`)
  } catch (err) {
    console.error('[google-cal] createNotetaker failed:', err)
  }
}
