import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import type { AuthTokens } from './auth.models';
import { AuthApiService } from './auth-api.service';
import { NoMobileRoleError, SessionService } from './session.service';

describe('SessionService', () => {
  const tokens: AuthTokens = {
    accessToken: 'access',
    refreshToken: 'refresh',
    accessTokenExpiresIn: 900,
    refreshTokenExpiresAt: '2026-10-22T00:00:00Z',
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'operator@example.com',
      displayName: 'Operator One',
      status: 'ACTIVE',
      emailVerified: true,
      roles: ['OPERATOR'],
      createdAt: '2026-10-21T00:00:00Z',
      updatedAt: '2026-10-21T00:00:00Z',
    },
  };

  type Mock = ReturnType<typeof vi.fn>;
  let api: { login: Mock; logout: Mock; refresh: Mock };
  const withRoles = (roles: AuthTokens['user']['roles']): AuthTokens => ({ ...tokens, user: { ...tokens.user, roles } });
  const signIn = (session: SessionService) => session.login({ email: 'user@example.com', password: 'correct-horse' });

  beforeEach(() => {
    api = { login: vi.fn(() => of(tokens)), logout: vi.fn(() => of(null)), refresh: vi.fn(() => of(tokens)) };
    TestBed.configureTestingModule({ providers: [{ provide: AuthApiService, useValue: api }] });
  });

  it('rejects accounts without a DRIVER or OPERATOR role and keeps no session', async () => {
    api.login.mockReturnValue(of(withRoles(['COMMUTER'])));
    const session = TestBed.inject(SessionService);
    await expect(signIn(session)).rejects.toBeInstanceOf(NoMobileRoleError);
    expect(session.status()).toBe('anonymous');
    expect(session.user()).toBeNull();
  });

  it('requires an explicit choice for multi-role accounts', async () => {
    api.login.mockReturnValue(of(withRoles(['DRIVER', 'OPERATOR'])));
    const session = TestBed.inject(SessionService);
    await signIn(session);
    expect(session.activeRole()).toBeNull();
    expect(session.selectRole('DRIVER')).toBe(true);
  });

  it('keeps the chosen role across refresh only while the server still grants it', async () => {
    api.login.mockReturnValue(of(withRoles(['DRIVER', 'OPERATOR'])));
    const session = TestBed.inject(SessionService);
    await signIn(session);
    session.selectRole('DRIVER');

    api.refresh.mockReturnValue(of(withRoles(['DRIVER', 'OPERATOR'])));
    expect(await session.refresh()).toBe(true);
    expect(session.activeRole()).toBe('DRIVER');

    api.refresh.mockReturnValue(of(withRoles(['OPERATOR'])));
    await session.refresh();
    expect(session.activeRole()).toBe('OPERATOR');
  });

  it('shares one refresh request between concurrent callers', async () => {
    const session = TestBed.inject(SessionService);
    await signIn(session);
    await Promise.all([session.refresh(), session.refresh()]);
    expect(api.refresh).toHaveBeenCalledTimes(1);
  });

  it('clears and marks the session expired when refresh fails', async () => {
    const session = TestBed.inject(SessionService);
    await signIn(session);
    api.refresh.mockReturnValue(throwError(() => new Error('401')));
    expect(await session.refresh()).toBe(false);
    expect(session.status()).toBe('anonymous');
    expect(session.expired()).toBe(true);
  });

  it('selects the single authorized mobile role after login', async () => {
    const session = TestBed.inject(SessionService);
    await session.login({ email: 'operator@example.com', password: 'correct-horse' });
    expect(session.status()).toBe('authenticated');
    expect(session.availableRoles()).toEqual(['OPERATOR']);
    expect(session.activeRole()).toBe('OPERATOR');
  });

  it('rejects role escalation outside the server roles', async () => {
    const session = TestBed.inject(SessionService);
    await session.login({ email: 'operator@example.com', password: 'correct-horse' });
    expect(session.selectRole('DRIVER')).toBe(false);
    expect(session.activeRole()).toBe('OPERATOR');
  });

  it('clears protected role state before logout completes', async () => {
    const session = TestBed.inject(SessionService);
    await session.login({ email: 'operator@example.com', password: 'correct-horse' });
    await session.logout();
    expect(session.status()).toBe('anonymous');
    expect(session.user()).toBeNull();
    expect(session.activeRole()).toBeNull();
  });
});
