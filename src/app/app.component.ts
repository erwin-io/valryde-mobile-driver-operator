import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { ConnectivityBannerComponent } from './shared/connectivity-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, ConnectivityBannerComponent],
  template: `
    <ion-app>
      <app-connectivity-banner />
      <ion-router-outlet />
    </ion-app>
  `,
  // ion-app is a flex column; a flex-filling outlet lets the offline banner push pages down instead of covering toolbars.
  styles: `ion-router-outlet { flex: 1; position: relative; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
