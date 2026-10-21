import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NEVER, of, Subject, throwError } from 'rxjs';

import type { AuthTokens } from './auth.models';
import { AuthApiService } from './auth-api.service';
import { NoMobileRoleError, SessionService, SessionSupersededError } from './session.service';
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
  let api: { login: Mock; logout: Mock; refresh: Mock; currentUser: Mock; updateProfile: Mock };
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
      updateProfile: vi.fn((displayName: string) => of({ user: { ...tokens.user, displayName } })),
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

  it('shows the server copy of a saved display name', async () => {
    const session = TestBed.inject(SessionService);
    await signIn(session);
    await session.updateProfile('Renamed Operator');
    expect(api.updateProfile).toHaveBeenCalledWith('Renamed Operator');
    expect(session.user()?.displayName).toBe('Renamed Operator');
  });

  it('ignores a profile save that completes after sign-out', async () => {
    const late = new Subject<{ user: AuthTokens['user'] }>();
    api.updateProfile.mockReturnValue(late);
    const session = TestBed.inject(SessionService);
    await signIn(session);
    const saving = session.updateProfile('Too Late');
    await session.logout();
    late.next({ user: { ...tokens.user, displayName: 'Too Late' } });
    late.complete();
    await saving;
    expect(session.user()).toBeNull();
  });

  it('ends a server-revoked session locally and marks it expired', async () => {
    const session = TestBed.inject(SessionService);
    await signIn(session);
    session.endRevoked();
    await settle();
    expect(session.status()).toBe('anonymous');
    expect(session.expired()).toBe(true);
    expect(vault.stored).toBeNull();
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

  /**
   * D-RACE: concurrency between sign-in, refresh, restore, profile reload and sign-out.
   * Every in-flight call is a manually released Subject, so ordering is forced, never timed.
   */
  describe('concurrency (D-RACE)', () => {
    const deferred = <T,>() => {
      const subject = new Subject<T>();
      return {
        subject,
        resolve: (value: T) => {
          subject.next(value);
          subject.complete();
        },
        reject: (error: unknown) => subject.error(error),
      };
    };
    const httpError = (status: number, code?: string) =>
      new HttpErrorResponse({ status, error: code ? { error: { code } } : null });
    const assertSignedOut = (session: SessionService) => {
      expect(session.status()).toBe('anonymous');
      expect(session.user()).toBeNull();
      expect(session.activeRole()).toBeNull();
      expect(vault.stored).toBeNull();
    };

    it('D-RACE-01 refresh then logout: a late refresh cannot restore the session or store its token', async () => {
      const session = TestBed.inject(SessionService);
      await signIn(session);
      const late = deferred<AuthTokens>();
      api.refresh.mockReturnValue(late.subject);
      const refreshing = session.refresh();
      await session.logout();
      late.resolve(withRoles(['OPERATOR'], 'refresh-rotated'));
      expect(await refreshing).toBe('rejected');
      await settle();
      assertSignedOut(session);
      expect(vault.save).not.toHaveBeenCalledWith('refresh-rotated');
      expect(api.logout).toHaveBeenCalledWith('refresh-1');
      // Nothing is left to refresh, and no new caller joins the abandoned request.
      expect(await session.refresh()).toBe('rejected');
      expect(api.refresh).toHaveBeenCalledTimes(1);
    });

    it('D-RACE-01 a late profile reload after logout does not bring the user back', async () => {
      const session = TestBed.inject(SessionService);
      await signIn(session);
      const late = deferred<{ user: AuthTokens['user'] }>();
      api.currentUser.mockReturnValue(late.subject);
      const reloading = session.reloadUser();
      await session.logout();
      late.resolve({ user: tokens.user });
      await reloading;
      assertSignedOut(session);
    });

    it('D-RACE-02 delayed vault writes: sign-out is the final effective state', async () => {
      const writes: { token: string; release: () => void }[] = [];
      vault.save.mockImplementation(
        (token: string) =>
          new Promise<void>((resolve) => writes.push({ token, release: () => resolve(void (vault.stored = token)) })),
      );
      const session = TestBed.inject(SessionService);
      await signIn(session);
      api.refresh.mockReturnValue(of(withRoles(['OPERATOR'], 'refresh-2')));
      await session.refresh();
      const out = session.logout();
      // Release the queued saves one at a time, in order; the queue holds the clear until they finish.
      for (let i = 0; i < 2; i++) {
        await vi.waitFor(() => expect(writes.length).toBeGreaterThan(i));
        writes[i].release();
      }
      await out;
      await settle();
      expect(writes.map((write) => write.token)).toEqual(['refresh-1', 'refresh-2']);
      expect(vault.clear).toHaveBeenCalled();
      assertSignedOut(session);
    });

    it('D-RACE-03 concurrent refresh: one call, then the rotated token is used next', async () => {
      const session = TestBed.inject(SessionService);
      await signIn(session);
      const first = deferred<AuthTokens>();
      api.refresh.mockReturnValueOnce(first.subject);
      const callers = [session.refresh(), session.refresh(), session.refresh()];
      first.resolve(withRoles(['OPERATOR'], 'refresh-2'));
      expect(await Promise.all(callers)).toEqual(['refreshed', 'refreshed', 'refreshed']);
      expect(api.refresh).toHaveBeenCalledTimes(1);
      expect(api.refresh).toHaveBeenLastCalledWith('refresh-1');
      api.refresh.mockReturnValueOnce(of(withRoles(['OPERATOR'], 'refresh-3')));
      await session.refresh();
      expect(api.refresh).toHaveBeenLastCalledWith('refresh-2');
    });

    it('D-RACE-04 late sign-in after logout does not restore the session', async () => {
      const late = deferred<AuthTokens>();
      api.login.mockReturnValue(late.subject);
      const session = TestBed.inject(SessionService);
      const signingIn = signIn(session);
      await session.logout();
      late.resolve(tokens);
      await expect(signingIn).rejects.toBeInstanceOf(SessionSupersededError);
      await settle();
      assertSignedOut(session);
      expect(vault.save).not.toHaveBeenCalled();
    });

    it('D-RACE-04 a superseded sign-in cannot overwrite or clear the newer one', async () => {
      const slow = deferred<AuthTokens>();
      api.login.mockReturnValueOnce(slow.subject).mockReturnValueOnce(of(withRoles(['DRIVER'], 'refresh-new')));
      const session = TestBed.inject(SessionService);
      const older = signIn(session);
      await signIn(session);
      slow.resolve(withRoles(['OPERATOR'], 'refresh-old'));
      await expect(older).rejects.toBeInstanceOf(SessionSupersededError);
      await settle();
      expect(session.status()).toBe('authenticated');
      expect(session.activeRole()).toBe('DRIVER');
      expect(vault.stored).toBe('refresh-new');
    });

    it('D-RACE-05 startup restore cannot overwrite a later logout', async () => {
      vault.stored = 'stored-refresh';
      const late = deferred<AuthTokens>();
      api.refresh.mockReturnValue(late.subject);
      const session = TestBed.inject(SessionService);
      const restoring = session.restore();
      await vi.waitFor(() => expect(api.refresh).toHaveBeenCalledWith('stored-refresh'));
      await session.logout();
      late.resolve(withRoles(['OPERATOR'], 'refresh-from-restore'));
      await restoring;
      await settle();
      assertSignedOut(session);
      expect(vault.save).not.toHaveBeenCalledWith('refresh-from-restore');
    });

    it('D-RACE-05 startup restore cannot overwrite an explicit sign-in', async () => {
      vault.stored = 'stored-refresh';
      const late = deferred<AuthTokens>();
      api.refresh.mockReturnValue(late.subject);
      api.login.mockReturnValue(of(withRoles(['DRIVER'], 'refresh-signed-in')));
      const session = TestBed.inject(SessionService);
      const restoring = session.restore();
      await vi.waitFor(() => expect(api.refresh).toHaveBeenCalled());
      await signIn(session);
      late.resolve(withRoles(['OPERATOR'], 'refresh-from-restore'));
      await restoring;
      await settle();
      expect(session.status()).toBe('authenticated');
      expect(session.activeRole()).toBe('DRIVER');
      expect(session.resumable()).toBe(false);
      expect(vault.stored).toBe('refresh-signed-in');
    });

    it('D-RACE-05 a stale restore rejection does not clear an explicit sign-in', async () => {
      vault.stored = 'stored-refresh';
      const late = deferred<AuthTokens>();
      api.refresh.mockReturnValue(late.subject);
      api.login.mockReturnValue(of(withRoles(['DRIVER'], 'refresh-signed-in')));
      const session = TestBed.inject(SessionService);
      const restoring = session.restore();
      await vi.waitFor(() => expect(api.refresh).toHaveBeenCalled());
      await signIn(session);
      late.reject(httpError(401, 'SESSION_REVOKED'));
      await restoring;
      await settle();
      expect(session.status()).toBe('authenticated');
      expect(session.expired()).toBe(false);
      expect(vault.stored).toBe('refresh-signed-in');
    });

    it.each([
      [0, undefined, 'unavailable'],
      [503, undefined, 'unavailable'],
      [400, 'VALIDATION_ERROR', 'rejected'],
      [401, 'SESSION_REVOKED', 'rejected'],
      [403, 'FORBIDDEN', 'rejected'],
    ] as const)('D-RACE-06 refresh failure %s %s is %s', async (status, code, expected) => {
      const session = TestBed.inject(SessionService);
      await signIn(session);
      await settle();
      api.refresh.mockReturnValue(throwError(() => httpError(status, code)));
      expect(await session.refresh()).toBe(expected);
      await settle();
      if (expected === 'unavailable') {
        // An outage keeps a valid session and its stored token.
        expect(session.status()).toBe('authenticated');
        expect(vault.stored).toBe('refresh-1');
        expect(session.expired()).toBe(false);
      } else {
        assertSignedOut(session);
        expect(session.expired()).toBe(true);
      }
    });

    it('D-RACE-06 sign-out still revokes on the server when reachable, and clears locally when not', async () => {
      const session = TestBed.inject(SessionService);
      await signIn(session);
      await session.logout();
      expect(api.logout).toHaveBeenCalledWith('refresh-1');
      api.logout.mockReturnValue(throwError(() => httpError(0)));
      api.login.mockReturnValue(of(withRoles(['OPERATOR'], 'refresh-9')));
      await signIn(session);
      await expect(session.logout()).resolves.toBeUndefined();
      expect(api.logout).toHaveBeenLastCalledWith('refresh-9');
      assertSignedOut(session);
    });
  });
});
