import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { TrackingPanelComponent } from './tracking-panel.component';
import { trackingFixture } from './tracking-fixtures';
import type { TrackingAvailability } from './tracking-view';

@Component({
  selector: 'app-tracking-preview-page',
  standalone: true,
  imports: [RouterLink, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, TrackingPanelComponent],
  template: `
    <ion-header><ion-toolbar><ion-title>Tracking fixture preview</ion-title><ion-button slot="end" fill="clear" routerLink="/auth/sign-in">Exit</ion-button></ion-toolbar></ion-header>
    <ion-content class="page-content"><main class="page-stack">
      <p>This development-only page makes no API or telemetry requests. It cannot verify a real tracker, group scope or compliance.</p>
      <div aria-label="Fixture scenarios">
        @for (state of states; track state) { <ion-button fill="outline" (click)="select(state)">{{ state }}</ion-button> }
        <ion-button fill="outline" (click)="snapshot.set(empty())">Empty scope</ion-button>
      </div>
      <app-tracking-panel [snapshot]="snapshot()" />
    </main></ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackingPreviewPage {
  protected readonly states: TrackingAvailability[] = ['ready', 'stale', 'offline', 'denied', 'unavailable'];
  protected readonly snapshot = signal(trackingFixture('ready'));
  protected select(state: TrackingAvailability): void { this.snapshot.set(trackingFixture(state)); }
  protected empty() { return trackingFixture('ready', true); }
}
