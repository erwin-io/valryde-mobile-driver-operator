import { ChangeDetectionStrategy, Component, inject, input, type OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { busOutline, chevronForwardOutline, peopleOutline, trailSignOutline, warningOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import { FleetApiService } from '../core/fleet-api.service';

import { StatePanelComponent } from '../shared/state-panel.component';

@Component({
  selector: 'app-operator-dashboard-page',
  standalone: true,
  imports: [RouterLink, IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar, StatePanelComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Fleet Dashboard</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content">
      @if (foundationPreview()) {
        <div class="foundation-notice"><ion-icon name="warning-outline" /> Foundation preview — no backend data is simulated.</div>
      }
      <main class="page-stack">
        <section class="dashboard-intro">
          <div><p class="eyebrow">YOUR FLEET</p><h1>Good operations start with clear status</h1></div>
          <ion-button size="small" routerLink="/operator/fleet/jeepneys/new" [disabled]="foundationPreview()">Add jeepney</ion-button>
        </section>

        <section aria-labelledby="fleet-overview-heading">
          <h2 id="fleet-overview-heading" class="section-heading">Fleet overview</h2>
          <div class="metric-grid">
            <article><span>Jeepneys</span><strong>{{ counts()?.jeepneys ?? '—' }}</strong><small>{{ counts() ? counts()!.active + ' active' : 'Not loaded' }}</small></article>
            <article><span>Awaiting approval</span><strong>{{ counts()?.pending ?? '—' }}</strong><small>Reviewed by VALRYDE Admin</small></article>
            <article><span>Fleet groups</span><strong>{{ counts()?.groups ?? '—' }}</strong><small>{{ counts() ? 'Your groups' : 'Not loaded' }}</small></article>
            <article><span>Drivers</span><strong>—</strong><small>Driver list not yet available</small></article>
            <article><span>Online</span><strong>—</strong><small>Tracking gated</small></article>
            <article><span>Off route</span><strong>—</strong><small>Tracking gated</small></article>
          </div>
        </section>

        @if (!counts()) {
          <app-state-panel
            panelId="operator-empty-fleet"
            icon="bus-outline"
            title="Fleet summary unavailable"
            [message]="foundationPreview() ? 'Preview only: no backend data is loaded.' : 'Your fleet counts could not be loaded. Open Fleet to try again.'"
          />
        }
        <p class="supporting-text">Online, moving and off-route counts appear once GPS tracking is connected.</p>

        <section aria-labelledby="management-heading">
          <h2 id="management-heading" class="section-heading">Manage operations</h2>
          <ion-list inset="true">
            @for (item of managementItems; track item.title) {
              <ion-item [routerLink]="item.link" [detail]="true" [disabled]="foundationPreview() || !item.link">
                <ion-icon [name]="item.icon" slot="start" aria-hidden="true" />
                <ion-label><h3>{{ item.title }}</h3><p>{{ item.subtitle }}</p></ion-label>
              </ion-item>
            }
          </ion-list>
        </section>
      </main>
    </ion-content>
  `,
  styles: `
    .dashboard-intro { align-items: end; display: flex; gap: var(--vr-space-4); justify-content: space-between; }
    .eyebrow { color: var(--vr-color-primary); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.1em; margin: 0 0 var(--vr-space-1); }
    h1 { font-size: 1.5rem; margin: 0; max-width: 28rem; }
    .metric-grid { display: grid; gap: var(--vr-space-3); grid-template-columns: repeat(2, 1fr); margin-top: var(--vr-space-3); }
    article { background: var(--vr-color-surface); border: 1px solid var(--vr-color-border); border-radius: var(--vr-radius-sm); display: grid; padding: var(--vr-space-4); }
    article span { color: var(--vr-color-text-muted); font-size: 0.8125rem; }
    article strong { font-size: 1.75rem; line-height: 1.2; }
    article small { color: var(--vr-color-unknown); }
    ion-list { border: 1px solid var(--vr-color-border); margin: var(--vr-space-3) 0 0; }
    @media (min-width: 600px) { .metric-grid { grid-template-columns: repeat(4, 1fr); } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorDashboardPage implements OnInit {
  private readonly api = inject(FleetApiService);
  private entered = false;
  readonly foundationPreview = input(false);
  protected readonly counts = signal<{ jeepneys: number; active: number; pending: number; groups: number } | null>(null);
  protected readonly managementItems = [
    { title: 'Jeepneys', subtitle: 'Vehicles, applications and routes', icon: 'bus-outline', link: '/operator/fleet/jeepneys' },
    { title: 'Fleet groups', subtitle: 'Organize jeepneys and drivers', icon: 'people-outline', link: '/operator/fleet/groups' },
    { title: 'Drivers', subtitle: 'Available when VALRYDE can list your drivers', icon: 'people-outline', link: null },
  ] as const;

  ngOnInit(): void {
    if (!this.foundationPreview()) void this.load();
  }

  ionViewWillEnter(): void {
    if (this.entered && !this.foundationPreview()) void this.load();
    this.entered = true;
  }

  /** Plain counts over the Operator-scoped lists; no tracking state is inferred. */
  protected async load(): Promise<void> {
    try {
      const [jeepneys, groups] = await Promise.all([firstValueFrom(this.api.listJeepneys()), firstValueFrom(this.api.listGroups())]);
      this.counts.set({
        jeepneys: jeepneys.length,
        active: jeepneys.filter((j) => j.status === 'ACTIVE').length,
        pending: jeepneys.filter((j) => j.status === 'PENDING_APPROVAL').length,
        groups: groups.length,
      });
    } catch {
      this.counts.set(null);
    }
  }

  constructor() {
    addIcons({ busOutline, chevronForwardOutline, peopleOutline, trailSignOutline, warningOutline });
  }
}
