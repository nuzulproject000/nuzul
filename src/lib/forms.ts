import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiError } from "@/types/api";

/** Map a 422 response's fieldErrors onto react-hook-form fields. Returns true when anything was mapped. */
export function applyFieldErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>): boolean {
  const e = err as ApiError;
  if (!e?.fieldErrors) return false;
  Object.entries(e.fieldErrors).forEach(([k, message]) => setError(k as Path<T>, { type: "server", message }));
  return true;
}

export const errorMessage = (err: unknown, fallback: string) => (err as ApiError)?.message ?? fallback;
