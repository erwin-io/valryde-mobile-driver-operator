import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

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

  it.each([0, 500, 503])('uses the connection-safe message for status %s', (status) => {
    expect(apiErrorMessage(rejected(status, 'INTERNAL', 'Do not expose this'), 'fallback')).toBe(
      'VALRYDE is unavailable right now. Check your connection and try again.',
    );
  });

  it.each([['1', '1 second'], ['60', '60 seconds']])('presents HTTP429 Retry-After %s without treating it as session rejection', (header, expected) => {
    const error = new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': header }), error: { error: { code: 'RATE_LIMITED', message: 'private internals' } } });
    expect(apiErrorMessage(error, 'fallback')).toBe('Too many requests. Try again in ' + expected + '.');
    expect(apiErrorCode(error)).toBe('RATE_LIMITED');
    expect(isClientError(error)).toBe(false);
  });

  it.each([null, 'invalid', '-1', '0', '999999999999999999999'])('keeps a safe throttle message with malformed/missing Retry-After %s', header => {
    const error = new HttpErrorResponse({ status: 429, headers: header ? new HttpHeaders({ 'Retry-After': header }) : undefined });
    expect(apiErrorMessage(error, 'fallback')).toBe('Too many requests. Please wait before trying again.');
  });

  it('keeps the friendly invalid-link copy', () => {
    expect(apiErrorMessage(rejected(400, 'INVALID_CHALLENGE', 'Internal challenge text'), 'fallback')).toBe(
      'This link is invalid, has expired, or was already used.',
    );
  });
});
