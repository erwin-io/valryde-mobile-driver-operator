import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { FleetGroup } from '../core/fleet.models';
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
            <app-state-panel
              panelId="group-members-gated"
              icon="lock-closed-outline"
              title="Members not available yet"
              message="VALRYDE can't yet list or remove group members, or list your drivers, so drivers and jeepneys can't be managed here."
            />
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
  protected readonly groupId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly group = signal<FleetGroup | null>(null);
  protected readonly label = statusLabel;
  protected readonly tone = statusTone;

  constructor() {
    void this.load();
  }

  ionViewWillEnter(): void {
    if (this.entered) void this.load();
    this.entered = true;
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.group.set((await firstValueFrom(this.api.listGroups())).find((g) => g.id === this.groupId) ?? null);
    } catch (error: unknown) {
      this.error.set(apiErrorMessage(error, 'This group could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }
}
