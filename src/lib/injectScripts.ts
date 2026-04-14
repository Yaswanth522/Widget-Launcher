const injectedScripts: HTMLScriptElement[] = []

export function clearInjectedScripts(): void {
  for (const el of injectedScripts) {
    el.remove()
  }
  injectedScripts.length = 0
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
 */
export async function injectEmbedScripts(
  html: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
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
      const message = e instanceof Error ? e.message : 'Could not run embed.'
      return { ok: false, error: message }
    }
  }

  return { ok: true }
}

function appendScriptFromParsed(source: HTMLScriptElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    cloneScriptAttributes(source, el)

    const srcAttr = source.getAttribute('src')?.trim()
    if (srcAttr) {
      el.src = source.src
      el.async = false
      el.onload = () => resolve()
      el.onerror = () =>
        reject(new Error(`Could not load: ${source.src}`))
      document.body.appendChild(el)
      injectedScripts.push(el)
      return
    }

    el.textContent = source.textContent
    document.body.appendChild(el)
    injectedScripts.push(el)
    resolve()
  })
}
