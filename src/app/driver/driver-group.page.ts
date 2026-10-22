import { ChangeDetectionStrategy, Component, inject, signal, type OnDestroy } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { FleetGroup, FleetGroupMember, Pagination } from '../core/fleet.models';
import { TrackingPanelComponent } from '../tracking/tracking-panel.component';

@Component({
  selector: 'app-driver-group-page',
  standalone: true,
  imports: [IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar, TrackingPanelComponent],
  template: `
    <ion-header><ion-toolbar><ion-title>My groups</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content"><main class="page-stack">
      @if (loading()) { <p role="status">Loading your groups…</p> }
      @if (error()) { <p role="alert">{{ error() }}</p><ion-button fill="outline" (click)="load()">Try again</ion-button> }
      @else if (!loading() && !groups().length) { <p>No group is currently available to your Driver account. Ask your operator to confirm membership.</p> }
      <ion-list inset="true">
        @for (group of groups(); track group.id) {
          <ion-item button="true" detail="true" (click)="select(group)"><ion-label><h2>{{ group.name }}</h2></ion-label></ion-item>
        }
      </ion-list>
      @if (selected(); as group) {
        <section aria-labelledby="driver-group-members">
          <h2 id="driver-group-members">{{ group.name }} members</h2>
          @if (membersLoading()) { <p role="status">Loading members…</p> }
          @if (membersError()) { <p role="alert">{{ membersError() }}</p><ion-button fill="outline" (click)="loadMembers()">Retry members</ion-button> }
          @else {
            <ion-list inset="true">
              @for (member of members(); track key(member)) {
                <ion-item><ion-label class="ion-text-wrap">
                  <h3>{{ member.memberType === 'DRIVER' ? member.displayName : member.plateNo }}</h3>
                  <p>{{ member.memberType === 'DRIVER' ? 'Driver' : 'Jeepney' }} · {{ member.status }}</p>
                </ion-label></ion-item>
              }
            </ion-list>
            @if (!membersLoading() && !members().length) { <p>No members in this group.</p> }
            @if (pagination(); as page) {
              <p>{{ members().length }} of {{ page.total }} members</p>
              @if (page.page < page.totalPages) { <ion-button fill="outline" [disabled]="membersLoading()" (click)="loadMembers(false)">Load more members</ion-button> }
            }
          }
        </section>
      }
      <section aria-labelledby="group-tracking-heading"><h2 id="group-tracking-heading">Group location and compliance</h2><app-tracking-panel /></section>
    </main></ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverGroupPage implements OnDestroy {
  private readonly api = inject(FleetApiService);
  private epoch = 0;
  private memberEpoch = 0;
  private entered = false;
  protected readonly groups = signal<FleetGroup[]>([]);
  protected readonly selected = signal<FleetGroup | null>(null);
  protected readonly members = signal<FleetGroupMember[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly membersLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly membersError = signal<string | null>(null);

  constructor() { void this.load(); }
  ionViewWillEnter(): void { if (this.entered) void this.load(); this.entered = true; }
  ngOnDestroy(): void { ++this.epoch; ++this.memberEpoch; this.groups.set([]); this.selected.set(null); this.members.set([]); }
  protected key(member: FleetGroupMember): string { return member.memberType === 'DRIVER' ? 'DRIVER:' + member.driverId : 'JEEPNEY:' + member.jeepneyId; }

  protected async load(): Promise<void> {
    const epoch = ++this.epoch;
    ++this.memberEpoch;
    this.groups.set([]); this.selected.set(null); this.members.set([]); this.pagination.set(null);
    this.loading.set(true); this.error.set(null);
    try {
      const groups = await firstValueFrom(this.api.listGroups());
      if (epoch !== this.epoch) return;
      this.groups.set(groups);
      if (groups.length === 1) await this.select(groups[0]!);
    } catch (error: unknown) { if (epoch === this.epoch) this.error.set(apiErrorMessage(error, 'Your groups could not be loaded.')); }
    finally { if (epoch === this.epoch) this.loading.set(false); }
  }

  protected async select(group: FleetGroup): Promise<void> {
    if (!this.groups().some(({ id }) => id === group.id)) return;
    this.selected.set(group);
    await this.loadMembers();
  }

  protected async loadMembers(reset = true): Promise<void> {
    const group = this.selected();
    if (!group) return;
    const epoch = ++this.memberEpoch;
    const page = reset ? 1 : (this.pagination()?.page ?? 0) + 1;
    if (reset) { this.members.set([]); this.pagination.set(null); }
    this.membersLoading.set(true); this.membersError.set(null);
    try {
      const result = await firstValueFrom(this.api.listGroupMembers(group.id, page));
      if (epoch !== this.memberEpoch) return;
      this.members.set(reset ? result.members : [...this.members(), ...result.members]); this.pagination.set(result.pagination);
    } catch (error: unknown) {
      if (epoch !== this.memberEpoch) return;
      this.members.set([]); this.pagination.set(null);
      this.membersError.set(apiErrorMessage(error, 'This group is no longer available.'));
    } finally { if (epoch === this.memberEpoch) this.membersLoading.set(false); }
  }
}
