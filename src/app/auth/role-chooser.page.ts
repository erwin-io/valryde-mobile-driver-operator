import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { busOutline, peopleOutline } from 'ionicons/icons';

import type { MobileRole } from '../core/auth.models';
import { homeFor } from '../core/role.guard';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-role-chooser-page',
  standalone: true,
  imports: [IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar],
  template: `
    <ion-header><ion-toolbar><ion-title>Choose workspace</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content">
      <main class="role-shell">
        <h1>Continue as</h1>
        <p>Select one of the roles authorized by your account.</p>
        @for (role of session.availableRoles(); track role) {
          <ion-button expand="block" size="large" fill="outline" (click)="choose(role)">
            <ion-icon slot="start" [name]="role === 'DRIVER' ? 'bus-outline' : 'people-outline'" />
            {{ role === 'DRIVER' ? 'Driver' : 'Operator' }}
          </ion-button>
        }
      </main>
    </ion-content>
  `,
  styles: `
    .role-shell { display: grid; gap: var(--vr-space-3); margin: 0 auto; max-width: 30rem; padding: var(--vr-space-8) var(--vr-space-4); }
    h1 { margin-bottom: 0; }
    p { color: var(--vr-color-text-muted); margin-top: 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleChooserPage {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);

  constructor() {
    addIcons({ busOutline, peopleOutline });
  }

  protected async choose(role: MobileRole): Promise<void> {
    if (!this.session.selectRole(role)) return;
    await this.router.navigate([homeFor(role)], { replaceUrl: true });
  }
}
