'use client';

import { useRef, useState, useTransition } from 'react';
import { createShift } from './actions';

type UserOption = { id: string; name: string };

export function CreateShiftModal({ users = [] }: { users?: UserOption[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function handleOpen() {
    setOpen(true);
    setError(null);
  }

  function handleClose() {
    setOpen(false);
    setError(null);
    formRef.current?.reset();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    startTransition(async () => {
      const result = await createShift(new FormData(form));
      if (result.error) {
        setError(result.error);
      } else {
        handleClose();
        // Refresh the page to show the new shift
        window.location.reload();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <PlusIcon className="h-4 w-4" />
        New Shift
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-shift-title"
        >
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 id="create-shift-title" className="text-sm font-semibold text-gray-900">
                Create New Shift
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form ref={formRef} onSubmit={handleSubmit} className="p-5">
              <div className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="assignee"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Assignee
                  </label>
                  <select
                    id="assignee"
                    name="assignee"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="startTime"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    id="startTime"
                    name="startTime"
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="endTime"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    id="endTime"
                    name="endTime"
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <LoadingSpinner />
                      Creating...
                    </>
                  ) : (
                    'Create Shift'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
