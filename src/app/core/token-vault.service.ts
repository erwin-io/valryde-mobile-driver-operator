import { inject, Injectable, InjectionToken } from '@angular/core';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';

const REFRESH_TOKEN_KEY = 'valryde.refreshToken';

/** Native bridge seam; defaults always use the real Capacitor OS-backed plugin. */
export const TOKEN_VAULT_PLATFORM = new InjectionToken<{
  isNativePlatform(): boolean;
  storage: Pick<typeof SecureStorage, 'get' | 'set' | 'remove'>;
}>('TOKEN_VAULT_PLATFORM', {
  providedIn: 'root',
  factory: () => ({ isNativePlatform: () => Capacitor.isNativePlatform(), storage: SecureStorage }),
});

/**
 * Persists only the refresh token, in OS-backed storage (iOS Keychain, Android KeyStore-encrypted).
 * The plugin's web fallback is plain localStorage, so nothing is persisted in browsers.
 */
@Injectable({ providedIn: 'root' })
export class TokenVaultService {
  private readonly platform = inject(TOKEN_VAULT_PLATFORM);
  readonly persistent = this.platform.isNativePlatform();

  async load(): Promise<string | null> {
    if (!this.persistent) return null;
    try {
      const value = await this.platform.storage.get(REFRESH_TOKEN_KEY, false, false);
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  }

  async save(refreshToken: string): Promise<void> {
    if (!this.persistent) return;
    // Device-only, never iCloud-synced: a refresh token must not follow a backup to another device.
    await this.platform.storage.set(REFRESH_TOKEN_KEY, refreshToken, false, false, KeychainAccess.whenUnlockedThisDeviceOnly);
  }

  async clear(): Promise<void> {
    if (!this.persistent) return;
    try {
      await this.platform.storage.remove(REFRESH_TOKEN_KEY, false);
    } catch {
      // Nothing stored or storage unavailable; there is no token left to protect.
    }
  }
}
