import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import type { MobileRole } from './auth.models';
import { SessionService } from './session.service';

export const workspaceFor = (role: MobileRole) => (role === 'DRIVER' ? '/driver' : '/operator');
export const homeFor = (role: MobileRole) => `${workspaceFor(role)}/${role === 'DRIVER' ? 'home' : 'dashboard'}`;

export function roleGuard(role: MobileRole): CanActivateFn {
  return () => {
    const session = inject(SessionService);
    const router = inject(Router);
    const allowed = session.status() === 'authenticated' && session.activeRole() === role;
    return allowed ? true : router.createUrlTree(['/auth/sign-in']);
  };
}

/** Sign-in/register screens: an authenticated session goes to its workspace instead. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.status() !== 'authenticated') return true;
  const role = session.activeRole();
  return router.createUrlTree([role ? homeFor(role) : '/role']);
};
