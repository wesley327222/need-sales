function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function safeParseJson(text: string): unknown {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(stripped)
}

export async function runWithRetry<T>(
  runFn: () => Promise<T>,
  label = 'agent',
): Promise<T | null> {
  const delays = [1000, 2000, 4000]
  let lastError: unknown

  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) await sleep(delays[attempt - 1])
    try {
      return await runFn()
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[${label}] attempt ${attempt + 1} failed: ${msg}`)
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError)
  console.error(`[${label}] all attempts exhausted. Last error: ${msg}`)
  return null
}
