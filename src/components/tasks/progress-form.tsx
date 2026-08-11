"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ProgressFormState } from "@/server/actions/progress";
import { MEMBER_STATUS_TARGETS } from "@/lib/types/domain";
import { STATUS_LABELS } from "@/components/tasks/badges";

const FIELD =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600";
const LABEL = "block text-sm font-medium text-zinc-800";

// FR19/D3: report progress + optionally move the task's status. Updates are
// immutable once submitted (A3) — the form says so.
export function ProgressForm({
  action,
}: {
  action: (
    prev: ProgressFormState,
    formData: FormData,
  ) => Promise<ProgressFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state && !state.ok ? (state.error.fields ?? {}) : {};

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section
      aria-label="Report progress"
      className="rounded-xl border border-blue-200 bg-blue-50/50 p-5"
    >
      <h2 className="text-lg font-semibold text-zinc-900">Report progress</h2>
      <form ref={formRef} action={formAction} className="mt-4 space-y-4">
        {state?.ok ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            Progress submitted — the task creator has been notified.
          </div>
        ) : null}
        {state && !state.ok ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {state.error.message}
          </div>
        ) : null}

        <div>
          <label htmlFor="progress-body" className={LABEL}>
            What have you completed or worked on?
          </label>
          <textarea
            id="progress-body"
            name="body"
            rows={4}
            required
            maxLength={5000}
            placeholder="e.g. Completed dashboard layout and API integration. Currently working on mobile responsiveness."
            className={FIELD}
          />
          {errors.body ? (
            <p role="alert" className="mt-1 text-sm text-red-700">
              {errors.body}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="progress-percent" className={LABEL}>
              Progress % <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <input
              id="progress-percent"
              name="percent"
              type="number"
              min={0}
              max={100}
              step={1}
              inputMode="numeric"
              placeholder="0–100"
              className={FIELD}
            />
            {errors.percent ? (
              <p role="alert" className="mt-1 text-sm text-red-700">
                {errors.percent}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="progress-status" className={LABEL}>
              Move status to{" "}
              <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <select
              id="progress-status"
              name="new_status"
              defaultValue=""
              className={FIELD}
            >
              <option value="">Keep current status</option>
              {MEMBER_STATUS_TARGETS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {errors.new_status ? (
              <p role="alert" className="mt-1 text-sm text-red-700">
                {errors.new_status}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            Updates can&apos;t be edited after submitting.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Submit update"}
          </button>
        </div>
      </form>
    </section>
  );
}
