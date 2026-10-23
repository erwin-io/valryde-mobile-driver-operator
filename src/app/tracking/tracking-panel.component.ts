import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonItem, IonLabel, IonList } from '@ionic/angular';

import { presentTracking, unavailableTracking, type TrackingView } from './tracking-view';
import { StatusPillComponent } from '../shared/status-pill.component';

@Component({
  selector: 'app-tracking-panel',
  standalone: true,
  imports: [DatePipe, IonItem, IonLabel, IonList, StatusPillComponent],
  template: `
    @if (state().source === 'development-fixture') {
      <p class="foundation-notice" role="status">DEVELOPMENT FIXTURE — synthetic data, no real GPS or compliance evidence.</p>
    }
    @if (state().availability === 'unavailable') {
      <p role="status">Tracking unavailable. Vehicle location, compliance and transit totals have not been received.</p>
    } @else if (state().availability === 'denied') {
      <p role="alert">Tracking access denied. Protected vehicle details have been cleared.</p>
    } @else if (state().vehicles.length === 0) {
      <p>No vehicles in the current tracking scope.</p>
    }
    @if (state().vehicles.length) {
    <ion-list inset="true">
      @for (vehicle of state().vehicles; track vehicle.id) {
        <ion-item>
          <ion-label class="ion-text-wrap">
            <h3>{{ vehicle.plate }}</h3>
            <p>{{ vehicle.availability === 'ready' ? 'Fixture observation' : vehicle.availability }}</p>
            <p>Compliance: {{ vehicle.compliance }}</p>
            @if (vehicle.observedAt) { <p>Observed {{ vehicle.observedAt | date:'medium':'UTC' }} UTC</p> }
            @if (vehicle.coordinate) { <p>Fixture coordinates: {{ vehicle.coordinate[1] }}, {{ vehicle.coordinate[0] }}</p> }
            @if (vehicle.compliance === 'OFF_ROUTE') { <p role="alert">Off-route warning — fixture state</p> }
          </ion-label>
          <app-status-pill slot="end" [tone]="vehicle.compliance === 'OFF_ROUTE' ? 'danger' : vehicle.compliance === 'ON_ROUTE' ? 'success' : 'unknown'">{{ vehicle.compliance }}</app-status-pill>
        </ion-item>
      }
    </ion-list>
    }
    <p class="supporting-text">Installed GPS hardware is the vehicle location source. Phone GPS is not used.</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackingPanelComponent {
  readonly snapshot = input<TrackingView>(unavailableTracking);
  protected readonly state = computed(() => presentTracking(this.snapshot()));
}
