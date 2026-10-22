import { ChangeDetectionStrategy, Component, computed, inject, signal, type OnDestroy } from '@angular/core';
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
import type { DriverDirectoryEntry, EffectiveRouteDirection, GpsSetupRequest, Jeepney, VehicleApplication } from '../core/fleet.models';
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
            @if (driversLoading()) {
              <p role="status"><ion-spinner name="crescent" /> Loading Driver directory…</p>
            } @else if (driversError()) {
              <app-state-panel panelId="jeepney-drivers-error" icon="people-outline" title="Driver assignment unavailable" [message]="driversError()!" actionLabel="Try again" (action)="loadDrivers()" />
            } @else {
              @if (currentDriver(); as assigned) {
                <ion-list inset="true"><ion-item><ion-label><p>Currently assigned</p><h3>{{ assigned.displayName }}</h3><p>{{ assigned.email }}</p></ion-label>
                  <ion-button slot="end" color="danger" fill="outline" [disabled]="assigning()" (click)="confirmUnassign.set(true); pendingDriver.set(null)">Unassign</ion-button>
                </ion-item></ion-list>
                @if (confirmUnassign()) {
                  <div class="confirm-panel" role="group" aria-label="Confirm Driver unassignment">
                    <h3>Unassign the current Driver from {{ j.plateNo }}?</h3>
                    <p>This ends the current vehicle assignment. Group memberships remain. If another operator action changed the Driver, the server ends the assignment current at confirmation.</p>
                    <ion-button fill="clear" [disabled]="assigning()" (click)="confirmUnassign.set(false)">Cancel</ion-button>
                    <ion-button color="danger" [disabled]="assigning()" (click)="unassignDriver()">Confirm unassignment</ion-button>
                  </div>
                }
              } @else {
                <p class="supporting-text">No active Driver assignment is reported for this jeepney.</p>
              }
              @if (assignmentMessage()) { <ion-note color="success" role="status">{{ assignmentMessage() }}</ion-note> }
              @if (assignmentError()) { <ion-note color="danger" role="alert">{{ assignmentError() }}</ion-note> }
              @if (pendingDriver(); as driver) {
                <div class="confirm-panel" role="group" aria-labelledby="assignment-confirm-heading">
                  <h3 id="assignment-confirm-heading">Assign {{ driver.displayName }}?</h3>
                  <p>This assigns {{ driver.displayName }} to {{ j.plateNo }} and replaces any active assignment held by this Driver or jeepney.</p>
                  <div class="confirm-actions">
                    <ion-button fill="clear" [disabled]="assigning()" (click)="pendingDriver.set(null)">Cancel</ion-button>
                    <ion-button [disabled]="assigning()" (click)="assignDriver()">{{ assigning() ? 'Assigning…' : 'Confirm assignment' }}</ion-button>
                  </div>
                </div>
              } @else if (eligibleDrivers().length === 0) {
                <p class="supporting-text">No active, verified Driver is available to assign.</p>
              } @else {
                <ion-list inset="true">
                  @for (driver of eligibleDrivers(); track driver.driverId) {
                    <ion-item>
                      <ion-label class="ion-text-wrap"><h3>{{ driver.displayName }}</h3><p>{{ driverAssignmentLabel(driver) }}</p></ion-label>
                      <ion-button slot="end" fill="outline" [disabled]="assigning() || driver.activeJeepneyId === jeepneyId" (click)="pendingDriver.set(driver); confirmUnassign.set(false)">{{ driver.activeJeepneyId === jeepneyId ? 'Assigned' : 'Assign' }}</ion-button>
                    </ion-item>
                  }
                </ion-list>
              }
            }
          </section>
        }
      </main>
    </ion-content>
  `,
  styles: `
    .swatch { border: 1px solid var(--vr-color-border); border-radius: 50%; height: 1.5rem; width: 1.5rem; }
    .confirm-panel { background: var(--vr-color-surface); border: 1px solid var(--vr-color-border); border-radius: var(--vr-radius-md); margin-top: var(--vr-space-3); padding: var(--vr-space-4); }
    .confirm-panel h3, .confirm-panel p { margin-top: 0; }
    .confirm-actions { display: flex; justify-content: flex-end; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JeepneyDetailPage implements OnDestroy {
  private readonly api = inject(FleetApiService);
  private entered = false;
  private destroyed = false;
  private loadEpoch = 0;
  private driversEpoch = 0;
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
  protected readonly drivers = signal<DriverDirectoryEntry[]>([]);
  protected readonly driversLoading = signal(true);
  protected readonly driversError = signal<string | null>(null);
  protected readonly pendingDriver = signal<DriverDirectoryEntry | null>(null);
  protected readonly assigning = signal(false);
  protected readonly confirmUnassign = signal(false);
  protected readonly assignmentError = signal<string | null>(null);
  protected readonly assignmentMessage = signal<string | null>(null);
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
  protected readonly eligibleDrivers = computed(() =>
    this.drivers().filter((driver) => driver.status === 'ACTIVE' && driver.userStatus === 'ACTIVE' && driver.emailVerified),
  );
  protected readonly currentDriver = computed(() => this.drivers().find(({ activeJeepneyId }) => activeJeepneyId === this.jeepneyId) ?? null);

  constructor() {
    void this.load();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    ++this.loadEpoch; ++this.driversEpoch;
    this.drivers.set([]); this.jeepney.set(null);
    this.pendingDriver.set(null); this.confirmUnassign.set(false);
  }

  ionViewWillEnter(): void {
    if (this.entered) void this.load();
    this.entered = true;
  }

  protected async load(): Promise<void> {
    const epoch = ++this.loadEpoch;
    this.loading.set(true);
    this.loadError.set(null);
    try {
      // No detail endpoints: pick this jeepney from Operator-scoped lists, so other fleets' IDs are never shown.
      const [jeepneys, applications, gpsRequests] = await Promise.all([
        firstValueFrom(this.api.listJeepneys()),
        firstValueFrom(this.api.listApplications()),
        firstValueFrom(this.api.listGpsRequests()),
      ]);
      if (epoch !== this.loadEpoch) return;
      const jeepney = jeepneys.find((j) => j.id === this.jeepneyId) ?? null;
      this.jeepney.set(jeepney);
      this.application.set(newest(applications.filter((a) => a.jeepneyId === this.jeepneyId)));
      this.gps.set(newest(gpsRequests.filter((r) => r.jeepneyId === this.jeepneyId)));
      if (jeepney) {
        void this.loadRoute();
        void this.loadDrivers();
      }
    } catch (error: unknown) {
      if (epoch !== this.loadEpoch) return;
      this.loadError.set(apiErrorMessage(error, 'This jeepney could not be loaded.'));
    } finally {
      if (epoch === this.loadEpoch) this.loading.set(false);
    }
  }

  protected async loadDrivers(): Promise<void> {
    if (this.destroyed) return;
    const epoch = ++this.driversEpoch;
    this.driversLoading.set(true);
    this.driversError.set(null);
    try {
      const drivers: DriverDirectoryEntry[] = [];
      for (let page = 1; ; page += 1) {
        const result = await firstValueFrom(this.api.listDrivers({ page, pageSize: 100 }));
        if (epoch !== this.driversEpoch) return;
        drivers.push(...result.drivers);
        if (page >= result.pagination.totalPages) break;
      }
      if (epoch !== this.driversEpoch) return;
      this.drivers.set(drivers);
    } catch (error: unknown) {
      if (epoch !== this.driversEpoch) return;
      this.drivers.set([]);
      this.driversError.set(apiErrorMessage(error, 'The Driver directory could not be loaded.'));
    } finally {
      if (epoch === this.driversEpoch) this.driversLoading.set(false);
    }
  }

  protected driverAssignmentLabel(driver: DriverDirectoryEntry): string {
    if (driver.activeJeepneyId === this.jeepneyId) return 'Assigned to this jeepney';
    return driver.activeJeepneyId ? 'Currently assigned to another jeepney' : 'No active jeepney assignment';
  }

  protected async unassignDriver(): Promise<void> {
    if (this.destroyed || !this.confirmUnassign() || !this.currentDriver() || this.assigning()) return;
    this.assigning.set(true);
    this.assignmentMessage.set(null); this.assignmentError.set(null);
    this.confirmUnassign.set(false);
    this.pendingDriver.set(null);
    ++this.driversEpoch;
    try {
      await firstValueFrom(this.api.unassignDriver(this.jeepneyId));
      if (this.destroyed) return;
      this.drivers.set([]);
      await this.loadDrivers();
      this.assignmentMessage.set(this.driversError() ? 'Unassignment accepted. Refresh the directory to confirm the current state.' : 'Driver unassigned. Assignment state refreshed.');
    } catch (error: unknown) {
      if (this.destroyed) return;
      this.assignmentError.set(apiErrorMessage(error, 'The Driver could not be unassigned.'));
      await this.loadDrivers();
    } finally { this.assigning.set(false); }
  }

  protected async assignDriver(): Promise<void> {
    const driver = this.pendingDriver();
    if (!driver || this.assigning()) return;
    this.assigning.set(true);
    this.assignmentError.set(null);
    this.assignmentMessage.set(null);
    try {
      await firstValueFrom(this.api.assignDriver(this.jeepneyId, driver.driverId));
      this.pendingDriver.set(null);
      await this.loadDrivers();
      this.assignmentMessage.set(this.driversError() ? 'Assignment accepted. Refresh the directory to confirm the current state.' : 'Assignment accepted. Driver directory refreshed.');
    } catch (error: unknown) {
      this.assignmentError.set(apiErrorMessage(error, 'The Driver could not be assigned.'));
    } finally {
      this.assigning.set(false);
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
