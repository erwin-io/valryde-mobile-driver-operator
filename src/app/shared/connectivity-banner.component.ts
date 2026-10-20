import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { cloudOfflineOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';

import { ConnectivityService } from '../core/connectivity.service';

@Component({
  selector: 'app-connectivity-banner',
  standalone: true,
  imports: [IonIcon],
  template: `
    @if (!connectivity.online()) {
      <div class="offline-banner" role="status" aria-live="polite">
        <ion-icon name="cloud-offline-outline" aria-hidden="true" />
        <span>You're offline. Live status and changes are unavailable.</span>
      </div>
    }
  `,
  styles: `
    .offline-banner {
      align-items: center;
      background: var(--vr-color-warning-soft);
      color: var(--vr-color-warning);
      display: flex;
      font-size: 0.875rem;
      font-weight: 650;
      gap: var(--vr-space-2);
      justify-content: center;
      min-height: 2.5rem;
      padding: var(--vr-space-2) var(--vr-space-4);
      position: relative;
      z-index: 1000;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectivityBannerComponent {
  protected readonly connectivity = inject(ConnectivityService);

  constructor() {
    addIcons({ cloudOfflineOutline });
  }
}
