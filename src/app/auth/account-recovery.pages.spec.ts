import { HttpErrorResponse } from '@angular/common/http';
import { type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthApiService } from '../core/auth-api.service';
import { ForgotPasswordPage } from './forgot-password.page';
import { ResetPasswordPage } from './reset-password.page';
import { VerifyEmailPage } from './verify-email.page';

describe('Account recovery pages', () => {
  type Mock = ReturnType<typeof vi.fn>;
  let api: { verifyEmail: Mock; resendVerification: Mock; forgotPassword: Mock; resetPassword: Mock };
  const invalidChallenge = () =>
    throwError(
      () =>
        new HttpErrorResponse({
          status: 400,
          error: { error: { code: 'INVALID_CHALLENGE', message: 'Challenge is invalid, expired, or already used' } },
        }),
    );

  const render = async <T,>(page: Type<T>, query: Record<string, string> = {}) => {
    TestBed.configureTestingModule({
      imports: [page],
      providers: [
        provideRouter([]),
        { provide: AuthApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(page);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, navigate, text: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  };

  beforeEach(() => {
    api = {
      verifyEmail: vi.fn(() => of({ user: {} })),
      resendVerification: vi.fn(() => of({ message: 'If an eligible account exists, verification instructions will be sent.' })),
      forgotPassword: vi.fn(() => of({ message: 'If an eligible account exists, password recovery instructions will be sent.' })),
      resetPassword: vi.fn(() => of(null)),
    };
  });

  describe('VerifyEmailPage', () => {
    it('verifies the link token and removes it from the URL', async () => {
      const { navigate, text } = await render(VerifyEmailPage, { token: 'verify-token-value' });
      expect(api.verifyEmail).toHaveBeenCalledWith('verify-token-value');
      expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {}, replaceUrl: true }));
      expect(text()).toContain('Email verified');
    });

    it('explains an expired link and offers a new one', async () => {
      api.verifyEmail.mockReturnValue(invalidChallenge());
      const { text } = await render(VerifyEmailPage, { token: 'used-token-value' });
      expect(text()).toContain('This link is invalid, has expired, or was already used.');
      expect(text()).toContain('Send a new link');
    });

    it('resends verification for the prefilled email', async () => {
      history.replaceState({ email: 'driver@example.test' }, '');
      const { fixture, text } = await render(VerifyEmailPage);
      (fixture.nativeElement as HTMLElement).querySelector('form')?.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(api.resendVerification).toHaveBeenCalledWith('driver@example.test');
      expect(text()).toContain('If an eligible account exists');
    });
  });

  describe('ForgotPasswordPage', () => {
    it('shows the server’s enumeration-resistant message', async () => {
      const { fixture, text } = await render(ForgotPasswordPage);
      const page = fixture.componentInstance as unknown as { form: { setValue(v: { email: string }): void } };
      page.form.setValue({ email: 'anyone@example.test' });
      (fixture.nativeElement as HTMLElement).querySelector('form')?.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(api.forgotPassword).toHaveBeenCalledWith('anyone@example.test');
      expect(text()).toContain('If an eligible account exists');
    });

    it('does not submit an invalid email', async () => {
      const { fixture } = await render(ForgotPasswordPage);
      (fixture.nativeElement as HTMLElement).querySelector('form')?.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      expect(api.forgotPassword).not.toHaveBeenCalled();
    });
  });

  describe('ResetPasswordPage', () => {
    interface ResetForm { form: { setValue(v: { password: string; confirm: string }): void } }
    const submit = async (password: string, confirm: string, query = { token: 'reset-token-value' }) => {
      const view = await render(ResetPasswordPage, query);
      (view.fixture.componentInstance as unknown as ResetForm).form.setValue({ password, confirm });
      (view.fixture.nativeElement as HTMLElement).querySelector('form')?.dispatchEvent(new Event('submit'));
      await view.fixture.whenStable();
      view.fixture.detectChanges();
      return view;
    };

    it('blocks mismatched passwords', async () => {
      await submit('first-password-123', 'other-password-123');
      expect(api.resetPassword).not.toHaveBeenCalled();
    });

    it('blocks passwords shorter than the Agent A minimum', async () => {
      await submit('short', 'short');
      expect(api.resetPassword).not.toHaveBeenCalled();
    });

    it('resets with the link token and confirms', async () => {
      const { text, navigate } = await submit('new-password-123', 'new-password-123');
      expect(api.resetPassword).toHaveBeenCalledWith('reset-token-value', 'new-password-123');
      expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ replaceUrl: true }));
      expect(text()).toContain('Password updated');
    });

    it('explains an invalid link', async () => {
      api.resetPassword.mockReturnValue(invalidChallenge());
      const { text } = await submit('new-password-123', 'new-password-123');
      expect(text()).toContain('This link is invalid, has expired, or was already used.');
    });

    it('handles a missing token without calling the API', async () => {
      const { text } = await render(ResetPasswordPage);
      expect(text()).toContain('Reset link missing');
      expect(api.resetPassword).not.toHaveBeenCalled();
    });
  });
});
