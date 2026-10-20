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
});
