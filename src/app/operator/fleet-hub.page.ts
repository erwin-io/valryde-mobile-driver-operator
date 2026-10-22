import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { busOutline, mapOutline, peopleOutline, personOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import { FleetApiService } from '../core/fleet-api.service';

@Component({
  selector: 'app-fleet-hub-page',
  standalone: true,
  imports: [RouterLink, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonTitle, IonToolbar],
  template: `
    <ion-header><ion-toolbar><ion-title>Fleet</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content">
      <main class="page-stack">
        <ion-list inset="true">
          <ion-item routerLink="/operator/fleet/jeepneys" detail="true">
            <ion-icon name="bus-outline" slot="start" aria-hidden="true" />
            <ion-label><h2>My jeepneys</h2><p>Vehicles, approval and routes</p></ion-label>
            <ion-note slot="end">{{ jeepneyCount() ?? '—' }}</ion-note>
          </ion-item>
          <ion-item routerLink="/operator/fleet/groups" detail="true">
            <ion-icon name="people-outline" slot="start" aria-hidden="true" />
            <ion-label><h2>Fleet groups</h2><p>Organize jeepneys and drivers</p></ion-label>
            <ion-note slot="end">{{ groupCount() ?? '—' }}</ion-note>
          </ion-item>
          <ion-item routerLink="/operator/fleet/drivers" detail="true">
            <ion-icon name="person-outline" slot="start" aria-hidden="true" />
            <ion-label class="ion-text-wrap"><h2>Drivers</h2><p>Directory and vehicle assignments</p></ion-label>
            <ion-note slot="end">{{ driverCount() ?? '—' }}</ion-note>
          </ion-item>
          <ion-item [disabled]="true">
            <ion-icon name="map-outline" slot="start" aria-hidden="true" />
            <ion-label class="ion-text-wrap"><h2>Live fleet map</h2><p>Coming with GPS tracking</p></ion-label>
          </ion-item>
        </ion-list>
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FleetHubPage {
  private readonly api = inject(FleetApiService);
  protected readonly jeepneyCount = signal<number | null>(null);
  protected readonly groupCount = signal<number | null>(null);
  protected readonly driverCount = signal<number | null>(null);
  private entered = false;

  constructor() {
    addIcons({ busOutline, mapOutline, peopleOutline, personOutline });
    void this.load();
  }

  ionViewWillEnter(): void {
    if (this.entered) void this.load();
    this.entered = true;
  }

  protected async load(): Promise<void> {
    // Counts are a convenience; on failure they stay "—" and each list shows its own error.
    const [jeepneys, groups, drivers] = await Promise.allSettled([
      firstValueFrom(this.api.listJeepneys()),
      firstValueFrom(this.api.listGroups()),
      firstValueFrom(this.api.listDrivers({ page: 1, pageSize: 1 })),
    ]);
    this.jeepneyCount.set(jeepneys.status === 'fulfilled' ? jeepneys.value.length : null);
    this.groupCount.set(groups.status === 'fulfilled' ? groups.value.length : null);
    this.driverCount.set(drivers.status === 'fulfilled' ? drivers.value.pagination.total : null);
  }
}
