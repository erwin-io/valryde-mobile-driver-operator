import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type { AuthTokens, LoginRequest, RegisterRequest, ValrydeUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  login(request: LoginRequest): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.baseUrl}/login`, request);
  }

  register(request: RegisterRequest): Observable<{ user: ValrydeUser; message: string }> {
    return this.http.post<{ user: ValrydeUser; message: string }>(`${this.baseUrl}/register`, request);
  }

  currentUser(): Observable<{ user: ValrydeUser }> {
    return this.http.get<{ user: ValrydeUser }>(`${this.baseUrl}/me`);
  }

  refresh(refreshToken: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.baseUrl}/refresh`, { refreshToken });
  }

  logout(refreshToken: string): Observable<null> {
    return this.http.post<null>(`${this.baseUrl}/logout`, { refreshToken });
  }

  verifyEmail(token: string): Observable<{ user: ValrydeUser }> {
    return this.http.post<{ user: ValrydeUser }>(`${this.baseUrl}/verify-email`, { token });
  }

  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/resend-verification`, { email });
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<null> {
    return this.http.post<null>(`${this.baseUrl}/reset-password`, { token, password });
  }

  updateProfile(displayName: string): Observable<{ user: ValrydeUser }> {
    return this.http.patch<{ user: ValrydeUser }>(`${this.baseUrl}/me`, { displayName });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<null> {
    return this.http.post<null>(`${this.baseUrl}/me/change-password`, { currentPassword, newPassword });
  }

  requestEmailChange(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/me/change-email`, { email });
  }

  confirmEmailChange(token: string): Observable<{ user: ValrydeUser }> {
    return this.http.post<{ user: ValrydeUser }>(`${this.baseUrl}/confirm-email-change`, { token });
  }
}
