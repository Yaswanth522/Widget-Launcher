import { useCallback, useEffect, useState } from 'react'
import { Background } from './components/Background'
import {
  LauncherForm,
  type BackgroundMode,
} from './components/LauncherForm'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function ConfigureFab({ onClick }: { onClick: () => void }) {
  return (
    <div className="fixed left-4 top-4 z-[100000] flex items-center gap-0">
      <button
        type="button"
        onClick={onClick}
        className="group relative flex h-12 w-12 items-center justify-center rounded-full border border-white/90 bg-white/95 text-[#1a1a1a] shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition hover:bg-white"
        aria-label="Open settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-6 w-6"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
        <span
          className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-10 max-w-[min(calc(100vw-5rem),14rem)] -translate-y-1/2 rounded-lg border border-[#d8dce5] bg-white/95 px-3 py-2 text-left text-xs font-medium text-[#333] opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:sr-only"
          role="tooltip"
        >
          Settings
        </span>
      </button>
    </div>
  )
}

function App() {
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('default')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [backgroundFileError, setBackgroundFileError] = useState<string | null>(
    null,
  )
  const [configureOpen, setConfigureOpen] = useState(false)

  const immersive = coverUrl !== null

  const revokeCoverUrl = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url)
  }, [])

  useEffect(() => {
    return () => revokeCoverUrl(coverUrl)
  }, [coverUrl, revokeCoverUrl])

  const handleBackgroundModeChange = useCallback(
    (mode: BackgroundMode) => {
      setBackgroundMode(mode)
      setBackgroundFileError(null)
      if (mode === 'default') {
        setCoverUrl((prev) => {
          revokeCoverUrl(prev)
          return null
        })
        setConfigureOpen(false)
      }
    },
    [revokeCoverUrl],
  )

  const handleBackgroundFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setBackgroundFileError('Please choose an image file.')
        return
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setBackgroundFileError('Image must be 5 MB or smaller.')
        return
      }
      setBackgroundFileError(null)
      setCoverUrl((prev) => {
        revokeCoverUrl(prev)
        return URL.createObjectURL(file)
      })
    },
    [revokeCoverUrl],
  )

  useEffect(() => {
    if (!configureOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfigureOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [configureOpen])

  useEffect(() => {
    if (!immersive || !configureOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [immersive, configureOpen])

  const shellClass = immersive
    ? configureOpen
      ? 'fixed inset-0 z-[99999] flex items-center justify-center overflow-x-hidden overflow-y-auto bg-black/40 p-2 sm:p-4'
      : 'hidden'
    : 'relative z-[2] flex min-h-[100dvh] w-full items-center justify-center overflow-x-hidden px-3 py-6 sm:px-8 sm:py-8'

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden">
      <Background coverUrl={coverUrl} />

      {immersive && !configureOpen && (
        <ConfigureFab onClick={() => setConfigureOpen(true)} />
      )}

      <div
        className={shellClass}
        onClick={
          immersive && configureOpen
            ? () => setConfigureOpen(false)
            : undefined
        }
      >
        <div
          className={
            immersive && configureOpen
              ? 'flex w-full max-w-none shrink-0 justify-center'
              : 'flex w-full justify-center'
          }
          onClick={
            immersive && configureOpen
              ? (e) => e.stopPropagation()
              : undefined
          }
        >
          <LauncherForm
            backgroundMode={backgroundMode}
            onBackgroundModeChange={handleBackgroundModeChange}
            onBackgroundFile={handleBackgroundFile}
            backgroundFileError={backgroundFileError}
            hasCoverImage={immersive}
            configureModalOpen={immersive && configureOpen}
            onCloseConfigure={() => setConfigureOpen(false)}
            onEnterPostLaunchChrome={() => setConfigureOpen(false)}
          />
        </div>
      </div>
    </div>
  )
}

export default App
