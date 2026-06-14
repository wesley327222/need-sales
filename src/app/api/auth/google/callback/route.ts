import { NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/google/auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new NextResponse(`OAuth error: ${error}`, { status: 400 })
  }
  if (!code) {
    return new NextResponse('Missing code', { status: 400 })
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`
    const tokens = await exchangeCodeForTokens(code, redirectUri)

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Google OAuth — NeedSales</title>
  <style>
    body { font-family: 'JetBrains Mono', monospace; background: #0A0A0B; color: #F0F0F4; padding: 40px; }
    h2  { color: #00E5A0; margin-bottom: 20px; }
    pre { background: #111113; border: 1px solid #2A2A30; border-radius: 6px; padding: 20px; word-break: break-all; white-space: pre-wrap; }
    p   { color: #8A8A96; font-size: 13px; }
    .label { color: #4A4A56; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
  </style>
</head>
<body>
  <h2>✓ Autorização concluída</h2>
  <p>Copie o <strong>refresh_token</strong> abaixo e adicione ao <code>.env.local</code>:</p>
  <div class="label">GOOGLE_REFRESH_TOKEN=</div>
  <pre>${tokens.refresh_token ?? '⚠ Refresh token não retornado — certifique-se de usar prompt=consent na URL de autorização'}</pre>
  <p style="margin-top:24px">Após salvar no .env.local, reinicie o servidor. Esta página pode ser fechada.</p>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    return new NextResponse(`Token exchange failed: ${err instanceof Error ? err.message : err}`, { status: 500 })
  }
}
