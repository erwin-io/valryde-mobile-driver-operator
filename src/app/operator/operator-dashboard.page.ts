import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { busOutline, chevronForwardOutline, peopleOutline, trailSignOutline, warningOutline } from 'ionicons/icons';

import { StatePanelComponent } from '../shared/state-panel.component';

@Component({
  selector: 'app-operator-dashboard-page',
  standalone: true,
  imports: [IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar, StatePanelComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Fleet Dashboard</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content">
      @if (foundationPreview()) {
        <div class="foundation-notice"><ion-icon name="warning-outline" /> Foundation preview — no backend data is simulated.</div>
      }
      <main class="page-stack">
        <section class="dashboard-intro">
          <div><p class="eyebrow">YOUR FLEET</p><h1>Good operations start with clear status</h1></div>
          <ion-button size="small" disabled="true">Add jeepney</ion-button>
        </section>

        <section aria-labelledby="fleet-overview-heading">
          <h2 id="fleet-overview-heading" class="section-heading">Fleet overview</h2>
          <div class="metric-grid">
            <article><span>Jeepneys</span><strong>—</strong><small>API pending</small></article>
            <article><span>Drivers</span><strong>—</strong><small>API pending</small></article>
            <article><span>Online</span><strong>—</strong><small>Tracking gated</small></article>
            <article><span>Off route</span><strong>—</strong><small>Tracking gated</small></article>
          </div>
        </section>

        <app-state-panel
          panelId="operator-empty-fleet"
          icon="bus-outline"
          title="Fleet summary unavailable"
          message="Counts will load from server-scoped fleet and tracking contracts. No values are inferred locally."
        />

        <section aria-labelledby="management-heading">
          <h2 id="management-heading" class="section-heading">Manage operations</h2>
          <ion-list inset="true">
            @for (item of managementItems; track item.title) {
              <ion-item [button]="true" [detail]="false" [disabled]="true">
                <ion-icon [name]="item.icon" slot="start" aria-hidden="true" />
                <ion-label><h3>{{ item.title }}</h3><p>{{ item.subtitle }}</p></ion-label>
                <ion-icon name="chevron-forward-outline" slot="end" aria-hidden="true" />
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
export class OperatorDashboardPage {
  readonly foundationPreview = input(false);
  protected readonly managementItems = [
    { title: 'Jeepneys', subtitle: 'Vehicles, applications and GPS state', icon: 'bus-outline' },
    { title: 'Drivers', subtitle: 'Associations and assignments', icon: 'people-outline' },
    { title: 'Transits', subtitle: 'Approved routes and effective assignments', icon: 'trail-sign-outline' },
  ] as const;

  constructor() {
    addIcons({ busOutline, chevronForwardOutline, peopleOutline, trailSignOutline, warningOutline });
  }
}
