import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { type AbstractControl, FormControl, FormGroup, ReactiveFormsModule, type ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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

const password = () =>
  new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(12), Validators.maxLength(128)] });
const newPasswordRules = (group: AbstractControl): ValidationErrors | null => {
  const { current, next, confirm } = group.value as { current: string; next: string; confirm: string };
  if (next !== confirm) return { mismatch: true };
  return next && next === current ? { unchanged: true } : null;
};

@Component({
  selector: 'app-change-password-page',
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
        <ion-title>Change password</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack narrow">
        <p class="supporting-text">Changing your password signs you out on every device, including this one.</p>
        <form class="form-card" [formGroup]="form" (ngSubmit)="submit()">
          <ion-list lines="none">
            <ion-item>
              <ion-input label="Current password" labelPlacement="stacked" type="password" autocomplete="current-password" formControlName="current" />
            </ion-item>
            <ion-item>
              <ion-input
                label="New password"
                labelPlacement="stacked"
                type="password"
                autocomplete="new-password"
                formControlName="next"
                errorText="Use 12–128 characters."
              />
            </ion-item>
            <ion-item>
              <ion-input label="Confirm new password" labelPlacement="stacked" type="password" autocomplete="new-password" formControlName="confirm" />
            </ion-item>
          </ion-list>
          @if (form.hasError('mismatch') && form.controls.confirm.touched) {
            <ion-note color="danger" role="alert">The new passwords do not match.</ion-note>
          }
          @if (form.hasError('unchanged')) {
            <ion-note color="danger" role="alert">Choose a password different from your current one.</ion-note>
          }
          @if (failure()) {
            <ion-note color="danger" role="alert">{{ failure() }}</ion-note>
          }
          <ion-button type="submit" expand="block" size="large" [disabled]="submitting()">Change password</ion-button>
        </form>
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordPage {
  private readonly api = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  protected readonly accountHref = `${workspaceFor(this.session.activeRole() ?? 'DRIVER')}/account`;
  protected readonly submitting = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly form = new FormGroup(
    { current: password(), next: password(), confirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }) },
    { validators: newPasswordRules },
  );

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.failure.set(null);
    const { current, next } = this.form.getRawValue();
    try {
      await firstValueFrom(this.api.changePassword(current, next));
    } catch (error: unknown) {
      this.failure.set(apiErrorMessage(error, 'Your password could not be changed.'));
      this.submitting.set(false);
      return;
    }
    // The server has revoked every session for this account; end ours and explain why.
    await this.session.logout();
    await this.router.navigate(['/auth/sign-in'], {
      replaceUrl: true,
      state: { notice: 'Password changed. Sign in with your new password.' },
    });
  }
}
