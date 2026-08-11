import Link from "next/link";

// EC-N4: friendly dead-end for tasks reassigned away / unknown pages.
export default function AppNotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">
          Not available
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          This page or task isn&apos;t available to you. It may have been
          reassigned or the link may be outdated.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Back to my dashboard
        </Link>
      </div>
    </div>
  );
}
