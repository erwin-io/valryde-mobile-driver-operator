import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

import { StatePanelComponent } from './state-panel.component';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, StatePanelComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ title() }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <div class="page-stack">
        <app-state-panel
          panelId="foundation-gate"
          icon="construct-outline"
          [title]="stateTitle()"
          [message]="message()"
        />
      </div>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPageComponent {
  readonly title = input.required<string>();
  readonly stateTitle = input.required<string>();
  readonly message = input.required<string>();
}
