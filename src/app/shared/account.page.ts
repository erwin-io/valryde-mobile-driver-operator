import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonAlert, IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular';

import type { MobileRole } from '../core/auth.models';
import { homeFor } from '../core/role.guard';
import { SessionService } from '../core/session.service';
import { TokenVaultService } from '../core/token-vault.service';

const roleLabel = (role: MobileRole | null) => (role === 'OPERATOR' ? 'Operator' : role === 'DRIVER' ? 'Driver' : '—');

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [RouterLink, IonAlert, IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Account</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack">
        <ion-list inset="true">
          <ion-item>
            <ion-label><p>Name</p><h2>{{ session.user()?.displayName }}</h2></ion-label>
          </ion-item>
          <ion-item>
            <ion-label><p>Email</p><h2>{{ session.user()?.email }}</h2></ion-label>
          </ion-item>
          <ion-item>
            <ion-label><p>Workspace</p><h2>{{ activeLabel() }}</h2></ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <p>This device</p>
              <h2>{{ persistent ? 'Signed in securely on this device' : 'Signed in for this browser tab only' }}</h2>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-list inset="true">
          <ion-item [routerLink]="'profile'" detail="true"><ion-label>Edit profile</ion-label></ion-item>
          <ion-item [routerLink]="'password'" detail="true"><ion-label>Change password</ion-label></ion-item>
          <ion-item [routerLink]="'email'" detail="true"><ion-label>Change email</ion-label></ion-item>
        </ion-list>

        @if (otherRole(); as role) {
          <ion-button id="switch-workspace" expand="block" fill="outline">Switch to {{ label(role) }} workspace</ion-button>
          <ion-alert
            trigger="switch-workspace"
            [header]="'Switch to ' + label(role) + '?'"
            message="You'll see only what your account is authorized to manage as {{ label(role) }}."
            [buttons]="[{ text: 'Cancel', role: 'cancel' }, { text: 'Switch', handler: switchTo(role) }]"
          />
        }

        <ion-button id="sign-out" expand="block" color="danger" fill="outline">Sign out</ion-button>
        <ion-alert
          trigger="sign-out"
          header="Sign out?"
          message="You'll need your email and password to sign in again on this device."
          [buttons]="signOutButtons"
        />
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);
  protected readonly persistent = inject(TokenVaultService).persistent;
  protected readonly label = roleLabel;
  protected readonly activeLabel = computed(() => roleLabel(this.session.activeRole()));
  protected readonly otherRole = computed(
    () => this.session.availableRoles().find((role) => role !== this.session.activeRole()) ?? null,
  );
  protected readonly signOutButtons = [
    { text: 'Cancel', role: 'cancel' },
    { text: 'Sign out', role: 'destructive', handler: () => void this.signOut() },
  ];

  /** Ionic keeps tab pages alive, so refresh the server profile on every visit; on failure the snapshot stays. */
  ionViewWillEnter(): void {
    this.session.reloadUser().catch(() => undefined);
  }

  protected switchTo(role: MobileRole) {
    return () => {
      if (this.session.selectRole(role)) void this.router.navigate([homeFor(role)], { replaceUrl: true });
    };
  }

  protected async signOut(): Promise<void> {
    await this.session.logout();
    await this.router.navigate(['/auth/sign-in'], { replaceUrl: true });
  }
}
