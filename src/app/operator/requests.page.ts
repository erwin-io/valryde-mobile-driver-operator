import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { GpsSetupRequest, Jeepney, VehicleApplication } from '../core/fleet.models';
import { statusLabel, statusTone } from '../shared/fleet-status';
import { StatePanelComponent } from '../shared/state-panel.component';
import { StatusPillComponent } from '../shared/status-pill.component';

@Component({
  selector: 'app-requests-page',
  standalone: true,
  imports: [RouterLink, IonContent, IonHeader, IonItem, IonLabel, IonList, IonSpinner, IonTitle, IonToolbar, StatePanelComponent, StatusPillComponent],
  template: `
    <ion-header><ion-toolbar><ion-title>Requests</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content">
      <main class="page-stack">
        @if (loading()) {
          <p role="status"><ion-spinner name="crescent" /> Loading requests…</p>
        } @else if (error()) {
          <app-state-panel panelId="requests-error" icon="cloud-offline-outline" title="Requests unavailable" [message]="error()!" actionLabel="Try again" (action)="load()" />
        } @else {
          <section aria-labelledby="applications-heading">
            <h2 id="applications-heading" class="section-heading">Vehicle applications</h2>
            @if (applications().length === 0) {
              <p class="supporting-text">No applications yet. Submit one from a jeepney's page.</p>
            } @else {
              <ion-list inset="true">
                @for (a of applications(); track a.id) {
                  <ion-item [routerLink]="['/operator/fleet/jeepneys', a.jeepneyId]" detail="true">
                    <ion-label><h2>{{ plate(a.jeepneyId) }}</h2><p>Submitted {{ a.createdAt.slice(0, 10) }}</p></ion-label>
                    <app-status-pill slot="end" [tone]="tone(a.status)">{{ label(a.status) }}</app-status-pill>
                  </ion-item>
                }
              </ion-list>
            }
          </section>

          <section aria-labelledby="gps-requests-heading">
            <h2 id="gps-requests-heading" class="section-heading">GPS installation requests</h2>
            @if (gpsRequests().length === 0) {
              <p class="supporting-text">No GPS installation requests. They can be made once a jeepney is approved.</p>
            } @else {
              <ion-list inset="true">
                @for (r of gpsRequests(); track r.id) {
                  <ion-item [routerLink]="['/operator/fleet/jeepneys', r.jeepneyId]" detail="true">
                    <ion-label><h2>{{ plate(r.jeepneyId) }}</h2><p>Verification: {{ label(r.verificationStatus) }}</p></ion-label>
                    <app-status-pill slot="end" [tone]="tone(r.status)">{{ label(r.status) }}</app-status-pill>
                  </ion-item>
                }
              </ion-list>
            }
          </section>

          <section aria-labelledby="route-change-heading">
            <h2 id="route-change-heading" class="section-heading">Route change requests</h2>
            <app-state-panel
              panelId="route-change-gated"
              icon="lock-closed-outline"
              title="Not available yet"
              message="VALRYDE doesn't accept route addition or change requests yet. Official routes are managed by VALRYDE Admin."
            />
          </section>
        }
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestsPage {
  private readonly api = inject(FleetApiService);
  private entered = false;
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly applications = signal<VehicleApplication[]>([]);
  protected readonly gpsRequests = signal<GpsSetupRequest[]>([]);
  private readonly jeepneys = signal<Jeepney[]>([]);
  private readonly plates = computed(() => new Map(this.jeepneys().map((j) => [j.id, j.plateNo])));
  protected readonly label = statusLabel;
  protected readonly tone = statusTone;

  constructor() {
    void this.load();
  }

  ionViewWillEnter(): void {
    if (this.entered) void this.load();
    this.entered = true;
  }

  protected plate(jeepneyId: string): string {
    return this.plates().get(jeepneyId) ?? 'Jeepney';
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [applications, gpsRequests, jeepneys] = await Promise.all([
        firstValueFrom(this.api.listApplications()),
        firstValueFrom(this.api.listGpsRequests()),
        firstValueFrom(this.api.listJeepneys()),
      ]);
      this.applications.set(applications);
      this.gpsRequests.set(gpsRequests);
      this.jeepneys.set(jeepneys);
    } catch (error: unknown) {
      this.error.set(apiErrorMessage(error, 'Your requests could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }
}
