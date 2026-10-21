import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, Router, type RouterStateSnapshot, UrlTree } from '@angular/router';

import type { MobileRole } from './auth.models';
import { guestGuard, roleGuard } from './role.guard';
import { SessionService, type SessionStatus } from './session.service';

describe('roleGuard', () => {
  const run = (status: SessionStatus, activeRole: MobileRole | null, required: MobileRole) => {
    TestBed.configureTestingModule({
      providers: [{ provide: SessionService, useValue: { status: () => status, activeRole: () => activeRole } }],
    });
    return TestBed.runInInjectionContext(() =>
      roleGuard(required)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  };
  const url = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('allows the active matching role', () => {
    expect(run('authenticated', 'DRIVER', 'DRIVER')).toBe(true);
  });

  it('redirects a Driver session away from Operator routes', () => {
    const result = run('authenticated', 'DRIVER', 'OPERATOR');
    expect(result).toBeInstanceOf(UrlTree);
    expect(url(result)).toBe('/auth/sign-in');
  });

  it('redirects anonymous sessions to sign-in', () => {
    expect(url(run('anonymous', null, 'OPERATOR'))).toBe('/auth/sign-in');
  });
});

describe('guestGuard', () => {
  const run = (status: SessionStatus, activeRole: MobileRole | null) => {
    TestBed.configureTestingModule({
      providers: [{ provide: SessionService, useValue: { status: () => status, activeRole: () => activeRole } }],
    });
    const result = TestBed.runInInjectionContext(() => guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    return result === true ? true : TestBed.inject(Router).serializeUrl(result as UrlTree);
  };

  it('lets anonymous users reach sign-in', () => expect(run('anonymous', null)).toBe(true));
  it('sends a restored Operator session to its dashboard', () => expect(run('authenticated', 'OPERATOR')).toBe('/operator/dashboard'));
  it('sends a multi-role session without a choice to the role chooser', () => expect(run('authenticated', null)).toBe('/role'));
});
