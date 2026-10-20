import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { busOutline, navigateOutline, pulseOutline, warningOutline } from 'ionicons/icons';

import { StatePanelComponent } from '../shared/state-panel.component';
import { StatusPillComponent } from '../shared/status-pill.component';

@Component({
  selector: 'app-driver-home-page',
  standalone: true,
  imports: [IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar, StatePanelComponent, StatusPillComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Driver Home</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content">
      @if (foundationPreview()) {
        <div class="foundation-notice"><ion-icon name="warning-outline" /> Foundation preview — no backend data is simulated.</div>
      }
      <main class="page-stack">
        <section class="welcome-block">
          <p class="eyebrow">CURRENT ASSIGNMENT</p>
          <h1>Ready when your assignment is</h1>
          <p>Your operator-assigned jeepney, effective route and tracker status will appear here.</p>
        </section>

        <app-state-panel
          panelId="driver-assignment"
          icon="bus-outline"
          title="No assigned jeepney"
          message="An authorized operator must associate your account and assign an eligible jeepney."
        />

        <section aria-labelledby="driver-status-heading">
          <div class="section-row">
            <h2 id="driver-status-heading" class="section-heading">Operational status</h2>
            <app-status-pill>Unknown</app-status-pill>
          </div>
          <ion-list inset="true">
            <ion-item>
              <ion-icon name="navigate-outline" slot="start" aria-hidden="true" />
              <ion-label><h3>Effective route</h3><p>Not available until a vehicle is assigned</p></ion-label>
            </ion-item>
            <ion-item>
              <ion-icon name="pulse-outline" slot="start" aria-hidden="true" />
              <ion-label><h3>Tracker status</h3><p>No authorized tracking state</p></ion-label>
            </ion-item>
          </ion-list>
        </section>

        <ion-button expand="block" size="large" disabled="true">Open route map</ion-button>
      </main>
    </ion-content>
  `,
  styles: `
    .welcome-block { background: var(--vr-color-primary); border-radius: var(--vr-radius-md); color: white; padding: var(--vr-space-6); }
    .eyebrow { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.1em; margin: 0 0 var(--vr-space-2); opacity: 0.82; }
    h1 { font-size: 1.5rem; margin: 0; }
    .welcome-block p:last-child { line-height: 1.45; margin-bottom: 0; opacity: 0.9; }
    .section-row { align-items: center; display: flex; justify-content: space-between; }
    ion-list { border: 1px solid var(--vr-color-border); margin: var(--vr-space-3) 0 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverHomePage {
  readonly foundationPreview = input(false);

  constructor() {
    addIcons({ busOutline, navigateOutline, pulseOutline, warningOutline });
  }
}
