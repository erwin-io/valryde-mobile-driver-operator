import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { workspaceFor } from '../core/role.guard';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-change-email-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
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
        <ion-buttons slot="start"><ion-back-button [defaultHref]="accountHref" /></ion-buttons>
        <ion-title>Change email</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack narrow">
        <p class="supporting-text">
          Current email: <strong>{{ session.user()?.email }}</strong>. We'll send a confirmation link to the new address.
          Your email changes only after you open it, and you will then be signed out on every device.
        </p>
        <form class="form-card" [formGroup]="form" (ngSubmit)="submit()">
          <ion-list lines="none">
            <ion-item>
              <ion-input
                label="New email address"
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
          <ion-button type="submit" expand="block" size="large" [disabled]="sending() || sent()">Send confirmation link</ion-button>
        </form>
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeEmailPage {
  private readonly api = inject(AuthApiService);
  protected readonly session = inject(SessionService);
  protected readonly accountHref = `${workspaceFor(this.session.activeRole() ?? 'DRIVER')}/account`;
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly noticeIsError = signal(false);
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(254)] }),
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.sending()) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.notice.set(null);
    try {
      await firstValueFrom(this.api.requestEmailChange(this.form.controls.email.value));
      this.noticeIsError.set(false);
      this.notice.set('Check the new inbox and open the confirmation link to finish.');
      this.sent.set(true);
    } catch (error: unknown) {
      this.noticeIsError.set(true);
      this.notice.set(apiErrorMessage(error, 'The confirmation link could not be sent.'));
    } finally {
      this.sending.set(false);
    }
  }
}
