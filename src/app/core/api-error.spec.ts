import { HttpErrorResponse } from '@angular/common/http';

import { apiErrorCode, apiErrorMessage, isClientError } from './api-error';

const rejected = (status: number, code: string, message: string) =>
  new HttpErrorResponse({ status, error: { error: { code, message, requestId: 'req-1' } } });

describe('API error presentation', () => {
  it.each([400, 401, 403, 404, 409])('preserves the server message for a %s workflow rejection', (status) => {
    const error = rejected(status, `STATUS_${status}`, `Server message ${status}`);
    expect(isClientError(error)).toBe(true);
    expect(apiErrorCode(error)).toBe(`STATUS_${status}`);
    expect(apiErrorMessage(error, 'fallback')).toBe(`Server message ${status}`);
  });

  it.each([0, 429, 500, 503])('uses the connection-safe message for status %s', (status) => {
    expect(apiErrorMessage(rejected(status, 'INTERNAL', 'Do not expose this'), 'fallback')).toBe(
      'VALRYDE is unavailable right now. Check your connection and try again.',
    );
  });

  it('keeps the friendly invalid-link copy', () => {
    expect(apiErrorMessage(rejected(400, 'INVALID_CHALLENGE', 'Internal challenge text'), 'fallback')).toBe(
      'This link is invalid, has expired, or was already used.',
    );
  });
});
