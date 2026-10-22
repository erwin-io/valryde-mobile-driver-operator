import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { DriverDirectoryEntry, Jeepney, Pagination } from '../core/fleet.models';
import { StatePanelComponent } from '../shared/state-panel.component';
import { StatusPillComponent } from '../shared/status-pill.component';

@Component({
  selector: 'app-drivers-page',
  standalone: true,
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSpinner,
    IonTitle,
    IonToolbar,
    StatePanelComponent,
    StatusPillComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/operator/fleet" /></ion-buttons>
        <ion-title>Drivers</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-input
          class="search"
          type="search"
          aria-label="Search drivers"
          placeholder="Search name or email"
          [clearInput]="true"
          [debounce]="300"
          (ionInput)="search($any($event).detail.value ?? '')"
        />
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack">
        <p class="supporting-text">This directory is scoped by your signed-in Operator session. Assignment controls use each Driver business ID, never the User ID.</p>
        @if (loading() && drivers().length === 0) {
          <p role="status"><ion-spinner name="crescent" /> Loading drivers…</p>
        } @else if (error()) {
          <app-state-panel panelId="drivers-error" icon="people-outline" title="Driver directory unavailable" [message]="error()!" actionLabel="Try again" (action)="load(true)" />
        } @else if (drivers().length === 0) {
          <app-state-panel panelId="drivers-empty" icon="people-outline" title="No drivers found" [message]="query ? 'No Driver matches your search.' : 'No Driver is associated with this Operator account.'" />
        } @else {
          <ion-list inset="true">
            @for (driver of drivers(); track driver.driverId) {
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <h2>{{ driver.displayName }}</h2>
                  <p>{{ driver.email }}</p>
                  <p>{{ assignmentLabel(driver) }}</p>
                  @if (driver.groupIds.length) { <p>{{ driver.groupIds.length }} {{ driver.groupIds.length === 1 ? 'group' : 'groups' }}</p> }
                </ion-label>
                <app-status-pill slot="end" [tone]="isEligible(driver) ? 'success' : 'danger'">{{ isEligible(driver) ? 'Ready' : 'Unavailable' }}</app-status-pill>
              </ion-item>
            }
          </ion-list>
          @if (pagination(); as page) {
            <ion-note>{{ page.total }} {{ page.total === 1 ? 'driver' : 'drivers' }} in this scope</ion-note>
            @if (page.page < page.totalPages) {
              <ion-button expand="block" fill="outline" [disabled]="loading()" (click)="load(false)">{{ loading() ? 'Loading…' : 'Load more' }}</ion-button>
            }
          }
        }
      </main>
    </ion-content>
  `,
  styles: `.search { --padding-start: var(--vr-space-4); --padding-end: var(--vr-space-4); }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriversPage {
  private readonly api = inject(FleetApiService);
  private readonly jeepneys = signal<Jeepney[]>([]);
  private loadEpoch = 0;
  private entered = false;
  protected query = '';
  protected readonly drivers = signal<DriverDirectoryEntry[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.load(true);
  }

  ionViewWillEnter(): void {
    if (this.entered) void this.load(true);
    this.entered = true;
  }

  protected search(value: string): void {
    this.query = value.trim();
    void this.load(true);
  }

  protected async load(reset: boolean): Promise<void> {
    const epoch = ++this.loadEpoch;
    const page = reset ? 1 : (this.pagination()?.page ?? 0) + 1;
    this.loading.set(true);
    this.error.set(null);
    try {
      const [directory, jeepneys] = await Promise.all([
        firstValueFrom(this.api.listDrivers({ q: this.query || undefined, page, pageSize: 20 })),
        page === 1 ? firstValueFrom(this.api.listJeepneys()) : Promise.resolve(this.jeepneys()),
      ]);
      if (epoch !== this.loadEpoch) return;
      this.jeepneys.set(jeepneys);
      this.drivers.set(reset ? directory.drivers : [...this.drivers(), ...directory.drivers]);
      this.pagination.set(directory.pagination);
    } catch (error: unknown) {
      if (epoch === this.loadEpoch) this.error.set(apiErrorMessage(error, 'The Driver directory could not be loaded.'));
    } finally {
      if (epoch === this.loadEpoch) this.loading.set(false);
    }
  }

  protected isEligible(driver: DriverDirectoryEntry): boolean {
    return driver.status === 'ACTIVE' && driver.userStatus === 'ACTIVE' && driver.emailVerified;
  }

  protected assignmentLabel(driver: DriverDirectoryEntry): string {
    if (!driver.activeJeepneyId) return 'No active jeepney assignment';
    const jeepney = this.jeepneys().find(({ id }) => id === driver.activeJeepneyId);
    return jeepney ? `Assigned to ${jeepney.plateNo}` : 'Assigned to a scoped jeepney';
  }
}
