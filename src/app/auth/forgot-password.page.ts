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
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { AuthApiService } from '../core/auth-api.service';

@Component({
  selector: 'app-forgot-password-page',
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
        <ion-title>Reset password</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack narrow">
        <h1>Forgot your password?</h1>
        <p class="supporting-text">Enter your account email. If it is eligible, we'll send a link to choose a new password.</p>
        <form class="form-card" [formGroup]="form" (ngSubmit)="submit()">
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
          <ion-button type="submit" expand="block" size="large" [disabled]="sending() || sent()">Send reset link</ion-button>
          <ion-button type="button" fill="clear" expand="block" routerLink="/auth/sign-in">Back to sign in</ion-button>
        </form>
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly api = inject(AuthApiService);
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly noticeIsError = signal(false);
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  private readonly email = this.form.controls.email;

  protected async submit(): Promise<void> {
    if (this.email.invalid || this.sending()) {
      this.email.markAsTouched();
      return;
    }
    this.sending.set(true);
    this.notice.set(null);
    try {
      // The server answers the same way whether or not the account exists (enumeration-resistant).
      const response = await firstValueFrom(this.api.forgotPassword(this.email.value));
      this.noticeIsError.set(false);
      this.notice.set(response.message);
      this.sent.set(true);
    } catch (error: unknown) {
      this.noticeIsError.set(true);
      this.notice.set(apiErrorMessage(error, 'The reset link could not be sent. Try again shortly.'));
    } finally {
      this.sending.set(false);
    }
  }
}
