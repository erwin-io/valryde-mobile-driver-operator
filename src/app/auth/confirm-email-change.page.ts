import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonNote, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { AuthApiService } from '../core/auth-api.service';
import { SessionService } from '../core/session.service';

type ConfirmState = 'confirming' | 'confirmed' | 'failed' | 'missing';

@Component({
  selector: 'app-confirm-email-change-page',
  standalone: true,
  imports: [RouterLink, IonButton, IonContent, IonHeader, IonNote, IonSpinner, IonTitle, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Confirm email</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack narrow">
        @switch (state()) {
          @case ('confirming') {
            <p role="status"><ion-spinner name="crescent" /> Confirming your new email…</p>
          }
          @case ('confirmed') {
            <h1>Email updated</h1>
            <p class="supporting-text">For your security, every device was signed out. Sign in with your new email.</p>
            <ion-button expand="block" size="large" routerLink="/auth/sign-in" [replaceUrl]="true">Sign in</ion-button>
          }
          @case ('missing') {
            <h1>Confirmation link missing</h1>
            <p class="supporting-text">Open the link from the confirmation email, or request a new one from your account.</p>
            <ion-button expand="block" routerLink="/auth/sign-in">Back to sign in</ion-button>
          }
          @default {
            <h1>Email not changed</h1>
            <ion-note color="danger" role="alert">{{ failure() }}</ion-note>
            <p class="supporting-text">Request a new confirmation link from your account settings.</p>
            <ion-button expand="block" routerLink="/auth/sign-in">Back to sign in</ion-button>
          }
        }
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmEmailChangePage {
  private readonly api = inject(AuthApiService);
  private readonly session = inject(SessionService);
  protected readonly state = signal<ConfirmState>('missing');
  protected readonly failure = signal('');

  constructor() {
    const route = inject(ActivatedRoute);
    const token = route.snapshot.queryParamMap.get('token');
    if (!token) return;
    // Keep the one-time token out of history once it has been read.
    void inject(Router).navigate([], { relativeTo: route, queryParams: {}, replaceUrl: true });
    void this.confirm(token);
  }

  private async confirm(token: string): Promise<void> {
    this.state.set('confirming');
    try {
      await firstValueFrom(this.api.confirmEmailChange(token));
    } catch (error: unknown) {
      this.failure.set(apiErrorMessage(error, 'This confirmation link is invalid or has expired.'));
      this.state.set('failed');
      return;
    }
    // The server revoked every session when the email changed; drop any local one too.
    if (this.session.status() === 'authenticated') await this.session.logout();
    this.state.set('confirmed');
  }
}
