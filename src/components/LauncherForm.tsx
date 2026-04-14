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
    .min(1, 'Paste your script tags')
    .refine((v) => /<script/i.test(v), {
      message: 'Include at least one <script> tag',
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
  const bgSelectId = useId()
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
            <p className="text-sm text-[#2d6a4f]">
              Widget is active on this page.
            </p>
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

  return (
    <div className="animate-panel-in w-full max-w-xl rounded-2xl border border-white/90 bg-white/70 px-8 py-9 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-[12px]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h1 className="text-[1.35rem] font-semibold tracking-tight text-[#1a1a1a]">
          {brandName?.trim() ? brandName.trim() : 'Welcome'}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          {launched && !injectError && (
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="rounded-xl border border-[#c5ccd8] bg-white/90 px-3 py-1.5 text-sm font-medium text-[#333] shadow-sm transition hover:bg-white"
            >
              Minimize
            </button>
          )}
          {configureModalOpen && onCloseConfigure && (
            <button
              type="button"
              onClick={onCloseConfigure}
              className="rounded-xl border border-[#c5ccd8] bg-white/90 px-3 py-1.5 text-sm font-medium text-[#333] shadow-sm transition hover:bg-white"
              aria-label="Close configuration"
            >
              Close
            </button>
          )}
        </div>
      </div>
      <p className="text-[0.95rem] leading-relaxed text-[#444]">
        Enter your brand name and paste the embed scripts your provider gave
        you. Launch runs them on this page so the widget can appear—use only
        code you trust.
      </p>
      <div
        className="animate-shimmer mt-5 h-[3px] rounded-full"
        aria-hidden
      />

      <form
        className="mt-8 space-y-5 text-left"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div>
          <label
            htmlFor={bgSelectId}
            className="mb-1.5 block text-sm font-medium text-[#333]"
          >
            Background
          </label>
          <select
            id={bgSelectId}
            value={backgroundMode}
            onChange={(e) =>
              onBackgroundModeChange(e.target.value as BackgroundMode)
            }
            className="w-full rounded-xl border border-[#d8dce5] bg-white/90 px-3.5 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#9aa8b8] focus:ring-2 focus:ring-[#9aa8b8]/25"
          >
            <option value="default">Default</option>
            <option value="upload">Upload image</option>
          </select>
        </div>

        {backgroundMode === 'upload' && (
          <div>
            <label
              htmlFor={fileInputId}
              className="mb-1.5 block text-sm font-medium text-[#333]"
            >
              Background image (max 5 MB)
            </label>
            <input
              id={fileInputId}
              key={hasCoverImage ? 'has-file' : 'no-file'}
              type="file"
              accept="image/*"
              className="block w-full text-sm text-[#444] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1a1a1a] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#333]"
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
              <p className="mt-1.5 text-sm text-[#2d6a4f]">
                Image fills the screen. Use the gear in the top-left to open
                this panel when it is hidden.
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

        <div>
          <label
            htmlFor="embedCode"
            className="mb-1.5 block text-sm font-medium text-[#333]"
          >
            Script tags (HTML)
          </label>
          <textarea
            id="embedCode"
            rows={12}
            spellCheck={false}
            placeholder={'Paste <script> tags from your provider…'}
            className="font-mono w-full resize-y rounded-xl border border-[#d8dce5] bg-white/90 px-3.5 py-2.5 text-xs leading-relaxed text-[#1a1a1a] shadow-sm outline-none transition placeholder:text-[#888] focus:border-[#9aa8b8] focus:ring-2 focus:ring-[#9aa8b8]/25"
            {...register('embedCode')}
          />
          {errors.embedCode && (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
              {errors.embedCode.message}
            </p>
          )}
        </div>

        {injectError && (
          <p className="text-sm text-red-600" role="alert">
            {injectError}
          </p>
        )}

        {launched && !injectError && !minimized && (
          <p className="text-sm text-[#2d6a4f]">
            Scripts injected. If the widget supports it, you should see its
            control on this page.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Launching…' : 'Launch widget'}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-[#c5ccd8] bg-white/80 px-5 py-2.5 text-sm font-medium text-[#333] shadow-sm transition hover:bg-white"
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
      </form>
    </div>
  )
}
