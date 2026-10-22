import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';

import { isClientError } from './api-error';

import type { AuthTokens, LoginRequest, MobileRole, ValrydeUser } from './auth.models';
import { AuthApiService } from './auth-api.service';
import { TokenStoreService } from './token-store.service';
import { TokenVaultService } from './token-vault.service';

export type SessionStatus = 'restoring' | 'anonymous' | 'authenticating' | 'authenticated';

/** `rejected`: the server refused the refresh token (session over). `unavailable`: network/outage; session kept. */
export type RefreshResult = 'refreshed' | 'rejected' | 'unavailable';

const RESTORE_TIMEOUT_MS = 10_000;

/** The account authenticated but holds neither DRIVER nor OPERATOR. */
export class NoMobileRoleError extends Error {
  constructor() {
    super('NO_MOBILE_ROLE');
  }
}

/** A sign-in finished after the session it belonged to was ended (e.g. by sign-out). */
export class SessionSupersededError extends Error {
  constructor() {
    super('SESSION_SUPERSEDED');
  }
}

const isMobileRole = (role: string): role is MobileRole => role === 'DRIVER' || role === 'OPERATOR';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(AuthApiService);
  private readonly tokenStore = inject(TokenStoreService);
  private readonly vault = inject(TokenVaultService);
  private readonly userState = signal<ValrydeUser | null>(null);
  private readonly statusState = signal<SessionStatus>('anonymous');
  private readonly activeRoleState = signal<MobileRole | null>(null);
  private readonly expiredState = signal(false);
  private readonly resumableState = signal(false);
  private refreshing: Promise<RefreshResult> | null = null;
  // Session generation: bumped whenever a session ends or a new one starts. Any async result that
  // returns into an older epoch is discarded, so a late login/refresh/profile can never resurrect a session.
  private epoch = 0;
  // Serializes vault writes so a late save can never resurrect a token after sign-out.
  private vaultQueue: Promise<unknown> = Promise.resolve();

  readonly user = this.userState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly activeRole = this.activeRoleState.asReadonly();
  /** True after a session ended because it could not be refreshed; cleared on next sign-in. */
  readonly expired = this.expiredState.asReadonly();
  /** A stored session exists but VALRYDE could not be reached to resume it. */
  readonly resumable = this.resumableState.asReadonly();
  readonly availableRoles = computed(() => (this.userState()?.roles ?? []).filter(isMobileRole));

  async login(request: LoginRequest): Promise<AuthTokens> {
    const epoch = this.begin();
    this.statusState.set('authenticating');
    try {
      const tokens = await firstValueFrom(this.api.login(request));
      if (epoch !== this.epoch) throw new SessionSupersededError();
      if (!tokens.user.roles.some(isMobileRole)) throw new NoMobileRoleError();
      this.expiredState.set(false);
      this.accept(tokens);
      return tokens;
    } catch (error: unknown) {
      // A superseded attempt must not clear whatever session replaced it.
      if (epoch === this.epoch) this.clear();
      throw error;
    }
  }

  selectRole(role: MobileRole): boolean {
    if (!this.availableRoles().includes(role)) return false;
    this.activeRoleState.set(role);
    return true;
  }

  /** Startup: resume a session from the OS-backed vault, if any. */
  async restore(): Promise<void> {
    const epoch = this.begin();
    this.statusState.set('restoring');
    await this.vaultQueue;
    const stored = epoch === this.epoch ? await this.vault.load() : null;
    if (epoch !== this.epoch) return;
    if (!stored) {
      this.statusState.set('anonymous');
      return;
    }
    const result = await this.exchange(stored, RESTORE_TIMEOUT_MS);
    if (epoch !== this.epoch) return;
    this.resumableState.set(result === 'unavailable');
    if (result === 'unavailable') this.statusState.set('anonymous');
  }

  /** Single-flight refresh of the in-memory session. Rejection ends the session; an outage keeps it. */
  refresh(): Promise<RefreshResult> {
    const refreshToken = this.tokenStore.refreshToken();
    if (!refreshToken) return Promise.resolve('rejected');
    if (!this.refreshing) {
      const pending: Promise<RefreshResult> = this.exchange(refreshToken).finally(() => {
        if (this.refreshing === pending) this.refreshing = null;
      });
      this.refreshing = pending;
    }
    return this.refreshing;
  }

  /** Re-reads the profile from the server; a role the server no longer grants stops being active. */
  async reloadUser(): Promise<void> {
    const epoch = this.epoch;
    const { user } = await firstValueFrom(this.api.currentUser());
    if (epoch !== this.epoch) return;
    this.userState.set(user);
    const active = this.activeRoleState();
    if (active && !user.roles.includes(active)) this.activeRoleState.set(null);
  }

  /** Saves the display name and shows the server's copy; ignored if the session ended meanwhile. */
  async updateProfile(displayName: string): Promise<void> {
    const epoch = this.epoch;
    const { user } = await firstValueFrom(this.api.updateProfile(displayName));
    if (epoch === this.epoch) this.userState.set(user);
  }

  /** The server revoked every session (credentials changed, account disabled): end this one locally. */
  endRevoked(): void {
    this.clear();
    this.expiredState.set(true);
  }

  /** Clears the device first, then asks the server to revoke the refresh token. */
  async logout(): Promise<void> {
    const refreshToken = this.tokenStore.refreshToken();
    this.clear();
    this.expiredState.set(false);
    this.resumableState.set(false);
    await this.vaultQueue;
    if (refreshToken) {
      try {
        await firstValueFrom(this.api.logout(refreshToken));
      } catch {
        // shortcut: revocation is best-effort when offline; the token is already gone from the device and expires server-side.
      }
    }
  }

  clear(): void {
    this.begin();
    this.tokenStore.clear();
    this.userState.set(null);
    this.activeRoleState.set(null);
    this.statusState.set('anonymous');
    this.persist(null);
  }

  private async exchange(refreshToken: string, ms?: number): Promise<RefreshResult> {
    const epoch = this.epoch;
    try {
      const request = this.api.refresh(refreshToken);
      const tokens = await firstValueFrom(ms ? request.pipe(timeout(ms)) : request);
      // The session this refresh belonged to is gone; its result must not touch the newer state.
      if (epoch !== this.epoch) return 'rejected';
      if (!tokens.user.roles.some(isMobileRole)) {
        this.clear();
        return 'rejected';
      }
      this.accept(tokens);
      return 'refreshed';
    } catch (error: unknown) {
      if (epoch !== this.epoch) return 'rejected';
      if (!isClientError(error)) return 'unavailable';
      this.clear();
      this.expiredState.set(true);
      return 'rejected';
    }
  }

  /** Starts a new session generation and detaches any in-flight refresh from it. */
  private begin(): number {
    this.refreshing = null;
    return ++this.epoch;
  }

  private persist(refreshToken: string | null): void {
    const write = () => (refreshToken ? this.vault.save(refreshToken) : this.vault.clear());
    this.vaultQueue = this.vaultQueue.then(write, write).catch(() => undefined);
  }

  private accept(tokens: AuthTokens): void {
    this.tokenStore.set(tokens);
    this.userState.set(tokens.user);
    const mobileRoles = tokens.user.roles.filter(isMobileRole);
    const current = this.activeRoleState();
    // Keep the chosen role across refresh only while the server still grants it.
    const keep = current && mobileRoles.includes(current) ? current : null;
    this.activeRoleState.set(keep ?? (mobileRoles.length === 1 ? mobileRoles[0] : null));
    this.statusState.set('authenticated');
    this.resumableState.set(false);
    this.persist(tokens.refreshToken);
  }
}
