import { HttpErrorResponse } from '@angular/common/http';
import { signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthApiService } from '../core/auth-api.service';
import type { MobileRole } from '../core/auth.models';
import { NoMobileRoleError, SessionService } from '../core/session.service';
import { RegisterPage } from './register.page';
import { RoleChooserPage } from './role-chooser.page';
import { SignInPage } from './sign-in.page';

const rejected = (status: number, code: string, message: string) =>
  new HttpErrorResponse({ status, error: { error: { code, message, requestId: 'req-1' } } });

describe('Authentication entry pages', () => {
  type Mock = ReturnType<typeof vi.fn>;

  const render = <T,>(page: Type<T>, providers: object[]) => {
    TestBed.configureTestingModule({ imports: [page], providers: [provideRouter([]), ...providers] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(page);
    fixture.detectChanges();
    return { fixture, navigate, text: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  };

  describe('SignInPage', () => {
    let activeRole: ReturnType<typeof signal<MobileRole | null>>;
    let session: {
      login: Mock;
      restore: Mock;
      status: ReturnType<typeof signal<'anonymous' | 'authenticated'>>;
      activeRole: ReturnType<typeof signal<MobileRole | null>>;
      resumable: ReturnType<typeof signal<boolean>>;
      expired: ReturnType<typeof signal<boolean>>;
    };

    beforeEach(() => {
      activeRole = signal<MobileRole | null>('DRIVER');
      session = {
        login: vi.fn(async () => undefined),
        restore: vi.fn(async () => undefined),
        status: signal<'anonymous' | 'authenticated'>('authenticated'),
        activeRole,
        resumable: signal(false),
        expired: signal(false),
      };
    });

    const submit = async (role: MobileRole | null = 'DRIVER') => {
      activeRole.set(role);
      const rendered = render(SignInPage, [{ provide: SessionService, useValue: session }]);
      const page = rendered.fixture.componentInstance as unknown as {
        form: { setValue(value: { email: string; password: string }): void };
        submit(): Promise<void>;
      };
      page.form.setValue({ email: 'mobile@example.test', password: 'valid-password-123' });
      await page.submit();
      rendered.fixture.detectChanges();
      return rendered;
    };

    it.each([
      ['DRIVER' as const, '/driver/home'],
      ['OPERATOR' as const, '/operator/dashboard'],
      [null, '/role'],
    ])('routes the authenticated %s context to the correct workspace', async (role, destination) => {
      const { navigate } = await submit(role);
      expect(session.login).toHaveBeenCalledWith({ email: 'mobile@example.test', password: 'valid-password-123' });
      expect(navigate).toHaveBeenCalledWith([destination], { replaceUrl: true });
    });

    it.each([
      [403, 'FORBIDDEN', 'Driver access is disabled', 'Driver access is disabled'],
      [503, 'SERVICE_UNAVAILABLE', 'Internal outage', 'VALRYDE is unavailable right now'],
    ])('renders the safe error state for status %s', async (status, code, message, expected) => {
      session.login.mockRejectedValue(rejected(status, code, message));
      expect((await submit()).text()).toContain(expected);
    });

    it('offers verification after EMAIL_NOT_VERIFIED', async () => {
      session.login.mockRejectedValue(rejected(403, 'EMAIL_NOT_VERIFIED', 'Verify your email first'));
      const { text } = await submit();
      expect(text()).toContain('Verify your email first');
      expect(text()).toContain('Verify email');
    });

    it('rejects an account without a mobile role', async () => {
      session.login.mockRejectedValue(new NoMobileRoleError());
      expect((await submit()).text()).toContain('does not have Driver or Operator access');
    });

    it('blocks an invalid form and serializes a valid sign-in', async () => {
      let complete!: () => void;
      session.login.mockReturnValue(new Promise<void>((resolve) => (complete = resolve)));
      const { fixture } = render(SignInPage, [{ provide: SessionService, useValue: session }]);
      const page = fixture.componentInstance as unknown as {
        form: { setValue(value: { email: string; password: string }): void };
        submit(): Promise<void>;
      };
      page.form.setValue({ email: 'invalid', password: 'short' });
      await page.submit();
      expect(session.login).not.toHaveBeenCalled();
      page.form.setValue({ email: 'driver@example.test', password: 'valid-password-123' });
      const first = page.submit();
      const second = page.submit();
      expect(session.login).toHaveBeenCalledTimes(1);
      complete();
      await Promise.all([first, second]);
    });
  });

  describe('RegisterPage', () => {
    let api: { register: Mock };

    beforeEach(() => {
      api = { register: vi.fn(() => of({ message: 'Check your email' })) };
    });

    const submit = async (role: MobileRole) => {
      const rendered = render(RegisterPage, [{ provide: AuthApiService, useValue: api }]);
      const page = rendered.fixture.componentInstance as unknown as {
        form: { setValue(value: { role: MobileRole; displayName: string; email: string; password: string }): void };
        submit(): Promise<void>;
      };
      page.form.setValue({ role, displayName: '  Mobile User  ', email: 'user@example.test', password: 'valid-password-123' });
      await page.submit();
      rendered.fixture.detectChanges();
      return rendered;
    };

    it.each(['DRIVER', 'OPERATOR'] as const)('registers the selected %s role without inventing association state', async (role) => {
      const { text } = await submit(role);
      expect(api.register).toHaveBeenCalledWith({ role, displayName: '  Mobile User  ', email: 'user@example.test', password: 'valid-password-123' });
      expect(text()).toContain('Check your email');
      expect(text()).toContain("Didn't get the email?");
    });

    it.each([
      [409, 'CONFLICT', 'Email address is already registered', 'Email address is already registered'],
      [503, 'SERVICE_UNAVAILABLE', 'Internal outage', 'VALRYDE is unavailable right now'],
    ])('renders registration failure status %s', async (status, code, message, expected) => {
      api.register.mockReturnValue(throwError(() => rejected(status, code, message)));
      expect((await submit('DRIVER')).text()).toContain(expected);
    });
  });

  describe('RoleChooserPage', () => {
    it('shows only granted roles and navigates only after an authorized selection', async () => {
      const session = { availableRoles: signal<MobileRole[]>(['DRIVER', 'OPERATOR']), selectRole: vi.fn((role) => role === 'OPERATOR') };
      const { fixture, navigate, text } = render(RoleChooserPage, [{ provide: SessionService, useValue: session }]);
      expect(text()).toContain('Driver');
      expect(text()).toContain('Operator');
      const page = fixture.componentInstance as unknown as { choose(role: MobileRole): Promise<void> };
      await page.choose('DRIVER');
      expect(navigate).not.toHaveBeenCalled();
      await page.choose('OPERATOR');
      expect(navigate).toHaveBeenCalledWith(['/operator/dashboard'], { replaceUrl: true });
    });
  });
});
