export default function ComponentLoading() {
  return (
    <main className="mx-auto w-full max-w-[1280px] animate-pulse px-4 pb-24 pt-12 sm:px-6 lg:px-8">
      <div className="h-8 w-32 rounded-lg bg-muted" />
      <div className="pb-14 pt-20">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="mt-5 h-14 max-w-lg rounded-xl bg-muted" />
        <div className="mt-5 h-5 max-w-2xl rounded bg-muted" />
      </div>
      <div className="min-h-[520px] rounded-2xl border border-border bg-card" />
    </main>
  )
}
