import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { TrackingPanelComponent } from './tracking-panel.component';

@Component({
  selector: 'app-tracking-page',
  standalone: true,
  imports: [IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, TrackingPanelComponent],
  template: `
    <ion-header><ion-toolbar>
      <ion-buttons slot="start"><ion-back-button [defaultHref]="backHref()" /></ion-buttons>
      <ion-title>{{ title() }}</ion-title>
    </ion-toolbar></ion-header>
    <ion-content class="page-content"><main class="page-stack">
      <h1>{{ title() }}</h1>
      <app-tracking-panel />
      <p>Live updates will appear after tracking is connected. Unknown values are not counted as online or on route.</p>
    </main></ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackingPage { readonly title = input('Fleet tracking'); readonly backHref = input('/operator/fleet'); }
