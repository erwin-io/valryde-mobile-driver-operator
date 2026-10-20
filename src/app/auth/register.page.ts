import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import type { ApiErrorEnvelope, MobileRole } from '../core/auth.models';
import { AuthApiService } from '../core/auth-api.service';

@Component({
  selector: 'app-register-page',
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
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/auth/sign-in" /></ion-buttons>
        <ion-title>Create account</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="register-shell">
        <header>
          <h1>Choose how you'll use Valryde</h1>
          <p>Registration creates an account. Fleet association, vehicle approval and GPS activation are separate workflows.</p>
        </header>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <ion-segment formControlName="role" aria-label="Account role">
            <ion-segment-button value="DRIVER">Driver</ion-segment-button>
            <ion-segment-button value="OPERATOR">Operator</ion-segment-button>
          </ion-segment>
          <ion-list lines="none">
            <ion-item><ion-input label="Display name" labelPlacement="stacked" formControlName="displayName" /></ion-item>
            <ion-item><ion-input label="Email address" labelPlacement="stacked" type="email" autocomplete="email" formControlName="email" /></ion-item>
            <ion-item><ion-input label="Password" labelPlacement="stacked" type="password" autocomplete="new-password" formControlName="password" /></ion-item>
          </ion-list>
          <p class="password-rule">Use 12–128 characters.</p>
          @if (message()) { <ion-note [color]="success() ? 'success' : 'danger'" role="status">{{ message() }}</ion-note> }
          <ion-button type="submit" expand="block" size="large" [disabled]="submitting()">Create account</ion-button>
          <ion-button type="button" fill="clear" expand="block" routerLink="/auth/sign-in">Back to sign in</ion-button>
        </form>
      </main>
    </ion-content>
  `,
  styles: `
    .register-shell { display: grid; gap: var(--vr-space-6); margin: 0 auto; max-width: 32rem; padding: var(--vr-space-6) var(--vr-space-4); }
    h1 { font-size: 1.5rem; margin: 0 0 var(--vr-space-2); }
    header p, .password-rule { color: var(--vr-color-text-muted); font-size: 0.875rem; line-height: 1.45; }
    form { background: var(--vr-color-surface); border: 1px solid var(--vr-color-border); border-radius: var(--vr-radius-md); display: grid; gap: var(--vr-space-3); padding: var(--vr-space-4); }
    ion-list, ion-item { --background: transparent; }
    ion-item { --padding-start: 0; --inner-padding-end: 0; }
    .password-rule { margin: 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly api = inject(AuthApiService);
  protected readonly submitting = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly success = signal(false);
  protected readonly form = new FormGroup({
    role: new FormControl<MobileRole>('DRIVER', { nonNullable: true }),
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(12), Validators.maxLength(128)] }),
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.message.set(null);
    try {
      const response = await firstValueFrom(this.api.register(this.form.getRawValue()));
      this.success.set(true);
      this.message.set(response.message);
      this.form.disable();
    } catch (error: unknown) {
      this.success.set(false);
      const body = error instanceof HttpErrorResponse ? (error.error as Partial<ApiErrorEnvelope>) : null;
      this.message.set(body?.error?.message ?? 'Registration failed. Check your details and try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
