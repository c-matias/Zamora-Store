import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-base text-ink placeholder:text-ink-mute aria-[invalid=true]:border-red-700";

export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-mute">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function a11y(id: string, error?: string) {
  return { id, name: id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${id}-error` : undefined } as const;
}
