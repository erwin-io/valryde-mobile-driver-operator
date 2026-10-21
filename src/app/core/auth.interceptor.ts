import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
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
      const retryable =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isPublicAuth(request.url) &&
        tokenStore.refreshToken() !== null;
      if (!retryable) return throwError(() => error);
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
