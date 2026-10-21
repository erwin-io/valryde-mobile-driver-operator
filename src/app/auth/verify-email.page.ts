import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { AuthApiService } from '../core/auth-api.service';

type VerifyState = 'idle' | 'verifying' | 'verified' | 'failed';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonList,
    IonNote,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/auth/sign-in" /></ion-buttons>
        <ion-title>Verify email</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack narrow">
        @switch (state()) {
          @case ('verifying') {
            <p role="status"><ion-spinner name="crescent" /> Verifying your email…</p>
          }
          @case ('verified') {
            <h1>Email verified</h1>
            <p class="supporting-text">Your account is ready. Sign in to continue.</p>
            <ion-button expand="block" size="large" routerLink="/auth/sign-in" [replaceUrl]="true">Sign in</ion-button>
          }
          @default {
            <h1>Check your email</h1>
            @if (state() === 'failed') {
              <ion-note color="danger" role="alert">{{ failure() }}</ion-note>
            }
            <p class="supporting-text">
              Open the verification link we sent to finish setting up your account. Request a new link below if it
              expired or did not arrive.
            </p>
            <form class="form-card" [formGroup]="form" (ngSubmit)="resend()">
              <ion-list lines="none">
                <ion-item>
                  <ion-input
                    label="Email address"
                    labelPlacement="stacked"
                    type="email"
                    autocomplete="email"
                    inputmode="email"
                    formControlName="email"
                    errorText="Enter a valid email address."
                  />
                </ion-item>
              </ion-list>
              @if (notice()) {
                <ion-note [color]="noticeIsError() ? 'danger' : 'success'" role="status">{{ notice() }}</ion-note>
              }
              <ion-button type="submit" expand="block" [disabled]="sending()">Send a new link</ion-button>
              <ion-button type="button" fill="clear" expand="block" routerLink="/auth/sign-in">Back to sign in</ion-button>
            </form>
          }
        }
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPage {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  protected readonly state = signal<VerifyState>('idle');
  protected readonly failure = signal('');
  protected readonly sending = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly noticeIsError = signal(false);
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  private readonly email = this.form.controls.email;

  constructor() {
    const route = inject(ActivatedRoute);
    const query = route.snapshot.queryParamMap;
    // The email arrives as navigation state, never in the URL.
    const state = globalThis.history?.state as { email?: unknown } | null;
    this.email.setValue(typeof state?.email === 'string' ? state.email : '');
    const token = query.get('token');
    if (token) {
      // Keep the one-time token out of history once it has been read.
      void this.router.navigate([], { relativeTo: route, queryParams: {}, replaceUrl: true });
      void this.verify(token);
    }
  }

  private async verify(token: string): Promise<void> {
    this.state.set('verifying');
    try {
      await firstValueFrom(this.api.verifyEmail(token));
      this.state.set('verified');
    } catch (error: unknown) {
      this.failure.set(apiErrorMessage(error, 'This verification link is invalid or has expired.'));
      this.state.set('failed');
    }
  }

  protected async resend(): Promise<void> {
    if (this.email.invalid || this.sending()) {
      this.email.markAsTouched();
      return;
    }
    this.sending.set(true);
    this.notice.set(null);
    try {
      const response = await firstValueFrom(this.api.resendVerification(this.email.value));
      this.noticeIsError.set(false);
      this.notice.set(response.message);
    } catch (error: unknown) {
      this.noticeIsError.set(true);
      this.notice.set(apiErrorMessage(error, 'A new link could not be sent. Try again shortly.'));
    } finally {
      this.sending.set(false);
    }
  }
}
