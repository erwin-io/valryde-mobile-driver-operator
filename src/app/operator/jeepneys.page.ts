import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonInput,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { Jeepney } from '../core/fleet.models';
import { statusLabel, statusTone } from '../shared/fleet-status';
import { StatePanelComponent } from '../shared/state-panel.component';
import { StatusPillComponent } from '../shared/status-pill.component';

@Component({
  selector: 'app-jeepneys-page',
  standalone: true,
  imports: [
    RouterLink,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonInput,
    IonSkeletonText,
    IonTitle,
    IonToolbar,
    StatePanelComponent,
    StatusPillComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/operator/fleet" /></ion-buttons>
        <ion-title>My jeepneys</ion-title>
        <ion-buttons slot="end"><ion-button routerLink="/operator/fleet/jeepneys/new">Add</ion-button></ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-input class="search" type="search" aria-label="Search plate number" placeholder="Search plate number" [clearInput]="true" (ionInput)="query.set($any($event).detail.value ?? '')" />
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack">
        @switch (state()) {
          @case ('loading') {
            <ion-list inset="true" aria-busy="true" aria-label="Loading jeepneys">
              @for (row of [1, 2, 3]; track row) {
                <ion-item><ion-label><ion-skeleton-text [animated]="true" style="width: 60%" /></ion-label></ion-item>
              }
            </ion-list>
          }
          @case ('error') {
            <app-state-panel panelId="jeepneys-error" icon="cloud-offline-outline" title="Jeepneys unavailable" [message]="error()" actionLabel="Try again" (action)="load()" />
          }
          @default {
            @if (jeepneys().length === 0) {
              <app-state-panel
                panelId="jeepneys-empty"
                icon="bus-outline"
                title="No jeepneys yet"
                message="Add a jeepney, then submit it for Admin approval before GPS setup."
                actionLabel="Add jeepney"
                (action)="add()"
              />
            } @else if (visible().length === 0) {
              <p class="supporting-text">No plate matches “{{ query() }}”.</p>
            } @else {
              <ion-list inset="true">
                @for (jeepney of visible(); track jeepney.id) {
                  <ion-item [routerLink]="['/operator/fleet/jeepneys', jeepney.id]" detail="true">
                    <span slot="start" class="swatch" [style.background]="jeepney.colorHex" aria-hidden="true"></span>
                    <ion-label>
                      <h2>{{ jeepney.plateNo }}</h2>
                      @if (jeepney.description) { <p>{{ jeepney.description }}</p> }
                    </ion-label>
                    <app-status-pill slot="end" [tone]="tone(jeepney.status)">{{ label(jeepney.status) }}</app-status-pill>
                  </ion-item>
                }
              </ion-list>
            }
          }
        }
      </main>
    </ion-content>
  `,
  styles: `.search { padding: 0 var(--vr-space-4); }
    .swatch { border: 1px solid var(--vr-color-border); border-radius: 50%; height: 1.5rem; width: 1.5rem; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JeepneysPage {
  private readonly api = inject(FleetApiService);
  private readonly router = inject(Router);
  private entered = false;
  private loadEpoch = 0;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly jeepneys = signal<Jeepney[]>([]);
  protected readonly query = signal('');
  // The list contract has no server search; filter what the server already scoped to this Operator.
  protected readonly visible = computed(() => {
    const q = this.query().trim().toUpperCase();
    return q ? this.jeepneys().filter((j) => j.plateNo.toUpperCase().includes(q)) : this.jeepneys();
  });
  protected readonly label = statusLabel;
  protected readonly tone = statusTone;

  constructor() {
    void this.load();
  }

  /** Re-read on every return (after create/edit) instead of trusting a stale copy. */
  ionViewWillEnter(): void {
    if (this.entered) void this.load();
    this.entered = true;
  }

  protected async load(): Promise<void> {
    const epoch = ++this.loadEpoch;
    this.state.set('loading');
    try {
      const jeepneys = await firstValueFrom(this.api.listJeepneys());
      if (epoch !== this.loadEpoch) return;
      this.jeepneys.set(jeepneys);
      this.state.set('ready');
    } catch (error: unknown) {
      if (epoch !== this.loadEpoch) return;
      this.error.set(apiErrorMessage(error, 'Your jeepneys could not be loaded.'));
      this.state.set('error');
    }
  }

  protected add(): void {
    void this.router.navigate(['/operator/fleet/jeepneys/new']);
  }
}
