import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import type { Jeepney } from '../core/fleet.models';
import { StatePanelComponent } from '../shared/state-panel.component';

const HEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'app-jeepney-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSpinner,
      IonTitle,
    IonToolbar,
    StatePanelComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button [defaultHref]="backHref" /></ion-buttons>
        <ion-title>{{ jeepneyId ? 'Edit jeepney' : 'Add jeepney' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack narrow">
        @if (loading()) {
          <p role="status"><ion-spinner name="crescent" /> Loading jeepney…</p>
        } @else if (missing()) {
          <app-state-panel panelId="jeepney-missing" icon="bus-outline" title="Jeepney not available" message="It does not exist or is not part of your fleet." />
        } @else {
          <form class="form-card" [formGroup]="form" (ngSubmit)="save()">
            <ion-list lines="none">
              @if (jeepneyId) {
                <ion-item>
                  <ion-label><p>Plate number</p><h2>{{ existing()?.plateNo }}</h2></ion-label>
                </ion-item>
              } @else {
                <ion-item>
                  <ion-input
                    label="Plate number"
                    labelPlacement="stacked"
                    autocapitalize="characters"
                    formControlName="plateNo"
                    maxlength="32"
                    errorText="Enter the plate number (up to 32 characters)."
                  />
                </ion-item>
              }
              <ion-item>
                <ion-label position="stacked" for="jeepney-color">Body color</ion-label>
                <div class="color-row">
                  <input id="jeepney-color" type="color" formControlName="colorHex" aria-describedby="jeepney-color-hint" />
                  <span>{{ form.controls.colorHex.value.toUpperCase() }}</span>
                </div>
              </ion-item>
              <ion-item>
                <ion-input label="Description (optional)" labelPlacement="stacked" formControlName="description" [counter]="true" maxlength="1000" />
              </ion-item>
            </ion-list>
            <p id="jeepney-color-hint" class="supporting-text">
              Pick the jeepney's real body color so commuters can recognize it. Approval status is set only by VALRYDE Admin.
            </p>
            @if (failure()) {
              <ion-note color="danger" role="alert">{{ failure() }}</ion-note>
            }
            <ion-button type="submit" expand="block" size="large" [disabled]="saving()">{{ jeepneyId ? 'Save changes' : 'Add jeepney' }}</ion-button>
          </form>
        }
      </main>
    </ion-content>
  `,
  styles: `
    .color-row { align-items: center; display: flex; gap: var(--vr-space-3); padding: var(--vr-space-2) 0; }
    .color-row input { block-size: 2.75rem; border: 1px solid var(--vr-color-border); border-radius: var(--vr-radius-sm); inline-size: 4rem; padding: 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JeepneyFormPage {
  private readonly api = inject(FleetApiService);
  private readonly router = inject(Router);
  protected readonly jeepneyId = inject(ActivatedRoute).snapshot.paramMap.get('id');
  protected readonly backHref = this.jeepneyId ? `/operator/fleet/jeepneys/${this.jeepneyId}` : '/operator/fleet/jeepneys';
  protected readonly loading = signal(this.jeepneyId !== null);
  protected readonly missing = signal(false);
  protected readonly existing = signal<Jeepney | null>(null);
  protected readonly saving = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly form = new FormGroup({
    plateNo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(32), Validators.pattern(/\S/)] }),
    colorHex: new FormControl('#1E88E5', { nonNullable: true, validators: [Validators.required, Validators.pattern(HEX)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });

  constructor() {
    if (this.jeepneyId) {
      this.form.controls.plateNo.disable();
      void this.loadExisting(this.jeepneyId);
    }
  }

  private async loadExisting(id: string): Promise<void> {
    try {
      // No detail endpoint: take it from the Operator-scoped list, so another fleet's ID is simply absent.
      const jeepney = (await firstValueFrom(this.api.listJeepneys())).find((j) => j.id === id) ?? null;
      this.existing.set(jeepney);
      this.missing.set(jeepney === null);
      if (jeepney) this.form.patchValue({ colorHex: jeepney.colorHex, description: jeepney.description ?? '' });
    } catch (error: unknown) {
      this.failure.set(apiErrorMessage(error, 'This jeepney could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.failure.set(null);
    const { plateNo, colorHex, description } = this.form.getRawValue();
    const color = colorHex.toUpperCase();
    try {
      const saved = this.jeepneyId
        ? await firstValueFrom(this.api.updateJeepney(this.jeepneyId, { colorHex: color, description: description.trim() || null }))
        : await firstValueFrom(
            this.api.createJeepney({ plateNo: plateNo.trim(), colorHex: color, ...(description.trim() ? { description: description.trim() } : {}) }),
          );
      await this.router.navigate(['/operator/fleet/jeepneys', saved.id], { replaceUrl: true });
    } catch (error: unknown) {
      this.failure.set(apiErrorMessage(error, 'The jeepney could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }
}
