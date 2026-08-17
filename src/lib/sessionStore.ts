import { z } from 'zod'

const STORAGE_KEY = 'widget-launcher.session.v1'

const envelopeSchema = z.object({
  v: z.literal(1),
  sessionId: z.string(),
  brandName: z.string(),
  embedCode: z.string(),
  launched: z.boolean(),
  minimized: z.boolean(),
  backgroundMode: z.enum(['default', 'upload']),
  hasCoverImage: z.boolean(),
})

export type SessionEnvelope = z.infer<typeof envelopeSchema>

const emptyEnvelope = (sessionId: string): SessionEnvelope => ({
  v: 1,
  sessionId,
  brandName: '',
  embedCode: '',
  launched: false,
  minimized: false,
  backgroundMode: 'default',
  hasCoverImage: false,
})

function readRaw(): SessionEnvelope | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return envelopeSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

function writeRaw(envelope: SessionEnvelope): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
  } catch {
    /* storage unavailable/full — persistence degrades to in-memory only */
  }
}

let cached: SessionEnvelope | null | undefined

/** Synchronous; call once and reuse the result for initial render state. */
export function loadSession(): SessionEnvelope {
  const envelope = cached ?? readRaw() ?? emptyEnvelope(crypto.randomUUID())
  cached = envelope
  return envelope
}

function patch(update: Partial<Omit<SessionEnvelope, 'v' | 'sessionId'>>): void {
  const current = loadSession()
  cached = { ...current, ...update }
  writeRaw(cached)
}

export function saveForm(fields: { brandName: string; embedCode: string }): void {
  patch(fields)
}

export function saveLaunch(fields: { launched: boolean; minimized: boolean }): void {
  patch(fields)
}

export function saveBackground(fields: {
  backgroundMode: SessionEnvelope['backgroundMode']
  hasCoverImage: boolean
}): void {
  patch(fields)
}

export function clearForm(): void {
  patch({ brandName: '', embedCode: '' })
}

export function clearLaunch(): void {
  patch({ launched: false, minimized: false })
}

/**
 * Belt-and-braces flush for browsers where a state-driven write might be
 * mid-flight when the tab is hidden/navigated away from. All writes above are
 * already synchronous, so this just re-persists whatever is currently cached.
 */
export function flushSession(): void {
  if (cached) writeRaw(cached)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSession)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSession()
  })
}
