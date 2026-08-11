// NFR2/NFR7: meaningful loading state for every authenticated surface.
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="h-7 w-56 rounded bg-zinc-200" />
      <div className="mt-2 h-4 w-40 rounded bg-zinc-200" />
      <div className="mt-8 h-40 rounded-xl bg-zinc-200" />
    </div>
  );
}
