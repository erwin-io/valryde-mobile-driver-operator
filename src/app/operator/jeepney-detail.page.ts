import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
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
  IonInput,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorCode, apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { EffectiveRouteDirection, GpsSetupRequest, Jeepney, VehicleApplication } from '../core/fleet.models';
import { statusLabel, statusTone } from '../shared/fleet-status';
import { StatePanelComponent } from '../shared/state-panel.component';
import { StatusPillComponent } from '../shared/status-pill.component';

const newest = <T extends { createdAt: string }>(items: T[]): T | null =>
  [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

type RouteState = { kind: 'loading' } | { kind: 'none' } | { kind: 'conflict' } | { kind: 'error'; message: string } | { kind: 'route'; route: EffectiveRouteDirection };

@Component({
  selector: 'app-jeepney-detail-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
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
    IonInput,
    IonTitle,
    IonToolbar,
    StatePanelComponent,
    StatusPillComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/operator/fleet/jeepneys" /></ion-buttons>
        <ion-title>{{ jeepney()?.plateNo ?? 'Jeepney' }}</ion-title>
        @if (jeepney()) {
          <ion-buttons slot="end"><ion-button [routerLink]="['/operator/fleet/jeepneys', jeepneyId, 'edit']">Edit</ion-button></ion-buttons>
        }
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack">
        @if (loading()) {
          <p role="status"><ion-spinner name="crescent" /> Loading jeepney…</p>
        } @else if (loadError()) {
          <app-state-panel panelId="jeepney-error" icon="cloud-offline-outline" title="Jeepney unavailable" [message]="loadError()!" actionLabel="Try again" (action)="load()" />
        } @else if (!jeepney()) {
          <app-state-panel panelId="jeepney-missing" icon="bus-outline" title="Jeepney not available" message="It does not exist or is not part of your fleet." />
        } @else {
          @let j = jeepney()!;
          <ion-list inset="true">
            <ion-item>
              <span slot="start" class="swatch" [style.background]="j.colorHex" aria-hidden="true"></span>
              <ion-label><p>Plate number</p><h2>{{ j.plateNo }}</h2></ion-label>
              <app-status-pill slot="end" [tone]="tone(j.status)">{{ label(j.status) }}</app-status-pill>
            </ion-item>
            <ion-item><ion-label><p>Body color</p><h2>{{ j.colorHex }}</h2></ion-label></ion-item>
            @if (j.description) {
              <ion-item><ion-label class="ion-text-wrap"><p>Description</p><h2>{{ j.description }}</h2></ion-label></ion-item>
            }
            @if (j.approvedAt) {
              <ion-item><ion-label><p>Approved</p><h2>{{ j.approvedAt.slice(0, 10) }}</h2></ion-label></ion-item>
            }
          </ion-list>

          <section aria-labelledby="application-heading">
            <h2 id="application-heading" class="section-heading">Vehicle application</h2>
            @if (application(); as app) {
              <ion-list inset="true">
                <ion-item>
                  <ion-label><p>Submitted {{ app.createdAt.slice(0, 10) }}</p><h2>Application</h2></ion-label>
                  <app-status-pill slot="end" [tone]="tone(app.status)">{{ label(app.status) }}</app-status-pill>
                </ion-item>
                @if (app.reviewNotes) {
                  <ion-item><ion-label class="ion-text-wrap"><p>Admin notes</p><h2>{{ app.reviewNotes }}</h2></ion-label></ion-item>
                }
              </ion-list>
            } @else {
              <p class="supporting-text">No application submitted yet.</p>
            }
            @if (canApply()) {
              <form class="form-card" [formGroup]="applyForm" (ngSubmit)="apply()">
                <ion-input label="Notes for VALRYDE Admin (optional)" labelPlacement="stacked" formControlName="notes" [counter]="true" maxlength="2000" />
                @if (applyError()) {
                  <ion-note color="danger" role="alert">{{ applyError() }}</ion-note>
                }
                <ion-button type="submit" expand="block" [disabled]="applying()">Submit for approval</ion-button>
              </form>
            }
          </section>

          <section aria-labelledby="route-heading">
            <h2 id="route-heading" class="section-heading">Effective route</h2>
            @switch (route().kind) {
              @case ('loading') { <p role="status"><ion-spinner name="crescent" /> Checking route…</p> }
              @case ('none') { <p class="supporting-text">No route assigned.</p> }
              @case ('conflict') {
                <ion-note color="warning" role="status">This jeepney is in more than one group with a route. Set a direct route assignment to resolve it.</ion-note>
              }
              @case ('error') { <p class="supporting-text">{{ $any(route()).message }}</p> }
              @case ('route') {
                @let r = $any(route()).route;
                <ion-list inset="true">
                  <ion-item>
                    <ion-label class="ion-text-wrap">
                      <p>{{ r.source === 'DIRECT' ? 'Assigned directly' : 'Inherited from a group' }}</p>
                      <h2>{{ r.direction.originName }} → {{ r.direction.destinationName }}</h2>
                      <p>{{ r.direction.directionLabel }}</p>
                    </ion-label>
                  </ion-item>
                </ion-list>
              }
            }
          </section>

          <section aria-labelledby="gps-heading">
            <h2 id="gps-heading" class="section-heading">GPS installation</h2>
            @if (gps(); as req) {
              <ion-list inset="true">
                <ion-item>
                  <ion-label><p>Requested {{ req.createdAt.slice(0, 10) }}</p><h2>Installation request</h2></ion-label>
                  <app-status-pill slot="end" [tone]="tone(req.status)">{{ label(req.status) }}</app-status-pill>
                </ion-item>
                @if (req.scheduledAt) {
                  <ion-item><ion-label><p>Scheduled</p><h2>{{ req.scheduledAt.slice(0, 16).replace('T', ' ') }}</h2></ion-label></ion-item>
                }
                @if (req.installedAt) {
                  <ion-item><ion-label><p>Installer reported</p><h2>{{ req.installedAt.slice(0, 10) }}</h2></ion-label></ion-item>
                }
                <ion-item>
                  <ion-label><p>Device verification</p></ion-label>
                  <app-status-pill slot="end" [tone]="tone(req.verificationStatus)">{{ label(req.verificationStatus) }}</app-status-pill>
                </ion-item>
                @if (req.rejectedReason) {
                  <ion-item><ion-label class="ion-text-wrap"><p>Reason</p><h2>{{ req.rejectedReason }}</h2></ion-label></ion-item>
                }
              </ion-list>
              <p class="supporting-text">Tracking starts only after VALRYDE verifies the installed device.</p>
            } @else if (application()?.status === 'APPROVED') {
              <p class="supporting-text">This jeepney is approved. Request a GPS tracker installation from VALRYDE.</p>
              @if (gpsError()) {
                <ion-note color="danger" role="alert">{{ gpsError() }}</ion-note>
              }
              <ion-button expand="block" [disabled]="requestingGps()" (click)="requestGps()">Request GPS installation</ion-button>
            } @else {
              <p class="supporting-text">Available after VALRYDE Admin approves this jeepney's application.</p>
            }
          </section>

          <section aria-labelledby="driver-heading">
            <h2 id="driver-heading" class="section-heading">Driver</h2>
            <ion-list inset="true">
              <ion-item [disabled]="true">
                <ion-label class="ion-text-wrap"><h3>Assign a driver</h3><p>Unavailable until VALRYDE provides a list of your drivers.</p></ion-label>
              </ion-item>
            </ion-list>
          </section>
        }
      </main>
    </ion-content>
  `,
  styles: `.swatch { border: 1px solid var(--vr-color-border); border-radius: 50%; height: 1.5rem; width: 1.5rem; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JeepneyDetailPage {
  private readonly api = inject(FleetApiService);
  private entered = false;
  protected readonly jeepneyId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly jeepney = signal<Jeepney | null>(null);
  protected readonly application = signal<VehicleApplication | null>(null);
  protected readonly route = signal<RouteState>({ kind: 'loading' });
  protected readonly gps = signal<GpsSetupRequest | null>(null);
  protected readonly requestingGps = signal(false);
  protected readonly gpsError = signal<string | null>(null);
  protected readonly applying = signal(false);
  protected readonly applyError = signal<string | null>(null);
  protected readonly applyForm = new FormGroup({
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
  });
  protected readonly notes = this.applyForm.controls.notes;
  protected readonly label = statusLabel;
  protected readonly tone = statusTone;
  // Only offered when the server's own state allows a new application; the server still decides (409 otherwise).
  protected readonly canApply = computed(() => {
    const status = this.jeepney()?.status;
    return (status === 'DRAFT' || status === 'REJECTED') && this.application()?.status !== 'PENDING';
  });

  constructor() {
    void this.load();
  }

  ionViewWillEnter(): void {
    if (this.entered) void this.load();
    this.entered = true;
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      // No detail endpoints: pick this jeepney from Operator-scoped lists, so other fleets' IDs are never shown.
      const [jeepneys, applications, gpsRequests] = await Promise.all([
        firstValueFrom(this.api.listJeepneys()),
        firstValueFrom(this.api.listApplications()),
        firstValueFrom(this.api.listGpsRequests()),
      ]);
      const jeepney = jeepneys.find((j) => j.id === this.jeepneyId) ?? null;
      this.jeepney.set(jeepney);
      this.application.set(newest(applications.filter((a) => a.jeepneyId === this.jeepneyId)));
      this.gps.set(newest(gpsRequests.filter((r) => r.jeepneyId === this.jeepneyId)));
      if (jeepney) void this.loadRoute();
    } catch (error: unknown) {
      this.loadError.set(apiErrorMessage(error, 'This jeepney could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadRoute(): Promise<void> {
    this.route.set({ kind: 'loading' });
    try {
      const route = await firstValueFrom(this.api.effectiveRoute(this.jeepneyId));
      this.route.set(route ? { kind: 'route', route } : { kind: 'none' });
    } catch (error: unknown) {
      this.route.set(
        apiErrorCode(error) === 'ROUTE_ASSIGNMENT_CONFLICT'
          ? { kind: 'conflict' }
          : { kind: 'error', message: apiErrorMessage(error, 'The route could not be checked.') },
      );
    }
  }

  protected async requestGps(): Promise<void> {
    const application = this.application();
    if (!application || application.status !== 'APPROVED' || this.requestingGps()) return;
    this.requestingGps.set(true);
    this.gpsError.set(null);
    try {
      await firstValueFrom(this.api.submitGpsRequest(application.id));
      await this.load();
    } catch (error: unknown) {
      this.gpsError.set(apiErrorMessage(error, 'The GPS installation request could not be submitted.'));
    } finally {
      this.requestingGps.set(false);
    }
  }

  protected async apply(): Promise<void> {
    if (this.notes.invalid || this.applying()) return;
    this.applying.set(true);
    this.applyError.set(null);
    try {
      await firstValueFrom(this.api.submitApplication(this.jeepneyId, this.notes.value.trim() || undefined));
      this.notes.reset();
      // Show the state the server now holds (the jeepney becomes PENDING_APPROVAL server-side).
      await this.load();
    } catch (error: unknown) {
      this.applyError.set(apiErrorMessage(error, 'The application could not be submitted.'));
    } finally {
      this.applying.set(false);
    }
  }
}
