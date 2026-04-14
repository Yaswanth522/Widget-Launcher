type BackgroundProps = {
  /** Full-viewport cover image (object-fit: cover behavior via CSS). */
  coverUrl?: string | null
}

export function Background({ coverUrl }: BackgroundProps) {
  if (coverUrl) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-0 min-h-[100dvh] w-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${coverUrl})` }}
        aria-hidden
      />
    )
  }

  return (
    <>
      <div
        className="animate-bg-shift pointer-events-none fixed inset-0 z-0 min-h-[100dvh] w-full"
        aria-hidden
      />
      <div
        className="animate-float-a pointer-events-none fixed top-[10%] -left-[5%] z-[1] h-[min(42vw,320px)] w-[min(42vw,320px)] rounded-full bg-[#b8c4d4] opacity-45 blur-[48px]"
        aria-hidden
      />
      <div
        className="animate-float-b pointer-events-none fixed -right-[8%] bottom-[15%] z-[1] h-[min(38vw,280px)] w-[min(38vw,280px)] rounded-full bg-[#c5ccd8] opacity-45 blur-[48px]"
        aria-hidden
      />
    </>
  )
}
