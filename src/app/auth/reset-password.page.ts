import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { type AbstractControl, FormControl, FormGroup, ReactiveFormsModule, type ValidationErrors, Validators } from '@angular/forms';
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
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { AuthApiService } from '../core/auth-api.service';

const passwordsMatch = (group: AbstractControl): ValidationErrors | null =>
  group.get('password')?.value === group.get('confirm')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-reset-password-page',
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
    IonTitle,
    IonToolbar,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/auth/sign-in" /></ion-buttons>
        <ion-title>New password</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack narrow">
        @if (done()) {
          <h1>Password updated</h1>
          <p class="supporting-text">Sign in with your new password. Other devices have been signed out.</p>
          <ion-button expand="block" size="large" routerLink="/auth/sign-in" [replaceUrl]="true">Sign in</ion-button>
        } @else if (!token) {
          <h1>Reset link missing</h1>
          <p class="supporting-text">Open the link from your password reset email, or request a new one.</p>
          <ion-button expand="block" routerLink="/auth/forgot-password">Request a new link</ion-button>
        } @else {
          <h1>Choose a new password</h1>
          <form class="form-card" [formGroup]="form" (ngSubmit)="submit()">
            <ion-list lines="none">
              <ion-item>
                <ion-input
                  label="New password"
                  labelPlacement="stacked"
                  type="password"
                  autocomplete="new-password"
                  formControlName="password"
                  errorText="Use 12–128 characters."
                />
              </ion-item>
              <ion-item>
                <ion-input
                  label="Confirm new password"
                  labelPlacement="stacked"
                  type="password"
                  autocomplete="new-password"
                  formControlName="confirm"
                />
              </ion-item>
            </ion-list>
            @if (form.hasError('mismatch') && form.get('confirm')?.touched) {
              <ion-note color="danger" role="alert">The passwords do not match.</ion-note>
            }
            @if (failure()) {
              <ion-note color="danger" role="alert">{{ failure() }}</ion-note>
              <ion-button fill="clear" size="small" routerLink="/auth/forgot-password">Request a new link</ion-button>
            }
            <ion-button type="submit" expand="block" size="large" [disabled]="submitting()">Update password</ion-button>
          </form>
        }
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly api = inject(AuthApiService);
  protected readonly token: string | null;
  protected readonly submitting = signal(false);
  protected readonly done = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly form = new FormGroup(
    {
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(12), Validators.maxLength(128)],
      }),
      confirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsMatch },
  );

  constructor() {
    const route = inject(ActivatedRoute);
    this.token = route.snapshot.queryParamMap.get('token');
    // Keep the one-time token out of history once it has been read.
    if (this.token) void inject(Router).navigate([], { relativeTo: route, queryParams: {}, replaceUrl: true });
  }

  protected async submit(): Promise<void> {
    if (!this.token || this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.failure.set(null);
    try {
      await firstValueFrom(this.api.resetPassword(this.token, this.form.controls.password.value));
      this.done.set(true);
    } catch (error: unknown) {
      this.failure.set(apiErrorMessage(error, 'This reset link is invalid or has expired.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
