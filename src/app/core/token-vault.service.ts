import { Injectable } from '@angular/core';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';

const REFRESH_TOKEN_KEY = 'valryde.refreshToken';

/**
 * Persists only the refresh token, in OS-backed storage (iOS Keychain, Android KeyStore-encrypted).
 * The plugin's web fallback is plain localStorage, so nothing is persisted in browsers.
 */
@Injectable({ providedIn: 'root' })
export class TokenVaultService {
  readonly persistent = Capacitor.isNativePlatform();

  async load(): Promise<string | null> {
    if (!this.persistent) return null;
    try {
      const value = await SecureStorage.get(REFRESH_TOKEN_KEY, false, false);
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  }

  async save(refreshToken: string): Promise<void> {
    if (!this.persistent) return;
    // Device-only, never iCloud-synced: a refresh token must not follow a backup to another device.
    await SecureStorage.set(REFRESH_TOKEN_KEY, refreshToken, false, false, KeychainAccess.whenUnlockedThisDeviceOnly);
  }

  async clear(): Promise<void> {
    if (!this.persistent) return;
    try {
      await SecureStorage.remove(REFRESH_TOKEN_KEY, false);
    } catch {
      // Nothing stored or storage unavailable; there is no token left to protect.
    }
  }
}
