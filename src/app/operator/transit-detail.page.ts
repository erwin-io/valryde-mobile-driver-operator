import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorCode, apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { RouteAssignmentTarget, RouteDirection, TransitRoute } from '../core/fleet.models';
import { StatePanelComponent } from '../shared/state-panel.component';

interface TargetOption {
  label: string;
  value: string;
  target: RouteAssignmentTarget;
}

@Component({
  selector: 'app-transit-detail-page',
  standalone: true,
  imports: [
    IonAlert,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSpinner,
    IonTitle,
    IonToolbar,
    StatePanelComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/operator/transits" /></ion-buttons>
        <ion-title>{{ route()?.routeCode ?? 'Route' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack">
        @if (loading()) {
          <p role="status"><ion-spinner name="crescent" /> Loading route…</p>
        } @else if (error()) {
          <app-state-panel panelId="transit-error" icon="map-outline" title="Route unavailable" [message]="error()!" />
        } @else if (route(); as r) {
          <h1>{{ r.publicName }}</h1>
          @if (r.description) { <p class="supporting-text">{{ r.description }}</p> }
          @if (notice()) {
            <ion-note [color]="noticeIsError() ? 'danger' : 'success'" role="status">{{ notice() }}</ion-note>
          }
          <h2 class="section-heading">Directions</h2>
          <ion-list inset="true">
            @for (d of r.directions; track d.id) {
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <h2>{{ d.originName }} → {{ d.destinationName }}</h2>
                  <p>{{ d.directionLabel }} · corridor {{ d.corridorM }} m</p>
                </ion-label>
                <ion-button slot="end" fill="outline" size="small" [disabled]="assigning() || options().length === 0" (click)="choose(d)">Assign</ion-button>
              </ion-item>
            }
          </ion-list>
          @if (options().length === 0) {
            <p class="supporting-text">Add a jeepney or group to your fleet to assign this route.</p>
          }
          <p class="supporting-text">The map view of this route arrives with the map release.</p>
        }
        <ion-alert
          [isOpen]="picking() !== null"
          header="Assign to"
          [subHeader]="picking() ? picking()!.originName + ' → ' + picking()!.destinationName : ''"
          message="This replaces the target's current route assignment."
          [inputs]="alertInputs()"
          [buttons]="alertButtons"
          (didDismiss)="picking.set(null)"
        />
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitDetailPage {
  private readonly api = inject(FleetApiService);
  private readonly routeId = inject(ActivatedRoute).snapshot.paramMap.get('routeId') ?? '';
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly route = signal<TransitRoute | null>(null);
  protected readonly options = signal<TargetOption[]>([]);
  protected readonly picking = signal<RouteDirection | null>(null);
  protected readonly alertInputs = signal<{ type: 'radio'; label: string; value: string; checked: boolean }[]>([]);
  protected readonly assigning = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly noticeIsError = signal(false);
  protected readonly alertButtons = [
    { text: 'Cancel', role: 'cancel' },
    { text: 'Assign', handler: (value: string | undefined) => void this.assign(value) },
  ];

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const [route, jeepneys, groups] = await Promise.all([
        firstValueFrom(this.api.getRoute(this.routeId)),
        firstValueFrom(this.api.listJeepneys()),
        firstValueFrom(this.api.listGroups()),
      ]);
      this.route.set(route);
      // Targets come only from the Operator-scoped lists; the server re-checks ownership (403 otherwise).
      this.options.set([
        ...jeepneys.map((j) => ({ label: `Jeepney ${j.plateNo}`, value: `j:${j.id}`, target: { jeepneyId: j.id } })),
        ...groups.map((g) => ({ label: `Group ${g.name}`, value: `g:${g.id}`, target: { groupId: g.id } })),
      ]);
    } catch (error: unknown) {
      this.error.set(apiErrorMessage(error, 'This route could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected choose(direction: RouteDirection): void {
    this.notice.set(null);
    this.alertInputs.set(this.options().map((o, i) => ({ type: 'radio', label: o.label, value: o.value, checked: i === 0 })));
    this.picking.set(direction);
  }

  protected async assign(value: string | undefined): Promise<void> {
    const direction = this.picking();
    const option = this.options().find((o) => o.value === value);
    if (!direction || !option || this.assigning()) return;
    this.assigning.set(true);
    let submitted = false;
    try {
      const assignment = await firstValueFrom(this.api.assignRoute(direction.id, option.target));
      submitted = true;
      // Re-read instead of treating a command response as durable current state.
      const current = await firstValueFrom(this.api.listRouteAssignments(option.target));
      const confirmed = assignment && current.assignments.some(row =>
        row.id === assignment.id && row.routeDirectionId === direction.id && row.activeTo === null &&
        row.jeepneyId === (option.target.jeepneyId ?? null) && row.groupId === (option.target.groupId ?? null),
      );
      this.noticeIsError.set(!confirmed);
      this.notice.set(confirmed
        ? `${option.label} now uses ${direction.originName} → ${direction.destinationName}.`
        : 'The assignment could not be confirmed as current. Refresh before trying again.');
    } catch (error: unknown) {
      this.noticeIsError.set(true);
      this.notice.set(
        submitted ? 'Assignment accepted, but its current state could not be checked. Refresh before trying again.' :
        apiErrorCode(error) === 'ROUTE_ASSIGNMENT_CONFLICT'
          ? 'This would give a jeepney more than one group route. Assign a route to the jeepney directly instead.'
          : apiErrorMessage(error, 'The route could not be assigned.'),
      );
    } finally {
      this.assigning.set(false);
    }
  }
}
