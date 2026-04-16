function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0f1e]/80 backdrop-blur-xl">
      <div className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.1)] shadow-[0_0_24px_rgba(0,245,255,0.14)]">
            <span className="font-heading text-2xl font-bold text-[#00f5ff]">S</span>
          </div>
          <div>
            <p className="font-heading text-3xl leading-none font-bold tracking-tight text-white">
              SimuSolve
            </p>
            <p className="mt-1 font-mono-display text-xs uppercase tracking-[0.34em] text-[rgba(0,245,255,0.7)]">
              Interactive Physics Workspace
            </p>
          </div>
        </div>

        <p className="max-w-xl font-mono-display text-sm text-slate-300 lg:text-right">
          See the Physics. Understand the Math.
        </p>
      </div>
    </header>
  )
}

export default Navbar
