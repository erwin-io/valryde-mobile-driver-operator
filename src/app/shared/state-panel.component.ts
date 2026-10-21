import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-state-panel',
  standalone: true,
  imports: [IonButton, IonIcon],
  template: `
    <section class="state-panel" [attr.aria-labelledby]="panelId() + '-title'">
      <ion-icon [name]="icon()" aria-hidden="true" />
      <div>
        <h2 [id]="panelId() + '-title'">{{ title() }}</h2>
        <p>{{ message() }}</p>
      </div>
      @if (actionLabel()) {
        <ion-button fill="outline" size="small" (click)="action.emit()">
          {{ actionLabel() }}
        </ion-button>
      }
    </section>
  `,
  styles: `
    .state-panel {
      align-items: flex-start;
      background: var(--vr-color-surface);
      border: 1px solid var(--vr-color-border);
      border-radius: var(--vr-radius-md);
      display: grid;
      gap: var(--vr-space-3);
      grid-template-columns: auto 1fr;
      padding: var(--vr-space-4);
    }

    ion-icon { color: var(--vr-color-unknown); font-size: 1.5rem; margin-top: 0.125rem; }
    h2 { font-size: 1rem; margin: 0 0 var(--vr-space-1); }
    p { color: var(--vr-color-text-muted); font-size: 0.875rem; line-height: 1.45; margin: 0; }
    ion-button { grid-column: 2; justify-self: start; margin: 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatePanelComponent {
  readonly panelId = input.required<string>();
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input<string>();
  readonly action = output<void>();
}
