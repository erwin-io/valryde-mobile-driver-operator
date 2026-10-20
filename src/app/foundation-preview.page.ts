import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonSegment, IonSegmentButton, IonTitle, IonToolbar } from '@ionic/angular';

import { DriverHomePage } from './driver/driver-home.page';
import { OperatorDashboardPage } from './operator/operator-dashboard.page';

@Component({
  selector: 'app-foundation-preview-page',
  standalone: true,
  imports: [RouterLink, IonButton, IonContent, IonHeader, IonSegment, IonSegmentButton, IonTitle, IonToolbar, DriverHomePage, OperatorDashboardPage],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Foundation Preview</ion-title>
        <ion-button slot="end" fill="clear" routerLink="/auth/sign-in">Exit</ion-button>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="view()" (ionChange)="setView($event.detail.value)">
          <ion-segment-button value="driver">Driver</ion-segment-button>
          <ion-segment-button value="operator">Operator</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (view() === 'driver') {
        <app-driver-home-page [foundationPreview]="true" />
      } @else {
        <app-operator-dashboard-page [foundationPreview]="true" />
      }
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoundationPreviewPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly view = signal<'driver' | 'operator'>('driver');

  constructor() {
    if (this.route.snapshot.paramMap.get('view') === 'operator') this.view.set('operator');
  }

  protected setView(value: string | number | null | undefined): void {
    if (value === 'driver' || value === 'operator') this.view.set(value);
  }
}
