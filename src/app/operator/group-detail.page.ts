import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { DriverDirectoryEntry, FleetGroup, Jeepney } from '../core/fleet.models';
import { statusLabel, statusTone } from '../shared/fleet-status';
import { StatePanelComponent } from '../shared/state-panel.component';
import { StatusPillComponent } from '../shared/status-pill.component';

@Component({
  selector: 'app-group-detail-page',
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
        <ion-buttons slot="start"><ion-back-button defaultHref="/operator/fleet/groups" /></ion-buttons>
        <ion-title>{{ group()?.name ?? 'Group' }}</ion-title>
        @if (group()) {
          <ion-buttons slot="end"><ion-button [routerLink]="['/operator/fleet/groups', groupId, 'edit']">Edit</ion-button></ion-buttons>
        }
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack">
        @if (loading()) {
          <p role="status"><ion-spinner name="crescent" /> Loading group…</p>
        } @else if (error()) {
          <app-state-panel panelId="group-error" icon="cloud-offline-outline" title="Group unavailable" [message]="error()!" actionLabel="Try again" (action)="load()" />
        } @else if (!group()) {
          <app-state-panel panelId="group-missing" icon="people-outline" title="Group not available" message="It does not exist or is not one of your groups." />
        } @else {
          @let g = group()!;
          <ion-list inset="true">
            <ion-item>
              <ion-label><p>Group</p><h2>{{ g.name }}</h2></ion-label>
              <app-status-pill slot="end" [tone]="tone(g.status)">{{ label(g.status) }}</app-status-pill>
            </ion-item>
            @if (g.description) {
              <ion-item><ion-label class="ion-text-wrap"><p>Description</p><h2>{{ g.description }}</h2></ion-label></ion-item>
            }
          </ion-list>
          <section aria-labelledby="members-heading">
            <h2 id="members-heading" class="section-heading">Members</h2>
            <p class="supporting-text">G1 reports Driver group IDs, so known Driver memberships can be shown and added. G2 is still required for a complete member list and all removals.</p>
            @if (membersLoading()) {
              <p role="status"><ion-spinner name="crescent" /> Loading available members…</p>
            } @else if (membersError()) {
              <app-state-panel panelId="group-members-error" icon="lock-closed-outline" title="Member controls unavailable" [message]="membersError()!" actionLabel="Try again" (action)="loadMemberOptions()" />
            } @else {
              @if (memberMessage()) { <ion-note color="success" role="status">{{ memberMessage() }}</ion-note> }
              @if (memberActionError()) { <ion-note color="danger" role="alert">{{ memberActionError() }}</ion-note> }
              <h3>Drivers</h3>
              @if (knownDriverMembers().length) {
                <ion-list inset="true">
                  @for (driver of knownDriverMembers(); track driver.driverId) {
                    <ion-item><ion-label><h3>{{ driver.displayName }}</h3><p>Known member · removal unavailable</p></ion-label></ion-item>
                  }
                </ion-list>
              }
              @if (availableDrivers().length) {
                <ion-list inset="true">
                  @for (driver of availableDrivers(); track driver.driverId) {
                    <ion-item>
                      <ion-label><h3>{{ driver.displayName }}</h3><p>{{ driver.email }}</p></ion-label>
                      <ion-button slot="end" fill="outline" [disabled]="addingId() !== null" (click)="addDriver(driver)">{{ addingId() === driver.driverId ? 'Adding…' : 'Add' }}</ion-button>
                    </ion-item>
                  }
                </ion-list>
              } @else if (!knownDriverMembers().length) {
                <p class="supporting-text">No active, verified Driver is available to add.</p>
              }

              <h3>Jeepneys</h3>
              <p class="supporting-text">G2 does not expose current jeepney membership. Adding is available, but the app cannot list or remove jeepneys afterward yet.</p>
              @if (jeepneys().length) {
                <ion-list inset="true">
                  @for (jeepney of jeepneys(); track jeepney.id) {
                    <ion-item>
                      <ion-label><h3>{{ jeepney.plateNo }}</h3><p>{{ label(jeepney.status) }}</p></ion-label>
                      <ion-button slot="end" fill="outline" [disabled]="addingId() !== null" (click)="addJeepney(jeepney)">{{ addingId() === jeepney.id ? 'Adding…' : 'Add' }}</ion-button>
                    </ion-item>
                  }
                </ion-list>
              } @else {
                <p class="supporting-text">No jeepney is available in this Operator scope.</p>
              }
            }
          </section>
        }
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupDetailPage {
  private readonly api = inject(FleetApiService);
  private entered = false;
  private loadEpoch = 0;
  private membersEpoch = 0;
  protected readonly groupId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly group = signal<FleetGroup | null>(null);
  protected readonly drivers = signal<DriverDirectoryEntry[]>([]);
  protected readonly jeepneys = signal<Jeepney[]>([]);
  protected readonly membersLoading = signal(false);
  protected readonly membersError = signal<string | null>(null);
  protected readonly memberMessage = signal<string | null>(null);
  protected readonly memberActionError = signal<string | null>(null);
  protected readonly addingId = signal<string | null>(null);
  protected readonly label = statusLabel;
  protected readonly tone = statusTone;
  protected readonly knownDriverMembers = computed(() => this.drivers().filter(({ groupIds }) => groupIds.includes(this.groupId)));
  protected readonly availableDrivers = computed(() =>
    this.drivers().filter(
      (driver) =>
        !driver.groupIds.includes(this.groupId) &&
        driver.status === 'ACTIVE' &&
        driver.userStatus === 'ACTIVE' &&
        driver.emailVerified,
    ),
  );

  constructor() {
    void this.load();
  }

  ionViewWillEnter(): void {
    if (this.entered) void this.load();
    this.entered = true;
  }

  protected async load(): Promise<void> {
    const epoch = ++this.loadEpoch;
    this.loading.set(true);
    this.error.set(null);
    try {
      const group = (await firstValueFrom(this.api.listGroups())).find((g) => g.id === this.groupId) ?? null;
      if (epoch !== this.loadEpoch) return;
      this.group.set(group);
      if (group) void this.loadMemberOptions();
    } catch (error: unknown) {
      if (epoch !== this.loadEpoch) return;
      this.error.set(apiErrorMessage(error, 'This group could not be loaded.'));
    } finally {
      if (epoch === this.loadEpoch) this.loading.set(false);
    }
  }

  protected async loadMemberOptions(): Promise<void> {
    const epoch = ++this.membersEpoch;
    this.membersLoading.set(true);
    this.membersError.set(null);
    try {
      const [drivers, jeepneys] = await Promise.all([
        firstValueFrom(this.api.listDrivers({ status: 'ACTIVE', page: 1, pageSize: 100 })),
        firstValueFrom(this.api.listJeepneys()),
      ]);
      if (epoch !== this.membersEpoch) return;
      this.drivers.set(drivers.drivers);
      this.jeepneys.set(jeepneys);
    } catch (error: unknown) {
      if (epoch !== this.membersEpoch) return;
      this.membersError.set(apiErrorMessage(error, 'Group member controls could not be loaded.'));
    } finally {
      if (epoch === this.membersEpoch) this.membersLoading.set(false);
    }
  }

  protected async addDriver(driver: DriverDirectoryEntry): Promise<void> {
    if (this.addingId()) return;
    this.addingId.set(driver.driverId);
    this.memberActionError.set(null);
    this.memberMessage.set(null);
    try {
      await firstValueFrom(this.api.addDriverToGroup(this.groupId, driver.driverId));
      this.memberMessage.set(`${driver.displayName} was added. Known Driver memberships were refreshed.`);
      await this.loadMemberOptions();
    } catch (error: unknown) {
      this.memberActionError.set(apiErrorMessage(error, 'The Driver could not be added to this group.'));
    } finally {
      this.addingId.set(null);
    }
  }

  protected async addJeepney(jeepney: Jeepney): Promise<void> {
    if (this.addingId()) return;
    this.addingId.set(jeepney.id);
    this.memberActionError.set(null);
    this.memberMessage.set(null);
    try {
      await firstValueFrom(this.api.addJeepneyToGroup(this.groupId, jeepney.id));
      this.memberMessage.set(`${jeepney.plateNo} was submitted for addition. Membership listing and removal remain unavailable until G2.`);
    } catch (error: unknown) {
      this.memberActionError.set(apiErrorMessage(error, 'The jeepney could not be added to this group.'));
    } finally {
      this.addingId.set(null);
    }
  }
}
