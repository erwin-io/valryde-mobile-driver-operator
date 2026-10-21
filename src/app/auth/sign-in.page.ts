import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { busOutline, shieldCheckmarkOutline } from 'ionicons/icons';

import { environment } from '../../environments/environment';
import { apiErrorCode, apiErrorMessage } from '../core/api-error';
import { homeFor } from '../core/role.guard';
import { NoMobileRoleError, SessionService, SessionSupersededError } from '../core/session.service';

@Component({
  selector: 'app-sign-in-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonNote,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Valryde Operator</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="auth-content">
      <main class="auth-shell">
        <section class="auth-intro" aria-labelledby="sign-in-heading">
          <div class="brand-mark"><ion-icon name="bus-outline" aria-hidden="true" /></div>
          <p class="eyebrow">DRIVER &amp; FLEET OPERATIONS</p>
          <h1 id="sign-in-heading">Sign in to your workspace</h1>
          <p>Access only the vehicles, routes and fleet tools authorized for your account.</p>
        </section>

        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
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
            <ion-item>
              <ion-input
                label="Password"
                labelPlacement="stacked"
                type="password"
                autocomplete="current-password"
                formControlName="password"
                errorText="Password must contain 12–128 characters."
              />
            </ion-item>
          </ion-list>

          @if (session.resumable() && !errorMessage()) {
            <ion-note class="form-error" color="warning" role="status">
              VALRYDE couldn't be reached to resume your session.
              <ion-button fill="clear" size="small" [disabled]="submitting()" (click)="resume()">Try again</ion-button>
            </ion-note>
          }
          @if (session.expired() && !errorMessage()) {
            <ion-note class="form-error" color="warning" role="status">Your session ended. Sign in again to continue.</ion-note>
          }
          @if (errorMessage()) {
            <ion-note class="form-error" color="danger" role="alert">{{ errorMessage() }}</ion-note>
            @if (needsVerification()) {
              <ion-button fill="outline" size="small" routerLink="/auth/verify-email" [state]="{ email: form.controls.email.value }">
                Verify email
              </ion-button>
            }
          }

          <ion-button type="submit" expand="block" size="large" [disabled]="submitting()">
            @if (submitting()) { <ion-spinner name="crescent" /> } @else { Sign in }
          </ion-button>
          <ion-button type="button" fill="clear" expand="block" routerLink="/auth/forgot-password">Forgot password?</ion-button>
          <ion-button type="button" fill="clear" expand="block" routerLink="/auth/register">
            Create a Driver or Operator account
          </ion-button>
        </form>

        <div class="security-note">
          <ion-icon name="shield-checkmark-outline" aria-hidden="true" />
          <span>Backend permissions remain authoritative for every action.</span>
        </div>

        @if (previewEnabled) {
          <section class="preview-tools" aria-label="Foundation preview">
            <strong>Foundation preview</strong>
            <p>No backend data or authorization is simulated.</p>
            <div>
              <ion-button fill="outline" size="small" routerLink="/foundation/driver">Driver home</ion-button>
              <ion-button fill="outline" size="small" routerLink="/foundation/operator">Operator home</ion-button>
            </div>
          </section>
        }
      </main>
    </ion-content>
  `,
  styles: `
    .auth-content { --background: var(--vr-color-surface-subtle); }
    .auth-shell { display: grid; gap: var(--vr-space-6); margin: 0 auto; max-width: 30rem; padding: var(--vr-space-8) var(--vr-space-4); }
    .auth-intro { text-align: center; }
    .brand-mark { align-items: center; background: var(--vr-color-primary); border-radius: 50%; color: white; display: inline-flex; font-size: 2rem; height: 4rem; justify-content: center; width: 4rem; }
    .eyebrow { color: var(--vr-color-primary); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.12em; margin: var(--vr-space-4) 0 var(--vr-space-2); }
    h1 { color: var(--vr-color-text); font-size: 1.75rem; margin: 0; }
    .auth-intro > p:last-child { color: var(--vr-color-text-muted); line-height: 1.5; }
    .auth-form { background: var(--vr-color-surface); border: 1px solid var(--vr-color-border); border-radius: var(--vr-radius-md); display: grid; gap: var(--vr-space-3); padding: var(--vr-space-4); }
    ion-list { background: transparent; }
    ion-item { --background: transparent; --padding-start: 0; --inner-padding-end: 0; margin-bottom: var(--vr-space-2); }
    .form-error { display: block; padding: 0 var(--vr-space-1); }
    .security-note { align-items: center; color: var(--vr-color-text-muted); display: flex; font-size: 0.8125rem; gap: var(--vr-space-2); justify-content: center; }
    .preview-tools { border-top: 1px solid var(--vr-color-border); color: var(--vr-color-text-muted); font-size: 0.8125rem; padding-top: var(--vr-space-4); text-align: center; }
    .preview-tools p { margin: var(--vr-space-1) 0 var(--vr-space-2); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);
  protected readonly submitting = signal(false);
  protected readonly apiError = signal<string | null>(null);
  protected readonly errorMessage = computed(() => this.apiError());
  protected readonly needsVerification = signal(false);
  protected readonly previewEnabled = environment.enableFoundationPreview;
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12), Validators.maxLength(128)],
    }),
  });

  constructor() {
    addIcons({ busOutline, shieldCheckmarkOutline });
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.apiError.set(null);
    this.needsVerification.set(false);
    try {
      await this.session.login(this.form.getRawValue());
      await this.enterWorkspace();
    } catch (error: unknown) {
      // The attempt was overtaken by a sign-out; nothing to report.
      if (error instanceof SessionSupersededError) return;
      this.needsVerification.set(apiErrorCode(error) === 'EMAIL_NOT_VERIFIED');
      this.apiError.set(this.describeError(error));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async resume(): Promise<void> {
    this.submitting.set(true);
    try {
      await this.session.restore();
      if (this.session.status() === 'authenticated') await this.enterWorkspace();
    } finally {
      this.submitting.set(false);
    }
  }

  private async enterWorkspace(): Promise<void> {
    const role = this.session.activeRole();
    await this.router.navigate([role ? homeFor(role) : '/role'], { replaceUrl: true });
  }

  private describeError(error: unknown): string {
    if (error instanceof NoMobileRoleError) {
      return 'This account does not have Driver or Operator access. Use the VALRYDE app for your role.';
    }
    return apiErrorMessage(error, 'Sign in failed. Check your details and try again.');
  }
}
