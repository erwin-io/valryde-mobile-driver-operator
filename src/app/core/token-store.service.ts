import { Injectable, signal } from '@angular/core';

import type { AuthTokens } from './auth.models';

@Injectable({ providedIn: 'root' })
export class TokenStoreService {
  private readonly tokens = signal<AuthTokens | null>(null);

  readonly accessToken = () => this.tokens()?.accessToken ?? null;
  readonly refreshToken = () => this.tokens()?.refreshToken ?? null;

  set(tokens: AuthTokens): void {
    this.tokens.set(tokens);
  }

  clear(): void {
    this.tokens.set(null);
  }
}
