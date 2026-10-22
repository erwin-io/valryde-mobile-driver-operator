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
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonSegment,
  IonSegmentButton,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessage } from '../core/api-error';
import { FleetApiService } from '../core/fleet-api.service';
import { StatePanelComponent } from '../shared/state-panel.component';

@Component({
  selector: 'app-group-form-page',
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
    IonList,
    IonNote,
    IonSpinner,
      IonTitle,
    IonSegment,
  IonSegmentButton,
    IonToolbar,
    StatePanelComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button [defaultHref]="backHref" /></ion-buttons>
        <ion-title>{{ groupId ? 'Edit group' : 'Create group' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="page-content">
      <main class="page-stack narrow">
        @if (loading()) {
          <p role="status"><ion-spinner name="crescent" /> Loading group…</p>
        } @else if (missing()) {
          <app-state-panel panelId="group-missing" icon="people-outline" title="Group not available" message="It does not exist or is not one of your groups." />
        } @else {
          <form class="form-card" [formGroup]="form" (ngSubmit)="save()">
            <ion-list lines="none">
              <ion-item>
                <ion-input label="Group name" labelPlacement="stacked" formControlName="name" maxlength="120" [counter]="true" errorText="Enter a name of 1–120 characters." />
              </ion-item>
              <ion-item>
                <ion-input label="Description (optional)" labelPlacement="stacked" formControlName="description" [counter]="true" maxlength="1000" />
              </ion-item>
              @if (groupId) {
                <ion-item>
                  <ion-segment formControlName="status" aria-label="Group status">
                    <ion-segment-button value="ACTIVE">Active</ion-segment-button>
                    <ion-segment-button value="INACTIVE">Inactive</ion-segment-button>
                  </ion-segment>
                </ion-item>
              }
            </ion-list>
            @if (failure()) {
              <ion-note color="danger" role="alert">{{ failure() }}</ion-note>
            }
            <ion-button type="submit" expand="block" size="large" [disabled]="saving()">{{ groupId ? 'Save changes' : 'Create group' }}</ion-button>
          </form>
        }
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupFormPage {
  private readonly api = inject(FleetApiService);
  private readonly router = inject(Router);
  protected readonly groupId = inject(ActivatedRoute).snapshot.paramMap.get('id');
  protected readonly backHref = this.groupId ? `/operator/fleet/groups/${this.groupId}` : '/operator/fleet/groups';
  protected readonly loading = signal(this.groupId !== null);
  protected readonly missing = signal(false);
  protected readonly saving = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    status: new FormControl<'ACTIVE' | 'INACTIVE'>('ACTIVE', { nonNullable: true }),
  });

  constructor() {
    if (this.groupId) void this.loadExisting(this.groupId);
  }

  private async loadExisting(id: string): Promise<void> {
    try {
      const group = (await firstValueFrom(this.api.listGroups())).find((g) => g.id === id) ?? null;
      this.missing.set(group === null);
      if (group) this.form.setValue({ name: group.name, description: group.description ?? '', status: group.status });
    } catch (error: unknown) {
      this.failure.set(apiErrorMessage(error, 'This group could not be loaded.'));
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
    const { name, description, status } = this.form.getRawValue();
    try {
      const saved = this.groupId
        ? await firstValueFrom(
            this.api.updateGroup(this.groupId, { name: name.trim(), description: description.trim() || null, status }),
          )
        : await firstValueFrom(this.api.createGroup({ name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}) }));
      await this.router.navigate(['/operator/fleet/groups', saved.id], { replaceUrl: true });
    } catch (error: unknown) {
      this.failure.set(apiErrorMessage(error, 'The group could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }
}
