import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { clearInjectedScripts, injectEmbedScripts } from '../lib/injectScripts'

export type BackgroundMode = 'default' | 'upload'

const schema = z.object({
  brandName: z
    .string()
    .min(1, 'Enter a brand name')
    .max(120, 'Keep the brand name under 120 characters'),
  embedCode: z
    .string()
    .min(1, 'Required')
    .refine((v) => /<script/i.test(v), {
      message: 'Must include a script tag',
    }),
})

type FormValues = z.infer<typeof schema>

const emptyDefaults: FormValues = {
  brandName: '',
  embedCode: '',
}

export type LauncherFormProps = {
  backgroundMode: BackgroundMode
  onBackgroundModeChange: (mode: BackgroundMode) => void
  onBackgroundFile: (file: File) => void
  backgroundFileError: string | null
  hasCoverImage: boolean
  configureModalOpen: boolean
  onCloseConfigure?: () => void
}

function BackgroundModeToggle({
  mode,
  onChange,
}: {
  mode: BackgroundMode
  onChange: (mode: BackgroundMode) => void
}) {
  return (
    <div
      className="flex w-full rounded-xl border border-[#c8ced9] bg-[#dde2eb] p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
      role="radiogroup"
      aria-label="Background"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'default'}
        className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          mode === 'default'
            ? 'bg-white text-[#1a1a1a] shadow-sm ring-1 ring-black/5'
            : 'text-[#4a5568] hover:text-[#1a1a1a]'
        }`}
        onClick={() => onChange('default')}
      >
        Default
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'upload'}
        className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          mode === 'upload'
            ? 'bg-white text-[#1a1a1a] shadow-sm ring-1 ring-black/5'
            : 'text-[#4a5568] hover:text-[#1a1a1a]'
        }`}
        onClick={() => onChange('upload')}
      >
        Upload image
      </button>
    </div>
  )
}

function CloseIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d8dce5] bg-white/95 text-[#444] shadow-sm transition hover:bg-white hover:text-[#111]"
      aria-label="Close"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18 18 6M6 6l12 12"
        />
      </svg>
    </button>
  )
}

export function LauncherForm({
  backgroundMode,
  onBackgroundModeChange,
  onBackgroundFile,
  backgroundFileError,
  hasCoverImage,
  configureModalOpen,
  onCloseConfigure,
}: LauncherFormProps) {
  const [launched, setLaunched] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [injectError, setInjectError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [documentTitle, setDocumentTitle] = useState('Widget Launcher')
  const fileInputId = useId()

  useEffect(() => {
    document.title = documentTitle
  }, [documentTitle])

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults,
  })

  const brandName = useWatch({ control, name: 'brandName' }) ?? ''

  const onSubmit = async (data: FormValues) => {
    setInjectError(null)
    setPending(true)
    clearInjectedScripts()
    setDocumentTitle(data.brandName.trim())
    const result = await injectEmbedScripts(data.embedCode)
    setPending(false)
    if (!result.ok) {
      setInjectError(result.error)
      setLaunched(false)
      setMinimized(false)
      setDocumentTitle('Widget Launcher')
      return
    }
    setLaunched(true)
    setMinimized(true)
  }

  const onReset = () => {
    clearInjectedScripts()
    setInjectError(null)
    setLaunched(false)
    setMinimized(false)
    reset(emptyDefaults)
    setDocumentTitle('Widget Launcher')
  }

  const onReloadPage = () => {
    window.location.reload()
  }

  const showMinimized = launched && !injectError && minimized

  if (showMinimized) {
    return (
      <div className="animate-panel-in w-full max-w-xl rounded-2xl border border-white/90 bg-white/70 px-5 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-[12px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-[#1a1a1a]">
              {brandName.trim() || 'Widget'}
            </p>
            <p className="text-sm text-[#2d6a4f]">Widget is running.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMinimized(false)}
              className="rounded-xl border border-[#c5ccd8] bg-white/90 px-4 py-2 text-sm font-medium text-[#333] shadow-sm transition hover:bg-white"
            >
              Expand
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl border border-[#c5ccd8] bg-white/80 px-4 py-2 text-sm font-medium text-[#333] shadow-sm transition hover:bg-white"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onReloadPage}
              className="px-2 py-2 text-sm font-medium text-[#555] underline-offset-2 hover:underline"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    )
  }

  const panelWide =
    'w-full max-w-[min(56rem,calc(100dvw-1.5rem))] sm:max-w-[min(56rem,calc(100dvw-2rem))]'
  const panelPadding = configureModalOpen ? 'px-5 py-5 sm:px-7 sm:py-6' : 'px-5 py-6 sm:px-8 sm:py-7'
  const panelHeight = configureModalOpen
    ? 'max-h-[min(100dvh-0.75rem,44rem)] sm:max-h-[min(100dvh-1rem,46rem)] flex min-h-0 flex-col overflow-y-auto'
    : ''

  return (
    <div
      className={`animate-panel-in rounded-2xl border border-white/90 bg-white/70 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-[12px] ${panelWide} ${panelPadding} ${panelHeight}`}
    >
      <div className="mb-2 flex min-h-[2.5rem] items-start justify-between gap-3 sm:mb-3">
        <h1 className="min-w-0 pr-2 text-lg font-semibold tracking-tight text-[#1a1a1a] sm:text-[1.35rem]">
          {brandName?.trim() ? brandName.trim() : 'Widget launcher'}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          {launched && !injectError && !configureModalOpen && (
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="rounded-xl border border-[#c5ccd8] bg-white/90 px-3 py-1.5 text-sm font-medium text-[#333] shadow-sm transition hover:bg-white"
            >
              Minimize
            </button>
          )}
          {configureModalOpen && onCloseConfigure && (
            <CloseIconButton onClick={onCloseConfigure} />
          )}
        </div>
      </div>

      <p
        className={`text-sm leading-snug text-[#444] sm:text-[0.95rem] sm:leading-relaxed ${configureModalOpen ? 'line-clamp-2 sm:line-clamp-none' : ''}`}
      >
        {configureModalOpen
          ? 'Update fields and launch when ready.'
          : 'Set your brand, background, and embed code—then launch.'}
      </p>
      <div
        className="animate-shimmer mt-3 h-[3px] rounded-full sm:mt-4"
        aria-hidden
      />

      <form
        className={`mt-5 flex flex-col sm:mt-6 ${configureModalOpen ? 'min-h-0 flex-1' : ''}`}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6 ${configureModalOpen ? 'min-h-0 flex-1 sm:grid-rows-1' : ''}`}
        >
          <div className="flex min-w-0 flex-col gap-4 sm:gap-4 sm:min-h-0">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-[#333]">
                Background
              </span>
              <BackgroundModeToggle
                mode={backgroundMode}
                onChange={onBackgroundModeChange}
              />
            </div>

            {backgroundMode === 'upload' && (
              <div>
                <label
                  htmlFor={fileInputId}
                  className="mb-1.5 block text-sm font-medium text-[#333]"
                >
                  Image (max 5 MB)
                </label>
                <input
                  id={fileInputId}
                  key={hasCoverImage ? 'has-file' : 'no-file'}
                  type="file"
                  accept="image/*"
                  className="block w-full max-w-full text-xs text-[#444] file:mr-2 file:rounded-lg file:border-0 file:bg-[#1a1a1a] file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[#333] sm:text-sm sm:file:mr-3 sm:file:px-3 sm:file:py-2 sm:file:text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onBackgroundFile(file)
                  }}
                />
                {backgroundFileError && (
                  <p className="mt-1.5 text-sm text-red-600" role="alert">
                    {backgroundFileError}
                  </p>
                )}
                {hasCoverImage && !backgroundFileError && (
                  <p className="mt-1.5 text-xs leading-snug text-[#2d6a4f] sm:text-sm">
                    Top-left gear opens this panel again.
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="brandName"
                className="mb-1.5 block text-sm font-medium text-[#333]"
              >
                Brand name
              </label>
              <input
                id="brandName"
                type="text"
                autoComplete="organization"
                placeholder="e.g. Yellow.ai"
                className="w-full rounded-xl border border-[#d8dce5] bg-white/90 px-3.5 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition placeholder:text-[#888] focus:border-[#9aa8b8] focus:ring-2 focus:ring-[#9aa8b8]/25"
                {...register('brandName')}
              />
              {errors.brandName && (
                <p className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.brandName.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col sm:h-full sm:min-h-0 sm:min-w-0">
            <label
              htmlFor="embedCode"
              className="mb-1.5 block shrink-0 text-sm font-medium text-[#333]"
            >
              Embed code
            </label>
            <textarea
              id="embedCode"
              spellCheck={false}
              placeholder="Widget embed snippet…"
              className={`font-mono w-full min-w-0 resize-none rounded-xl border border-[#d8dce5] bg-white/90 px-3 py-2.5 text-xs leading-relaxed text-[#1a1a1a] shadow-sm outline-none transition placeholder:text-[#888] focus:border-[#9aa8b8] focus:ring-2 focus:ring-[#9aa8b8]/25 sm:px-3.5 ${
                configureModalOpen
                  ? 'min-h-[10rem] sm:min-h-0 sm:flex-1 sm:overflow-y-auto'
                  : 'min-h-[12rem] sm:min-h-[min(42dvh,20rem)]'
              }`}
              {...register('embedCode')}
            />
            {errors.embedCode && (
              <p className="mt-1.5 shrink-0 text-sm text-red-600" role="alert">
                {errors.embedCode.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 shrink-0 space-y-3 border-t border-[#e2e6ee] pt-4 sm:col-span-2">
          {injectError && (
            <p className="text-sm text-red-600" role="alert">
              {injectError}
            </p>
          )}

          {launched && !injectError && !minimized && (
            <p className="text-sm text-[#2d6a4f]">Launched—check for the widget control.</p>
          )}

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
            >
              {pending ? 'Launching…' : 'Launch widget'}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl border border-[#c5ccd8] bg-white/80 px-4 py-2.5 text-sm font-medium text-[#333] shadow-sm transition hover:bg-white sm:px-5"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onReloadPage}
              className="text-sm font-medium text-[#555] underline-offset-2 hover:underline"
            >
              Reload page
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
