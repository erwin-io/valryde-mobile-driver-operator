import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { busOutline, documentTextOutline, gridOutline, mapOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-operator-shell',
  standalone: true,
  imports: [IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs],
  template: `
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="dashboard" href="/operator/dashboard"><ion-icon name="grid-outline" /><ion-label>Dashboard</ion-label></ion-tab-button>
        <ion-tab-button tab="fleet" href="/operator/fleet"><ion-icon name="bus-outline" /><ion-label>Fleet</ion-label></ion-tab-button>
        <ion-tab-button tab="transits" href="/operator/transits"><ion-icon name="map-outline" /><ion-label>Transits</ion-label></ion-tab-button>
        <ion-tab-button tab="requests" href="/operator/requests"><ion-icon name="document-text-outline" /><ion-label>Requests</ion-label></ion-tab-button>
        <ion-tab-button tab="account" href="/operator/account"><ion-icon name="person-circle-outline" /><ion-label>Account</ion-label></ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorShellComponent {
  constructor() {
    addIcons({ busOutline, documentTextOutline, gridOutline, mapOutline, personCircleOutline });
  }
}
