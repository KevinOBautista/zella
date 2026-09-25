/**
 * Public reads must never turn a backend failure into "no results" (or into
 * sample content). This raises instead, so the route's error boundary shows
 * an honest error state.
 */
export class DataUnavailableError extends Error {
  constructor(context: string, cause?: unknown) {
    super(`Could not load ${context}`);
    this.name = "DataUnavailableError";
    this.cause = cause;
  }
}

type Result<T> = { data: T; error: { message: string; code?: string } | null; count?: number | null };

export function orThrow<T>(context: string, result: Result<T>): T {
  if (result.error) throw new DataUnavailableError(context, result.error);
  return result.data;
}

export function countOrThrow(context: string, result: { error: { message: string } | null; count: number | null }): number {
  if (result.error) throw new DataUnavailableError(context, result.error);
  return result.count ?? 0;
}
