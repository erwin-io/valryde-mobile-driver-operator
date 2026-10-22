import { HttpErrorResponse } from '@angular/common/http';
import { signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ConfirmEmailChangePage } from '../auth/confirm-email-change.page';
import { AuthApiService } from '../core/auth-api.service';
import { SessionService } from '../core/session.service';
import { ChangeEmailPage } from './change-email.page';
import { ChangePasswordPage } from './change-password.page';
import { EditProfilePage } from './edit-profile.page';

describe('Account security pages', () => {
  type Mock = ReturnType<typeof vi.fn>;
  let api: { changePassword: Mock; requestEmailChange: Mock; confirmEmailChange: Mock };
  let session: {
    user: () => { displayName: string; email: string };
    activeRole: () => 'OPERATOR';
    status: ReturnType<typeof signal<string>>;
    updateProfile: Mock;
    logout: Mock;
  };
  const rejected = (status: number, code: string, message: string) =>
    throwError(() => new HttpErrorResponse({ status, error: { error: { code, message } } }));

  const render = async <T,>(page: Type<T>, query: Record<string, string> = {}) => {
    TestBed.configureTestingModule({
      imports: [page],
      providers: [
        provideRouter([]),
        { provide: AuthApiService, useValue: api },
        { provide: SessionService, useValue: session },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(page);
    await fixture.whenStable();
    fixture.detectChanges();
    const form = (fixture.componentInstance as unknown as { form: { setValue(v: object): void } }).form;
    const submit = async (value?: object) => {
      if (value) form.setValue(value);
      (fixture.nativeElement as HTMLElement).querySelector('form')?.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { navigate, submit, text: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  };

  beforeEach(() => {
    api = {
      changePassword: vi.fn(() => of(null)),
      requestEmailChange: vi.fn(() => of({ message: 'sent' })),
      confirmEmailChange: vi.fn(() => of({ user: {} })),
    };
    session = {
      user: () => ({ displayName: 'Ops One', email: 'ops@example.test' }),
      activeRole: () => 'OPERATOR',
      status: signal('authenticated'),
      updateProfile: vi.fn(async () => undefined),
      logout: vi.fn(async () => undefined),
    };
  });

  describe('EditProfilePage (S11)', () => {
    it('prefills and saves a trimmed display name', async () => {
      const { submit, text } = await render(EditProfilePage);
      await submit({ displayName: '  Ops Renamed  ' });
      expect(session.updateProfile).toHaveBeenCalledWith('Ops Renamed');
      expect(text()).toContain('Profile saved.');
    });

    it('rejects a blank name without calling the API', async () => {
      const { submit } = await render(EditProfilePage);
      await submit({ displayName: '   ' });
      expect(session.updateProfile).not.toHaveBeenCalled();
    });

    it('shows a server rejection', async () => {
      session.updateProfile.mockRejectedValue(new HttpErrorResponse({ status: 400, error: { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' } } }));
      const { submit, text } = await render(EditProfilePage);
      await submit({ displayName: 'Ops' });
      expect(text()).toContain('Request validation failed');
    });
  });

  describe('ChangePasswordPage (S12)', () => {
    const change = { current: 'current-password-1', next: 'brand-new-password', confirm: 'brand-new-password' };

    it('blocks mismatched confirmation and an unchanged password', async () => {
      const { submit } = await render(ChangePasswordPage);
      await submit({ ...change, confirm: 'something-else-123' });
      await submit({ current: change.current, next: change.current, confirm: change.current });
      expect(api.changePassword).not.toHaveBeenCalled();
    });

    it('shows a wrong current password and keeps the session', async () => {
      api.changePassword.mockReturnValue(rejected(401, 'INVALID_CREDENTIALS', 'Current password is incorrect'));
      const { submit, text } = await render(ChangePasswordPage);
      await submit(change);
      expect(text()).toContain('Current password is incorrect');
      expect(session.logout).not.toHaveBeenCalled();
    });

    it('ends the session and explains why after success', async () => {
      const { submit, navigate } = await render(ChangePasswordPage);
      await submit(change);
      expect(api.changePassword).toHaveBeenCalledWith(change.current, change.next);
      expect(session.logout).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/auth/sign-in'], {
        replaceUrl: true,
        state: { notice: 'Password changed. Sign in with your new password.' },
      });
    });
  });

  describe('ChangeEmailPage (S12)', () => {
    it('requests confirmation at the new address', async () => {
      const { submit, text } = await render(ChangeEmailPage);
      await submit({ email: 'new@example.test' });
      expect(api.requestEmailChange).toHaveBeenCalledWith('new@example.test');
      expect(text()).toContain('open the confirmation link');
    });

    it('shows an address conflict from the server', async () => {
      api.requestEmailChange.mockReturnValue(rejected(409, 'CONFLICT', 'Email is already in use'));
      const { submit, text } = await render(ChangeEmailPage);
      await submit({ email: 'taken@example.test' });
      expect(text()).toContain('Email is already in use');
    });
  });

  describe('ConfirmEmailChangePage', () => {
    it('confirms, strips the token, and ends the local session', async () => {
      const { navigate, text } = await render(ConfirmEmailChangePage, { token: 'email-change-token-value' });
      expect(api.confirmEmailChange).toHaveBeenCalledWith('email-change-token-value');
      expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {}, replaceUrl: true }));
      await vi.waitFor(() => expect(text()).toContain('Email updated'));
      expect(session.logout).toHaveBeenCalled();
    });

    it('does not sign out a signed-out visitor', async () => {
      session.status.set('anonymous');
      const { text } = await render(ConfirmEmailChangePage, { token: 'email-change-token-value' });
      await vi.waitFor(() => expect(text()).toContain('Email updated'));
      expect(session.logout).not.toHaveBeenCalled();
    });

    it('explains an invalid link', async () => {
      api.confirmEmailChange.mockReturnValue(rejected(400, 'INVALID_CHALLENGE', 'Email-change challenge is invalid'));
      const { text } = await render(ConfirmEmailChangePage, { token: 'used-token-value-000' });
      await vi.waitFor(() => expect(text()).toContain('This link is invalid, has expired, or was already used.'));
      expect(session.logout).not.toHaveBeenCalled();
    });

    it('handles a missing token without calling the API', async () => {
      const { text } = await render(ConfirmEmailChangePage);
      expect(text()).toContain('Confirmation link missing');
      expect(api.confirmEmailChange).not.toHaveBeenCalled();
    });
  });
});
