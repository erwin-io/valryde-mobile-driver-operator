import { TestBed } from '@angular/core/testing';

const native = vi.hoisted(() => ({ value: true }));
const storage = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));
vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: storage,
  KeychainAccess: { whenUnlockedThisDeviceOnly: 1 },
}));

import { TokenVaultService } from './token-vault.service';

describe('TokenVaultService', () => {
  beforeEach(() => {
    native.value = true;
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('stores the refresh token device-only and never iCloud-synced on native platforms', async () => {
    native.value = true;
    await TestBed.inject(TokenVaultService).save('refresh-token');
    expect(storage.set).toHaveBeenCalledWith('valryde.refreshToken', 'refresh-token', false, false, 1);
  });

  it('treats unreadable secure storage as no stored session', async () => {
    native.value = true;
    storage.get.mockRejectedValue(new Error('keystore unavailable'));
    expect(await TestBed.inject(TokenVaultService).load()).toBeNull();
  });

  it('never persists in a browser, where the plugin would fall back to plain localStorage', async () => {
    native.value = false;
    const vault = TestBed.inject(TokenVaultService);
    await vault.save('refresh-token');
    expect(await vault.load()).toBeNull();
    await vault.clear();
    expect(storage.set).not.toHaveBeenCalled();
    expect(storage.get).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
