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

import { apiErrorMessage } from '../core/api-error';
import { workspaceFor } from '../core/role.guard';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-edit-profile-page',
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
        <ion-title>Edit profile</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack narrow">
        <form class="form-card" [formGroup]="form" (ngSubmit)="save()">
          <ion-list lines="none">
            <ion-item>
              <ion-input
                label="Display name"
                labelPlacement="stacked"
                autocomplete="name"
                formControlName="displayName"
                [counter]="true"
                maxlength="120"
                errorText="Enter a name of 1–120 characters."
              />
            </ion-item>
          </ion-list>
          <p class="supporting-text">Your email and role are managed separately and are not changed here.</p>
          @if (notice()) {
            <ion-note [color]="noticeIsError() ? 'danger' : 'success'" role="status">{{ notice() }}</ion-note>
          }
          <ion-button type="submit" expand="block" size="large" [disabled]="saving()">Save</ion-button>
        </form>
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProfilePage {
  private readonly session = inject(SessionService);
  protected readonly accountHref = `${workspaceFor(this.session.activeRole() ?? 'DRIVER')}/account`;
  protected readonly saving = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly noticeIsError = signal(false);
  protected readonly form = new FormGroup({
    displayName: new FormControl(this.session.user()?.displayName ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)],
    }),
  });

  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.notice.set(null);
    try {
      await this.session.updateProfile(this.form.controls.displayName.value.trim());
      this.noticeIsError.set(false);
      this.notice.set('Profile saved.');
    } catch (error: unknown) {
      this.noticeIsError.set(true);
      this.notice.set(apiErrorMessage(error, 'Your profile could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }
}
