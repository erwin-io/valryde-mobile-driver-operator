import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
  IonSkeletonText,
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
  selector: 'app-groups-page',
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
        <ion-title>Fleet groups</ion-title>
        <ion-buttons slot="end"><ion-button routerLink="/operator/fleet/groups/new">Add</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack">
        @switch (state()) {
          @case ('loading') {
            <ion-list inset="true" aria-busy="true" aria-label="Loading groups">
              @for (row of [1, 2]; track row) {
                <ion-item><ion-label><ion-skeleton-text [animated]="true" style="width: 50%" /></ion-label></ion-item>
              }
            </ion-list>
          }
          @case ('error') {
            <app-state-panel panelId="groups-error" icon="cloud-offline-outline" title="Groups unavailable" [message]="error()" actionLabel="Try again" (action)="load()" />
          }
          @default {
            @if (groups().length === 0) {
              <app-state-panel
                panelId="groups-empty"
                icon="people-outline"
                title="No groups yet"
                message="Groups organize your jeepneys and drivers, for example by route or shift."
                actionLabel="Create group"
                (action)="add()"
              />
            } @else {
              <ion-list inset="true">
                @for (group of groups(); track group.id) {
                  <ion-item [routerLink]="['/operator/fleet/groups', group.id]" detail="true">
                    <ion-label>
                      <h2>{{ group.name }}</h2>
                      @if (group.description) { <p>{{ group.description }}</p> }
                    </ion-label>
                    <app-status-pill slot="end" [tone]="tone(group.status)">{{ label(group.status) }}</app-status-pill>
                  </ion-item>
                }
              </ion-list>
            }
          }
        }
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsPage {
  private readonly api = inject(FleetApiService);
  private readonly router = inject(Router);
  private entered = false;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly groups = signal<FleetGroup[]>([]);
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
    this.state.set('loading');
    try {
      this.groups.set(await firstValueFrom(this.api.listGroups()));
      this.state.set('ready');
    } catch (error: unknown) {
      this.error.set(apiErrorMessage(error, 'Your groups could not be loaded.'));
      this.state.set('error');
    }
  }

  protected add(): void {
    void this.router.navigate(['/operator/fleet/groups/new']);
  }
}
