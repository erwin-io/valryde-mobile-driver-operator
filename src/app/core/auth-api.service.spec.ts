import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AuthTokens } from './auth.models';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the verified Agent A login endpoint and payload', () => {
    const request = { email: 'driver@example.com', password: 'correct-horse' };
    const response: AuthTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpiresIn: 900,
      refreshTokenExpiresAt: '2026-10-22T00:00:00Z',
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        email: request.email,
        displayName: 'Driver One',
        status: 'ACTIVE',
        emailVerified: true,
        roles: ['DRIVER'],
        createdAt: '2026-10-21T00:00:00Z',
        updatedAt: '2026-10-21T00:00:00Z',
      },
    };

    service.login(request).subscribe((result) => expect(result).toEqual(response));
    const pending = http.expectOne('/api/auth/login');
    expect(pending.request.method).toBe('POST');
    expect(pending.request.body).toEqual(request);
    pending.flush(response);
  });

  it('sends only the refresh token to the refresh endpoint', () => {
    service.refresh('opaque-refresh-token').subscribe();
    const pending = http.expectOne('/api/auth/refresh');
    expect(pending.request.method).toBe('POST');
    expect(pending.request.body).toEqual({ refreshToken: 'opaque-refresh-token' });
    pending.flush({});
  });

  it.each([
    ['verifyEmail', ['verify-token'], '/api/auth/verify-email', { token: 'verify-token' }],
    ['resendVerification', ['d@example.com'], '/api/auth/resend-verification', { email: 'd@example.com' }],
    ['forgotPassword', ['d@example.com'], '/api/auth/forgot-password', { email: 'd@example.com' }],
    ['resetPassword', ['reset-token', 'new-password-123'], '/api/auth/reset-password', { token: 'reset-token', password: 'new-password-123' }],
    ['logout', ['opaque-refresh-token'], '/api/auth/logout', { refreshToken: 'opaque-refresh-token' }],
    ['changePassword', ['old-password-123', 'new-password-123'], '/api/auth/me/change-password', { currentPassword: 'old-password-123', newPassword: 'new-password-123' }],
    ['requestEmailChange', ['new@example.test'], '/api/auth/me/change-email', { email: 'new@example.test' }],
    ['confirmEmailChange', ['email-change-token'], '/api/auth/confirm-email-change', { token: 'email-change-token' }],
  ] as const)('%s posts the Agent A payload', (method, args, url, body) => {
    (service[method] as (...a: string[]) => ReturnType<AuthApiService['logout']>)(...args).subscribe();
    const pending = http.expectOne(url);
    expect(pending.request.method).toBe('POST');
    expect(pending.request.body).toEqual(body);
    pending.flush(null);
  });

  it('updates only the display name through PATCH /auth/me', () => {
    service.updateProfile('New Name').subscribe();
    const pending = http.expectOne('/api/auth/me');
    expect(pending.request.method).toBe('PATCH');
    expect(pending.request.body).toEqual({ displayName: 'New Name' });
    pending.flush({ user: {} });
  });
});
