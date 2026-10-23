import { ChangeDetectionStrategy, Component, computed, inject, signal, type OnDestroy } from '@angular/core';
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

import { apiErrorCode, apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { DriverDirectoryEntry, FleetGroup, FleetGroupMember, Pagination, Jeepney } from '../core/fleet.models';
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
            <p class="supporting-text">Membership is confirmed by the server. Removing a jeepney may change its inherited route.</p>
            @if (memberMessage()) { <ion-note color="success" role="status">{{ memberMessage() }}</ion-note> }
            @if (memberActionError()) { <ion-note color="danger" role="alert">{{ memberActionError() }}</ion-note> }
            @if (pendingRemoval(); as member) {
              <section role="group" aria-label="Confirm member removal">
                <h3>Remove {{ memberName(member) }}?</h3>
                <p>Group visibility and inherited routes may change after removal.</p>
                <ion-button fill="clear" [disabled]="addingId() !== null" (click)="pendingRemoval.set(null)">Cancel</ion-button>
                <ion-button color="danger" [disabled]="addingId() !== null" (click)="removeMember()">Confirm removal</ion-button>
              </section>
            }
            @if (membershipError()) {
              <app-state-panel panelId="membership-error" icon="lock-closed-outline" title="Membership unavailable" [message]="membershipError()!" actionLabel="Try again" (action)="loadMembership()" />
            } @else {
              <ion-list inset="true">
                @for (member of members(); track memberKey(member)) {
                  <ion-item>
                    <ion-label class="ion-text-wrap"><h3>{{ memberName(member) }}</h3><p>{{ member.memberType === 'DRIVER' ? 'Driver' : 'Jeepney' }} · {{ member.status === 'DISABLED' ? 'Disabled' : label(member.status) }}</p></ion-label>
                    <ion-button slot="end" fill="outline" color="danger" [attr.aria-label]="'Remove ' + memberName(member)" [disabled]="addingId() !== null || membershipLoading()" (click)="pendingRemoval.set(member)">Remove</ion-button>
                  </ion-item>
                }
              </ion-list>
              @if (membershipLoading()) { <p role="status">Loading membership…</p> }
              @else if (members().length === 0) { <p>This group has no members.</p> }
              @if (memberPagination(); as page) {
                <p>{{ members().length }} of {{ page.total }} members</p>
                @if (page.page < page.totalPages) { <ion-button fill="outline" [disabled]="membershipLoading() || addingId() !== null" (click)="loadMembership(false)">Load more members</ion-button> }
              }
            }
            @if (membersLoading()) {
              <p role="status"><ion-spinner name="crescent" /> Loading available members…</p>
            } @else if (membersError()) {
              <app-state-panel panelId="group-members-error" icon="lock-closed-outline" title="Member controls unavailable" [message]="membersError()!" actionLabel="Try again" (action)="loadMemberOptions()" />
            } @else {
              <h3>Drivers</h3>
              @if (availableDrivers().length) {
                <ion-list inset="true">
                  @for (driver of availableDrivers(); track driver.driverId) {
                    <ion-item>
                      <ion-label><h3>{{ driver.displayName }}</h3><p>{{ driver.email }}</p></ion-label>
                      <ion-button slot="end" fill="outline" [disabled]="addingId() !== null" (click)="addDriver(driver)">{{ addingId() === driver.driverId ? 'Adding…' : 'Add' }}</ion-button>
                    </ion-item>
                  }
                </ion-list>
              } @else {
                <p class="supporting-text">No active, verified Driver is available to add.</p>
              }

              <h3>Jeepneys</h3>

              @if (availableJeepneys().length) {
                <ion-list inset="true">
                  @for (jeepney of availableJeepneys(); track jeepney.id) {
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
export class GroupDetailPage implements OnDestroy {
  private readonly api = inject(FleetApiService);
  private entered = false;
  private loadEpoch = 0;
  private membersEpoch = 0;
  private membershipEpoch = 0;
  private destroyed = false;
  protected readonly members = signal<FleetGroupMember[]>([]);
  protected readonly memberPagination = signal<Pagination | null>(null);
  protected readonly membershipLoading = signal(false);
  protected readonly membershipError = signal<string | null>(null);
  protected readonly pendingRemoval = signal<FleetGroupMember | null>(null);
  protected readonly availableJeepneys = computed(() => this.jeepneys().filter(j => !this.members().some(m => m.memberType === 'JEEPNEY' && m.jeepneyId === j.id)));
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

  ngOnDestroy(): void {
    this.destroyed = true;
    ++this.loadEpoch; ++this.membersEpoch; ++this.membershipEpoch;
    this.members.set([]); this.drivers.set([]); this.jeepneys.set([]);
  }

  protected memberKey(member: FleetGroupMember): string {
    return member.memberType === 'DRIVER' ? 'DRIVER:' + member.driverId : 'JEEPNEY:' + member.jeepneyId;
  }

  protected memberName(member: FleetGroupMember): string {
    return member.memberType === 'DRIVER' ? member.displayName : member.plateNo;
  }

  protected async loadMembership(reset = true): Promise<boolean> {
    const epoch = ++this.membershipEpoch;
    const page = reset ? 1 : (this.memberPagination()?.page ?? 0) + 1;
    this.membershipLoading.set(true);
    this.membershipError.set(null);
    if (reset) { this.members.set([]); this.memberPagination.set(null); this.pendingRemoval.set(null); }
    try {
      const result = await firstValueFrom(this.api.listGroupMembers(this.groupId, page));
      if (epoch !== this.membershipEpoch) return false;
      this.members.set(reset ? result.members : [...this.members(), ...result.members]);
      this.memberPagination.set(result.pagination);
      return true;
    } catch (error: unknown) {
      if (epoch === this.membershipEpoch) {
        this.members.set([]); this.memberPagination.set(null); this.pendingRemoval.set(null);
        this.membershipError.set(apiErrorMessage(error, 'Group membership could not be loaded.'));
        if (['FORBIDDEN', 'NOT_FOUND', 'AUTH_REQUIRED', 'SESSION_REVOKED'].includes(apiErrorCode(error) ?? '')) {
          ++this.membersEpoch; this.drivers.set([]); this.jeepneys.set([]); this.group.set(null);
          this.error.set('Group membership unavailable. Access must be confirmed again.');
        }
      }
      return false;
    } finally { if (epoch === this.membershipEpoch) this.membershipLoading.set(false); }
  }

  protected async removeMember(): Promise<void> {
    const member = this.pendingRemoval();
    if (!member || this.addingId() || this.destroyed) return;
    this.addingId.set(this.memberKey(member));
    this.memberMessage.set(null); this.memberActionError.set(null);
    try {
      await firstValueFrom(this.api.removeGroupMember(this.groupId, member));
      if (this.destroyed) return;
      this.pendingRemoval.set(null);
      const reconciled = await this.loadMembership();
      await this.loadMemberOptions();
      if (!this.destroyed) this.memberMessage.set(reconciled ? 'Member removed. Membership refreshed.' : 'Removal accepted. Refresh membership to confirm the current state.');
    } catch (error: unknown) {
      if (!this.destroyed) {
        this.pendingRemoval.set(null);
        this.memberActionError.set(apiErrorMessage(error, 'The member could not be removed.'));
        await this.loadMembership();
      }
    } finally { if (!this.destroyed) this.addingId.set(null); }
  }

  protected async load(): Promise<void> {
    const epoch = ++this.loadEpoch;
    this.loading.set(true);
    this.error.set(null);
    this.group.set(null);
    ++this.membersEpoch; ++this.membershipEpoch;
    this.members.set([]); this.drivers.set([]); this.jeepneys.set([]); this.pendingRemoval.set(null);
    try {
      const group = (await firstValueFrom(this.api.listGroups())).find((g) => g.id === this.groupId) ?? null;
      if (epoch !== this.loadEpoch) return;
      this.group.set(group);
      if (group) { void this.loadMemberOptions(); void this.loadMembership(); }
    } catch (error: unknown) {
      if (epoch !== this.loadEpoch) return;
      this.error.set(apiErrorMessage(error, 'This group could not be loaded.'));
    } finally {
      if (epoch === this.loadEpoch) this.loading.set(false);
    }
  }

  protected async loadMemberOptions(): Promise<void> {
    const epoch = ++this.membersEpoch;
    if (this.destroyed) return;
    this.membersLoading.set(true);
    this.membersError.set(null);
    try {
      const [drivers, jeepneys] = await Promise.all([
        this.allDriverOptions(),
        firstValueFrom(this.api.listJeepneys()),
      ]);
      if (epoch !== this.membersEpoch) return;
      this.drivers.set(drivers);
      this.jeepneys.set(jeepneys);
    } catch (error: unknown) {
      if (epoch !== this.membersEpoch) return;
      this.drivers.set([]); this.jeepneys.set([]);
      this.membersError.set(apiErrorMessage(error, 'Group member controls could not be loaded.'));
    } finally {
      if (epoch === this.membersEpoch) this.membersLoading.set(false);
    }
  }

  private async allDriverOptions(): Promise<DriverDirectoryEntry[]> {
    const result: DriverDirectoryEntry[] = [];
    for (let page = 1; !this.destroyed; page += 1) {
      const response = await firstValueFrom(this.api.listDrivers({ status: 'ACTIVE', page, pageSize: 100 }));
      result.push(...response.drivers);
      if (page >= response.pagination.totalPages) break;
    }
    return result;
  }

  protected async addDriver(driver: DriverDirectoryEntry): Promise<void> {
    if (this.addingId() || this.destroyed) return;
    this.addingId.set(driver.driverId);
    this.memberActionError.set(null);
    this.memberMessage.set(null);
    try {
      await firstValueFrom(this.api.addDriverToGroup(this.groupId, driver.driverId));
      if (this.destroyed) return;
      const reconciled = await this.loadMembership();
      await this.loadMemberOptions();
      if (!this.destroyed) this.memberMessage.set(reconciled ? `${driver.displayName} was added. Membership refreshed.` : 'Addition accepted. Refresh membership to confirm the current state.');
    } catch (error: unknown) {
      this.memberActionError.set(apiErrorMessage(error, 'The Driver could not be added to this group.'));
    } finally {
      this.addingId.set(null);
    }
  }

  protected async addJeepney(jeepney: Jeepney): Promise<void> {
    if (this.addingId() || this.destroyed) return;
    this.addingId.set(jeepney.id);
    this.memberActionError.set(null);
    this.memberMessage.set(null);
    try {
      await firstValueFrom(this.api.addJeepneyToGroup(this.groupId, jeepney.id));
      if (this.destroyed) return;
      const reconciled = await this.loadMembership();
      await this.loadMemberOptions();
      if (!this.destroyed) this.memberMessage.set(reconciled ? `${jeepney.plateNo} was added. Membership refreshed.` : 'Addition accepted. Refresh membership to confirm the current state.');
    } catch (error: unknown) {
      this.memberActionError.set(apiErrorMessage(error, 'The jeepney could not be added to this group.'));
    } finally {
      this.addingId.set(null);
    }
  }
}
