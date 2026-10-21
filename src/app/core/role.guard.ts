import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import type { MobileRole } from './auth.models';
import { SessionService } from './session.service';

export function roleGuard(role: MobileRole): CanActivateFn {
  return () => {
    const session = inject(SessionService);
    const router = inject(Router);
    const allowed = session.status() === 'authenticated' && session.activeRole() === role;
    return allowed ? true : router.createUrlTree(['/auth/sign-in']);
  };
}
