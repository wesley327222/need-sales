import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  registerWatchChannel,
  stopWatchChannel,
  getInitialSyncToken,
} from '@/lib/google/calendar'

export async function POST(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL não configurado' }, { status: 500 })
  }

  const supabase = createServiceClient()

  // Load existing channel to stop it first (avoid orphaned channels)
  const { data: existing } = await supabase
    .from('google_calendar_sync')
    .select('channel_id, resource_id')
    .eq('id', 'default')
    .single()

  if (existing?.channel_id && existing?.resource_id) {
    try {
      await stopWatchChannel(existing.channel_id, existing.resource_id)
    } catch {
      // Ignore — channel may have already expired
    }
  }

  const channelId = crypto.randomUUID()
  const webhookUrl = `${appUrl}/api/webhooks/google-calendar`

  const channel = await registerWatchChannel(webhookUrl, channelId)

  // Get fresh sync token so we only process events from now on
  const syncToken = await getInitialSyncToken()

  await supabase
    .from('google_calendar_sync')
    .upsert({
      id:                  'default',
      channel_id:          channel.id,
      resource_id:         channel.resourceId,
      channel_expiration:  channel.expiration,
      sync_token:          syncToken,
      updated_at:          new Date().toISOString(),
    })

  return NextResponse.json({
    ok: true,
    channelId: channel.id,
    resourceId: channel.resourceId,
    expiresAt: new Date(channel.expiration).toISOString(),
    webhookUrl,
  })
}
