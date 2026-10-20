import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type { AuthTokens, LoginRequest, MobileRole, ValrydeUser } from './auth.models';
import { AuthApiService } from './auth-api.service';
import { TokenStoreService } from './token-store.service';

export type SessionStatus = 'anonymous' | 'authenticating' | 'authenticated';

/** The account authenticated but holds neither DRIVER nor OPERATOR. */
export class NoMobileRoleError extends Error {
  constructor() {
    super('NO_MOBILE_ROLE');
  }
}

const isMobileRole = (role: string): role is MobileRole => role === 'DRIVER' || role === 'OPERATOR';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(AuthApiService);
  private readonly tokenStore = inject(TokenStoreService);
  private readonly userState = signal<ValrydeUser | null>(null);
  private readonly statusState = signal<SessionStatus>('anonymous');
  private readonly activeRoleState = signal<MobileRole | null>(null);
  private readonly expiredState = signal(false);
  private refreshing: Promise<boolean> | null = null;

  readonly user = this.userState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly activeRole = this.activeRoleState.asReadonly();
  /** True after a session ended because it could not be refreshed; cleared on next sign-in. */
  readonly expired = this.expiredState.asReadonly();
  readonly availableRoles = computed(() => (this.userState()?.roles ?? []).filter(isMobileRole));

  async login(request: LoginRequest): Promise<AuthTokens> {
    this.statusState.set('authenticating');
    try {
      const tokens = await firstValueFrom(this.api.login(request));
      if (!tokens.user.roles.some(isMobileRole)) throw new NoMobileRoleError();
      this.expiredState.set(false);
      this.accept(tokens);
      return tokens;
    } catch (error: unknown) {
      this.clear();
      throw error;
    }
  }

  selectRole(role: MobileRole): boolean {
    if (!this.availableRoles().includes(role)) return false;
    this.activeRoleState.set(role);
    return true;
  }

  /** Single-flight refresh; on failure the session is cleared and marked expired. */
  refresh(): Promise<boolean> {
    const refreshToken = this.tokenStore.refreshToken();
    if (!refreshToken) return Promise.resolve(false);
    this.refreshing ??= firstValueFrom(this.api.refresh(refreshToken))
      .then((tokens) => {
        this.accept(tokens);
        return true;
      })
      .catch(() => {
        this.clear();
        this.expiredState.set(true);
        return false;
      })
      .finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  async logout(): Promise<void> {
    const refreshToken = this.tokenStore.refreshToken();
    this.clear();
    if (refreshToken) {
      try {
        await firstValueFrom(this.api.logout(refreshToken));
      } catch {
        // Local protected state is already cleared; remote revocation can be retried by backend policy later.
      }
    }
  }

  clear(): void {
    this.tokenStore.clear();
    this.userState.set(null);
    this.activeRoleState.set(null);
    this.statusState.set('anonymous');
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
  }
}
