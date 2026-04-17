/** Every script this launcher adds or causes to be added is tagged; each new inject removes all tagged scripts first. */
const LAUNCHER_SCRIPT_ATTR = 'data-widget-launcher-embed'

/**
 * Vendors like Yellow.ai keep globals and DOM after `<script>` removal.
 * Tear those down before the next inject so an edited snippet does not stack
 * on top of the previous widget.
 */
function teardownEmbedRuntimeArtifacts(): void {
  const w = window as unknown as Record<string, unknown>
  const ym = w.YellowMessenger
  if (typeof ym === 'function') {
    const call = ym as (cmd: string, ...args: unknown[]) => void
    for (const cmd of [
      'destroy',
      'close',
      'logout',
      'unload',
      'kill',
      'remove',
    ] as const) {
      try {
        call(cmd)
      } catch {
        /* ignore unknown commands */
      }
    }
  }

  const domSelectors = [
    'iframe[src*="yellowmessenger" i]',
    'iframe[src*="yellow.ai" i]',
    'iframe[src*="nexus.yellow" i]',
    '[id^="ym-"]',
    '[id*="YellowMessenger" i]',
  ] as const
  for (const sel of domSelectors) {
    document.querySelectorAll(sel).forEach((node) => node.remove())
  }

  for (const key of [
    'YellowMessenger',
    'ymConfig',
    'ymPlugin',
    'ymToken',
  ] as const) {
    try {
      delete w[key]
    } catch {
      /* non-configurable */
    }
  }

  for (const sel of domSelectors) {
    document.querySelectorAll(sel).forEach((node) => node.remove())
  }
}

function stripInjectedEmbedFromDocument(): void {
  teardownEmbedRuntimeArtifacts()
  removeAllLauncherTaggedScripts()
}

function markLauncherEmbedScript(el: HTMLScriptElement): void {
  el.setAttribute(LAUNCHER_SCRIPT_ATTR, '1')
}

function snapshotScripts(): Set<Element> {
  return new Set(document.querySelectorAll('script'))
}

/** Remove every script from a previous launch (or partial inject). */
function removeAllLauncherTaggedScripts(): void {
  document.querySelectorAll(`script[${LAUNCHER_SCRIPT_ATTR}]`).forEach((n) => {
    n.remove()
  })
}

/**
 * Tag any `<script>` that appeared after `original` (embed + vendor follow-ons).
 * Safe to call repeatedly; already-tagged nodes stay tagged.
 */
function tagScriptsAddedSince(original: Set<Element>): void {
  for (const el of document.querySelectorAll('script')) {
    if (original.has(el)) continue
    markLauncherEmbedScript(el as HTMLScriptElement)
  }
}

/**
 * Vendors often append `<script src>` on a later task; re-scan a few times so those get tagged too.
 */
async function tagNewEmbedScriptsWithSettling(original: Set<Element>): Promise<void> {
  tagScriptsAddedSince(original)
  await Promise.resolve()
  tagScriptsAddedSince(original)
  await new Promise<void>((r) => queueMicrotask(r))
  tagScriptsAddedSince(original)
  await new Promise<void>((r) => setTimeout(r, 0))
  tagScriptsAddedSince(original)
  await new Promise<void>((r) => setTimeout(r, 50))
  tagScriptsAddedSince(original)
  await new Promise<void>((r) => setTimeout(r, 200))
  tagScriptsAddedSince(original)
}

function removeExistingScriptsWithSameAbsoluteSrc(resolvedSrc: string): void {
  let target: string
  try {
    target = new URL(resolvedSrc, document.baseURI).href
  } catch {
    return
  }
  for (const node of document.querySelectorAll('script[src]')) {
    const s = node as HTMLScriptElement
    try {
      if (new URL(s.src).href === target) s.remove()
    } catch {
      /* ignore invalid src */
    }
  }
}

export function clearInjectedScripts(): void {
  stripInjectedEmbedFromDocument()
}

function cloneScriptAttributes(
  source: HTMLScriptElement,
  target: HTMLScriptElement,
): void {
  for (const { name, value } of Array.from(source.attributes)) {
    if (name.toLowerCase() === 'src') continue
    target.setAttribute(name, value)
  }
}

/**
 * Parses HTML embed code, finds <script> nodes in order, and appends
 * equivalent scripts to document.body. External scripts load sequentially
 * so following inline scripts run after the loader is ready.
 *
 * Always removes previously tagged embed scripts first, then injects fresh.
 */
export async function injectEmbedScripts(
  html: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  stripInjectedEmbedFromDocument()
  const scriptsBeforeThisLaunch = snapshotScripts()

  const wrapped = `<!DOCTYPE html><html><head></head><body>${html}</body></html>`
  const doc = new DOMParser().parseFromString(wrapped, 'text/html')
  const scripts = Array.from(doc.body.querySelectorAll('script'))

  if (scripts.length === 0) {
    return { ok: false, error: 'Add at least one script tag.' }
  }

  for (const source of scripts) {
    try {
      await appendScriptFromParsed(source)
    } catch (e) {
      stripInjectedEmbedFromDocument()
      const message = e instanceof Error ? e.message : 'Could not run embed.'
      return { ok: false, error: message }
    }
  }

  await tagNewEmbedScriptsWithSettling(scriptsBeforeThisLaunch)

  return { ok: true }
}

/**
 * Many vendor widgets (e.g. Yellow.ai) defer their CDN inject with
 * `window.addEventListener('load', inject)`. If embed code runs after the
 * page has already reached `complete`, `load` never fires again, so nothing
 * loads. Briefly intercept `load` registration and invoke those listeners once
 * the inline script has finished.
 */
function runInlineWithLateLoadPolyfill(run: () => void): void {
  if (document.readyState !== 'complete') {
    run()
    return
  }

  const queued: EventListenerOrEventListenerObject[] = []
  const orig = window.addEventListener.bind(window)
  window.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (type === 'load' && listener) {
      queued.push(listener)
      return
    }
    return orig(type, listener as EventListener, options)
  }) as typeof window.addEventListener

  try {
    run()
  } finally {
    window.addEventListener = orig
  }

  if (queued.length === 0) return
  const ev = new Event('load')
  for (const listener of queued) {
    if (typeof listener === 'function') {
      listener.call(window, ev)
    } else if (listener && typeof listener.handleEvent === 'function') {
      listener.handleEvent.call(listener, ev)
    }
  }
}

function appendScriptFromParsed(source: HTMLScriptElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const srcAttr = source.getAttribute('src')?.trim()
    if (srcAttr) {
      const el = document.createElement('script')
      cloneScriptAttributes(source, el)
      el.src = source.src
      el.async = false
      removeExistingScriptsWithSameAbsoluteSrc(el.src)
      markLauncherEmbedScript(el)
      el.onload = () => resolve()
      el.onerror = () =>
        reject(new Error(`Could not load: ${source.src}`))
      document.body.appendChild(el)
      return
    }

    runInlineWithLateLoadPolyfill(() => {
      const el = document.createElement('script')
      cloneScriptAttributes(source, el)
      el.textContent = source.textContent
      markLauncherEmbedScript(el)
      document.body.appendChild(el)
    })
    resolve()
  })
}
