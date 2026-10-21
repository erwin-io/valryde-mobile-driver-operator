import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { Pagination, TransitRoute } from '../core/fleet.models';
import { StatePanelComponent } from '../shared/state-panel.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-transits-page',
  standalone: true,
  imports: [RouterLink, IonButton, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonSpinner, IonTitle, IonToolbar, StatePanelComponent],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Official routes</ion-title></ion-toolbar>
      <ion-toolbar>
        <ion-input class="search" type="search" aria-label="Search routes" placeholder="Search route code or name" [clearInput]="true" [debounce]="300" (ionInput)="search($any($event).detail.value ?? '')" />
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack">
        <p class="supporting-text">Routes are published by VALRYDE Admin. Open a route to assign one of its directions to your jeepney or group.</p>
        @if (error()) {
          <app-state-panel panelId="transits-error" icon="cloud-offline-outline" title="Routes unavailable" [message]="error()!" actionLabel="Try again" (action)="load(1)" />
        } @else if (!loading() && routes().length === 0) {
          <app-state-panel panelId="transits-empty" icon="map-outline" title="No official routes" [message]="query ? 'No route matches your search.' : 'No routes have been published yet.'" />
        } @else {
          <ion-list inset="true">
            @for (route of routes(); track route.id) {
              <ion-item [routerLink]="['/operator/transits', route.id]" detail="true">
                <span slot="start" class="swatch" [style.background]="route.routeColorHex" aria-hidden="true"></span>
                <ion-label class="ion-text-wrap">
                  <h2>{{ route.routeCode }} · {{ route.publicName }}</h2>
                  <p>{{ route.directions.length }} {{ route.directions.length === 1 ? 'direction' : 'directions' }}</p>
                </ion-label>
              </ion-item>
            }
          </ion-list>
          @if (loading()) {
            <p role="status"><ion-spinner name="crescent" /> Loading routes…</p>
          } @else if (pagination() && pagination()!.page < pagination()!.totalPages) {
            <ion-button expand="block" fill="outline" (click)="load(pagination()!.page + 1)">Load more</ion-button>
          }
        }
      </main>
    </ion-content>
  `,
  styles: `
    .search { padding: 0 var(--vr-space-4); }
    .swatch { border: 1px solid var(--vr-color-border); border-radius: 50%; height: 1.5rem; width: 1.5rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitsPage {
  private readonly api = inject(FleetApiService);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly routes = signal<TransitRoute[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected query = '';

  constructor() {
    void this.load(1);
  }

  protected search(query: string): void {
    this.query = query.trim();
    void this.load(1);
  }

  /** Server-side search and pagination (the only paginated Agent A collection). */
  protected async load(page: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.api.listRoutes({ q: this.query || undefined, page, pageSize: PAGE_SIZE }));
      this.routes.set(page === 1 ? result.routes : [...this.routes(), ...result.routes]);
      this.pagination.set(result.pagination);
    } catch (error: unknown) {
      this.error.set(apiErrorMessage(error, 'Official routes could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }
}
