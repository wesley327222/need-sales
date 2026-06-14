import { NextResponse } from 'next/server'
import { getGoogleOAuthUrl } from '@/lib/google/auth'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/auth/google/callback`
  const url = getGoogleOAuthUrl(redirectUri)
  return NextResponse.redirect(url)
}
