import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import type { MobileRole } from '../core/auth.models';
import { SessionService } from '../core/session.service';
import { TokenVaultService } from '../core/token-vault.service';
import { AccountPage } from './account.page';

describe('AccountPage', () => {
  const setup = (roles: MobileRole[], active: MobileRole) => {
    const activeRole = signal<MobileRole | null>(active);
    const session = {
      user: () => ({ displayName: 'Dana Driver', email: 'dana@example.test' }),
      activeRole,
      availableRoles: () => roles,
      selectRole: vi.fn((role: MobileRole) => {
        if (!roles.includes(role)) return false;
        activeRole.set(role);
        return true;
      }),
      logout: vi.fn(async () => undefined),
      reloadUser: vi.fn(async () => undefined),
    };
    TestBed.configureTestingModule({
      imports: [AccountPage],
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: session },
        { provide: TokenVaultService, useValue: { persistent: false } },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AccountPage);
    fixture.detectChanges();
    const page = fixture.componentInstance as unknown as {
      signOutButtons: { handler?: () => void }[];
      switchTo(role: MobileRole): () => void;
      ionViewWillEnter(): void;
    };
    return { fixture, session, navigate, page, text: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  };

  it('shows the account and states that a browser session is not remembered', () => {
    const { text } = setup(['DRIVER'], 'DRIVER');
    expect(text()).toContain('Dana Driver');
    expect(text()).toContain('Driver');
    expect(text()).toContain('this browser tab only');
  });

  it('refreshes the profile from the server on every visit', () => {
    const { page, session } = setup(['DRIVER'], 'DRIVER');
    page.ionViewWillEnter();
    page.ionViewWillEnter();
    expect(session.reloadUser).toHaveBeenCalledTimes(2);
  });

  it('offers no workspace switch to a single-role account', () => {
    expect(setup(['DRIVER'], 'DRIVER').text()).not.toContain('Switch to');
  });

  it('switches a multi-role account to its other server-granted workspace', () => {
    const { text, page, session, navigate } = setup(['DRIVER', 'OPERATOR'], 'DRIVER');
    expect(text()).toContain('Switch to Operator workspace');
    page.switchTo('OPERATOR')();
    expect(session.selectRole).toHaveBeenCalledWith('OPERATOR');
    expect(navigate).toHaveBeenCalledWith(['/operator/dashboard'], { replaceUrl: true });
  });

  it('signs out through the session and returns to sign-in', async () => {
    const { page, session, navigate } = setup(['OPERATOR'], 'OPERATOR');
    page.signOutButtons.find((button) => button.handler)?.handler?.();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/auth/sign-in'], { replaceUrl: true }));
    expect(session.logout).toHaveBeenCalled();
  });
});
