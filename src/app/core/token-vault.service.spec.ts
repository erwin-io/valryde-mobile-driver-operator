import { TestBed } from '@angular/core/testing';

const native = { value: true };
const storage = { get: vi.fn(), set: vi.fn(), remove: vi.fn() };

import { TOKEN_VAULT_PLATFORM, TokenVaultService } from './token-vault.service';

describe('TokenVaultService', () => {
  beforeEach(() => {
    native.value = true;
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: TOKEN_VAULT_PLATFORM, useValue: { isNativePlatform: () => native.value, storage } }] });
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
