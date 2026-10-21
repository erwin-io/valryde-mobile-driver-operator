import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, mapOutline, peopleOutline, personCircleOutline, pulseOutline } from 'ionicons/icons';

@Component({
  selector: 'app-driver-shell',
  standalone: true,
  imports: [IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs],
  template: `
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/driver/home"><ion-icon name="home-outline" /><ion-label>Home</ion-label></ion-tab-button>
        <ion-tab-button tab="map" href="/driver/map"><ion-icon name="map-outline" /><ion-label>Route Map</ion-label></ion-tab-button>
        <ion-tab-button tab="group" href="/driver/group"><ion-icon name="people-outline" /><ion-label>Group</ion-label></ion-tab-button>
        <ion-tab-button tab="events" href="/driver/events"><ion-icon name="pulse-outline" /><ion-label>Events</ion-label></ion-tab-button>
        <ion-tab-button tab="account" href="/driver/account"><ion-icon name="person-circle-outline" /><ion-label>Account</ion-label></ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverShellComponent {
  constructor() {
    addIcons({ homeOutline, mapOutline, peopleOutline, personCircleOutline, pulseOutline });
  }
}
