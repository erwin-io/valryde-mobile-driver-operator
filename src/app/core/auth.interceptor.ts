import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { apiErrorCode } from './api-error';
import { SessionService } from './session.service';
import { TokenStoreService } from './token-store.service';

const authBase = `${environment.apiBaseUrl}/auth/`;
// Public auth endpoints (login, refresh, logout, register, ...) report their own 401s; `/auth/me*` is protected.
const isPublicAuth = (url: string) => url.startsWith(authBase) && !url.startsWith(`${authBase}me`);
const withToken = (request: HttpRequest<unknown>, token: string | null) =>
  token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const tokenStore = inject(TokenStoreService);
  const session = inject(SessionService);
  const router = inject(Router);

  return next(withToken(request, tokenStore.accessToken())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isPublicAuth(request.url)) {
        return throwError(() => error);
      }
      const code = apiErrorCode(error);
      // Credentials changed or account disabled server-side: refreshing cannot help.
      if (code === 'SESSION_REVOKED') {
        session.endRevoked();
        void router.navigate(['/auth/sign-in']);
        return throwError(() => error);
      }
      // Only an invalid/expired access token is refreshable; e.g. a wrong current password (INVALID_CREDENTIALS) is not.
      const refreshable = (code === null || code === 'AUTH_REQUIRED') && tokenStore.refreshToken() !== null;
      if (!refreshable) return throwError(() => error);
      return from(session.refresh()).pipe(
        switchMap((result) => {
          if (result === 'refreshed') return next(withToken(request, tokenStore.accessToken()));
          // An outage keeps the session; only a server rejection ends it.
          if (result === 'rejected') void router.navigate(['/auth/sign-in']);
          return throwError(() => error);
        }),
      );
    }),
  );
};
