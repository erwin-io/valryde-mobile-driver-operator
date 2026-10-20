import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'unknown';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  template: `<span class="status-pill" [attr.data-tone]="tone()"><ng-content /></span>`,
  styles: `
    .status-pill {
      align-items: center;
      background: var(--vr-color-surface-subtle);
      border-radius: 999px;
      color: var(--vr-color-unknown);
      display: inline-flex;
      font-size: 0.75rem;
      font-weight: 700;
      min-height: 1.75rem;
      padding: 0 var(--vr-space-3);
    }

    [data-tone='success'] { background: var(--vr-color-success-soft); color: var(--vr-color-success); }
    [data-tone='warning'] { background: var(--vr-color-warning-soft); color: var(--vr-color-warning); }
    [data-tone='danger'] { background: var(--vr-color-danger-soft); color: var(--vr-color-danger); }
    [data-tone='info'] { background: var(--vr-color-info-soft); color: var(--vr-color-info-text); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPillComponent {
  readonly tone = input<StatusTone>('unknown');
}
