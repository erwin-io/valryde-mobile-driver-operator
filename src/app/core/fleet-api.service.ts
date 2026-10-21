import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  EffectiveRouteDirection,
  FleetGroup,
  FleetGroupCreate,
  FleetGroupUpdate,
  Jeepney,
  JeepneyCreate,
  JeepneyUpdate,
  VehicleApplication,
} from './fleet.models';

/** Agent A fleet and vehicle-workflow endpoints. Scope and ownership are enforced server-side. */
@Injectable({ providedIn: 'root' })
export class FleetApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  listJeepneys(): Observable<Jeepney[]> {
    return this.http.get<{ jeepneys: Jeepney[] }>(`${this.api}/jeepneys`).pipe(map((r) => r.jeepneys));
  }

  createJeepney(input: JeepneyCreate): Observable<Jeepney> {
    return this.http.post<{ jeepney: Jeepney }>(`${this.api}/jeepneys`, input).pipe(map((r) => r.jeepney));
  }

  updateJeepney(id: string, input: JeepneyUpdate): Observable<Jeepney> {
    return this.http
      .patch<{ jeepney: Jeepney }>(`${this.api}/jeepneys/${encodeURIComponent(id)}`, input)
      .pipe(map((r) => r.jeepney));
  }

  effectiveRoute(jeepneyId: string): Observable<EffectiveRouteDirection | null> {
    return this.http
      .get<{ effectiveRouteDirection: EffectiveRouteDirection | null }>(
        `${this.api}/jeepneys/${encodeURIComponent(jeepneyId)}/effective-route`,
      )
      .pipe(map((r) => r.effectiveRouteDirection));
  }

  listGroups(): Observable<FleetGroup[]> {
    return this.http.get<{ groups: FleetGroup[] }>(`${this.api}/fleet-groups`).pipe(map((r) => r.groups));
  }

  createGroup(input: FleetGroupCreate): Observable<FleetGroup> {
    return this.http.post<{ group: FleetGroup }>(`${this.api}/fleet-groups`, input).pipe(map((r) => r.group));
  }

  updateGroup(id: string, input: FleetGroupUpdate): Observable<FleetGroup> {
    return this.http
      .patch<{ group: FleetGroup }>(`${this.api}/fleet-groups/${encodeURIComponent(id)}`, input)
      .pipe(map((r) => r.group));
  }

  listApplications(): Observable<VehicleApplication[]> {
    return this.http
      .get<{ applications: VehicleApplication[] }>(`${this.api}/vehicle-applications`)
      .pipe(map((r) => r.applications));
  }

  submitApplication(jeepneyId: string, applicantNotes?: string): Observable<VehicleApplication> {
    const body = applicantNotes ? { jeepneyId, applicantNotes } : { jeepneyId };
    return this.http
      .post<{ application: VehicleApplication }>(`${this.api}/vehicle-applications`, body)
      .pipe(map((r) => r.application));
  }
}
