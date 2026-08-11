"use client";

import { useEffect } from "react";

// NFR6: friendly failure surface — technical detail goes to logs, never users.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          We couldn&apos;t complete that action. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
