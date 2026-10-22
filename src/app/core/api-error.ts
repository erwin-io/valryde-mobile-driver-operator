import { HttpErrorResponse } from '@angular/common/http';

import type { ApiErrorEnvelope } from './auth.models';

// Preserve actionable Agent A client errors; treat transport/server statuses as outages.
const CLIENT_ERRORS = [400, 401, 403, 404, 409];

export const isClientError = (error: unknown): error is HttpErrorResponse =>
  error instanceof HttpErrorResponse && CLIENT_ERRORS.includes(error.status);

/** Agent A error code (e.g. `EMAIL_NOT_VERIFIED`) when the server rejected the request. */
export function apiErrorCode(error: unknown): string | null {
  if (!isClientError(error)) return null;
  return (error.error as Partial<ApiErrorEnvelope> | null)?.error?.code ?? null;
}

// Server messages that use internal wording get a plain-language replacement.
const FRIENDLY: Record<string, string> = {
  INVALID_CHALLENGE: 'This link is invalid, has expired, or was already used.',
};

/** Plain-language message: the server's message for rejections, a connection message otherwise. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!isClientError(error)) return 'VALRYDE is unavailable right now. Check your connection and try again.';
  const body = (error.error as Partial<ApiErrorEnvelope> | null)?.error;
  return (body?.code && FRIENDLY[body.code]) || body?.message || fallback;
}
