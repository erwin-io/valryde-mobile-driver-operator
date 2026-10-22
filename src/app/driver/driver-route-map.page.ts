import { ChangeDetectionStrategy, Component, inject, signal, type OnDestroy, type OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { busOutline, mapOutline, swapHorizontalOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import { apiErrorCode, apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { EffectiveRouteDirection, Jeepney, TransitRoute } from '../core/fleet.models';
import { statusLabel, statusTone } from '../shared/fleet-status';
import { StatePanelComponent } from '../shared/state-panel.component';
import { StatusPillComponent } from '../shared/status-pill.component';
import { isValidRouteGeometry, type RouteCoordinate } from './route-geometry';
import { StaticRouteMapComponent } from './static-route-map.component';

interface DriverRouteView {
  effective: EffectiveRouteDirection;
  route: TransitRoute;
  coordinates: readonly RouteCoordinate[];
}

type RouteState = 'choose' | 'loading' | 'ready' | 'none' | 'inactive' | 'conflict' | 'invalid' | 'error';

@Component({
  selector: 'app-driver-route-map-page',
  standalone: true,
  imports: [
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSpinner,
    IonTitle,
    IonToolbar,
    StatePanelComponent,
    StaticRouteMapComponent,
    StatusPillComponent,
  ],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Official Route</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content">
      <main class="page-stack">
        <section>
          <p class="eyebrow">DRIVER ROUTE</p>
          <h1>Authorized vehicle route</h1>
          <p class="supporting-text">VALRYDE can show routes for vehicles your account may access. Active Driver assignment confirmation still requires Agent A's G3 contract.</p>
        </section>

        @if (vehiclesLoading()) {
          <p role="status"><ion-spinner name="crescent" /> Loading authorized vehicles…</p>
        } @else if (vehiclesError()) {
          <app-state-panel panelId="driver-route-vehicles-error" icon="bus-outline" title="Vehicles unavailable" [message]="vehiclesError()!" actionLabel="Try again" (action)="loadVehicles()" />
        } @else if (vehicles().length === 0) {
          <app-state-panel panelId="driver-route-no-vehicles" icon="bus-outline" title="No authorized vehicle" message="Your account does not currently have access to a jeepney. Ask your operator to verify your association and assignment." />
        } @else if (state() === 'choose') {
          <section aria-labelledby="vehicle-picker-heading">
            <h2 id="vehicle-picker-heading" class="section-heading">Choose an authorized jeepney</h2>
            <p class="supporting-text">Choosing a vehicle here does not mark it as your active assignment.</p>
            <ion-list inset="true">
              @for (vehicle of vehicles(); track vehicle.id) {
                <ion-item button="true" detail="true" (click)="selectVehicle(vehicle)">
                  <span slot="start" class="swatch" [style.background]="vehicle.colorHex" aria-hidden="true"></span>
                  <ion-label><h2>{{ vehicle.plateNo }}</h2><p>{{ label(vehicle.status) }}</p></ion-label>
                </ion-item>
              }
            </ion-list>
          </section>
        } @else if (selectedVehicle(); as vehicle) {
          <section class="vehicle-summary" aria-labelledby="selected-vehicle-heading">
            <div>
              <p class="eyebrow">AUTHORIZED VEHICLE</p>
              <h2 id="selected-vehicle-heading">{{ vehicle.plateNo }}</h2>
              <p>Active Driver assignment is not confirmed.</p>
            </div>
            <app-status-pill [tone]="tone(vehicle.status)">{{ label(vehicle.status) }}</app-status-pill>
          </section>
          @if (vehicles().length > 1) {
            <ion-button fill="outline" size="small" (click)="chooseVehicle()"><ion-icon name="swap-horizontal-outline" slot="start" />Change vehicle</ion-button>
          }

          @switch (state()) {
            @case ('loading') { <p role="status"><ion-spinner name="crescent" /> Loading official route…</p> }
            @case ('none') { <app-state-panel panelId="driver-route-none" icon="map-outline" title="No route assigned" message="This authorized vehicle has no effective route. Ask your operator to assign an approved direction." /> }
            @case ('inactive') { <app-state-panel panelId="driver-route-inactive" icon="bus-outline" title="Vehicle is not active" message="Route guidance is unavailable until the vehicle has an ACTIVE server status." /> }
            @case ('conflict') { <app-state-panel panelId="driver-route-conflict" icon="map-outline" title="Route needs operator attention" message="This vehicle belongs to more than one group with different routes. Your operator must resolve the route conflict." /> }
            @case ('invalid') { <app-state-panel panelId="driver-route-invalid" icon="map-outline" title="Official route unavailable" message="The route or its published geometry is inactive or invalid. No map has been drawn." /> }
            @case ('error') { <app-state-panel panelId="driver-route-error" icon="map-outline" title="Route unavailable" [message]="routeError()!" actionLabel="Try again" (action)="reloadRoute()" /> }
            @case ('ready') {
              @if (routeView(); as view) {
                <section class="route-card" aria-labelledby="route-heading">
                  <div class="route-title">
                    <span class="route-line" [style.background]="view.route.routeColorHex" aria-hidden="true"></span>
                    <div><p>{{ view.route.routeCode }}</p><h2 id="route-heading">{{ view.route.publicName }}</h2></div>
                  </div>
                  <dl>
                    <div><dt>Direction</dt><dd>{{ view.effective.direction.directionLabel }}</dd></div>
                    <div><dt>Origin</dt><dd>{{ view.effective.direction.originName }}</dd></div>
                    <div><dt>Destination</dt><dd>{{ view.effective.direction.destinationName }}</dd></div>
                    <div><dt>Assignment source</dt><dd>{{ view.effective.source === 'DIRECT' ? 'Direct vehicle route' : 'Fleet group route' }}</dd></div>
                  </dl>
                  @if (view.effective.source === 'GROUP') { <ion-note>Inherited from an authorized fleet group.</ion-note> }
                </section>
                <section aria-labelledby="map-heading">
                  <h2 id="map-heading" class="section-heading">Route geometry</h2>
                  <p class="supporting-text">Static official geometry only. This map does not use phone GPS or show live vehicle location.</p>
                  <app-static-route-map
                    [coordinates]="view.coordinates"
                    [routeColor]="view.route.routeColorHex"
                    [originName]="view.effective.direction.originName"
                    [destinationName]="view.effective.direction.destinationName"
                  />
                </section>
              }
            }
          }
        }
      </main>
    </ion-content>
  `,
  styles: `
    h1 { font-size: 1.5rem; margin: 0; }
    .eyebrow { color: var(--vr-color-text-muted); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.1em; margin: 0 0 var(--vr-space-1); }
    ion-list { border: 1px solid var(--vr-color-border); margin: var(--vr-space-3) 0 0; }
    .swatch { border: 1px solid var(--vr-color-border); border-radius: 50%; height: 1.5rem; width: 1.5rem; }
    .vehicle-summary, .route-card { background: var(--vr-color-surface); border: 1px solid var(--vr-color-border); border-radius: var(--vr-radius-md); padding: var(--vr-space-4); }
    .vehicle-summary { align-items: flex-start; display: flex; justify-content: space-between; }
    .vehicle-summary h2, .vehicle-summary p:last-child { margin: 0; }
    .vehicle-summary p:last-child { color: var(--vr-color-text-muted); font-size: 0.8125rem; }
    .route-title { align-items: center; display: flex; gap: var(--vr-space-3); }
    .route-title p, .route-title h2 { margin: 0; }
    .route-line { border-radius: 999px; height: 3rem; width: 0.5rem; }
    dl { display: grid; gap: var(--vr-space-3); margin: var(--vr-space-4) 0; }
    dl div { border-top: 1px solid var(--vr-color-border); padding-top: var(--vr-space-2); }
    dt { color: var(--vr-color-text-muted); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    dd { margin: var(--vr-space-1) 0 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverRouteMapPage implements OnInit, OnDestroy {
  private readonly api = inject(FleetApiService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private loadEpoch = 0;
  private hasLoadedOnce = false;

  protected readonly vehicles = signal<Jeepney[]>([]);
  protected readonly vehiclesLoading = signal(true);
  protected readonly vehiclesError = signal<string | null>(null);
  protected readonly selectedVehicle = signal<Jeepney | null>(null);
  protected readonly state = signal<RouteState>('choose');
  protected readonly routeView = signal<DriverRouteView | null>(null);
  protected readonly routeError = signal<string | null>(null);
  protected readonly label = statusLabel;
  protected readonly tone = statusTone;

  constructor() {
    addIcons({ busOutline, mapOutline, swapHorizontalOutline });
  }

  ngOnInit(): void {
    void this.loadVehicles();
  }

  ngOnDestroy(): void {
    ++this.loadEpoch;
  }

  ionViewWillEnter(): void {
    if (this.hasLoadedOnce) void this.loadVehicles();
  }

  protected async loadVehicles(): Promise<void> {
    const epoch = ++this.loadEpoch;
    this.vehiclesLoading.set(true);
    this.vehiclesError.set(null);
    try {
      const vehicles = await firstValueFrom(this.api.listJeepneys());
      if (epoch !== this.loadEpoch) return;
      this.vehicles.set(vehicles);
      const requestedVehicleId = this.activatedRoute.snapshot.queryParamMap.get('jeepneyId');
      const requested = vehicles.find(({ id }) => id === requestedVehicleId);
      const automatic = requested ?? (vehicles.length === 1 ? vehicles[0] : undefined);
      this.vehiclesLoading.set(false);
      if (automatic) await this.selectVehicle(automatic);
      else this.state.set('choose');
    } catch (error: unknown) {
      if (epoch === this.loadEpoch) this.vehiclesError.set(apiErrorMessage(error, 'Your authorized vehicles could not be loaded.'));
    } finally {
      this.hasLoadedOnce = true;
      if (epoch === this.loadEpoch) this.vehiclesLoading.set(false);
    }
  }

  protected chooseVehicle(): void {
    ++this.loadEpoch;
    this.selectedVehicle.set(null);
    this.routeView.set(null);
    this.state.set('choose');
  }

  protected async selectVehicle(vehicle: Jeepney): Promise<void> {
    const epoch = ++this.loadEpoch;
    this.selectedVehicle.set(vehicle);
    this.routeView.set(null);
    this.routeError.set(null);
    if (vehicle.status !== 'ACTIVE') {
      this.state.set('inactive');
      return;
    }
    this.state.set('loading');
    try {
      const effective = await firstValueFrom(this.api.effectiveRoute(vehicle.id));
      if (epoch !== this.loadEpoch) return;
      if (!effective) {
        this.state.set('none');
        return;
      }
      if (effective.direction.status !== 'ACTIVE' || !isValidRouteGeometry(effective.direction.geometry.coordinates)) {
        this.state.set('invalid');
        return;
      }
      const route = await firstValueFrom(this.api.getRoute(effective.direction.routeId));
      if (epoch !== this.loadEpoch) return;
      const publishedDirection = route.directions.find(({ id }) => id === effective.direction.id);
      if (
        route.status !== 'ACTIVE' ||
        publishedDirection?.status !== 'ACTIVE' ||
        !/^#[0-9A-Fa-f]{6}$/.test(route.routeColorHex) ||
        !isValidRouteGeometry(publishedDirection.geometry.coordinates)
      ) {
        this.state.set('invalid');
        return;
      }
      this.routeView.set({ effective: { ...effective, direction: publishedDirection }, route, coordinates: publishedDirection.geometry.coordinates });
      this.state.set('ready');
    } catch (error: unknown) {
      if (epoch !== this.loadEpoch) return;
      if (apiErrorCode(error) === 'ROUTE_ASSIGNMENT_CONFLICT') this.state.set('conflict');
      else {
        this.routeError.set(apiErrorMessage(error, 'The official route could not be loaded.'));
        this.state.set('error');
      }
    }
  }

  protected reloadRoute(): void {
    const vehicle = this.selectedVehicle();
    if (vehicle) void this.selectVehicle(vehicle);
  }
}
