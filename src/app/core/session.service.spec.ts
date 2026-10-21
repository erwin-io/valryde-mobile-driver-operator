import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';

import type { AuthTokens } from './auth.models';
import { AuthApiService } from './auth-api.service';
import { NoMobileRoleError, SessionService } from './session.service';
import { TokenVaultService } from './token-vault.service';

describe('SessionService', () => {
  const tokens: AuthTokens = {
    accessToken: 'access',
    refreshToken: 'refresh-1',
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
  const revoked = () => throwError(() => new HttpErrorResponse({ status: 401, error: { error: { code: 'SESSION_REVOKED' } } }));
  const offline = () => throwError(() => new HttpErrorResponse({ status: 0 }));

  type Mock = ReturnType<typeof vi.fn>;
  let api: { login: Mock; logout: Mock; refresh: Mock; currentUser: Mock };
  let vault: { stored: string | null; persistent: boolean; load: Mock; save: Mock; clear: Mock };
  const withRoles = (roles: AuthTokens['user']['roles'], refreshToken = tokens.refreshToken): AuthTokens => ({
    ...tokens,
    refreshToken,
    user: { ...tokens.user, roles },
  });
  const signIn = (session: SessionService) => session.login({ email: 'user@example.com', password: 'correct-horse' });
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  beforeEach(() => {
    api = {
      login: vi.fn(() => of(tokens)),
      logout: vi.fn(() => of(null)),
      refresh: vi.fn(() => of(tokens)),
      currentUser: vi.fn(() => of({ user: tokens.user })),
    };
    vault = {
      stored: null,
      persistent: true,
      load: vi.fn(async () => vault.stored),
      save: vi.fn(async (token: string) => void (vault.stored = token)),
      clear: vi.fn(async () => void (vault.stored = null)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthApiService, useValue: api },
        { provide: TokenVaultService, useValue: vault },
      ],
    });
  });

  it('selects the single authorized mobile role after login', async () => {
    const session = TestBed.inject(SessionService);
    await signIn(session);
    expect(session.status()).toBe('authenticated');
    expect(session.availableRoles()).toEqual(['OPERATOR']);
    expect(session.activeRole()).toBe('OPERATOR');
  });

  it('rejects role escalation outside the server roles', async () => {
    const session = TestBed.inject(SessionService);
    await signIn(session);
    expect(session.selectRole('DRIVER')).toBe(false);
    expect(session.activeRole()).toBe('OPERATOR');
  });

  it('rejects accounts without a DRIVER or OPERATOR role and keeps no session', async () => {
    api.login.mockReturnValue(of(withRoles(['COMMUTER'])));
    const session = TestBed.inject(SessionService);
    await expect(signIn(session)).rejects.toBeInstanceOf(NoMobileRoleError);
    expect(session.status()).toBe('anonymous');
    expect(session.user()).toBeNull();
    await settle();
    expect(vault.stored).toBeNull();
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
    expect(await session.refresh()).toBe('refreshed');
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

  it('ends and marks the session expired when the server rejects the refresh token', async () => {
    const session = TestBed.inject(SessionService);
    await signIn(session);
    api.refresh.mockReturnValue(revoked());
    expect(await session.refresh()).toBe('rejected');
    expect(session.status()).toBe('anonymous');
    expect(session.expired()).toBe(true);
    await settle();
    expect(vault.stored).toBeNull();
  });

  it('keeps the session when refresh fails because VALRYDE is unreachable', async () => {
    const session = TestBed.inject(SessionService);
    await signIn(session);
    api.refresh.mockReturnValue(offline());
    expect(await session.refresh()).toBe('unavailable');
    expect(session.status()).toBe('authenticated');
    expect(session.expired()).toBe(false);
  });

  it('drops the active role when the server profile no longer grants it', async () => {
    api.login.mockReturnValue(of(withRoles(['DRIVER', 'OPERATOR'])));
    const session = TestBed.inject(SessionService);
    await signIn(session);
    session.selectRole('DRIVER');
    api.currentUser.mockReturnValue(of({ user: { ...tokens.user, roles: ['OPERATOR'] } }));
    await session.reloadUser();
    expect(session.activeRole()).toBeNull();
    expect(session.availableRoles()).toEqual(['OPERATOR']);
  });

  describe('secure persistence', () => {
    it('stores only the rotated refresh token in the vault', async () => {
      const session = TestBed.inject(SessionService);
      await signIn(session);
      api.refresh.mockReturnValue(of(withRoles(['OPERATOR'], 'refresh-2')));
      await session.refresh();
      await settle();
      expect(vault.save).toHaveBeenLastCalledWith('refresh-2');
      expect(vault.save.mock.calls.flat()).not.toContain('access');
    });

    it('restores a stored session at startup', async () => {
      vault.stored = 'stored-refresh';
      const session = TestBed.inject(SessionService);
      await session.restore();
      expect(api.refresh).toHaveBeenCalledWith('stored-refresh');
      expect(session.status()).toBe('authenticated');
      expect(session.activeRole()).toBe('OPERATOR');
    });

    it('starts anonymous without calling the API when nothing is stored', async () => {
      const session = TestBed.inject(SessionService);
      await session.restore();
      expect(api.refresh).not.toHaveBeenCalled();
      expect(session.status()).toBe('anonymous');
    });

    it('discards a stored token the server rejects', async () => {
      vault.stored = 'revoked-refresh';
      api.refresh.mockReturnValue(revoked());
      const session = TestBed.inject(SessionService);
      await session.restore();
      await settle();
      expect(session.status()).toBe('anonymous');
      expect(vault.stored).toBeNull();
    });

    it('keeps a stored token and offers resume when VALRYDE is unreachable at startup', async () => {
      vault.stored = 'stored-refresh';
      api.refresh.mockReturnValue(offline());
      const session = TestBed.inject(SessionService);
      await session.restore();
      expect(session.status()).toBe('anonymous');
      expect(session.resumable()).toBe(true);
      expect(vault.stored).toBe('stored-refresh');
    });

    it('does not hang startup when the refresh never answers', async () => {
      vi.useFakeTimers();
      try {
        vault.stored = 'stored-refresh';
        api.refresh.mockReturnValue(NEVER);
        const session = TestBed.inject(SessionService);
        const restoring = session.restore();
        await vi.advanceTimersByTimeAsync(10_000);
        await restoring;
        expect(session.resumable()).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it('drops a restored session whose account lost all mobile roles', async () => {
      vault.stored = 'stored-refresh';
      api.refresh.mockReturnValue(of(withRoles(['COMMUTER'])));
      const session = TestBed.inject(SessionService);
      await session.restore();
      await settle();
      expect(session.status()).toBe('anonymous');
      expect(vault.stored).toBeNull();
    });
  });

  describe('sign-out', () => {
    it('clears device state and revokes the refresh token on the server', async () => {
      const session = TestBed.inject(SessionService);
      await signIn(session);
      await session.logout();
      expect(session.status()).toBe('anonymous');
      expect(session.user()).toBeNull();
      expect(session.activeRole()).toBeNull();
      expect(api.logout).toHaveBeenCalledWith('refresh-1');
      expect(vault.stored).toBeNull();
    });

    it('still clears the device when revocation fails offline', async () => {
      api.logout.mockReturnValue(offline());
      const session = TestBed.inject(SessionService);
      await signIn(session);
      await expect(session.logout()).resolves.toBeUndefined();
      expect(session.status()).toBe('anonymous');
      expect(vault.stored).toBeNull();
    });

    it('never lets a pending vault write resurrect the token after sign-out', async () => {
      let release: () => void = () => undefined;
      vault.save.mockImplementationOnce(
        (token: string) => new Promise<void>((resolve) => (release = () => resolve(void (vault.stored = token)))),
      );
      const session = TestBed.inject(SessionService);
      await signIn(session);
      const out = session.logout();
      release();
      await out;
      expect(vault.stored).toBeNull();
    });
  });
});
