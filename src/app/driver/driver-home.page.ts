import { ChangeDetectionStrategy, Component, inject, input, type OnInit, signal } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { busOutline, pulseOutline, warningOutline } from 'ionicons/icons';

import { firstValueFrom } from 'rxjs';

import { apiErrorCode } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { Jeepney } from '../core/fleet.models';
import { statusLabel, statusTone } from '../shared/fleet-status';
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

        @if (vehicles() === null || vehicles()!.length === 0) {
          <app-state-panel
            panelId="driver-assignment"
            icon="bus-outline"
            [title]="loadFailed() ? 'Jeepneys unavailable' : 'No assigned jeepney'"
            [message]="loadFailed() ? 'Your jeepneys could not be loaded. Check your connection and try again.' : 'An authorized operator must associate your account and assign an eligible jeepney.'"
            [actionLabel]="loadFailed() ? 'Try again' : undefined"
            (action)="load()"
          />
        } @else {
          <section aria-labelledby="driver-vehicles-heading">
            <h2 id="driver-vehicles-heading" class="section-heading">Jeepneys you can access</h2>
            <p class="supporting-text">VALRYDE doesn't yet show which one you are assigned to today.</p>
            <ion-list inset="true">
              @for (v of vehicles(); track v.jeepney.id) {
                <ion-item>
                  <span slot="start" class="swatch" [style.background]="v.jeepney.colorHex" aria-hidden="true"></span>
                  <ion-label class="ion-text-wrap">
                    <h2>{{ v.jeepney.plateNo }}</h2>
                    <p>{{ v.route }}</p>
                  </ion-label>
                  <app-status-pill slot="end" [tone]="tone(v.jeepney.status)">{{ label(v.jeepney.status) }}</app-status-pill>
                </ion-item>
              }
            </ion-list>
          </section>
        }

        <section aria-labelledby="driver-status-heading">
          <div class="section-row">
            <h2 id="driver-status-heading" class="section-heading">Operational status</h2>
            <app-status-pill>Unknown</app-status-pill>
          </div>
          <ion-list inset="true">
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
    .swatch { border: 1px solid var(--vr-color-border); border-radius: 50%; height: 1.5rem; width: 1.5rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverHomePage implements OnInit {
  private readonly api = inject(FleetApiService);
  readonly foundationPreview = input(false);
  /** null = not loaded. Each jeepney carries the server's effective-route summary. */
  protected readonly vehicles = signal<{ jeepney: Jeepney; route: string }[] | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly label = statusLabel;
  protected readonly tone = statusTone;

  ngOnInit(): void {
    if (!this.foundationPreview()) void this.load();
  }

  protected async load(): Promise<void> {
    this.loadFailed.set(false);
    try {
      const jeepneys = await firstValueFrom(this.api.listJeepneys());
      this.vehicles.set(await Promise.all(jeepneys.map(async (jeepney) => ({ jeepney, route: await this.routeSummary(jeepney.id) }))));
    } catch {
      this.loadFailed.set(true);
    }
  }

  private async routeSummary(jeepneyId: string): Promise<string> {
    try {
      const route = await firstValueFrom(this.api.effectiveRoute(jeepneyId));
      return route ? `${route.direction.originName} → ${route.direction.destinationName}` : 'No route assigned';
    } catch (error: unknown) {
      return apiErrorCode(error) === 'ROUTE_ASSIGNMENT_CONFLICT' ? 'Route unavailable — contact your operator' : 'Route not available';
    }
  }

  constructor() {
    addIcons({ busOutline, pulseOutline, warningOutline });
  }
}
