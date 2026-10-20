import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { SessionService } from './session.service';
import { TokenStoreService } from './token-store.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let tokens: { access: string | null; refresh: string | null };
  let session: { refresh: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  beforeEach(() => {
    tokens = { access: 'old-access', refresh: 'refresh' };
    session = { refresh: vi.fn() };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenStoreService, useValue: { accessToken: () => tokens.access, refreshToken: () => tokens.refresh } },
        { provide: SessionService, useValue: session },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('attaches the in-memory bearer token', () => {
    http.get('/api/jeepneys').subscribe();
    expect(backend.expectOne('/api/jeepneys').request.headers.get('Authorization')).toBe('Bearer old-access');
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    session.refresh.mockImplementation(async () => {
      tokens.access = 'new-access';
      return true;
    });
    const result = new Promise((resolve) => http.get('/api/auth/me').subscribe(resolve));
    backend.expectOne('/api/auth/me').flush(null, unauthorized);
    await Promise.resolve();
    const retry = backend.expectOne('/api/auth/me');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    retry.flush({ user: {} });
    expect(await result).toEqual({ user: {} });
    expect(session.refresh).toHaveBeenCalledTimes(1);
  });

  it('returns to sign-in when the session cannot be refreshed', async () => {
    session.refresh.mockResolvedValue(false);
    const failed = new Promise((resolve) => http.get('/api/jeepneys').subscribe({ error: resolve }));
    backend.expectOne('/api/jeepneys').flush(null, unauthorized);
    await failed;
    expect(router.navigate).toHaveBeenCalledWith(['/auth/sign-in']);
  });

  it('does not refresh on 401 from public auth endpoints', async () => {
    const failed = new Promise((resolve) => http.post('/api/auth/login', {}).subscribe({ error: resolve }));
    backend.expectOne('/api/auth/login').flush(null, unauthorized);
    await failed;
    expect(session.refresh).not.toHaveBeenCalled();
  });
});
